// ---------------------------------------------------------------------------
// «هشتگ‌ها و موضوعات» — /core/tags/ و /core/categories/{entity_name}/
// هشتگ: همه‌ی محتوای برچسب‌خورده در همه‌ی بخش‌ها · موضوع: درخت دسته‌بندی هر بخش
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Hash, FolderTree, Plus, Search, X, ChevronLeft, CornerDownLeft } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import EmptyState from "../../components/ui/EmptyState";
import RowActions from "../../components/ui/RowActions";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import type { Category, Chat, EntityName, Tag } from "../../social/types";
import { contentKindLabel, entityLabel } from "../../social/types";
import { ApiChip, Field, PublishBadge, fa } from "./kit";

type TabId = "tags" | "categories";
type Item = { id: string; title: string; to: string; sub?: string; draft?: { is_draft: boolean; is_public: boolean; published_at: string | null } };
type Group = { key: string; label: string; items: Item[] };

const ENTITIES: EntityName[] = ["magazine", "blog", "news", "media", "event", "topic", "group", "channel"];

/** همه‌ی آیتم‌های قابل‌دیدن برای کاربر فعلی، گروه‌بندی‌شده بر اساس نوع (محلی — در SocialContext چنین کمکی نیست) */
function useVisibleItems() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const pubOk = (x: { user_id: string; is_draft: boolean; is_public: boolean; deleted_at: string | null }, manage: boolean) => !x.deleted_at && ((x.is_public && !x.is_draft) || x.user_id === s.me || manage);

  const mag = hasPermission("magazines.manage");
  const newsM = hasPermission("news.manage");
  const mediaM = hasPermission("media.manage");
  const evM = hasPermission("events.manage");
  const forumM = hasPermission("forum.moderate");

  const content = s.content.filter((c) => {
    const m = c.kind === "news" ? newsM : mag;
    return s.canView(c, m) && pubOk(c, m);
  });
  const media = s.media.filter((m) => s.canView(m, mediaM) && pubOk(m, mediaM));
  const events = s.events.filter((e) => s.canView(e, evM) && pubOk(e, evM));
  const topics = s.topics.filter((t) => s.canView(t, forumM) && pubOk(t, forumM));
  const chatOk = (c: Chat) => !c.deleted_at && (!c.is_private || s.isMember(c) || hasPermission(c.chat_type === "channel" ? "channels.manage" : "groups.manage"));
  const groups = s.chats.filter((c) => c.chat_type === "group" && chatOk(c));
  const channels = s.chats.filter((c) => c.chat_type === "channel" && chatOk(c));
  return { content, media, events, topics, groups, channels };
}

export default function TopicsHub() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabId>("tags");
  const { hasPermission } = useTenancy();
  const manage = hasPermission("taxonomy.manage");
  const { tags, categories } = useSocial();
  const [entity, setEntity] = useState<EntityName>("magazine");

  const apiItems = [
    { label: "همه‌ی هشتگ‌ها", ep: endpoints.tags() },
    ...(manage
      ? [
          { label: "ساخت هشتگ", ep: endpoints.tagCreate() },
          { label: "تغییر نام هشتگ", ep: endpoints.tagUpdate("{id}") },
          { label: "حذف هشتگ", ep: endpoints.tagDelete("{id}") },
        ]
      : []),
    { label: "موضوع‌های یک بخش", ep: endpoints.categories(entity) },
    ...(manage
      ? [
          { label: "ساخت موضوع", ep: endpoints.categoryCreate(entity) },
          { label: "ویرایش موضوع", ep: endpoints.categoryUpdate(entity, "{id}") },
          { label: "حذف موضوع", ep: endpoints.categoryDelete(entity, "{id}") },
        ]
      : []),
    { label: "محتوا (مجله/بلاگ/خبر)", ep: endpoints.contentList("magazines") },
    { label: "رسانه", ep: endpoints.mediaList() },
    { label: "رویدادها", ep: endpoints.eventList() },
    { label: "پرسش و پاسخ", ep: endpoints.topicList() },
    { label: "گروه‌ها و کانال‌ها", ep: endpoints.chatsMy() },
  ];

  return (
    <div>
      <PageHeader title="هشتگ‌ها و موضوعات" description="هر هشتگ همه‌ی مطالب مرتبط را در همه‌ی بخش‌ها کنار هم می‌آورد؛ موضوع‌ها دسته‌بندی هر بخش‌اند." icon={<Hash size={20} />} actions={<ApiChip items={apiItems} />} />
      <Tabs<TabId>
        tabs={[
          { id: "tags", label: "هشتگ‌ها", count: tags.length },
          { id: "categories", label: "موضوعات (دسته‌بندی‌ها)", count: categories.length },
        ]}
        active={tab}
        onChange={(t) => {
          setTab(t);
          if (t === "categories" && params.get("tag")) setParams({}, { replace: true });
        }}
      />
      {tab === "tags" ? <TagsSection manage={manage} /> : <CategoriesSection manage={manage} entity={entity} setEntity={setEntity} />}
    </div>
  );
}

// ================================================================ هشتگ‌ها
function TagsSection({ manage }: { manage: boolean }) {
  const s = useSocial();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const selected = params.get("tag") ?? "";
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<Tag | null>(null);
  const v = useVisibleItems();

  const allTagged: { tags: string[] }[] = [...v.content, ...v.media, ...v.events, ...v.topics, ...v.groups, ...v.channels];
  const usage = (name: string) => allTagged.filter((x) => x.tags.includes(name)).length;
  const list = s.tags
    .filter((t) => !q || t.name.includes(q.replace(/^#/, "")))
    .map((t) => ({ t, n: usage(t.name) }))
    .sort((a, b) => b.n - a.n || a.t.name.localeCompare(b.t.name, "fa"));
  const max = Math.max(1, ...list.map((x) => x.n));

  const select = (name: string) => setParams(name ? { tag: name } : {}, { replace: false });

  const create = () => {
    const r = s.saveTag({ name: newName });
    if (!r.ok) return notify(r.error, "warning");
    notify("هشتگ ساخته شد.", "success");
    setNewName("");
  };

  const groupsFor = (tag: string): Group[] => {
    const has = (x: { tags: string[] }) => x.tags.includes(tag);
    return [
      {
        key: "mag",
        label: "مجلات و بلاگ",
        items: v.content.filter((c) => c.kind !== "news" && has(c)).map((c) => ({ id: c.id, title: c.title, to: `/dashboard/magazines/${c.id}`, sub: contentKindLabel[c.kind], draft: c })),
      },
      { key: "news", label: "اخبار", items: v.content.filter((c) => c.kind === "news" && has(c)).map((c) => ({ id: c.id, title: c.title, to: `/dashboard/news/${c.id}`, draft: c })) },
      { key: "media", label: "رسانه", items: v.media.filter(has).map((m) => ({ id: m.id, title: m.caption || "بدون توضیح", to: `/dashboard/media/${m.id}`, draft: m })) },
      { key: "events", label: "رویدادها", items: v.events.filter(has).map((e) => ({ id: e.id, title: e.title, to: `/dashboard/events/${e.id}`, sub: e.start_date, draft: e })) },
      { key: "topics", label: "پرسش و پاسخ", items: v.topics.filter(has).map((t) => ({ id: t.id, title: t.title, to: `/dashboard/forum/${t.id}`, draft: t })) },
      {
        key: "chats",
        label: "گروه‌ها و کانال‌ها",
        items: [...v.groups.filter(has).map((c) => ({ id: c.id, title: c.title, to: `/dashboard/groups/${c.id}`, sub: "گروه" })), ...v.channels.filter(has).map((c) => ({ id: c.id, title: c.title, to: `/dashboard/channels/${c.id}`, sub: "کانال" }))],
      },
    ].filter((g) => g.items.length > 0);
  };

  const selTag = s.tags.find((t) => t.name === selected);
  const groups = selected ? groupsFor(selected) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4">
      <div className="card p-4 space-y-3 self-start">
        <div className="relative">
          <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی هشتگ…" />
        </div>
        {manage && (
          <div className="flex gap-2">
            <input className="input-field flex-1 min-w-0" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="هشتگ جدید…" />
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={create}>
              افزودن
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {list.map(({ t, n }) => {
            const on = t.name === selected;
            const big = n / max > 0.6;
            return (
              <button
                key={t.id}
                onClick={() => select(on ? "" : t.name)}
                className={`rounded-full border px-2.5 py-1 flex items-center gap-1 ${big ? "text-[13px] font-medium" : "text-[11.5px]"} ${on ? "bg-brand-600 border-brand-600 text-white" : n ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100" : "border-ink-200 text-ink-500 hover:bg-ink-50"}`}
              >
                <Hash size={big ? 12 : 10} />
                {t.name}
                <span className={`text-[10px] tabular-nums ${on ? "text-white/80" : "text-ink-400"}`}>{fa(n)}</span>
              </button>
            );
          })}
          {list.length === 0 && <p className="text-xs text-ink-400">هشتگی پیدا نشد.</p>}
        </div>
      </div>

      <div className="min-w-0">
        {!selected ? (
          <EmptyState icon={<Hash size={22} />} title="یک هشتگ انتخاب کنید" description="همه‌ی مجله‌ها، اخبار، رسانه‌ها، رویدادها، پرسش‌ها و گروه‌ها/کانال‌های برچسب‌خورده با آن اینجا نمایش داده می‌شوند." />
        ) : (
          <div className="card p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <p className="text-base font-bold text-ink-900 flex items-center gap-1">
                <Hash size={16} className="text-brand-600" />
                {selected}
                <span className="text-xs font-normal text-ink-400 mr-1">{fa(groups.reduce((a, g) => a + g.items.length, 0))} مورد</span>
              </p>
              <span className="flex items-center gap-1">
                {manage && selTag && (
                  <RowActions
                    onEdit={() => setRenaming(selTag)}
                    onDelete={() =>
                      confirm({
                        title: `هشتگ «${selTag.name}» حذف شود؟`,
                        message: "از همه‌ی مطالب برچسب‌خورده هم برداشته می‌شود.",
                        onConfirm: () => {
                          s.deleteTag(selTag.id);
                          select("");
                          notify("هشتگ حذف شد.", "success");
                        },
                      })
                    }
                  />
                )}
                <button onClick={() => select("")} className="p-1.5 rounded-md text-ink-400 hover:text-ink-700 hover:bg-ink-100" aria-label="بستن">
                  <X size={14} />
                </button>
              </span>
            </div>
            {!selTag && <p className="text-xs text-amber-700 mb-2">این هشتگ در فهرست هشتگ‌ها نیست.</p>}
            {groups.length === 0 ? (
              <p className="text-xs text-ink-400">مطلبی با این هشتگ که اجازه‌ی دیدنش را داشته باشید پیدا نشد.</p>
            ) : (
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={g.key}>
                    <p className="text-xs font-bold text-ink-600 mb-1.5">
                      {g.label} <span className="font-normal text-ink-400">({fa(g.items.length)})</span>
                    </p>
                    <div className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
                      {g.items.map((it) => (
                        <Link key={it.id} to={it.to} className="flex items-center gap-2 px-3 py-2 hover:bg-ink-50">
                          <span className="flex-1 min-w-0 text-[13px] text-ink-800 truncate">{it.title}</span>
                          {it.draft && <PublishBadge item={it.draft} />}
                          {it.sub && <span className="text-[11px] text-ink-400 shrink-0">{it.sub}</span>}
                          <ChevronLeft size={14} className="text-ink-300 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {renaming && <RenameTag tag={renaming} onClose={() => setRenaming(null)} onRenamed={(n) => select(n)} />}
    </div>
  );
}

function RenameTag({ tag, onClose, onRenamed }: { tag: Tag; onClose: () => void; onRenamed: (name: string) => void }) {
  const { saveTag } = useSocial();
  const { notify } = useToast();
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState("");
  const submit = () => {
    const r = saveTag({ id: tag.id, name });
    if (!r.ok) return setError(r.error);
    notify("نام هشتگ در همه‌ی مطالب به‌روز شد.", "success");
    onRenamed(name.trim().replace(/^#/, ""));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="تغییر نام هشتگ" description={`PATCH /core/tags/${tag.id}/`}>
      <div className="space-y-3">
        <Field label="نام (name)">
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />
        </Field>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" onClick={submit}>
            ذخیره
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ================================================================ موضوعات (دسته‌بندی‌ها)
function CategoriesSection({ manage, entity, setEntity }: { manage: boolean; entity: EntityName; setEntity: (e: EntityName) => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const confirm = useConfirm();
  const v = useVisibleItems();
  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);

  const cats = s.categoriesOf(entity);
  const roots = cats.filter((c) => !c.parent_id || !cats.some((x) => x.id === c.parent_id));
  const kidsOf = (id: string) => cats.filter((c) => c.parent_id === id);

  const itemsOf = (e: EntityName): { category_ids: string[] }[] => {
    switch (e) {
      case "magazine":
        return v.content.filter((c) => c.kind === "magazines");
      case "blog":
        return v.content.filter((c) => c.kind === "blogs");
      case "news":
        return v.content.filter((c) => c.kind === "news");
      case "media":
        return v.media;
      case "event":
        return v.events;
      case "topic":
        return v.topics;
      case "group":
        return v.groups;
      case "channel":
        return v.channels;
      default:
        return [];
    }
  };
  const items = itemsOf(entity);
  const countOf = (id: string) => items.filter((x) => x.category_ids.includes(id)).length;

  const add = () => {
    const r = s.saveCategory({ entity_name: entity, title, parent_id: parent || null });
    if (!r.ok) return setError(r.error);
    setTitle("");
    setParent("");
    setError("");
    notify("موضوع ساخته شد.", "success");
  };

  const remove = (c: Category) =>
    confirm({
      title: `موضوع «${c.title}» حذف شود؟`,
      message: kidsOf(c.id).length ? "زیرموضوع‌های آن به سطح اول منتقل می‌شوند و مطالب از این موضوع خارج می‌شوند." : "مطالب مرتبط از این موضوع خارج می‌شوند.",
      onConfirm: () => {
        s.deleteCategory(c.id);
        notify("موضوع حذف شد.", "success");
      },
    });

  const row = (c: Category, child: boolean) => (
    <div key={c.id} className={`flex items-center gap-2 px-3 py-2.5 ${child ? "pr-8 bg-ink-50/40" : ""}`}>
      {child ? <CornerDownLeft size={12} className="text-ink-300 shrink-0" /> : <FolderTree size={14} className="text-brand-600 shrink-0" />}
      <span className={`flex-1 min-w-0 truncate ${child ? "text-[12.5px] text-ink-700" : "text-[13px] font-medium text-ink-900"}`}>{c.title}</span>
      <span className="text-[11px] text-ink-400 tabular-nums shrink-0">{fa(countOf(c.id))} مورد</span>
      {manage && <RowActions size={13} onEdit={() => setEditing(c)} onDelete={() => remove(c)} />}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {ENTITIES.map((e) => (
          <button key={e} onClick={() => setEntity(e)} className={`text-xs px-3 py-1.5 rounded-lg border ${entity === e ? "bg-brand-50 border-brand-300 text-brand-700 font-medium" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
            {entityLabel[e]}
            <span className="text-[10px] text-ink-400 mr-1">{fa(s.categoriesOf(e).length)}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] gap-4">
        <div className="card overflow-hidden self-start">
          <div className="px-3 py-2.5 border-b border-ink-100 text-xs text-ink-500">
            موضوع‌های «{entityLabel[entity]}» <span dir="ltr" className="text-ink-400">({entity})</span>
          </div>
          {cats.length === 0 ? (
            <p className="text-xs text-ink-400 p-4">هنوز موضوعی برای این بخش تعریف نشده است.</p>
          ) : (
            <div className="divide-y divide-ink-100">{roots.flatMap((r) => [row(r, false), ...kidsOf(r.id).map((c) => row(c, true))])}</div>
          )}
        </div>

        {manage && (
          <div className="card p-4 space-y-3 self-start">
            <p className="text-sm font-bold text-ink-900">موضوع جدید</p>
            <Field label="عنوان (title)">
              <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="مثلاً: نوآوری" />
            </Field>
            <Field label="والد (parent_id) — اختیاری">
              <select className="input-field" value={parent} onChange={(e) => setParent(e.target.value)}>
                <option value="">— سطح اول —</option>
                {roots.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </Field>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={add}>
              افزودن موضوع
            </Button>
          </div>
        )}
      </div>

      {editing && <EditCategory cat={editing} options={kidsOf(editing.id).length ? [] : roots.filter((r) => r.id !== editing.id)} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditCategory({ cat, options, onClose }: { cat: Category; options: Category[]; onClose: () => void }) {
  const { saveCategory } = useSocial();
  const { notify } = useToast();
  const [title, setTitle] = useState(cat.title);
  const [parent, setParent] = useState(cat.parent_id ?? "");
  const [error, setError] = useState("");
  const submit = () => {
    const r = saveCategory({ id: cat.id, entity_name: cat.entity_name, title, parent_id: parent || null });
    if (!r.ok) return setError(r.error);
    notify("موضوع ویرایش شد.", "success");
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="ویرایش موضوع" description={`PATCH /core/categories/${cat.entity_name}/${cat.id}/`}>
      <div className="space-y-3">
        <Field label="عنوان (title)">
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="والد (parent_id)">
          <select className="input-field" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">— سطح اول —</option>
            {options.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" onClick={submit}>
            ذخیره
          </Button>
        </div>
      </div>
    </Modal>
  );
}
