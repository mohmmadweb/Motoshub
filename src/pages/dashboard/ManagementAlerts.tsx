// ---------------------------------------------------------------------------
// کارت «هشدارهای مدیریتی» — فقط برای مدیران (گزارش پروژه‌ها، مدیر سامانه یا مدیر
// هلدینگ/شرکت). هر هشدار به رکورد مبدأ پیوند دارد و فقط داده‌ی داخل دامنه‌ی دید
// کاربر (filterScoped / canSee) شمرده می‌شود.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertOctagon, BookOpen, ChevronLeft, FileSignature, Flag, HeartPulse, Landmark, Moon, Wallet } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useInnovation } from "../../context/InnovationContext";
import { budgetUsage, isDone } from "../../pm/selectors";
import { dayNum, fa } from "../../pm/jalali";
import { dormantFunded, guaranteeAlerts, overdueObligations } from "../../innovation/extras";
import { rialShort } from "../../innovation/util";
import { useDormantThreshold } from "../innovation/FundWatch";
import type { GlobalFilter } from "../../reports/types";

type Alert = { key: string; group: AlertGroup; title: string; sub: string; to: string; severity: 2 | 1; project?: string; person?: string };
type AlertGroup = "health" | "budget" | "milestone" | "obligation" | "guarantee" | "dormant" | "knowledge";

const GROUPS: Record<AlertGroup, { label: string; icon: typeof Flag; tone: string }> = {
  health: { label: "سلامت قرمز", icon: HeartPulse, tone: "text-rose-600" },
  budget: { label: "عبور از بودجه", icon: Wallet, tone: "text-rose-600" },
  milestone: { label: "نقطه‌ی عطف در خطر", icon: Flag, tone: "text-amber-600" },
  obligation: { label: "تعهد قراردادی معوق", icon: FileSignature, tone: "text-rose-600" },
  guarantee: { label: "ضمانت‌نامه رو به انقضا", icon: Landmark, tone: "text-amber-600" },
  dormant: { label: "طرح خوابیده‌ی صندوق", icon: Moon, tone: "text-amber-600" },
  knowledge: { label: "گردش کار دانش معوق", icon: BookOpen, tone: "text-amber-600" },
};

/** آیا کاربر فعلی کارت هشدارهای مدیریتی را می‌بیند؟ */
export function useIsManager() {
  const t = useTenancy();
  return t.hasPermission("projects.reports") || t.hasPermission("settings.system") || t.myBindings.some((b) => t.isAdminRole(b.role) && (b.scope.type === "system" || b.scope.type === "holding" || b.scope.type === "company"));
}

export function useManagementAlerts(filter?: GlobalFilter): Alert[] {
  const { filterScoped, today } = useTenancy();
  const pm = useProjectsPM();
  const km = useKnowledge();
  const inn = useInnovation();
  const threshold = useDormantThreshold();
  return useMemo(() => {
    const out: Alert[] = [];
    const ref = dayNum(pm.refDate) ?? 0;
    const visible = filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p })))
      .map((x) => x._p)
      .filter((p) => !p.meta.archived);
    visible.forEach((p) => {
      const base = `/dashboard/projects/${p.meta.id}`;
      if (p.meta.health === "قرمز") out.push({ key: `h-${p.meta.id}`, group: "health", title: p.meta.name, sub: `مدیر: ${p.meta.manager} · فاز ${p.meta.phase}`, to: `${base}?tab=overview`, severity: 2, project: p.meta.name, person: p.meta.manager });
      const usage = budgetUsage(p);
      if (usage > 100) out.push({ key: `b-${p.meta.id}`, group: "budget", title: p.meta.name, sub: `${fa(usage)}٪ بودجه مصرف شده (${rialShort(p.budget.total)})`, to: `${base}?tab=budget`, severity: 2, project: p.meta.name, person: p.meta.manager });
      p.milestones.forEach((m) => {
        if (m.status === "انجام‌شده") return;
        const due = dayNum(m.due);
        const ts = p.tasks.filter((t) => m.taskIds.includes(t.id) || t.milestoneId === m.id);
        const pct = ts.length ? Math.round((ts.filter((t) => isDone(p, t)).length / ts.length) * 100) : 0;
        const soon = due !== null && due - ref <= 14;
        if (m.status === "در خطر" || (soon && pct < 70))
          out.push({ key: `m-${p.meta.id}-${m.id}`, group: "milestone", title: `${m.title} — ${p.meta.name}`, sub: `سررسید ${m.due}${due !== null && due < ref ? " (گذشته)" : ""} · ${fa(pct)}٪ تکمیل`, to: `${base}?tab=milestones&focus=${m.id}`, severity: due !== null && due < ref ? 2 : 1, project: p.meta.name, person: m.owner });
      });
    });
    const contracts = filterScoped(inn.contracts);
    overdueObligations(contracts, today).forEach(({ c, m, days }) =>
      out.push({ key: `o-${c.id}-${m.id}`, group: "obligation", title: `${m.title} — ${c.title}`, sub: `${fa(days)} روز از سررسید ${m.due} گذشته · ${c.vendor}`, to: `/dashboard/contracts?open=${c.id}`, severity: 2, person: c.owner })
    );
    guaranteeAlerts(contracts, today).forEach(({ c, g, days, level }) =>
      out.push({ key: `g-${g.id}`, group: "guarantee", title: `${g.kind} — ${c.title}`, sub: `${g.bank} · ${level === 0 ? `${fa(-days)} روز از سررسید گذشته` : `${fa(days)} روز تا سررسید`}`, to: `/dashboard/contracts?open=${c.id}`, severity: level === 0 || level === 7 ? 2 : 1, person: c.owner })
    );
    dormantFunded(inn, inn.today, threshold, { nf: filterScoped(inn.nfProjects), employment: filterScoped(inn.employment) }).forEach((d) =>
      out.push({ key: `d-${d.id}`, group: "dormant", title: d.title, sub: `${d.days >= 9999 ? "بدون رویداد ثبت‌شده" : `${fa(d.days)} روز بدون رویداد`} · آخرین: ${d.lastAt ?? "—"}`, to: d.link, severity: d.days >= threshold * 2 ? 2 : 1 })
    );
    filterScoped(km.docs)
      .filter(km.canSee)
      .forEach((d) => {
        const fi = km.flowInfo(d);
        if (fi && fi.overdueDays > 0)
          out.push({ key: `k-${d.id}`, group: "knowledge", title: d.title, sub: `مرحله‌ی «${fi.step.name}» · ${fa(fi.overdueDays)} روز تأخیر · ${fi.actors.join("، ") || "—"}`, to: `/dashboard/knowledge?tab=workflow&doc=${d.id}`, severity: fi.overdueDays > 7 ? 2 : 1, person: fi.actors[0] });
      });
    return out
      .filter((a) => !filter?.project || a.project === filter.project)
      .filter((a) => !filter?.person || a.person === filter.person)
      .sort((a, b) => b.severity - a.severity);
  }, [filterScoped, pm.projects, pm.refDate, inn, km, today, threshold, filter?.project, filter?.person]);
}

export function ManagementAlertsCard({ filter }: { filter?: GlobalFilter }) {
  const alerts = useManagementAlerts(filter);
  const [group, setGroup] = useState<AlertGroup | "all">("all");
  const [more, setMore] = useState(false);
  const counts = alerts.reduce<Partial<Record<AlertGroup, number>>>((m, a) => ({ ...m, [a.group]: (m[a.group] ?? 0) + 1 }), {});
  const list = group === "all" ? alerts : alerts.filter((a) => a.group === group);
  const shown = more ? list : list.slice(0, 6);
  const critical = alerts.filter((a) => a.severity === 2).length;
  return (
    <div className="card p-3.5 h-full flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-xs font-bold text-ink-800 flex items-center gap-1.5">
          <AlertOctagon size={14} className="text-rose-600" /> هشدارهای مدیریتی
          {alerts.length > 0 && <span className="text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-1.5">{fa(alerts.length)}</span>}
        </p>
        {critical > 0 && <Badge tone="danger">{fa(critical)} بحرانی</Badge>}
      </div>
      {alerts.length === 0 ? (
        <p className="text-[11.5px] text-ink-400 py-1">در دامنه‌ی شما هشدار مدیریتی فعالی نیست.</p>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1.5 -mx-0.5 px-0.5">
            <button type="button" onClick={() => setGroup("all")} className={`text-[11px] whitespace-nowrap rounded-full border px-2 py-0.5 ${group === "all" ? "bg-navy-900 text-white border-navy-900" : "border-ink-200 text-ink-600"}`}>
              همه {fa(alerts.length)}
            </button>
            {(Object.keys(GROUPS) as AlertGroup[])
              .filter((g) => counts[g])
              .map((g) => (
                <button key={g} type="button" onClick={() => setGroup(g)} className={`text-[11px] whitespace-nowrap rounded-full border px-2 py-0.5 ${group === g ? "bg-navy-900 text-white border-navy-900" : "border-ink-200 text-ink-600"}`}>
                  {GROUPS[g].label} {fa(counts[g]!)}
                </button>
              ))}
          </div>
          <div className="space-y-1.5 flex-1">
            {shown.map((a) => {
              const G = GROUPS[a.group];
              return (
                <Link key={a.key} to={a.to} className={`flex items-center gap-2 text-[12px] rounded-lg border px-2.5 py-1.5 hover:border-brand-300 ${a.severity === 2 ? "border-rose-200 bg-rose-50/40" : "border-ink-100"}`}>
                  <G.icon size={13} className={`${G.tone} shrink-0`} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-ink-800">{a.title}</span>
                    <span className="block truncate text-[10.5px] text-ink-500">
                      {G.label} · {a.sub}
                    </span>
                  </span>
                  <ChevronLeft size={13} className="text-ink-300 shrink-0" />
                </Link>
              );
            })}
          </div>
          {list.length > 6 && (
            <button type="button" onClick={() => setMore((v) => !v)} className="text-[11px] text-brand-700 font-medium mt-2 self-start">
              {more ? "نمایش کمتر" : `نمایش همه (${fa(list.length)})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
