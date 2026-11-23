// ---------------------------------------------------------------------------
// «سوالات متداول» — ماژول واقعی /social/faqs/ (FaqStoreSerializer: question، answer، category_ids،
// tags، is_draft، is_public، published_date/time، send_notification) با چیدمان v6.8 (06_qa_faq):
// آکاردئون با نشان دسته + دیالوگ «افزودن» (پرسش، پاسخ کوتاه). دسته‌ها از /social/categories/faq/.
// همین فهرست (فقط منتشرشده و عمومی) در سایت عمومی /public/faqs هم نمایش داده می‌شود (PublicFaqList).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircleQuestion, Plus, ChevronDown, Pencil, Trash2, Eye, Globe2, EyeOff, Send } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import Tabs from "../../components/ui/Tabs";
import FilterBar from "../../components/ui/FilterBar";
import EmptyState from "../../components/ui/EmptyState";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import type { Faq } from "../../social/types";
import { ApiChip, CategoryPicker, Field, TagInput, fa, stamp } from "./kit";

type View = "published" | "drafts";

/** مدیر سوالات متداول (social.faq.faq.create/update/publish) — تا افزوده شدن مجوز faq.* در کاتالوگ، ناظر پرسش و پاسخ یا راهبر شبکه اجتماعی */
function useFaqManager() {
  const { hasPermission } = useTenancy();
  return hasPermission("faq.manage") || hasPermission("faq.create") || hasPermission("forum.moderate") || hasPermission("social.settings");
}

/** یک ردیف آکاردئون */
function FaqRow({ f, open, onToggle, manager, onEdit, onDelete, onPublish }: { f: Faq; open: boolean; onToggle: () => void; manager?: boolean; onEdit?: () => void; onDelete?: () => void; onPublish?: (on: boolean) => void }) {
  const s = useSocial();
  const live = f.is_public && !f.is_draft;
  return (
    <li id={`faq-${f.id}`} className="border-b border-[var(--color-border)] last:border-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-start gap-3 px-5 py-3.5 text-right hover:bg-ink-50 max-sm:px-3">
        <ChevronDown size={18} strokeWidth={1.5} className={`shrink-0 mt-0.5 text-ink-400 transition-transform ${open ? "rotate-180 text-teal-700" : ""}`} />
        <span className="flex-1 min-w-0">
          <span className={`block text-[14px] leading-6 ${open ? "font-bold text-ink-900" : "font-medium text-ink-800"}`}>{f.question}</span>
          <span className="flex items-center gap-1.5 flex-wrap mt-1">
            {f.category_ids.map((c) => (
              <Badge key={c} tone="info">
                {s.categoryTitle(c)}
              </Badge>
            ))}
            {manager && !live && <Badge tone={f.is_draft ? "warning" : "neutral"}>{f.is_draft ? "پیش‌نویس" : "منتشرنشده"}</Badge>}
          </span>
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 pr-12 max-sm:px-3 max-sm:pr-10 space-y-3">
          <p className="text-[13.5px] leading-7 text-ink-700 whitespace-pre-wrap">{f.answer}</p>
          {f.tags.length > 0 && <p className="text-[11.5px] text-teal-700">{f.tags.map((t) => `#${t}`).join(" ")}</p>}
          <div className="flex items-center gap-3 flex-wrap text-[11.5px] text-ink-400">
            <span className="flex items-center gap-1">
              <Eye size={12} /> {fa(f.view_count)} بازدید
            </span>
            <span>به‌روزرسانی {stamp(f.updated_at)}</span>
            {manager && (
              <span className="flex items-center gap-1.5 mr-auto">
                {onPublish && (
                  <Button size="sm" variant="ghost" icon={live ? <EyeOff size={13} /> : <Send size={13} />} onClick={() => onPublish(!live)}>
                    {live ? "لغو انتشار" : "انتشار"}
                  </Button>
                )}
                {onEdit && (
                  <Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={onEdit}>
                    ویرایش
                  </Button>
                )}
                {onDelete && <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} className="!text-rose-600" onClick={onDelete} aria-label="حذف" />}
              </span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** دیالوگ «افزودن / ویرایش» — FaqStoreSerializer */
function FaqDialog({ faq, onClose }: { faq: Faq | null; onClose: () => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [cats, setCats] = useState<string[]>(faq?.category_ids ?? []);
  const [tags, setTags] = useState<string[]>(faq?.tags ?? []);
  const [isPublic, setIsPublic] = useState(faq ? faq.is_public || faq.is_draft : true);
  const [error, setError] = useState("");
  const save = (draft: boolean) => {
    const r = s.saveFaq({ id: faq?.id, question, answer, category_ids: cats, tags, is_draft: draft, is_public: isPublic, send_notification: false });
    if (!r.ok) return setError(r.error);
    notify(draft ? "سؤال به‌صورت پیش‌نویس ذخیره شد." : faq ? "سؤال ویرایش شد." : "سؤال منتشر شد.", { tone: "success" });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={faq ? "ویرایش سؤال متداول" : "افزودن سؤال متداول"}
      description={faq ? "PATCH /social/faqs/{id}/" : "POST /social/faqs/"}
      wide
      footer={
        <>
          <Button variant="primary" onClick={() => save(false)}>
            {faq && !faq.is_draft ? "ذخیره" : "انتشار"}
          </Button>
          <Button variant="outline" onClick={() => save(true)}>
            ذخیره‌ی پیش‌نویس
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="پرسش (question)">
          <input className="input-field" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="مثلاً: چطور برای جلسه‌ی جدید زمان ثبت کنم؟" autoFocus />
        </Field>
        <Field label="پاسخ کوتاه (answer)">
          <textarea className="input-field min-h-[120px]" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </Field>
        <CategoryPicker entity="faq" value={cats} onChange={setCats} />
        <Field label="برچسب‌ها (tags)">
          <TagInput value={tags} onChange={setTags} />
        </Field>
        <label className="flex items-center justify-between gap-2 text-[13px] text-ink-700">
          <span className="flex items-center gap-1.5">
            <Globe2 size={15} /> نمایش در سایت عمومی (is_public)
          </span>
          <Toggle on={isPublic} onChange={() => setIsPublic((v) => !v)} />
        </label>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

export default function FaqPage() {
  const s = useSocial();
  const manager = useFaqManager();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [params] = useSearchParams();
  const [view, setView] = useState<View>("published");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [openId, setOpenId] = useState<string | null>(params.get("q"));
  const [editing, setEditing] = useState<Faq | null | "new">(null);

  // پیوند مستقیم ?q=<id> همان سؤال را باز می‌کند
  useEffect(() => {
    const id = params.get("q");
    if (id) {
      setOpenId(id);
      window.setTimeout(() => document.getElementById(`faq-${id}`)?.scrollIntoView({ block: "center" }), 60);
    }
  }, [params]);

  const live = (f: Faq) => !f.deleted_at && f.is_public && !f.is_draft;
  const all = s.faqs.filter((f) => !f.deleted_at && (manager || live(f)));
  const drafts = all.filter((f) => !live(f));
  const cats = s.categoriesOf("faq");
  const pool = view === "drafts" ? drafts : all.filter(live);
  const term = q.trim();
  const list = useMemo(
    () =>
      pool
        .filter((f) => (cat === "all" || f.category_ids.includes(cat)) && (!term || f.question.includes(term) || f.answer.includes(term) || f.tags.some((t) => t.includes(term.replace(/^#/, "")))))
        .sort((a, b) => b.view_count - a.view_count || (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, cat, term]
  );

  const toggle = (f: Faq) => {
    if (openId === f.id) return setOpenId(null);
    setOpenId(f.id);
    s.viewFaq(f.id);
  };

  return (
    <div>
      <PageHeader
        title="سوالات متداول"
        description="پاسخ کوتاه به پرتکرارترین پرسش‌ها"
        icon={<MessageCircleQuestion size={20} />}
        tabs={
          manager ? (
            <Tabs<View>
              tabs={[
                { id: "published", label: "منتشرشده", count: all.filter(live).length },
                { id: "drafts", label: "پیش‌نویس و منتشرنشده", count: drafts.length },
              ]}
              active={view}
              onChange={setView}
            />
          ) : undefined
        }
        actions={
          <span className="flex items-center gap-2">
            <ApiChip
              items={[
                { label: "فهرست سوالات (مدیر)", ep: endpoints.faqList() },
                { label: "سوالات منتشرشده (عمومی)", ep: endpoints.faqPublished() },
                { label: "پیش‌نویس‌ها", ep: endpoints.faqDrafts() },
                { label: "دسته‌ها", ep: endpoints.categories("faq") },
                { label: "افزودن", ep: endpoints.faqCreate() },
                { label: "ویرایش", ep: endpoints.faqUpdate("{id}") },
                { label: "انتشار", ep: endpoints.faqPublish("{id}") },
                { label: "لغو انتشار", ep: endpoints.faqUnpublish("{id}") },
                { label: "حذف", ep: endpoints.faqDelete("{id}") },
              ]}
            />
            {manager && (
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditing("new")}>
                افزودن
              </Button>
            )}
          </span>
        }
      />

      <div className="card">
        <FilterBar
          pills={[{ id: "all", label: "همه", count: pool.length }, ...cats.map((c) => ({ id: c.id, label: c.title, count: pool.filter((f) => f.category_ids.includes(c.id)).length }))]}
          active={cat}
          onPill={setCat}
          search={q}
          onSearch={setQ}
          searchPlaceholder="جستجو در پرسش‌ها و پاسخ‌ها…"
        />
        {list.length === 0 ? (
          <div className="py-10">
            <EmptyState icon={<MessageCircleQuestion size={22} />} title={term || cat !== "all" ? "سؤالی پیدا نشد" : view === "drafts" ? "پیش‌نویسی نیست" : "هنوز سؤال متداولی منتشر نشده"} />
          </div>
        ) : (
          <ul>
            {list.map((f) => (
              <FaqRow
                key={f.id}
                f={f}
                open={openId === f.id}
                onToggle={() => toggle(f)}
                manager={manager}
                onEdit={() => setEditing(f)}
                onPublish={(on) => {
                  s.publishFaq(f.id, on);
                  notify(on ? "سؤال منتشر شد." : "انتشار سؤال لغو شد.", { tone: "success" });
                }}
                onDelete={() =>
                  confirm({
                    title: "این سؤال حذف شود؟",
                    message: f.question,
                    confirmLabel: "حذف",
                    onConfirm: () => {
                      s.deleteFaq(f.id);
                      notify("سؤال حذف شد.", { tone: "success" });
                    },
                  })
                }
              />
            ))}
          </ul>
        )}
      </div>

      {editing && <FaqDialog faq={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** سایت عمومی (/public/faqs) — فقط سوالات منتشرشده و عمومی (GET /social/faqs/published/) */
export function PublicFaqList() {
  const s = useSocial();
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const term = q.trim();
  const list = s.faqs
    .filter((f) => !f.deleted_at && f.is_public && !f.is_draft && (!term || f.question.includes(term) || f.answer.includes(term)))
    .sort((a, b) => b.view_count - a.view_count);
  return (
    <div className="card">
      <FilterBar search={q} onSearch={setQ} searchPlaceholder="جستجو در سوالات متداول…" />
      {list.length === 0 ? (
        <div className="py-10">
          <EmptyState icon={<MessageCircleQuestion size={22} />} title="سؤالی پیدا نشد" />
        </div>
      ) : (
        <ul>
          {list.map((f) => (
            <FaqRow key={f.id} f={f} open={openId === f.id} onToggle={() => setOpenId(openId === f.id ? null : f.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
