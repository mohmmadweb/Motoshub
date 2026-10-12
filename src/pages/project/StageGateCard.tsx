import { useState } from "react";
import { PlayCircle, Wrench, OctagonX, CalendarClock, ArrowLeftRight } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { addDays, dayNum, fa } from "../../pm/jalali";
import { budgetUsage, projectProgress } from "../../pm/selectors";
import type { GateDecision, LifecyclePhase } from "../../pm/types";
import { Field, useProjectPage } from "./shared";

export const gateTone: Record<GateDecision, BadgeTone> = { ادامه: "success", اصلاح: "warning", توقف: "danger" };
const gateIcon = { ادامه: PlayCircle, اصلاح: Wrench, توقف: OctagonX } as const;
const gateHint: Record<GateDecision, string> = {
  ادامه: "طبق برنامه ادامه می‌یابد",
  اصلاح: "ادامه با اقدام اصلاحی",
  توقف: "اجرا متوقف می‌شود",
};

/**
 * پنجره‌ی یک مرحله از چرخه‌ی عمر (با کلیک روی همان مرحله در نوار چرخه‌ی عمر):
 * بازبینی مرحله (Stage-gate) — تصمیم ادامه / اصلاح / توقف با دلیل + سابقه‌ی تصمیم‌های همین مرحله
 * و در صورت مجوز، انتقال پروژه به این مرحله.
 */
export default function PhaseGateModal({
  phase,
  hint,
  onClose,
  canSetPhase,
  onSetPhase,
  canSeeGates,
  canRecord,
}: {
  phase: LifecyclePhase;
  hint: string;
  onClose: () => void;
  canSetPhase: boolean;
  onSetPhase: () => void;
  canSeeGates: boolean;
  canRecord: boolean;
}) {
  const { p, pid, refDate } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const current = p.meta.phase === phase;
  const gates = [...(p.stageGates ?? [])].filter((g) => g.phase === phase).sort((a, b) => (dayNum(b.date) ?? 0) - (dayNum(a.date) ?? 0));
  const last = gates[0];
  const [decision, setDecision] = useState<GateDecision>("ادامه");
  const [reason, setReason] = useState("");
  const [actions, setActions] = useState("");
  const [next, setNext] = useState(addDays(refDate, 30));
  const ref = dayNum(refDate)!;
  const nextDay = current ? dayNum(last?.nextReview) : null;
  const overdue = nextDay !== null && nextDay < ref && p.meta.phase !== "اختتام";

  const save = () => {
    if (!reason.trim()) return notify("دلیل تصمیم را بنویسید.", "warning");
    pm.recordStageGate(pid, { decision, reason: reason.trim(), actions: decision === "اصلاح" ? actions.trim() || undefined : undefined, nextReview: decision === "توقف" ? undefined : next });
    notify(`تصمیم «${decision}» ثبت شد و به مالک، مدیر پروژه و کارفرما اطلاع داده شد.`);
    setReason("");
    setActions("");
  };

  return (
    <Modal open onClose={onClose} title={`مرحله‌ی «${phase}»${current ? " (مرحله‌ی فعلی)" : ""}`} description={hint} width="max-w-lg">
      <div className="space-y-4">
        {canSeeGates && (
          <>
            <p className="text-[11.5px] text-ink-500 leading-5 rounded-lg bg-ink-50 px-3 py-2">بازبینی مرحله: در هر مرحله تصمیم می‌گیرید پروژه ادامه یابد، اصلاح شود یا متوقف شود — با دلیل و تاریخ بازبینی بعدی.</p>

            {current && canRecord && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(["ادامه", "اصلاح", "توقف"] as GateDecision[]).map((d) => {
                    const I = gateIcon[d];
                    return (
                      <button key={d} type="button" onClick={() => setDecision(d)} className={`rounded-lg border p-2 text-right ${decision === d ? (d === "ادامه" ? "border-emerald-400 bg-emerald-50" : d === "اصلاح" ? "border-amber-400 bg-amber-50" : "border-rose-400 bg-rose-50") : "border-ink-200 hover:bg-ink-50"}`}>
                        <span className="flex items-center gap-1 text-[13px] font-bold text-ink-900">
                          <I size={13} /> {d}
                        </span>
                        <span className="block text-[10.5px] text-ink-500 mt-0.5 leading-4">{gateHint[d]}</span>
                      </button>
                    );
                  })}
                </div>
                <Field label="دلیل تصمیم">
                  <textarea className="input-field min-h-[60px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="بر اساس چه شواهدی؟" />
                </Field>
                {decision === "اصلاح" && (
                  <Field label="اقدام اصلاحی">
                    <textarea className="input-field min-h-[46px]" value={actions} onChange={(e) => setActions(e.target.value)} placeholder="مثلاً: افزودن نیرو، تمدید مهلت…" />
                  </Field>
                )}
                {decision !== "توقف" && (
                  <Field label="تاریخ بازبینی بعدی">
                    <JalaliDatePicker value={next} onChange={setNext} />
                  </Field>
                )}
                <p className="text-[11px] text-ink-400">
                  همراه تصمیم ذخیره می‌شود: پیشرفت {fa(projectProgress(p))}٪ · مصرف بودجه {fa(budgetUsage(p))}٪ · سلامت {p.meta.health}
                </p>
                <Button variant="primary" className="w-full justify-center" onClick={save}>
                  ثبت تصمیم
                </Button>
              </div>
            )}

            {last?.nextReview && current && (
              <p className={`text-[11.5px] flex items-center gap-1 ${overdue ? "text-rose-700 font-medium" : "text-ink-600"}`}>
                <CalendarClock size={12} /> بازبینی بعدی: {last.nextReview}
                {overdue && ` — ${fa(ref - nextDay!)} روز گذشته`}
              </p>
            )}

            <div>
              <p className="text-xs font-bold text-ink-700 mb-2">سابقه‌ی تصمیم‌های این مرحله</p>
              {gates.length ? (
                <div className="border-r-2 border-ink-100 pr-3 space-y-2.5 max-h-56 overflow-y-auto">
                  {gates.map((g) => (
                    <div key={g.id}>
                      <p className="text-[11px] text-ink-400 flex items-center gap-1.5">
                        <Badge tone={gateTone[g.decision]}>{g.decision}</Badge> {g.date} · {g.by}
                      </p>
                      <p className="text-[11.5px] text-ink-700 leading-6 mt-0.5">{g.reason}</p>
                      {g.actions && <p className="text-[11px] text-amber-800">اقدام اصلاحی: {g.actions}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-ink-400">برای این مرحله تصمیمی ثبت نشده است.</p>
              )}
            </div>
          </>
        )}

        {!current && canSetPhase && (
          <Button variant="secondary" className="w-full justify-center" icon={<ArrowLeftRight size={13} />} onClick={onSetPhase}>
            {phase === "اختتام" && !p.closure ? "شروع اختتام پروژه" : `انتقال پروژه به مرحله‌ی «${phase}»`}
          </Button>
        )}
      </div>
    </Modal>
  );
}
