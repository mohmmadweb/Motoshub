import { useState, type ReactNode } from "react";
import { Download, Printer, BarChart3 } from "lucide-react";
import Button from "../../components/ui/Button";
import { activeTasks, budgetUsage, columnLabel, isDone, isOverdue, memberStats, paidTotal, projectProgress, taskActualCost, taskLoggedHours } from "../../pm/selectors";
import { fa, fmtRial, fmtShort } from "../../pm/jalali";
import { downloadText, toCsv, useProjectPage } from "./shared";

type ReportId = "progress" | "tasks" | "team" | "finance" | "time" | "expense" | "meetings";
const reports: { id: ReportId; label: string }[] = [
  { id: "progress", label: "پیشرفت پروژه" },
  { id: "tasks", label: "گزارش وظایف" },
  { id: "team", label: "عملکرد تیم" },
  { id: "finance", label: "گزارش مالی" },
  { id: "time", label: "گزارش زمان" },
  { id: "expense", label: "گزارش هزینه" },
  { id: "meetings", label: "گزارش جلسات" },
];

function Bars({ rows, unit = "" }: { rows: { label: string; value: number; tone?: string; hint?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-800">{r.label}</span>
            <span className="text-ink-500">
              {r.hint ?? `${fa(r.value)}${unit}`}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
            <div className={`h-full rounded-full ${r.tone ?? "bg-brand-500"}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-ink-50 rounded-lg p-3">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="text-base font-bold text-ink-900 mt-1">{value}</p>
    </div>
  );
}

export default function ReportsTab() {
  const { p, refDate } = useProjectPage();
  const [rid, setRid] = useState<ReportId>("progress");
  const ts = activeTasks(p);
  const paid = paidTotal(p);

  const csv = (): (string | number)[][] => {
    switch (rid) {
      case "tasks":
      case "progress":
        return [["عنوان", "وضعیت", "مسئول", "اولویت", "شروع", "سررسید", "پیشرفت", "عقب‌افتاده"], ...ts.map((t) => [t.title, columnLabel(p, t.status), t.assignee, t.priority, t.start, t.due, isDone(p, t) ? 100 : t.progress, isOverdue(p, t, refDate) ? "بله" : "خیر"])];
      case "team":
        return [["عضو", "نقش", "کل تسک", "باز", "بسته", "درصد", "ساعت"], ...p.members.map((m) => { const s = memberStats(p, m.name); return [m.name, m.role, s.task_count, s.open_task_count, s.closed_task_count, s.progress_percentage, s.hours]; })];
      case "finance":
        return [["سرفصل", "تخصیص", "پرداخت‌شده"], ...p.budget.lines.map((l) => [l.category, l.allocated, p.expenses.filter((e) => e.category === l.category && e.status === "پرداخت‌شده").reduce((s, e) => s + e.amount, 0)])];
      case "time":
        return [["تسک", "برآورد ساعت", "ساعت ثبت‌شده"], ...ts.map((t) => [t.title, t.estHours, taskLoggedHours(p, t.id)])];
      case "expense":
        return [["شرح", "دسته", "مبلغ", "تاریخ", "وضعیت"], ...p.expenses.map((e) => [e.title, e.category, e.amount, e.date, e.status])];
      case "meetings":
        return [["جلسه", "تاریخ", "ساعت", "نوع", "وضعیت", "شرکت‌کنندگان"], ...p.meetings.map((m) => [m.title, m.date, m.time, m.mode, m.status, m.participants.length])];
    }
  };

  const byStatus = p.columns.map((c) => ({ label: c.label, value: ts.filter((t) => t.status === c.id).length }));
  const byPriority = (["بحرانی", "زیاد", "متوسط", "کم"] as const).map((x) => ({ label: x, value: ts.filter((t) => t.priority === x).length }));
  const byCategory = [...new Set(p.expenses.map((e) => e.category))].map((c) => ({ label: c, value: p.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        {reports.map((r) => (
          <button key={r.id} onClick={() => setRid(r.id)} className={`text-xs px-3 py-1.5 rounded-md border ${rid === r.id ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
            {r.label}
          </button>
        ))}
        <Button size="sm" variant="secondary" icon={<Download size={13} />} className="mr-auto" onClick={() => downloadText(`report-${rid}-${p.meta.id}.csv`, toCsv(csv()))}>
          خروجی CSV
        </Button>
        <Button size="sm" variant="secondary" icon={<Printer size={13} />} onClick={() => window.print()}>
          چاپ / PDF
        </Button>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <BarChart3 size={15} className="text-brand-600" /> {reports.find((r) => r.id === rid)!.label} — {p.meta.name}
          </h3>
          <span className="text-[11px] text-ink-400">تاریخ گزارش: {refDate}</span>
        </div>

        {rid === "progress" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="پیشرفت" value={`${fa(projectProgress(p))}٪`} />
              <Kpi label="تسک‌ها / انجام‌شده" value={`${fa(ts.length)} / ${fa(ts.filter((t) => isDone(p, t)).length)}`} />
              <Kpi label="عقب‌افتاده" value={fa(ts.filter((t) => isOverdue(p, t, refDate)).length)} />
              <Kpi label="مایل‌ستون محقق‌شده" value={`${fa(p.milestones.filter((m) => m.status === "انجام‌شده").length)} از ${fa(p.milestones.length)}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-ink-600 mb-2">پیشرفت تسک‌ها</p>
                <Bars rows={ts.map((t) => ({ label: t.title, value: isDone(p, t) ? 100 : t.progress, tone: isOverdue(p, t, refDate) ? "bg-rose-500" : isDone(p, t) ? "bg-emerald-500" : "bg-brand-500" }))} unit="٪" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink-600 mb-2">مایل‌ستون‌ها</p>
                <Bars
                  rows={p.milestones.map((m) => {
                    const l = m.taskIds.length;
                    const d = m.taskIds.filter((id) => { const t = p.tasks.find((x) => x.id === id); return t && isDone(p, t); }).length;
                    return { label: `${m.title} (${m.due})`, value: l ? Math.round((d / l) * 100) : m.status === "انجام‌شده" ? 100 : 0, tone: m.status === "در خطر" ? "bg-rose-500" : "bg-emerald-500" };
                  })}
                  unit="٪"
                />
              </div>
            </div>
          </div>
        )}

        {rid === "tasks" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-ink-600 mb-2">بر اساس وضعیت</p>
              <Bars rows={byStatus} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-600 mb-2">بر اساس اولویت</p>
              <Bars rows={byPriority} />
            </div>
          </div>
        )}

        {rid === "team" && (
          <Bars
            rows={p.members.filter((m) => memberStats(p, m.name).task_count > 0).map((m) => {
              const s = memberStats(p, m.name);
              return { label: `${m.name} (${m.role})`, value: s.progress_percentage, hint: `${fa(s.closed_task_count)}/${fa(s.task_count)} تسک · ${fa(s.hours)} ساعت · ${fa(s.progress_percentage)}٪` };
            })}
          />
        )}

        {rid === "finance" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="بودجه" value={fmtShort(p.budget.total)} />
              <Kpi label="هزینه‌شده" value={`${fmtShort(paid)} (${fa(budgetUsage(p))}٪)`} />
              <Kpi label="باقی‌مانده" value={fmtShort(p.budget.total - paid)} />
              <Kpi label="درآمد − هزینه" value={fmtShort(p.budget.revenue - paid)} />
            </div>
            <Bars rows={p.budget.lines.map((l) => { const s = p.expenses.filter((e) => e.category === l.category && e.status === "پرداخت‌شده").reduce((x, e) => x + e.amount, 0); return { label: l.category, value: s, hint: `${fmtShort(s)} از ${fmtShort(l.allocated)}`, tone: s > l.allocated ? "bg-rose-500" : "bg-amber-500" }; })} />
            <div>
              <p className="text-xs font-bold text-ink-600 mb-2">تخمینی در برابر واقعی (تسک‌ها)</p>
              <Bars rows={ts.filter((t) => t.estBudget).map((t) => { const a = taskActualCost(p, t.id); return { label: t.title, value: a, hint: `${fmtShort(a)} / ${fmtShort(t.estBudget)}`, tone: a > t.estBudget ? "bg-rose-500" : "bg-emerald-500" }; })} />
            </div>
          </div>
        )}

        {rid === "time" && <Bars rows={ts.filter((t) => t.estHours || taskLoggedHours(p, t.id)).map((t) => { const h = taskLoggedHours(p, t.id); return { label: t.title, value: h, hint: `${fa(h)} از ${fa(t.estHours)} ساعت`, tone: h > t.estHours ? "bg-rose-500" : "bg-brand-500" }; })} />}

        {rid === "expense" && (
          <div className="space-y-4">
            <Bars rows={byCategory.map((c) => ({ ...c, hint: fmtRial(c.value) }))} />
            <p className="text-xs text-ink-500">
              جمع کل ثبت‌شده: {fmtRial(p.expenses.reduce((s, e) => s + e.amount, 0))} · پرداخت‌شده: {fmtRial(paid)}
            </p>
          </div>
        )}

        {rid === "meetings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="جلسات" value={fa(p.meetings.length)} />
              <Kpi label="برگزارشده" value={fa(p.meetings.filter((m) => m.status === "برگزارشده").length)} />
              <Kpi label="صورت‌جلسات" value={fa(p.minutes.length)} />
              <Kpi label="مصوبات تبدیل‌شده به تسک" value={fa(p.minutes.flatMap((m) => m.actions ?? []).filter((a) => a.taskId).length)} />
            </div>
            <Bars rows={p.minutes.map((m) => ({ label: `${m.title} (${m.date})`, value: m.decisions, hint: `${fa(m.decisions)} مصوبه · ${fa(m.followUps)} پیگیری · ${fa(m.attendees)} حاضر` }))} />
          </div>
        )}
        {ts.length === 0 && rid !== "meetings" && <p className="text-xs text-ink-400">داده‌ای برای گزارش وجود ندارد.</p>}
        <p className="text-[10.5px] text-ink-400 mt-4 print:hidden">گزارش‌ها از داده‌ی زنده‌ی پروژه ساخته می‌شوند؛ هر تغییر در بورد/مالی/زمان بلافاصله اینجا منعکس می‌شود.</p>
      </div>
    </div>
  );
}
