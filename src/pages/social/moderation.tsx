// ---------------------------------------------------------------------------
// «پیشنهادی» — گزارش تخلف (محتوا، نظر، پیام، رسانه)، نشان «پنهان‌شده توسط ناظر» و
// نشان وضعیت بازبینی پیش از انتشار. صف رسیدگی در «تنظیمات سامانه ← شبکه‌ی اجتماعی» است.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Flag, EyeOff, Eye, Clock, Undo2 } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useSocial, type ReportInput } from "../../context/SocialContext";
import { endpoints, fmtEndpoint } from "../../social/endpoints";
import type { ContentReview, Moderation, ReportReason } from "../../social/types";
import { reportReasonLabel, reportTargetLabel } from "../../social/types";
import { Field } from "./kit";

type Target = Omit<ReportInput, "reason" | "note">;

/** مودال ثبت گزارش تخلف */
export function ReportModal({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const [reason, setReason] = useState<ReportReason>("offensive");
  const [note, setNote] = useState("");
  const submit = () => {
    if (!target) return;
    if (reason === "other" && !note.trim()) return notify("برای «سایر» توضیح کوتاهی بنویسید.", "warning");
    const r = s.reportAbuse({ ...target, reason, note });
    notify(r.ok ? "گزارش ثبت شد و به صف ناظران رفت. نام شما برای صاحب مورد نمایش داده نمی‌شود." : r.error, r.ok ? "success" : "warning");
    if (r.ok) {
      setNote("");
      onClose();
    }
  };
  return (
    <Modal open={!!target} onClose={onClose} title="گزارش تخلف" description={target ? `${reportTargetLabel[target.target_type]}: «${target.target_excerpt.slice(0, 70)}»` : undefined}>
      {target && (
        <div className="space-y-3">
          <Field label="دلیل">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {(Object.keys(reportReasonLabel) as ReportReason[]).map((r) => (
                <label key={r} className={`flex items-center gap-2 text-xs rounded-lg border px-2.5 py-2 cursor-pointer ${reason === r ? "border-brand-400 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-700 hover:bg-ink-50"}`}>
                  <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--color-brand-600)]" />
                  {reportReasonLabel[r]}
                </label>
              ))}
            </div>
          </Field>
          <Field label="توضیح (اختیاری)" hint="فقط ناظران این توضیح را می‌بینند.">
            <textarea className="input-field min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="چه چیزی مشکل دارد؟" />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" icon={<Flag size={14} />} onClick={submit}>
              ثبت گزارش
            </Button>
            <Button variant="ghost" onClick={onClose}>
              انصراف
            </Button>
            <code dir="ltr" className="text-[10.5px] text-amber-700 mr-auto hidden sm:block">
              {fmtEndpoint(endpoints.reportCreate())}
            </code>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** دکمه‌ی «گزارش تخلف» — برای صاحب مورد نمایش داده نمی‌شود */
export function ReportButton({ target, iconOnly = false, className = "" }: { target: Target; iconOnly?: boolean; className?: string }) {
  const s = useSocial();
  const [open, setOpen] = useState(false);
  if (target.target_owner_id === s.me) return null;
  const mine = s.myReportOn(target.target_type, target.target_id);
  const pending = mine?.status === "open";
  return (
    <>
      {iconOnly ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          disabled={pending}
          className={`p-1 rounded ${pending ? "text-amber-500" : "text-ink-400 hover:text-rose-600"} ${className}`}
          title={pending ? "گزارش شما در صف بررسی است" : "گزارش تخلف"}
          aria-label="گزارش تخلف"
        >
          <Flag size={12} />
        </button>
      ) : (
        <Button size="sm" variant="ghost" icon={<Flag size={13} />} onClick={() => setOpen(true)} disabled={pending} title={pending ? "گزارش شما در صف بررسی است" : undefined} className={className}>
          {pending ? "گزارش شد" : "گزارش تخلف"}
        </Button>
      )}
      <ReportModal target={open ? target : null} onClose={() => setOpen(false)} />
    </>
  );
}

/** نوار «پنهان‌شده توسط ناظر» — فقط صاحب مورد و ناظران آن را می‌بینند */
export function HiddenBanner({ m, onUnhide }: { m: Moderation | null | undefined; onUnhide?: () => void }) {
  const s = useSocial();
  if (!m?.hidden) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
      <EyeOff size={14} className="shrink-0" />
      <span className="flex-1 min-w-[180px] leading-6">
        این مورد توسط ناظر ({s.userName(m.by)}) برای دیگران پنهان شده است: «{m.reason}»
      </span>
      {onUnhide && s.canModerate && (
        <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={onUnhide}>
          نمایش دوباره
        </Button>
      )}
    </div>
  );
}

/** نشان کوچک «پنهان‌شده» */
export function HiddenBadge({ m }: { m: Moderation | null | undefined }) {
  if (!m?.hidden) return null;
  return (
    <Badge tone="danger" icon={<EyeOff size={10} />}>
      پنهان‌شده
    </Badge>
  );
}

/** نشان وضعیت بازبینی پیش از انتشار */
export function ReviewBadge({ review }: { review: ContentReview | null | undefined }) {
  if (!review || review.status === "approved") return null;
  return review.status === "pending" ? (
    <Badge tone="warning" icon={<Clock size={10} />}>
      در انتظار بازبینی
    </Badge>
  ) : (
    <Badge tone="danger" icon={<Undo2 size={10} />}>
      برگشت برای اصلاح
    </Badge>
  );
}
