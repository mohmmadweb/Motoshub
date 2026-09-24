import { useEffect, useState } from "react";
import { Send, Save, X } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { users } from "../../data/mock";
import type { Scoped } from "../../data/tenancy";
import { addDays } from "../../pm/jalali";
import { accessLevels, type AccessLevel, type KDoc, type KFile } from "../../km/types";
import { Field, FilePicker } from "./shared";

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
};

/** ثبت سند جدید (چند فایل) یا ویرایش اطلاعات سند موجود */
export default function DocFormModal({ open, doc, onClose, defaultCategory }: { open: boolean; doc?: KDoc | null; onClose: () => void; defaultCategory?: string }) {
  const km = useKnowledge();
  const { notify } = useToast();
  const { defaultScopeForNew, actingUser, hasPermission } = useTenancy();
  const [d, setD] = useState<Draft | null>(null);
  const [scope, setScope] = useState<Scoped>({ scope: "سراسری" });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!open) return;
    if (doc) {
      setD({ title: doc.title, description: doc.description, type: doc.type, categoryId: doc.categoryId, tags: doc.tags, unit: doc.unit, owner: doc.owner, access: doc.access, importance: doc.importance, approvers: doc.approvers, reviewDate: doc.reviewDate, files: doc.files });
      setScope({ scope: doc.scope, holdingId: doc.holdingId, companyId: doc.companyId });
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
      });
      setScope(defaultScopeForNew());
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
    if (!doc && !d.files.length) return notify("حداقل یک فایل پیوست کنید.", "warning");
    if (!d.description.trim()) return notify("توضیح سند الزامی است.", "warning");
    if (doc) {
      km.updateDoc(doc.id, { ...d, title: d.title.trim(), ...scope });
      notify("اطلاعات سند ذخیره شد.");
    } else {
      const skipReview = !km.settings.workflowSteps.review;
      km.createDoc({ ...d, title: d.title.trim(), relations: [], ...scope, authorId: actingUser.id, submit: sendForReview && !skipReview });
      notify(sendForReview ? (skipReview ? "سند ثبت شد." : `سند ثبت و برای بررسی به ${d.approvers.length.toLocaleString("fa-IR")} نفر ارسال شد.`) : "پیش‌نویس سند ذخیره شد.");
    }
    onClose();
  };

  const leaves = km.categories.filter((c) => c.parentId || !km.categories.some((x) => x.parentId === c.id));

  return (
    <Modal open={open} onClose={onClose} title={doc ? "ویرایش اطلاعات سند" : "افزودن سند به مخزن دانش"} description={doc ? `${doc.code} · نسخه‌ی ${doc.version.toLocaleString("fa-IR")} — برای تغییر فایل، «نسخه‌ی جدید» بارگذاری کنید.` : "یک یا چند فایل را همراه با مشخصات سند ثبت کنید؛ سند پس از تأیید منتشر می‌شود."} width="max-w-3xl">
      <div className="space-y-4">
        {!doc && (
          <Field label="فایل‌های سند">
            <FilePicker files={d.files} onChange={setFiles} />
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
