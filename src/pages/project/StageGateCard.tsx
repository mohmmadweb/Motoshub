import { useState } from "react";
import { ShieldCheck, Plus, ChevronDown, PlayCircle, Wrench, OctagonX, CalendarClock } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { addDays, dayNum, fa } from "../../pm/jalali";
import { budgetUsage, projectProgress } from "../../pm/selectors";
import type { GateDecision } from "../../pm/types";
import { Field, SectionTitle, useProjectPage } from "./shared";

export const gateTone: Record<GateDecision, BadgeTone> = { ادامه: "success", اصلاح: "warning", توقف: "danger" };
const gateIcon = { ادامه: PlayCircle, اصلاح: Wrench, توقف: OctagonX } as const;
const gateHint: Record<GateDecision, string> = {
  ادامه: "پروژه طبق برنامه ادامه می‌یابد",
  اصلاح: "ادامه با اقدام اصلاحی (زمان، بودجه، دامنه یا تیم)",
  توقف: "اجرای پروژه متوقف می‌شود؛ سلامت قرمز می‌شود",
};

/** بازبینی دوره‌ای پروژه (Stage-gate): تصمیم ادامه / اصلاح / توقف با دلیل و تاریخ بازبینی بعدی */
export default function StageGateCard() {
  const { p, pid, canEdit, canManage, refDate } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const gates = [...(p.stageGates ?? [])].sort((a, b) => (dayNum(b.date) ?? 0) - (dayNum(a.date) ?? 0));
  const last = gates[0];
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState(false);
  const [decision, setDecision] = useState<GateDecision>("ادامه");
  const [reason, setReason] = useState("");
  const [actions, setActions] = useState("");
  const [next, setNext] = useState(addDays(refDate, 30));
  const ref = dayNum(refDate)!;
  const nextDay = dayNum(last?.nextReview);
  const overdue = nextDay !== null && nextDay < ref && p.meta.phase !== "اختتام";
  const due = nextDay !== null && nextDay >= ref ? nextDay - ref : null;

  const save = () => {
    if (!reason.trim()) return notify("دلیل تصمیم را بنویسید.", "warning");
    pm.recordStageGate(pid, { decision, reason: reason.trim(), actions: decision === "اصلاح" ? actions.trim() || undefined : undefined, nextReview: decision === "توقف" ? undefined : next });
    notify(`تصمیم «${decision}» ثبت شد و به مالک، مدیر پروژه و کارفرما اطلاع داده شد.`);
    setOpen(false);
    setReason("");
    setActions("");
  };

  return (
    <div className="card p-4">
      <SectionTitle
        icon={<ShieldCheck size={15} className="text-navy-700" />}
        title="بازبینی دوره‌ای (Stage-gate)"
        hint="ارزیابی مستمر: در هر نقطه‌ی بازبینی تصمیم ادامه، اصلاح یا توقف پروژه با دلیل ثبت می‌شود."
        action={
          canEdit &&
          canManage && (
            <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setOpen(true)}>
              ثبت بازبینی
            </Button>
          )
        }
      />
      {last ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={gateTone[last.decision]}>{last.decision}</Badge>
            <span className="text-[11px] text-ink-400">
              {last.date} · {last.by} · مرحله‌ی {last.phase}
            </span>
          </div>
          <p className="text-xs text-ink-700 leading-6">{last.reason}</p>
          {last.actions && <p className="text-[11.5px] text-amber-800 bg-amber-50 rounded-md px-2 py-1 leading-6">اقدام اصلاحی: {last.actions}</p>}
          <p className="text-[11px] text-ink-400">
            شاخص‌ها هنگام تصمیم: پیشرفت {fa(last.snapshot.progress)}٪ · مصرف بودجه {fa(last.snapshot.budgetUsage)}٪ · سلامت {last.snapshot.health} · {fa(last.snapshot.openRisks)} ریسک باز — اکنون: پیشرفت {fa(projectProgress(p))}٪ · بودجه {fa(budgetUsage(p))}٪
          </p>
          {last.nextReview && (
            <p className={`text-[11.5px] flex items-center gap-1 ${overdue ? "text-rose-700 font-medium" : "text-ink-600"}`}>
              <CalendarClock size={12} /> بازبینی بعدی: {last.nextReview}
              {overdue ? ` — ${fa(ref - nextDay!)} روز گذشته؛ بازبینی انجام نشده` : due !== null ? ` (${due === 0 ? "امروز" : `${fa(due)} روز دیگر`})` : ""}
            </p>
          )}
          {gates.length > 1 && (
            <div>
              <button onClick={() => setHist((v) => !v)} className="text-[11px] text-brand-700 hover:underline flex items-center gap-0.5">
                تاریخچه‌ی بازبینی‌ها ({fa(gates.length)}) <ChevronDown size={12} className={hist ? "rotate-180" : ""} />
              </button>
              {hist && (
                <div className="mt-2 border-r-2 border-ink-100 pr-3 space-y-2">
                  {gates.slice(1).map((g) => (
                    <div key={g.id}>
                      <p className="text-[11px] text-ink-400 flex items-center gap-1.5">
                        <Badge tone={gateTone[g.decision]}>{g.decision}</Badge> {g.date} · {g.by}
                      </p>
                      <p className="text-[11.5px] text-ink-700 leading-6 mt-0.5">{g.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-ink-400">هنوز بازبینی‌ای ثبت نشده است. پیشنهاد: در پایان هر مرحله‌ی چرخه‌ی عمر یا هر ماه یک بازبینی ثبت کنید.</p>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="ثبت بازبینی دوره‌ای" description={`پیشرفت فعلی ${fa(projectProgress(p))}٪ · مصرف بودجه ${fa(budgetUsage(p))}٪ · سلامت ${p.meta.health} — این شاخص‌ها همراه تصمیم ذخیره می‌شوند.`}>
        <div className="space-y-3">
          <Field label="تصمیم">
            <div className="grid grid-cols-3 gap-2">
              {(["ادامه", "اصلاح", "توقف"] as GateDecision[]).map((d) => {
                const I = gateIcon[d];
                return (
                  <button key={d} type="button" onClick={() => setDecision(d)} className={`rounded-lg border p-2.5 text-right ${decision === d ? (d === "ادامه" ? "border-emerald-400 bg-emerald-50" : d === "اصلاح" ? "border-amber-400 bg-amber-50" : "border-rose-400 bg-rose-50") : "border-ink-200 hover:bg-ink-50"}`}>
                    <span className="flex items-center gap-1 text-sm font-bold text-ink-900">
                      <I size={14} /> {d}
                    </span>
                    <span className="block text-[10.5px] text-ink-500 mt-0.5 leading-4">{gateHint[d]}</span>
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="دلیل تصمیم">
            <textarea className="input-field min-h-[70px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="بر اساس چه شواهدی این تصمیم گرفته شد؟" />
          </Field>
          {decision === "اصلاح" && (
            <Field label="اقدام اصلاحی">
              <textarea className="input-field min-h-[50px]" value={actions} onChange={(e) => setActions(e.target.value)} placeholder="مثلاً: افزودن نیرو، بازتعریف دامنه، تمدید مهلت…" />
            </Field>
          )}
          {decision !== "توقف" && (
            <Field label="تاریخ بازبینی بعدی">
              <JalaliDatePicker value={next} onChange={setNext} />
            </Field>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={save}>
              ثبت تصمیم
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
