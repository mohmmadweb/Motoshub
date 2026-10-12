import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, Flag, GanttChartSquare, ListChecks, PiggyBank, Video } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import PhaseGateModal, { gateTone } from "./StageGateCard";
import ClosureWizard, { ClosureSummary, FinalReportModal } from "./ClosureWizard";
import { TagLinks, contractTitle, fundTitle, opportunityTitle } from "./SettingsExtras";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useTenancy } from "../../context/TenancyContext";
import { users } from "../../data/mock";
import { activeTasks, isDone, isOverdue, paidTotal, projectProgress } from "../../pm/selectors";
import { dayNum, fa, fmtRial, fmtShort, fromDayNum } from "../../pm/jalali";
import { nextOccurrence } from "../../pm/recurrence";
import type { LifecyclePhase } from "../../pm/types";
import { useProjectPage, type TabId } from "./shared";

export const phases: { id: LifecyclePhase; hint: string }[] = [
  { id: "برنامه‌ریزی", hint: "تعریف هدف، زمان، بودجه و تیم" },
  { id: "اجرا", hint: "انجام تسک‌ها" },
  { id: "نظارت", hint: "بررسی پیشرفت، زمان و هزینه" },
  { id: "بررسی", hint: "بررسی کیفیت و نتایج" },
  { id: "تکمیل", hint: "پایان تسک‌ها و تحویل" },
  { id: "اختتام", hint: "گزارش نهایی و آرشیو" },
];

/** کارت شاخص قابل‌کلیک — هر عدد به بخشی که از آن می‌آید می‌رود */
function Kpi({ label, value, hint, icon, tone = "text-ink-900", onClick }: { label: string; value: string; hint?: string; icon: ReactNode; tone?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-3.5 text-right hover:border-brand-300 transition-colors min-w-0 group">
      <span className="flex items-center justify-between gap-2 text-[11.5px] text-ink-500">
        <span className="truncate">{label}</span>
        <span className="text-ink-300 group-hover:text-brand-600 shrink-0">{icon}</span>
      </span>
      <span className={`block text-lg font-bold mt-1 leading-snug truncate ${tone}`}>{value}</span>
      {hint && <span className="block text-[11px] text-ink-400 mt-0.5 truncate">{hint}</span>}
    </button>
  );
}

/** عنوان کارت = نام بخشی که خلاصه می‌کند و پیوند به همان بخش */
function CardHead({ title, sub, onOpen, action }: { title: string; sub?: string; onOpen?: () => void; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <div className="min-w-0">
        {onOpen ? (
          <button onClick={onOpen} className="text-sm font-bold text-ink-900 hover:text-brand-700 flex items-center gap-0.5">
            {title} <ChevronLeft size={14} className="text-ink-300" />
          </button>
        ) : (
          <p className="text-sm font-bold text-ink-900">{title}</p>
        )}
        {sub && <p className="text-[11px] text-ink-400">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export default function OverviewTab() {
  const { p, pid, canEdit, canManage, refDate, openTask, goTab, access, editable } = useProjectPage();
  const pm = useProjectsPM();
  const { ownerLabel, scopePath, iam } = useTenancy();
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState(false);
  const [moreInfo, setMoreInfo] = useState(false);
  const [phaseOpen, setPhaseOpen] = useState<LifecyclePhase | null>(null);

  const ts = activeTasks(p);
  const work = ts.filter((t) => t.type !== "epic");
  const done = ts.filter((t) => isDone(p, t)).length;
  const late = ts.filter((t) => isOverdue(p, t, refDate)).length;
  const progress = projectProgress(p);
  const remaining = p.budget.total - paidTotal(p);
  const ref = dayNum(refDate)!;
  const nextOf = (m: (typeof p.meetings)[number]) => (m.recurrence ? nextOccurrence(m.recurrence, m.date, ref) ?? dayNum(m.date) ?? 0 : dayNum(m.date) ?? 0);
  const nextMeeting = p.meetings.filter((m) => m.status === "برنامه‌ریزی‌شده" && nextOf(m) >= ref).sort((a, b) => nextOf(a) - nextOf(b))[0];
  const soon = ts.filter((t) => !isDone(p, t) && (dayNum(t.due) ?? 0) >= ref && (dayNum(t.due) ?? 0) - ref <= 7).sort((a, b) => (dayNum(a.due) ?? 0) - (dayNum(b.due) ?? 0));
  const nextMs = p.milestones.filter((m) => m.status !== "انجام‌شده").sort((a, b) => (dayNum(a.due) ?? 0) - (dayNum(b.due) ?? 0))[0];
  const recent = [...p.logs].sort((a, b) => b.seq - a.seq).slice(0, 6);
  const phaseIdx = phases.findIndex((x) => x.id === p.meta.phase);
  const group = pm.store.groups.find((g) => g.id === p.meta.groupId);
  const activeSprint = (p.sprints ?? []).find((x) => x.status === "فعال");
  const readyToClose = !p.closure && (p.meta.phase === "تکمیل" || (work.length > 0 && work.every((t) => isDone(p, t))));
  const lastGateOf = (ph: LifecyclePhase) => [...(p.stageGates ?? [])].filter((g) => g.phase === ph).sort((a, b) => (dayNum(b.date) ?? 0) - (dayNum(a.date) ?? 0))[0];

  const setPhase = (ph: LifecyclePhase) => {
    setPhaseOpen(null);
    // ورود به «اختتام» از مسیر ارزیابی پایان پروژه — گزارش نهایی و ارزیابی اعضا الزامی است
    if (ph === "اختتام" && !p.closure) return setClosing(true);
    pm.updateMeta(pid, { phase: ph });
  };

  // ---- پیوندها: هر مقدار به صفحه‌ی منبعش
  const person = (name: string) => {
    const u = users.find((x) => x.name === name);
    return u ? <Link to={`/dashboard/profile/${u.id}`} className="text-brand-700 hover:underline">{name}</Link> : name || "—";
  };
  const tabLink = (tab: TabId, text: ReactNode) => (access.canSeeTab(tab) ? <button onClick={() => goTab(tab)} className="text-brand-700 hover:underline text-right">{text}</button> : text);
  const company = p.meta.companyName ? iam.scopes.find((sc) => sc.name === p.meta.companyName) : undefined;
  const rows: [string, ReactNode][] = [
    ["کارفرما", p.meta.client || "—"],
    ["مدیر پروژه", person(p.meta.manager)],
    ["بازه", `${p.meta.start} تا ${p.meta.deadline}`],
    ["تیم", tabLink("team", `${fa(p.members.length)} عضو`)],
    ...(p.meta.fundId && fundTitle(p.meta.fundId) ? ([["صندوق نوآوری", <Link to={`/dashboard/funds?focus=${p.meta.fundId}`} className="text-brand-700 hover:underline">{fundTitle(p.meta.fundId)}</Link>]] as [string, ReactNode][]) : []),
    ...(p.meta.contractId && contractTitle(p.meta.contractId) ? ([["قرارداد فناورانه", <Link to={`/dashboard/contracts?focus=${p.meta.contractId}`} className="text-brand-700 hover:underline">{contractTitle(p.meta.contractId)}</Link>]] as [string, ReactNode][]) : []),
    ...(p.meta.opportunityId && opportunityTitle(p.meta.opportunityId) ? ([["فرصت پژوهشی", <Link to={`/dashboard/research?focus=${p.meta.opportunityId}`} className="text-brand-700 hover:underline">{opportunityTitle(p.meta.opportunityId)}</Link>]] as [string, ReactNode][]) : []),
    ...(p.meta.companyName ? ([["شرکت / مجری", company ? <Link to={`/dashboard/org/${company.id}`} className="text-brand-700 hover:underline">{p.meta.companyName}</Link> : p.meta.companyName]] as [string, ReactNode][]) : []),
  ];
  const extraRows: [string, ReactNode][] = [
    ["حامی مالی", p.meta.sponsor || "—"],
    ["مسئول مالی", person(p.meta.financeOfficer)],
    ["سلامت", p.meta.health],
    ["اولویت", p.meta.priority],
    ["بودجه‌ی کل", access.can("budget") ? tabLink("budget", fmtRial(p.budget.total)) : "—"],
    ...(activeSprint ? ([["اسپرینت فعال", tabLink("sprints", `${activeSprint.name} (تا ${activeSprint.end})`)]] as [string, ReactNode][]) : []),
    ["کلید پروژه", p.meta.key ?? "—"],
    ["فضای کاری", p.meta.scopeId ? <Link to={`/dashboard/org/${p.meta.scopeId}`} className="text-brand-700 hover:underline">{scopePath(p.meta.scopeId)}</Link> : p.meta.workspace],
    ["مالک محتوا", ownerLabel(p.meta)],
    ["سطح دسترسی", p.meta.visibility],
    ["ایجاد", p.meta.createdAt],
  ];

  return (
    <div className="space-y-4">
      {/* شاخص‌های اصلی — هر کدام به بخش منبع */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="پیشرفت" value={`${fa(progress)}٪`} hint={`مرحله: ${p.meta.phase}`} icon={<GanttChartSquare size={15} />} tone="text-brand-700" onClick={() => goTab("board")} />
        <Kpi label="تسک‌های انجام‌شده" value={`${fa(done)} از ${fa(ts.length)}`} hint={`${fa(ts.length - done)} باقی‌مانده`} icon={<ListChecks size={15} />} onClick={() => goTab("board")} />
        <Kpi label="عقب‌افتاده" value={fa(late)} hint={late ? "از سررسید گذشته" : "همه در موعد"} icon={<AlertTriangle size={15} />} tone={late ? "text-rose-600" : "text-emerald-700"} onClick={() => goTab("board")} />
        {access.can("budget") && <Kpi label="بودجه‌ی باقی‌مانده" value={fmtShort(remaining)} hint={`از ${fmtShort(p.budget.total)} ریال`} icon={<PiggyBank size={15} />} tone={remaining < 0 ? "text-rose-600" : "text-ink-900"} onClick={() => goTab("budget")} />}
        {access.can("meetings") && <Kpi label="جلسه‌ی بعدی" value={nextMeeting ? fromDayNum(nextOf(nextMeeting)) : "—"} hint={nextMeeting ? `${nextMeeting.time} · ${nextMeeting.title}` : "جلسه‌ای تنظیم نشده"} icon={<Video size={15} />} onClick={() => goTab("minutes", nextMeeting?.id)} />}
      </div>

      {/* چرخه‌ی عمر + بازبینی هر مرحله */}
      <div className="card px-3 py-2.5">
        <div className="flex items-center gap-1 overflow-x-auto" aria-label="چرخه‌ی عمر پروژه">
          <span className="text-xs font-bold text-ink-600 ml-2 whitespace-nowrap">چرخه‌ی عمر:</span>
          {phases.map((ph, i) => {
            const g = lastGateOf(ph.id);
            return (
              <button
                key={ph.id}
                onClick={() => setPhaseOpen(ph.id)}
                title={`${ph.hint} — برای بازبینی این مرحله کلیک کنید`}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${i === phaseIdx ? "bg-brand-600 text-white font-medium" : i < phaseIdx ? "text-emerald-700 hover:bg-emerald-50" : "text-ink-400 hover:bg-ink-50"}`}
              >
                {i < phaseIdx && <CheckCircle2 size={12} />}
                {ph.id}
                {g && access.can("gates") && <span className={`w-1.5 h-1.5 rounded-full ${gateTone[g.decision] === "success" ? "bg-emerald-400" : gateTone[g.decision] === "warning" ? "bg-amber-400" : "bg-rose-500"}`} title={`بازبینی: ${g.decision}`} />}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-ink-400 mt-1.5 pr-1">روی هر مرحله بزنید تا بازبینی آن (ادامه / اصلاح / توقف) و سابقه‌اش را ببینید.</p>
      </div>

      {readyToClose && canEdit && canManage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs p-3 flex items-center gap-2 flex-wrap">
          <Flag size={14} /> {p.meta.phase === "تکمیل" ? "پروژه در مرحله‌ی «تکمیل» است." : "همه‌ی کارهای پروژه انجام شده است."} برای اختتام، ارزیابی نهایی را ثبت کنید.
          <Button size="sm" variant="primary" className="mr-auto" icon={<Flag size={13} />} onClick={() => setClosing(true)}>
            شروع اختتام پروژه
          </Button>
        </div>
      )}
      {p.closure && (
        <div id="closure-summary">
          <ClosureSummary onOpen={() => setReport(true)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="card p-4">
            <CardHead
              title="آخرین فعالیت‌ها"
              action={
                access.can("history") && (
                  <button onClick={() => goTab("history")} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                    تاریخچه‌ی کامل ({fa(p.logs.length)})
                  </button>
                )
              }
            />
            <ul className="divide-y divide-ink-100">
              {recent.map((l) => (
                <li key={l.id} className="py-1.5 flex items-start gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-[7px] shrink-0" />
                  <p className="text-xs text-ink-800 leading-5 min-w-0 flex-1 line-clamp-2">{l.description}</p>
                  <span className="text-[10.5px] text-ink-400 whitespace-nowrap shrink-0 mt-0.5">{l.date}</span>
                </li>
              ))}
              {recent.length === 0 && <li className="py-2 text-[11px] text-ink-400">هنوز فعالیتی ثبت نشده است.</li>}
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {access.can("milestones") && (
              <div className="card p-4">
                <CardHead title="مایل‌ستون‌ها" sub="مایل‌ستون بعدی" onOpen={() => goTab("milestones", nextMs?.id)} />
                {nextMs ? (
                  <button onClick={() => goTab("milestones", nextMs.id)} className="w-full text-right">
                    <p className="text-[13px] text-ink-800 hover:text-brand-700">{nextMs.title}</p>
                    <p className="text-[11px] text-ink-400 mt-1">
                      سررسید {nextMs.due} · <span className={nextMs.status === "در خطر" ? "text-rose-600" : ""}>{nextMs.status}</span>
                    </p>
                  </button>
                ) : (
                  <p className="text-[11px] text-ink-400">مایل‌ستون بازی نمانده است.</p>
                )}
              </div>
            )}
            {access.can("tasks") && (
              <div className="card p-4">
                <CardHead title="وظایف" sub="سررسیدهای ۷ روز آینده" onOpen={() => goTab("board")} />
                {soon.slice(0, 5).map((t) => (
                  <button key={t.id} onClick={() => openTask(t.id)} className="flex justify-between gap-2 w-full text-xs py-1 text-ink-700 hover:text-brand-700">
                    <span className="truncate">{t.title}</span>
                    <span className="text-ink-400 shrink-0">{t.due}</span>
                  </button>
                ))}
                {soon.length > 5 && <p className="text-[11px] text-ink-400 mt-1">و {fa(soon.length - 5)} مورد دیگر</p>}
                {soon.length === 0 && <p className="text-[11px] text-ink-400">سررسیدی در ۷ روز آینده نیست.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="card p-4 min-w-0">
          <CardHead title="مشخصات پروژه" onOpen={access.canSeeTab("settings") ? () => goTab("settings") : undefined} />
          {p.meta.description && <p className="text-xs text-ink-600 leading-6 mb-2">{p.meta.description}</p>}
          <div className="flex flex-wrap gap-1 mb-3">
            <Badge tone="brand">{p.meta.category}</Badge>
            {group && (
              <span className="text-[10.5px] px-1.5 py-0.5 rounded border" style={{ color: group.color, borderColor: `color-mix(in srgb, ${group.color} 35%, transparent)` }}>
                گروه: {group.name}
              </span>
            )}
            <TagLinks tags={p.meta.tags} />
          </div>
          <dl className="text-[11.5px] grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            {[...rows, ...(moreInfo ? extraRows : [])].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-400 whitespace-nowrap">{k}</dt>
                <dd className="text-ink-700 min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <button onClick={() => setMoreInfo((v) => !v)} className="text-[11px] text-brand-700 hover:underline mt-2">
            {moreInfo ? "نمایش کمتر" : "نمایش بیشتر"}
          </button>
        </div>
      </div>

      {phaseOpen && (
        <PhaseGateModal
          phase={phaseOpen}
          hint={phases.find((x) => x.id === phaseOpen)?.hint ?? ""}
          onClose={() => setPhaseOpen(null)}
          canSetPhase={canEdit}
          onSetPhase={() => setPhase(phaseOpen)}
          canSeeGates={access.can("gates")}
          canRecord={editable && canManage && access.can("gates", "write")}
        />
      )}
      {closing && <ClosureWizard onClose={() => setClosing(false)} />}
      {report && <FinalReportModal onClose={() => setReport(false)} />}
    </div>
  );
}
