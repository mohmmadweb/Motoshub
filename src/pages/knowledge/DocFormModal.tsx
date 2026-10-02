import { useEffect, useState } from "react";
import { Send, Save, X, FileUp, PenSquare, ShieldCheck, ChevronDown, ChevronUp, LayoutTemplate, BadgeCheck, Plus } from "lucide-react";
import Toggle from "../../components/ui/Toggle";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { isCircularType, templateForType } from "../../km/templates";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { users } from "../../data/mock";
import type { Scoped } from "../../data/tenancy";
import { addDays } from "../../pm/jalali";
import { accessLevels, type AccessLevel, type KAcl, type KAudienceEntry, type KDoc, type KFile } from "../../km/types";
import { Field, FilePicker } from "./shared";
import { MarkdownEditor } from "./Markdown";
import { AclEditor, AccessSummary } from "./AccessEditor";

type Draft = {
  title: string;
  description: string;
  type: string;
  categoryId: string;
  tags: string[];
  unit: string;
  owner: string;
  access: AccessLevel;
  importance: KDoc["importance"];
  approvers: string[];
  reviewDate: string;
  files: KFile[];
  format: "file" | "article";
  body: string;
  acl?: KAcl;
};
/** ابلاغ: مخاطبان، مهلت و نیاز به «خواندم و پذیرفتم» */
type CircularDraft = { on: boolean; audience: KAudienceEntry[]; deadline: string };

/** ثبت سند جدید (چند فایل) یا ویرایش اطلاعات سند موجود */
export default function DocFormModal({ open, doc, onClose, defaultCategory }: { open: boolean; doc?: KDoc | null; onClose: () => void; defaultCategory?: string }) {
  const km = useKnowledge();
  const { notify } = useToast();
  const { defaultScopeForNew, actingUser, hasPermission } = useTenancy();
  const [d, setD] = useState<Draft | null>(null);
  const [scope, setScope] = useState<Scoped>({ scope: "سراسری" });
  const [tagInput, setTagInput] = useState("");
  const [aclOpen, setAclOpen] = useState(false);
  const [circ, setCirc] = useState<CircularDraft>({ on: false, audience: [], deadline: "" });
  const confirm = useConfirm();

  useEffect(() => {
    if (!open) return;
    if (doc) {
      setD({ title: doc.title, description: doc.description, type: doc.type, categoryId: doc.categoryId, tags: doc.tags, unit: doc.unit, owner: doc.owner, access: doc.access, importance: doc.importance, approvers: doc.approvers, reviewDate: doc.reviewDate, files: doc.files, format: doc.format ?? "file", body: doc.body ?? "", acl: doc.acl });
      setAclOpen(!!doc.acl);
      setScope({ scope: doc.scope, holdingId: doc.holdingId, companyId: doc.companyId });
      setCirc({ on: !!doc.circular, audience: doc.circular?.audience ?? [], deadline: doc.circular?.deadline ?? "" });
    } else {
      setD({
        title: "",
        description: "",
        type: km.docTypes[0]?.name ?? "سایر",
        categoryId: defaultCategory || km.categories.find((c) => c.parentId)?.id || km.categories[0]?.id || "",
        tags: [],
        unit: km.settings.units[0] ?? "",
        owner: actingUser.name,
        access: "داخلی",
        importance: "عادی",
        approvers: km.settings.defaultApprovers,
        reviewDate: addDays(km.today, km.settings.reviewPeriodDays),
        files: [],
        format: "file",
        body: "",
        acl: undefined,
      });
      setAclOpen(false);
      setScope(defaultScopeForNew());
      setCirc({ on: false, audience: [], deadline: "" });
    }
    setTagInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc?.id]);

  if (!d) return null;

  const setFiles = (files: KFile[]) => setD({ ...d, files, title: d.title || (files[0]?.name.replace(/\.[^.]+$/, "") ?? "") });
  const addTag = (t: string) => {
    const v = t.trim();
    if (v && !d.tags.includes(v)) setD({ ...d, tags: [...d.tags, v] });
    setTagInput("");
  };

  const submit = (sendForReview: boolean) => {
    if (!d.title.trim()) return notify("عنوان سند الزامی است.", "warning");
    if (!doc && d.format === "file" && !d.files.length) return notify("حداقل یک فایل پیوست کنید.", "warning");
    if (d.format === "article" && !d.body.trim()) return notify("متن مقاله را بنویسید.", "warning");
    if (!d.description.trim()) return notify("توضیح سند الزامی است.", "warning");
    const { body, format, ...meta } = d;
    // ابلاغ (فقط بخشنامه/دستورالعمل/آیین‌نامه) — تأییدهای قبلی حفظ می‌شود
    const circular = isCircularType(d.type) && circ.on ? { audience: circ.audience, deadline: circ.deadline || null, acks: doc?.circular?.acks ?? {}, lastReminderAt: doc?.circular?.lastReminderAt ?? null } : null;
    if (doc) {
      km.updateDoc(doc.id, { ...meta, format, title: d.title.trim(), ...scope, circular });
      // تغییر متن مقاله = نسخه‌ی جدید (برای تاریخچه و مقایسه‌ی متنی)
      if (format === "article" && body !== (doc.body ?? "")) km.newVersion(doc.id, [], "ویرایش متن مقاله", body);
      notify(format === "article" && body !== (doc.body ?? "") ? "تغییرات ذخیره و نسخه‌ی جدید متن ثبت شد." : "اطلاعات سند ذخیره شد.");
    } else {
      const skipReview = !km.settings.workflowSteps.review;
      km.createDoc({ ...meta, format, body: format === "article" ? body : undefined, title: d.title.trim(), relations: [], ...scope, authorId: actingUser.id, circular, submit: sendForReview && !skipReview });
      notify(sendForReview ? (skipReview ? "سند ثبت شد." : `سند ثبت و برای بررسی به ${d.approvers.length.toLocaleString("fa-IR")} نفر ارسال شد.`) : "پیش‌نویس سند ذخیره شد.");
    }
    onClose();
  };

  const leaves = km.categories.filter((c) => c.parentId || !km.categories.some((x) => x.parentId === c.id));
  // قالب مقاله‌ی نوع سند (هدف، دامنه، تعاریف، مسئولیت‌ها، روش اجرا…)
  const tpl = templateForType(d.type, km.settings.docTemplates);
  const insertTemplate = () => {
    if (!tpl) return;
    if (!d.body.trim()) return setD({ ...d, body: tpl });
    confirm({ title: `جایگزینی متن با قالب «${d.type}»؟`, message: "متن فعلی مقاله با قالب جایگزین می‌شود.", confirmLabel: "جایگزینی", onConfirm: () => setD({ ...d, body: tpl }) });
  };

  return (
    <Modal open={open} onClose={onClose} title={doc ? "ویرایش اطلاعات سند" : "افزودن سند به مخزن دانش"} description={doc ? `${doc.code} · نسخه‌ی ${doc.version.toLocaleString("fa-IR")}${(doc.format ?? "file") === "file" ? " — برای تغییر فایل، «نسخه‌ی جدید» بارگذاری کنید." : ""}` : "فایل بارگذاری کنید یا مقاله را همین‌جا بنویسید؛ سند پس از طی گردش کار منتشر می‌شود."} width="max-w-3xl">
      <div className="space-y-4">
        {!doc && (
          <div className="flex rounded-lg border border-ink-200 overflow-hidden w-fit">
            {(
              [
                ["file", FileUp, "بارگذاری فایل"],
                ["article", PenSquare, "نوشتن مقاله"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button key={id} type="button" onClick={() => setD({ ...d, format: id })} className={`px-3 py-1.5 text-xs flex items-center gap-1.5 ${d.format === id ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}
        {d.format === "article" ? (
          <Field label="متن مقاله" hint={doc ? "با ذخیره‌ی تغییر متن، نسخه‌ی جدید ثبت می‌شود و تفاوت‌ها در «نسخه‌ها» قابل مقایسه است." : undefined}>
            {tpl && (
              <div className="flex items-center gap-2 flex-wrap rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 mb-2 text-[11.5px] text-ink-700">
                <LayoutTemplate size={14} className="text-brand-600 shrink-0" />
                <span className="flex-1 min-w-[160px]">قالب «{d.type}»: {tpl.split("\n").filter((l) => l.startsWith("## ")).slice(0, 5).map((l) => l.replace(/^##\s*[۰-۹\d.]*\s*/, "").replace(/^ماده [۰-۹]+ — /, "")).join("، ")}…</span>
                <Button size="sm" variant={d.body.trim() ? "ghost" : "primary"} onClick={insertTemplate}>
                  {d.body.trim() ? "جایگزینی با قالب" : "شروع با قالب"}
                </Button>
              </div>
            )}
            <MarkdownEditor value={d.body} onChange={(body) => setD({ ...d, body })} />
          </Field>
        ) : (
          !doc && (
            <Field label="فایل‌های سند">
              <FilePicker files={d.files} onChange={setFiles} />
            </Field>
          )
        )}
        {!doc && d.format === "article" && (
          <Field label="پیوست‌ها (اختیاری)">
            <FilePicker files={d.files} onChange={(files) => setD({ ...d, files })} />
          </Field>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Field label="عنوان سند">
              <input className="input-field" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="مثلاً: دستورالعمل ثبت و پیگیری طرح‌های اشتغال خرد" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="توضیحات">
              <textarea className="input-field min-h-[80px]" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="هدف، دامنه‌ی کاربرد و خلاصه‌ی محتوای سند" />
            </Field>
          </div>
          <Field label="نوع سند">
            <select className="input-field" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}>
              {km.docTypes.map((t) => (
                <option key={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="دسته‌بندی">
            <select className="input-field" value={d.categoryId} onChange={(e) => setD({ ...d, categoryId: e.target.value })}>
              {leaves.map((c) => (
                <option key={c.id} value={c.id}>
                  {km.categoryPath(c.id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="واحد سازمانی">
            <select className="input-field" value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value })}>
              {km.settings.units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="مالک / مسئول سند">
            <input className="input-field" list="km-users" value={d.owner} onChange={(e) => setD({ ...d, owner: e.target.value })} />
            <datalist id="km-users">
              {users.map((u) => (
                <option key={u.id} value={u.name} />
              ))}
            </datalist>
          </Field>
          <Field label="سطح دسترسی">
            <select className="input-field" value={d.access} onChange={(e) => setD({ ...d, access: e.target.value as AccessLevel })}>
              {accessLevels.filter((a) => a !== "خیلی محرمانه" || hasPermission("knowledge.confidential")).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="اهمیت">
            <select className="input-field" value={d.importance} onChange={(e) => setD({ ...d, importance: e.target.value as KDoc["importance"] })}>
              {["عادی", "مهم", "حیاتی"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="تاریخ بازبینی بعدی">
            <JalaliDatePicker value={d.reviewDate} onChange={(v) => setD({ ...d, reviewDate: v })} />
          </Field>
          <Field label="تأییدکنندگان">
            <div className="flex flex-wrap gap-1 items-center border border-ink-200 rounded-lg px-2 py-1.5 min-h-[38px]">
              {d.approvers.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 text-[11px] bg-brand-50 text-brand-700 rounded px-1.5 py-0.5">
                  {a}
                  <button type="button" onClick={() => setD({ ...d, approvers: d.approvers.filter((x) => x !== a) })} aria-label={`حذف ${a}`}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <select className="text-[11px] bg-transparent text-ink-500 outline-none" value="" onChange={(e) => e.target.value && setD({ ...d, approvers: [...d.approvers, e.target.value] })} aria-label="افزودن تأییدکننده">
                <option value="">+ افزودن</option>
                {users.filter((u) => !d.approvers.includes(u.name)).map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="برچسب‌ها">
              <div className="flex flex-wrap gap-1 items-center border border-ink-200 rounded-lg px-2 py-1.5">
                {d.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-[11px] bg-ink-100 text-ink-700 rounded px-1.5 py-0.5">
                    #{t}
                    <button type="button" onClick={() => setD({ ...d, tags: d.tags.filter((x) => x !== t) })} aria-label={`حذف ${t}`}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  className="flex-1 min-w-[120px] text-xs outline-none bg-transparent py-0.5"
                  list="km-tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "،" || e.key === ",") {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder="برچسب را بنویسید و Enter بزنید"
                />
                <datalist id="km-tags">
                  {km.settings.tags.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </Field>
          </div>
        </div>
        {isCircularType(d.type) && <CircularBox value={circ} onChange={setCirc} type={d.type} />}
        <div className="rounded-lg border border-ink-200">
          <button type="button" onClick={() => setAclOpen((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-right">
            <ShieldCheck size={15} className="text-brand-600 shrink-0" />
            <span className="text-xs font-medium text-ink-800 flex-1">
              دسترسی جزءبه‌جزء
              <span className="text-ink-400 font-normal mr-1">— {d.acl?.entries.length ? `${d.acl.entries.length.toLocaleString("fa-IR")} ردیف` : "فقط سطح دسترسی"}{d.acl?.viewOnly ? " · فقط مشاهده" : ""}</span>
            </span>
            {aclOpen ? <ChevronUp size={14} className="text-ink-400" /> : <ChevronDown size={14} className="text-ink-400" />}
          </button>
          {aclOpen && (
            <div className="px-3 pb-3 space-y-3 border-t border-ink-100 pt-3">
              <AclEditor value={d.acl} onChange={(acl) => setD({ ...d, acl })} access={d.access} />
              <AccessSummary doc={{ ...(doc ?? ({} as KDoc)), ...d, author: doc?.author ?? actingUser.name, acl: d.acl } as KDoc} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-ink-100 flex-wrap">
          {doc ? (
            <Button variant="primary" icon={<Save size={14} />} onClick={() => submit(false)}>
              ذخیره‌ی تغییرات
            </Button>
          ) : (
            <>
              <Button variant="primary" icon={<Send size={14} />} onClick={() => submit(true)}>
                {km.settings.workflowSteps.review ? "ثبت و ارسال برای بررسی" : "ثبت سند"}
              </Button>
              <Button variant="secondary" icon={<Save size={14} />} onClick={() => submit(false)}>
                ذخیره‌ی پیش‌نویس
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          {!doc && d.files.length > 1 && <span className="text-[11px] text-ink-400 mr-auto">{d.files.length.toLocaleString("fa-IR")} فایل در قالب یک سند ثبت می‌شود.</span>}
        </div>
      </div>
    </Modal>
  );
}

/** ابلاغ بخشنامه/دستورالعمل/آیین‌نامه: مخاطبان (واحد/نقش) و مهلت «خواندم و پذیرفتم» */
function CircularBox({ value, onChange, type }: { value: CircularDraft; onChange: (v: CircularDraft) => void; type: string }) {
  const { iam, scopePath } = useTenancy();
  const [kind, setKind] = useState<"scope" | "role">("scope");
  const [target, setTarget] = useState("");
  const options =
    kind === "scope"
      ? iam.scopes.filter((x) => x.type !== "system" && x.active).map((x) => ({ id: x.id, label: scopePath(x.id).split(" › ").slice(1).join(" › ") || x.name }))
      : iam.roles.filter((r) => r.active).map((r) => ({ id: r.id, label: r.name }));
  const label = (e: KAudienceEntry) => (e.kind === "scope" ? scopePath(e.id).split(" › ").slice(1).join(" › ") || e.id : iam.roles.find((r) => r.id === e.id)?.name ?? e.id);
  const add = () => {
    if (!target || value.audience.some((e) => e.kind === kind && e.id === target)) return;
    onChange({ ...value, audience: [...value.audience, { kind, id: target }] });
    setTarget("");
  };
  return (
    <div className={`rounded-lg border p-3 space-y-3 ${value.on ? "border-amber-200 bg-amber-50/50" : "border-ink-200"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-ink-800 flex items-center gap-1.5">
          <BadgeCheck size={14} className="text-amber-600" /> ابلاغ {type} و «خواندم و پذیرفتم»
        </span>
        <Toggle on={value.on} onChange={() => onChange({ ...value, on: !value.on })} label="نیاز به تأیید خواندن" />
      </div>
      {value.on && (
        <>
          <p className="text-[11px] text-ink-500 leading-5">پس از انتشار، به مخاطبان اعلان فوری می‌رود و بنر تأیید خواندن برایشان نمایش داده می‌شود. بدون مخاطب = همه‌ی کسانی که سند را می‌بینند.</p>
          {value.audience.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {value.audience.map((e) => (
                <span key={`${e.kind}-${e.id}`} className="inline-flex items-center gap-1 text-[11px] bg-white border border-ink-200 rounded px-1.5 py-0.5">
                  <span className="text-ink-400">{e.kind === "scope" ? "واحد" : "نقش"}:</span> {label(e)}
                  <button type="button" onClick={() => onChange({ ...value, audience: value.audience.filter((x) => x !== e) })} aria-label="حذف">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <select className="input-field !w-auto" value={kind} onChange={(e) => (setKind(e.target.value as "scope" | "role"), setTarget(""))} aria-label="نوع مخاطب">
              <option value="scope">واحد سازمانی</option>
              <option value="role">نقش</option>
            </select>
            <select className="input-field flex-1 min-w-[160px]" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="مخاطب">
              <option value="">انتخاب…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button size="sm" icon={<Plus size={13} />} onClick={add} disabled={!target}>
              افزودن
            </Button>
          </div>
          <Field label="مهلت تأیید خواندن" hint="خالی = بدون مهلت">
            <JalaliDatePicker value={value.deadline} onChange={(deadline) => onChange({ ...value, deadline })} placeholder="بدون مهلت" />
          </Field>
        </>
      )}
    </div>
  );
}
