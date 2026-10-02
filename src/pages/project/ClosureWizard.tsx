import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Flag, Star, Plus, X, Printer, CheckCircle2, AlertTriangle, ArrowUpFromLine, Archive } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { activeTasks, budgetUsage, isDone, memberStats, paidTotal, projectProgress } from "../../pm/selectors";
import { taskFlows } from "../../pm/flow";
import { dayNum, fa, fmtRial, fromDayNum } from "../../pm/jalali";
import type { MemberEvaluation, ProjectClosure, ProjectState } from "../../pm/types";
import { Field, Progress, useProjectPage } from "./shared";
import { fundTitle, contractTitle, opportunityTitle } from "./SettingsExtras";

/** انحراف زمان و هزینه — خودکار از داده‌ی پروژه */
export function computeVariance(p: ProjectState, refDate: string) {
  const ts = activeTasks(p).filter((t) => t.type !== "epic");
  const open = ts.filter((t) => !isDone(p, t));
  const flows = taskFlows(p, refDate);
  const doneDays = flows.map((f) => f.doneDay).filter((x): x is number => x !== undefined);
  const ref = dayNum(refDate)!;
  const actualEnd = open.length ? ref : doneDays.length ? Math.max(...doneDays) : ref;
  const planEnd = dayNum(p.meta.deadline) ?? actualEnd;
  const planStart = dayNum(p.meta.start) ?? planEnd;
  const scheduleVarianceDays = actualEnd - planEnd;
  const scheduleVariancePct = Math.round((scheduleVarianceDays / Math.max(1, planEnd - planStart)) * 1000) / 10;
  const spent = paidTotal(p);
  const costVariance = spent - p.budget.total;
  const costVariancePct = p.budget.total ? Math.round((costVariance / p.budget.total) * 1000) / 10 : 0;
  return { open, actualEnd: fromDayNum(actualEnd), scheduleVarianceDays, scheduleVariancePct, spent, costVariance, costVariancePct };
}

function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${fa(n)} از ۵`} className={`${n <= value ? "text-amber-500" : "text-ink-300"} ${onChange ? "hover:scale-110" : ""} transition-transform`}>
          <Star size={size} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </span>
  );
}

const steps = ["نتایج و کیفیت", "انحراف زمان و هزینه", "درس‌آموخته‌ها", "ارزیابی اعضا"] as const;

/**
 * ویزارد اختتام پروژه (بند ۴۶ سند + «عملکرد واقعی» سند اعتبارسنجی):
 * تحقق اهداف، کیفیت، انحراف زمان/هزینه (خودکار)، درس‌آموخته‌ها (با انتقال به مدیریت دانش)
 * و ارزیابی ۱ تا ۵ هر عضو — روی پروژه ذخیره و گزارش نهایی قابل چاپ ساخته می‌شود.
 */
export default function ClosureWizard({ onClose }: { onClose: () => void }) {
  const { p, pid, refDate } = useProjectPage();
  const pm = useProjectsPM();
  const km = useKnowledge();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const v = useMemo(() => computeVariance(p, refDate), [p, refDate]);
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState(Math.min(100, projectProgress(p)));
  const [quality, setQuality] = useState(4);
  const [summary, setSummary] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [lessons, setLessons] = useState<string[]>([""]);
  const [transfer, setTransfer] = useState(true);
  const people = p.members.filter((m) => m.role !== "مشاهده‌گر");
  const [evals, setEvals] = useState<MemberEvaluation[]>(() =>
    people.map((m) => {
      const st = memberStats(p, m.name);
      return { memberId: m.id, name: m.name, score: st.task_count && st.progress_percentage >= 80 ? 4 : 3, note: st.task_count ? `${fa(st.closed_task_count)} از ${fa(st.task_count)} تسک انجام شد · ${fa(st.hours)} ساعت ثبت‌شده` : "" };
    })
  );
  const [report, setReport] = useState(false);

  const submit = () => {
    const cleanLessons = lessons.map((x) => x.trim()).filter(Boolean);
    const c: Omit<ProjectClosure, "closedAt" | "closedBy"> = {
      goalsAchieved: goals,
      qualityScore: quality,
      scheduleVarianceDays: v.scheduleVarianceDays,
      scheduleVariancePct: v.scheduleVariancePct,
      costVariance: v.costVariance,
      costVariancePct: v.costVariancePct,
      summary: summary.trim(),
      outcomes: outcomes.trim(),
      lessons: cleanLessons,
      memberEvals: evals,
      transferredToKm: transfer && cleanLessons.length > 0,
    };
    pm.closeProject(pid, c);
    if (transfer && hasPermission("knowledge.upload")) {
      cleanLessons.forEach((l, i) =>
        km.saveExperience({ kind: "درس‌آموخته", title: `${p.meta.name} — درس‌آموخته ${fa(i + 1)}`, body: l, author: km.me, unit: km.settings.units[0] ?? "مدیریت پروژه", tags: ["دانش پروژه", ...p.meta.tags.slice(0, 2)], status: "منتشرشده", relations: [{ type: "project", id: pid }], projectId: pid, future: l })
      );
      km.transferProjectKnowledge(pid, p.meta.name, p.documents.map((d) => ({ name: d.name, type: d.type, size: d.size })));
    }
    notify(`پروژه وارد «اختتام» شد؛ ارزیابی نهایی ثبت شد${transfer && cleanLessons.length ? ` و ${fa(cleanLessons.length)} درس‌آموخته به مدیریت دانش منتقل شد` : ""}.`);
    setReport(true);
  };

  if (report) return <FinalReportModal onClose={onClose} />;

  return (
    <Modal open onClose={onClose} title="اختتام پروژه و ارزیابی نهایی" description="نتیجه‌ی واقعی پروژه ثبت می‌شود: تحقق اهداف، کیفیت، انحراف زمان و هزینه، درس‌آموخته‌ها و عملکرد اعضا." width="max-w-2xl">
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
        {steps.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${i === step ? "bg-brand-600 text-white" : i < step ? "text-emerald-700 bg-emerald-50" : "text-ink-400 bg-ink-50"}`}>
            {i < step ? <CheckCircle2 size={11} /> : <span>{fa(i + 1)}</span>} {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <Field label={`میزان تحقق اهداف: ${fa(goals)}٪`} hint={`پیشرفت محاسبه‌شده‌ی تسک‌ها ${fa(projectProgress(p))}٪ است؛ تحقق اهداف را بر اساس نتیجه‌ی واقعی تعیین کنید.`}>
            <input type="range" min={0} max={100} step={5} value={goals} onChange={(e) => setGoals(Number(e.target.value))} className="w-full accent-[var(--color-brand-600)]" dir="ltr" />
          </Field>
          <Field label="کیفیت خروجی (۱ تا ۵)">
            <Stars value={quality} onChange={setQuality} size={22} />
          </Field>
          <Field label="خلاصه‌ی نتیجه">
            <textarea className="input-field min-h-[70px]" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="مثلاً: ۸ کارگاه راه‌اندازی شد و ۱۲ روستا آب لوله‌کشی گرفتند." />
          </Field>
          <Field label="خروجی‌ها و نتایج قابل اندازه‌گیری">
            <textarea className="input-field min-h-[60px]" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} placeholder="تعداد ذی‌نفع، اشتغال ایجادشده، درآمد، …" />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {v.open.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {fa(v.open.length)} تسک هنوز باز است؛ پایان واقعی «امروز» در نظر گرفته شد. بهتر است پیش از اختتام تسک‌ها را ببندید یا بایگانی کنید.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card p-3">
              <p className="text-[11px] text-ink-400">انحراف زمان‌بندی (خودکار)</p>
              <p className={`text-lg font-bold mt-1 ${v.scheduleVarianceDays > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {v.scheduleVarianceDays > 0 ? `${fa(v.scheduleVarianceDays)} روز تأخیر` : v.scheduleVarianceDays < 0 ? `${fa(-v.scheduleVarianceDays)} روز زودتر` : "سر موعد"}
              </p>
              <p className="text-[11px] text-ink-500 mt-1">
                برنامه: {p.meta.start} تا {p.meta.deadline} · پایان واقعی: {v.actualEnd} ({fa(v.scheduleVariancePct)}٪ مدت برنامه)
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-ink-400">انحراف هزینه (خودکار)</p>
              <p className={`text-lg font-bold mt-1 ${v.costVariance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {v.costVariance > 0 ? `${fa(v.costVariancePct)}٪ اضافه‌هزینه` : v.costVariance < 0 ? `${fa(-v.costVariancePct)}٪ صرفه‌جویی` : "مطابق بودجه"}
              </p>
              <p className="text-[11px] text-ink-500 mt-1">
                هزینه‌ی پرداخت‌شده {fmtRial(v.spent)} از بودجه‌ی {fmtRial(p.budget.total)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-ink-400 leading-5">این مقادیر از تاریخ انجام تسک‌ها (تاریخچه‌ی جابه‌جایی وضعیت) و هزینه‌های پرداخت‌شده محاسبه می‌شوند و در گزارش نهایی و ارزیابی‌های بعدی (اعتبارسنجی مجریان) به‌کار می‌روند.</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-ink-500">چه چیزی خوب پیش رفت؟ چه چیزی باید در پروژه‌های بعدی متفاوت انجام شود؟</p>
          {lessons.map((l, i) => (
            <div key={i} className="flex gap-2">
              <textarea className="input-field min-h-[44px]" value={l} onChange={(e) => setLessons(lessons.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`درس‌آموخته‌ی ${fa(i + 1)}`} />
              <button onClick={() => setLessons(lessons.filter((_, j) => j !== i))} className="text-ink-400 hover:text-rose-600" aria-label="حذف">
                <X size={14} />
              </button>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setLessons([...lessons, ""])}>
            افزودن درس‌آموخته
          </Button>
          <label className="flex items-start gap-2 text-xs text-ink-700 rounded-lg border border-brand-200 bg-brand-50/50 p-3">
            <input type="checkbox" checked={transfer} onChange={(e) => setTransfer(e.target.checked)} className="accent-[var(--color-brand-600)] mt-0.5" disabled={!hasPermission("knowledge.upload")} />
            <span>
              <b className="flex items-center gap-1">
                <ArrowUpFromLine size={12} /> انتقال به مدیریت دانش
              </b>
              درس‌آموخته‌ها منتشر و {fa(p.documents.length)} سند پروژه به مخزن دانش سازمان منتقل می‌شود.
              {!hasPermission("knowledge.upload") && <span className="text-rose-600 block">مجوز بارگذاری در مدیریت دانش را ندارید.</span>}
            </span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <p className="text-xs text-ink-500">ارزیابی عملکرد هر عضو (۱ تا ۵) — به سوابق همکاری و پروفایل اعضا اضافه می‌شود.</p>
          {evals.map((e, i) => (
            <div key={e.memberId} className="grid grid-cols-1 sm:grid-cols-[150px_auto_1fr] gap-2 items-center border-b border-ink-100 pb-2">
              <span className="text-xs font-medium text-ink-800">{e.name}</span>
              <Stars value={e.score} onChange={(n) => setEvals(evals.map((x, j) => (j === i ? { ...x, score: n } : x)))} />
              <input className="input-field !py-1.5 !text-xs" value={e.note} onChange={(ev) => setEvals(evals.map((x, j) => (j === i ? { ...x, note: ev.target.value } : x)))} placeholder="یادداشت ارزیابی" />
            </div>
          ))}
          {evals.length === 0 && <p className="text-[11px] text-ink-400">عضوی برای ارزیابی نیست.</p>}
        </div>
      )}

      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-ink-100">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            قبلی
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)}>
            بعدی
          </Button>
        ) : (
          <Button variant="primary" icon={<Flag size={14} />} onClick={submit}>
            ثبت ارزیابی و اختتام پروژه
          </Button>
        )}
        <Button variant="ghost" className="mr-auto" onClick={onClose}>
          انصراف
        </Button>
      </div>
    </Modal>
  );
}

/** متن گزارش نهایی — هم در پیش‌نمایش و هم در نسخه‌ی چاپی */
function ReportBody({ p, refDate }: { p: ProjectState; refDate: string }) {
  const c = p.closure!;
  const done = activeTasks(p).filter((t) => isDone(p, t) && t.type !== "epic").length;
  const total = activeTasks(p).filter((t) => t.type !== "epic").length;
  const links = [fundTitle(p.meta.fundId) && `صندوق: ${fundTitle(p.meta.fundId)}`, contractTitle(p.meta.contractId) && `قرارداد: ${contractTitle(p.meta.contractId)}`, opportunityTitle(p.meta.opportunityId) && `فرصت پژوهشی: ${opportunityTitle(p.meta.opportunityId)}`, p.meta.companyName && `مجری: ${p.meta.companyName}`].filter(Boolean);
  const avg = c.memberEvals.length ? c.memberEvals.reduce((s, e) => s + e.score, 0) / c.memberEvals.length : 0;
  return (
    <div className="space-y-4 text-ink-800" dir="rtl">
      <div className="border-b-2 border-ink-800 pb-2">
        <p className="text-[11px] text-ink-500">گزارش نهایی پروژه · {p.meta.workspace}</p>
        <h1 className="text-lg font-bold">{p.meta.name}</h1>
        <p className="text-xs text-ink-500">
          کارفرما: {p.meta.client} · مدیر پروژه: {p.meta.manager} · بازه: {p.meta.start} تا {p.meta.deadline} · اختتام: {c.closedAt} ({c.closedBy})
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {[
          ["تحقق اهداف", `${fa(c.goalsAchieved)}٪`],
          ["کیفیت خروجی", `${fa(c.qualityScore)} از ۵`],
          ["انحراف زمان", c.scheduleVarianceDays > 0 ? `${fa(c.scheduleVarianceDays)} روز تأخیر` : c.scheduleVarianceDays < 0 ? `${fa(-c.scheduleVarianceDays)} روز زودتر` : "سر موعد"],
          ["انحراف هزینه", c.costVariance > 0 ? `+${fa(c.costVariancePct)}٪` : `${fa(c.costVariancePct)}٪`],
        ].map(([k, val]) => (
          <div key={k} className="border border-ink-200 rounded-lg p-2">
            <p className="text-[10.5px] text-ink-500">{k}</p>
            <p className="text-sm font-bold">{val}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="text-sm font-bold mb-1">خلاصه و نتایج</h2>
        <p className="text-xs leading-6">{c.summary || "—"}</p>
        {c.outcomes && <p className="text-xs leading-6 text-ink-600">{c.outcomes}</p>}
        <p className="text-[11px] text-ink-500 mt-1">
          {fa(done)} از {fa(total)} کار انجام شد · پیشرفت {fa(projectProgress(p))}٪ · مصرف بودجه {fa(budgetUsage(p))}٪ ({fmtRial(paidTotal(p))} از {fmtRial(p.budget.total)}) · {fa(p.milestones.filter((m) => m.status === "انجام‌شده").length)} از {fa(p.milestones.length)} مایل‌ستون
        </p>
        {links.length > 0 && <p className="text-[11px] text-ink-500">{links.join(" · ")}</p>}
      </section>
      <section>
        <h2 className="text-sm font-bold mb-1">درس‌آموخته‌ها {c.transferredToKm && <span className="text-[10px] font-normal text-emerald-700">(به مدیریت دانش منتقل شد)</span>}</h2>
        <ol className="list-decimal pr-5 text-xs leading-6">
          {c.lessons.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
          {c.lessons.length === 0 && <li>—</li>}
        </ol>
      </section>
      <section>
        <h2 className="text-sm font-bold mb-1">ارزیابی عملکرد اعضا (میانگین {fa(Math.round(avg * 10) / 10)} از ۵)</h2>
        <table className="w-full text-xs border border-ink-200">
          <thead>
            <tr className="bg-ink-50 text-right">
              <th className="p-1.5 font-medium">عضو</th>
              <th className="p-1.5 font-medium">امتیاز</th>
              <th className="p-1.5 font-medium">یادداشت</th>
            </tr>
          </thead>
          <tbody>
            {c.memberEvals.map((e) => (
              <tr key={e.memberId} className="border-t border-ink-100">
                <td className="p-1.5">{e.name}</td>
                <td className="p-1.5 whitespace-nowrap">
                  <Stars value={e.score} size={12} />
                </td>
                <td className="p-1.5 text-ink-600">{e.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {(p.stageGates ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-1">بازبینی‌های دوره‌ای</h2>
          {(p.stageGates ?? []).map((g) => (
            <p key={g.id} className="text-xs leading-6">
              {g.date} — <b>{g.decision}</b>: {g.reason}
            </p>
          ))}
        </section>
      )}
      <p className="text-[10px] text-ink-400 border-t border-ink-200 pt-2">تهیه‌شده در سامانه‌ی موتوشاب · {refDate}</p>
    </div>
  );
}

/** پیش‌نمایش + چاپ گزارش نهایی (window.print فقط همین بخش را چاپ می‌کند) */
export function FinalReportModal({ onClose }: { onClose: () => void }) {
  const { p, pid, refDate, canManage, hasPerm } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  if (!p.closure) return null;
  return (
    <>
      <Modal open onClose={onClose} title="گزارش نهایی پروژه" description="نسخه‌ی قابل چاپ — برای ذخیره به PDF از گزینه‌ی چاپ مرورگر استفاده کنید." width="max-w-3xl">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button variant="primary" icon={<Printer size={14} />} onClick={() => window.print()}>
            چاپ / ذخیره‌ی PDF
          </Button>
          {canManage && hasPerm("projects.archive") && !p.meta.archived && (
            <Button
              variant="secondary"
              icon={<Archive size={14} />}
              onClick={() =>
                confirm({
                  title: "بایگانی پروژه‌ی خاتمه‌یافته؟",
                  message: "پروژه فقط‌خواندنی می‌شود؛ گزارش نهایی و همه‌ی سوابق باقی می‌ماند و قابل بازیابی است.",
                  confirmLabel: "بایگانی",
                  onConfirm: () => {
                    pm.updateMeta(pid, { archived: true });
                    notify("پروژه بایگانی شد.", "info");
                    onClose();
                  },
                })
              }
            >
              بایگانی پروژه
            </Button>
          )}
          <Badge tone="success" icon={<CheckCircle2 size={11} />}>
            بسته‌شده در {p.closure.closedAt}
          </Badge>
        </div>
        <div className="rounded-lg border border-ink-200 p-4 bg-white">
          <ReportBody p={p} refDate={refDate} />
        </div>
      </Modal>
      {createPortal(
        <div className="pm-print-root" aria-hidden>
          <style>{`.pm-print-root{display:none}@media print{body>*:not(.pm-print-root){display:none!important}.pm-print-root{display:block!important;padding:24px;background:#fff;color:#111}}`}</style>
          <ReportBody p={p} refDate={refDate} />
        </div>,
        document.body
      )}
    </>
  );
}

/** کارت خلاصه‌ی اختتام در نمای کلی */
export function ClosureSummary({ onOpen }: { onOpen: () => void }) {
  const { p } = useProjectPage();
  const c = p.closure;
  if (!c) return null;
  return (
    <div className="card p-4 border-emerald-200">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <p className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
          <Flag size={14} className="text-emerald-600" /> پروژه بسته شد — {c.closedAt}
        </p>
        <Button size="sm" variant="secondary" icon={<Printer size={13} />} onClick={onOpen}>
          گزارش نهایی
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-[11.5px]">
        <div>
          <p className="text-ink-400">تحقق اهداف</p>
          <Progress value={c.goalsAchieved} tone="bg-emerald-500" className="mt-1" />
          <p className="text-ink-700 mt-0.5">{fa(c.goalsAchieved)}٪</p>
        </div>
        <div>
          <p className="text-ink-400">کیفیت خروجی</p>
          <Stars value={c.qualityScore} size={13} />
        </div>
        <p className="text-ink-600">زمان: {c.scheduleVarianceDays > 0 ? <span className="text-rose-600">{fa(c.scheduleVarianceDays)} روز تأخیر</span> : "سر موعد"}</p>
        <p className="text-ink-600">هزینه: {c.costVariance > 0 ? <span className="text-rose-600">+{fa(c.costVariancePct)}٪</span> : `${fa(c.costVariancePct)}٪`}</p>
      </div>
      {c.summary && <p className="text-[11.5px] text-ink-600 leading-6 mt-2">{c.summary}</p>}
    </div>
  );
}
