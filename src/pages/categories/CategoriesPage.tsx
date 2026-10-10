// ---------------------------------------------------------------------------
// «دسته‌بندی‌ها» (منوی دانش و محتوا) — مدیریت درخت دسته‌بندی هر بخش، دقیقاً مطابق Motoshub Social API:
//   GET/POST  /core/categories/{entity_name}/          ← فهرست / ساخت ({"title": "…", "parent_id": …})
//   GET/PATCH/DELETE /core/categories/{entity_name}/{id}/
//   فیلدها: id, title, entity_name, parent_id, parent, created_at, updated_at
// خواندن: دارندگان هر مجوز مدیریتی (*.manage) · ساخت/تغییر نام/جابه‌جایی/حذف: taxonomy.manage
// حذفِ دسته‌ی در حال استفاده مسدود است (اول مطالب به دسته‌ی دیگری منتقل شوند)؛ زیرشاخه‌ها به والد بالاتر می‌روند.
// ---------------------------------------------------------------------------
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft, CornerDownLeft, FolderInput, FolderPlus, FolderTree, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Drawer from "../../components/ui/Drawer";
import Tabs from "../../components/ui/Tabs";
import EmptyState from "../../components/ui/EmptyState";
import AccessDenied from "../../components/ui/AccessDenied";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import type { Category, EntityName } from "../../social/types";
import { emitSettingsChange } from "../../iam/settingsAudit";
import { MANAGE_PERMS } from "../../components/Sidebar";
import { ApiChip, Field, fa } from "../social/kit";

const ENTITIES: { id: EntityName; label: string }[] = [
  { id: "news", label: "خبر" },
  { id: "blog", label: "بلاگ" },
  { id: "magazine", label: "مجله" },
  { id: "media", label: "رسانه" },
  { id: "event", label: "رویداد" },
  { id: "topic", label: "پرسش و پاسخ" },
];
type Use = { id: string; title: string; to: string; category_ids: string[] };

/** آیتم‌های هر بخش که دسته‌بندی دارند (همه‌ی آیتم‌های حذف‌نشده — مبنای شمارش و قفل حذف) */
function useEntityItems(entity: EntityName): Use[] {
  const s = useSocial();
  return useMemo(() => {
    const live = <T extends { deleted_at: string | null }>(xs: T[]) => xs.filter((x) => !x.deleted_at);
    switch (entity) {
      case "news":
      case "blog":
      case "magazine": {
        const kind = entity === "news" ? "news" : entity === "blog" ? "blogs" : "magazines";
        const base = entity === "news" ? "news" : entity === "blog" ? "blog" : "magazines";
        return live(s.content.filter((c) => c.kind === kind)).map((c) => ({ id: c.id, title: c.title, to: `/dashboard/${base}/${c.id}`, category_ids: c.category_ids }));
      }
      case "media":
        return live(s.media).map((m) => ({ id: m.id, title: m.caption || "رسانه", to: `/dashboard/media/${m.id}`, category_ids: m.category_ids }));
      case "event":
        return live(s.events).map((e) => ({ id: e.id, title: e.title, to: `/dashboard/events/${e.id}`, category_ids: e.category_ids }));
      case "topic":
        return live(s.topics).map((t) => ({ id: t.id, title: t.title, to: `/dashboard/forum/${t.id}`, category_ids: t.category_ids }));
      default:
        return [];
    }
  }, [s.content, s.media, s.events, s.topics, entity]);
}

export default function CategoriesPage() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canRead = MANAGE_PERMS.some((p) => hasPermission(p));
  const manage = hasPermission("taxonomy.manage");
  const [entity, setEntity] = useState<EntityName>("news");
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [form, setForm] = useState<{ mode: "create" | "rename" | "move"; cat?: Category; parent: string; title: string } | null>(null);
  const [detail, setDetail] = useState<Category | null>(null);
  const [blocked, setBlocked] = useState<{ cat: Category; uses: Use[] } | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const items = useEntityItems(entity);

  const cats = s.categoriesOf(entity);
  const byId = new Map(cats.map((c) => [c.id, c]));
  const kidsOf = (id: string | null) => cats.filter((c) => (id ? c.parent_id === id : !c.parent_id || !byId.has(c.parent_id))).sort((a, b) => a.title.localeCompare(b.title, "fa"));
  const descendants = (id: string): string[] => kidsOf(id).flatMap((k) => [k.id, ...descendants(k.id)]);
  const usesOf = (id: string) => items.filter((x) => x.category_ids.includes(id));
  /** شمار موارد خود دسته + زیرشاخه‌ها */
  const totalOf = (id: string) => new Set([id, ...descendants(id)].flatMap((c) => usesOf(c).map((u) => u.id))).size;
  const pathOf = (c: Category): string => {
    const seen = new Set<string>();
    const parts = [c.title];
    let p = c.parent_id ? byId.get(c.parent_id) : undefined;
    while (p && !seen.has(p.id)) {
      seen.add(p.id);
      parts.unshift(p.title);
      p = p.parent_id ? byId.get(p.parent_id) : undefined;
    }
    return parts.join(" › ");
  };

  // جستجو: دسته‌های منطبق + اجدادشان دیده می‌شوند
  const term = q.trim();
  const shown = useMemo(() => {
    if (!term) return null;
    const keep = new Set<string>();
    cats.forEach((c) => {
      if (!c.title.includes(term)) return;
      let cur: Category | undefined = c;
      while (cur && !keep.has(cur.id)) {
        keep.add(cur.id);
        cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
      }
    });
    return keep;
  }, [term, cats]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!canRead) return <AccessDenied module="دسته‌بندی‌ها" />;

  const audit = (summary: string, before?: Record<string, unknown>, after?: Record<string, unknown>) => emitSettingsChange({ area: "دسته‌بندی‌ها", summary, before, after });

  const submit = () => {
    if (!form) return;
    if (form.mode === "create") {
      const r = s.saveCategory({ entity_name: entity, title: form.title, parent_id: form.parent || null });
      if (!r.ok) return notify(r.error, "warning");
      audit(`ساخت دسته‌بندی «${form.title.trim()}» در بخش ${entity}`, undefined, { title: form.title.trim(), entity_name: entity, parent_id: form.parent || null });
      notify("دسته‌بندی با موفقیت ایجاد شد", "success");
    } else if (form.cat) {
      const c = form.cat;
      const parent_id = form.mode === "move" ? form.parent || null : c.parent_id;
      const title = form.mode === "rename" ? form.title : c.title;
      if (form.mode === "rename" && cats.some((x) => x.id !== c.id && x.parent_id === c.parent_id && x.title.trim() === title.trim())) return notify("دسته‌ای با همین عنوان در همین سطح وجود دارد.", "warning");
      const r = s.saveCategory({ id: c.id, entity_name: c.entity_name, title, parent_id });
      if (!r.ok) return notify(r.error, "warning");
      audit(form.mode === "rename" ? `تغییر نام دسته‌بندی «${c.title}»` : `جابه‌جایی دسته‌بندی «${c.title}»`, { title: c.title, parent_id: c.parent_id }, { title: title.trim(), parent_id });
      notify(form.mode === "rename" ? "نام دسته‌بندی ذخیره شد." : "دسته‌بندی جابه‌جا شد.", "success");
    }
    setForm(null);
  };

  const remove = (c: Category) => {
    const uses = usesOf(c.id);
    if (uses.length) return setBlocked({ cat: c, uses });
    const kids = kidsOf(c.id);
    confirm({
      title: `دسته‌بندی «${c.title}» حذف شود؟`,
      message: kids.length ? `${fa(kids.length)} زیرشاخه‌ی آن به «${c.parent_id ? byId.get(c.parent_id)?.title ?? "سطح اول" : "سطح اول"}» منتقل می‌شوند.` : "این دسته‌بندی در هیچ مطلبی استفاده نشده است.",
      confirmLabel: "حذف",
      onConfirm: () => {
        kids.forEach((k) => s.saveCategory({ id: k.id, entity_name: k.entity_name, title: k.title, parent_id: c.parent_id }));
        s.deleteCategory(c.id);
        audit(`حذف دسته‌بندی «${c.title}» از بخش ${entity}`, { id: c.id, title: c.title }, undefined);
        notify("دسته‌بندی حذف شد.", "success");
      },
    });
  };

  const toggle = (id: string) => setCollapsed((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));

  const renderNode = (c: Category, depth: number) => {
    if (shown && !shown.has(c.id)) return null;
    const kids = kidsOf(c.id);
    const open = !!shown || !collapsed.includes(c.id);
    const own = usesOf(c.id).length;
    const total = totalOf(c.id);
    return (
      <div key={c.id}>
        <div className="group flex items-center gap-1.5 px-2 py-2 hover:bg-ink-50/70" style={{ paddingInlineStart: 8 + depth * 18 }}>
          {kids.length ? (
            <button onClick={() => toggle(c.id)} aria-label={open ? "بستن زیرشاخه‌ها" : "باز کردن زیرشاخه‌ها"} aria-expanded={open} className="w-5 h-5 flex items-center justify-center text-ink-400 hover:text-ink-700 shrink-0">
              {open ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
            </button>
          ) : (
            <span className="w-5 flex justify-center shrink-0 text-ink-300">{depth ? <CornerDownLeft size={12} /> : <FolderTree size={13} className="text-brand-600" />}</span>
          )}
          <button onClick={() => setDetail(c)} className={`flex-1 min-w-0 text-start truncate ${depth ? "text-[12.5px] text-ink-700" : "text-[13px] font-medium text-ink-900"} hover:text-brand-700`}>
            {term && c.title.includes(term) ? <mark className="bg-amber-100 text-ink-900 rounded px-0.5">{c.title}</mark> : c.title}
          </button>
          <span className="text-[11px] text-ink-400 tabular-nums shrink-0" title={kids.length ? `${fa(own)} مستقیم · ${fa(total)} با زیرشاخه‌ها` : undefined}>
            {fa(total)} مورد
          </span>
          {manage && (
            <span className="flex items-center shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              <IconBtn label="زیرشاخه‌ی جدید" onClick={() => setForm({ mode: "create", parent: c.id, title: "" })}>
                <FolderPlus size={13} />
              </IconBtn>
              <IconBtn label="تغییر نام" onClick={() => setForm({ mode: "rename", cat: c, parent: c.parent_id ?? "", title: c.title })}>
                <Pencil size={13} />
              </IconBtn>
              <IconBtn label="جابه‌جایی" onClick={() => setForm({ mode: "move", cat: c, parent: c.parent_id ?? "", title: c.title })}>
                <FolderInput size={13} />
              </IconBtn>
              <IconBtn label="حذف" danger onClick={() => remove(c)}>
                <Trash2 size={13} />
              </IconBtn>
            </span>
          )}
        </div>
        {open && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  const roots = kidsOf(null);
  // گزینه‌های والد: همه‌ی دسته‌های همین بخش جز خودش و نوادگانش (جلوگیری از چرخه)
  const parentOptions = form?.cat ? cats.filter((c) => c.id !== form.cat!.id && !descendants(form.cat!.id).includes(c.id)) : cats;
  const apiItems = [
    { label: "فهرست دسته‌بندی‌های بخش", ep: endpoints.categories(entity) },
    { label: "جزئیات یک دسته‌بندی", ep: { method: "GET" as const, path: `/core/categories/${entity}/{id}/` } },
    ...(manage
      ? [
          { label: "ساخت دسته‌بندی", ep: endpoints.categoryCreate(entity) },
          { label: "تغییر نام / جابه‌جایی", ep: endpoints.categoryUpdate(entity, "{id}") },
          { label: "حذف دسته‌بندی", ep: endpoints.categoryDelete(entity, "{id}") },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="دسته‌بندی‌ها"
        description="درخت دسته‌بندی هر بخش محتوایی؛ نویسندگان هنگام انتشار از همین فهرست انتخاب می‌کنند."
        icon={<FolderTree size={18} />}
        actions={
          <>
            <ApiChip items={apiItems} />
            {manage && (
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setForm({ mode: "create", parent: "", title: "" })}>
                دسته‌بندی جدید
              </Button>
            )}
          </>
        }
      />
      <Tabs<EntityName> tabs={ENTITIES.map((e) => ({ id: e.id, label: e.label, count: s.categoriesOf(e.id).length }))} active={entity} onChange={(e) => (setEntity(e), setQ(""))} />

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-ink-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی دسته‌بندی…" aria-label="جستجوی دسته‌بندی" className="input-field ps-8 pe-8" />
            {q && (
              <button onClick={() => setQ("")} aria-label="پاک کردن جستجو" className="absolute end-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
                <X size={13} />
              </button>
            )}
          </div>
          <span className="text-[11px] text-ink-400 ms-auto whitespace-nowrap">
            {fa(cats.length)} دسته · {fa(items.filter((x) => x.category_ids.some((id) => byId.has(id))).length)} مطلب دسته‌بندی‌شده
          </span>
        </div>
        {cats.length === 0 ? (
          <EmptyState icon={<FolderTree size={22} />} title="هنوز دسته‌بندی‌ای برای این بخش تعریف نشده است" description={manage ? "با «دسته‌بندی جدید» اولین دسته را بسازید." : "مدیر محتوا می‌تواند دسته‌بندی تعریف کند."} />
        ) : shown && shown.size === 0 ? (
          <p className="text-xs text-ink-400 p-4">دسته‌ای با «{term}» پیدا نشد.</p>
        ) : (
          <div className="divide-y divide-ink-100">{roots.map((r) => renderNode(r, 0))}</div>
        )}
      </div>
      {!manage && <p className="text-[11.5px] text-ink-400 mt-2">فقط‌خواندنی — ساخت و ویرایش دسته‌بندی با مجوز «مدیریت هشتگ‌ها و موضوعات» (taxonomy.manage) است.</p>}

      {/* ساخت / تغییر نام / جابه‌جایی */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === "create" ? "دسته‌بندی جدید" : form?.mode === "rename" ? "تغییر نام دسته‌بندی" : "جابه‌جایی دسته‌بندی"}
        description={form?.mode === "create" ? `POST /core/categories/${entity}/` : `PATCH /core/categories/${entity}/${form?.cat?.id}/`}
      >
        {form && (
          <div className="space-y-3">
            {form.mode !== "move" && (
              <Field label="عنوان (title)">
                <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="مثلاً: انرژی‌های تجدیدپذیر" autoFocus />
              </Field>
            )}
            {form.mode !== "rename" && (
              <Field label="والد (parent_id)" hint={form.mode === "move" ? "زیرشاخه‌ها همراه دسته جابه‌جا می‌شوند." : "خالی = سطح اول"}>
                <select className="input-field" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
                  <option value="">— سطح اول —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {pathOf(c)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setForm(null)}>انصراف</Button>
              <Button variant="primary" onClick={submit} disabled={form.mode !== "move" && !form.title.trim()}>
                {form.mode === "create" ? "ایجاد" : "ذخیره"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* حذف مسدود: دسته در حال استفاده */}
      <Modal open={!!blocked} onClose={() => setBlocked(null)} title={`حذف «${blocked?.cat.title ?? ""}» ممکن نیست`} description="این دسته‌بندی روی مطالب زیر ثبت شده است؛ ابتدا دسته‌ی آن‌ها را عوض کنید یا این دسته را تغییر نام دهید.">
        {blocked && (
          <div className="space-y-3">
            <ul className="max-h-64 overflow-y-auto divide-y divide-ink-100 border border-ink-100 rounded-lg">
              {blocked.uses.map((u) => (
                <li key={u.id}>
                  <Link to={u.to} className="block px-3 py-2 text-[12.5px] text-ink-700 hover:bg-ink-50 hover:text-brand-700 truncate">
                    {u.title}
                  </Link>
                </li>
              ))}
            </ul>
            {manage && (
              <div className="rounded-lg bg-ink-50 border border-ink-100 p-3 space-y-2">
                <p className="text-[12px] text-ink-700">یا همه‌ی این مطالب را به دسته‌ی دیگری منتقل کنید و سپس این دسته حذف شود:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select className="input-field !w-auto flex-1 min-w-[160px]" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="دسته‌ی مقصد">
                    <option value="">انتخاب دسته‌ی مقصد…</option>
                    {cats
                      .filter((c) => c.id !== blocked.cat.id && !descendants(blocked.cat.id).includes(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parent_id ? `↳ ${c.title}` : c.title}
                        </option>
                      ))}
                  </select>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!moveTo}
                    onClick={() => {
                      const c = blocked.cat;
                      const r = s.reassignCategory(c.id, moveTo);
                      if (!r.ok) return notify(r.error, "warning");
                      kidsOf(c.id).forEach((k) => s.saveCategory({ id: k.id, entity_name: k.entity_name, title: k.title, parent_id: c.parent_id }));
                      s.deleteCategory(c.id);
                      const target = byId.get(moveTo)?.title ?? "";
                      audit(`انتقال ${fa(r.moved ?? 0)} مطلب از «${c.title}» به «${target}» و حذف دسته‌بندی`, { id: c.id, title: c.title }, { moved_to: moveTo, moved: r.moved });
                      notify(`${fa(r.moved ?? 0)} مطلب به «${target}» منتقل و دسته‌بندی حذف شد.`, "success");
                      setMoveTo("");
                      setBlocked(null);
                    }}
                  >
                    انتقال آیتم‌ها و حذف
                  </Button>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setBlocked(null)}>متوجه شدم</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* جزئیات (همان پاسخ GET /core/categories/{entity}/{id}/) */}
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ""}>
        {detail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
              {[
                ["id", detail.id],
                ["title", detail.title],
                ["entity_name", detail.entity_name],
                ["parent_id", detail.parent_id ?? "null"],
                ["parent", detail.parent_id ? byId.get(detail.parent_id)?.title ?? "—" : "null"],
                ["created_at", detail.created_at],
                ["updated_at", detail.updated_at],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt dir="ltr" className="font-mono text-[11px] text-ink-400">{k}</dt>
                  <dd className="text-ink-800 truncate">{v}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="text-[12px] font-bold text-ink-600 mb-1.5">مطالب این دسته ({fa(usesOf(detail.id).length)})</p>
              {usesOf(detail.id).length ? (
                <ul className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
                  {usesOf(detail.id).map((u) => (
                    <li key={u.id}>
                      <Link to={u.to} className="block px-3 py-2 text-[12.5px] text-ink-700 hover:bg-ink-50 hover:text-brand-700 truncate">
                        {u.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11.5px] text-ink-400">هنوز مطلبی در این دسته نیست.</p>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={`w-7 h-7 rounded-md flex items-center justify-center text-ink-400 ${danger ? "hover:text-rose-600 hover:bg-rose-50" : "hover:text-brand-700 hover:bg-ink-100"}`}>
      {children}
    </button>
  );
}
