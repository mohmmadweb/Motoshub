// مانیتورینگ پروژه‌ها (میزیتو): پیشرفت، چهار دسته‌ی کارها، بیشترین تأخیر، پرکارترین فرد، مرتب‌سازی، بایگانی، چاپ
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Printer } from "lucide-react";
import FilterBar from "../../components/ui/FilterBar";
import StatusBar from "../../components/ui/StatusBar";
import Progress from "../../components/ui/Progress";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import { projectProgress } from "../../pm/selectors";
import { assigneesOf, delayDays, monitorBucket, monitorCounts } from "../../pm/rules";
import { printNode } from "../../pm/print";
import { useMonitorScope } from "./shared";

type Sort = "delay" | "least" | "progress" | "name";

export default function ProjectsMonitor() {
  const pm = useProjectsPM();
  const { projects } = useMonitorScope();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("delay");
  const [archived, setArchived] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const rows = projects
    .filter((p) => archived || !p.meta.archived)
    .filter((p) => !q || p.meta.name.includes(q))
    .map((p) => {
      const live = p.tasks.filter((t) => !t.archived);
      const c = monitorCounts(p, live, pm.refDate);
      const late = live.filter((t) => monitorBucket(p, t, pm.refDate) === "overdue").sort((a, b) => delayDays(b, pm.refDate) - delayDays(a, pm.refDate));
      const load = new Map<string, number>();
      live.filter((t) => monitorBucket(p, t, pm.refDate) !== "done").forEach((t) => assigneesOf(t).forEach((n) => load.set(n, (load.get(n) ?? 0) + 1)));
      const busiest = [...load.entries()].sort((a, b) => b[1] - a[1])[0];
      return { p, c, worst: late[0], busiest, progress: projectProgress(p) };
    })
    .sort((a, b) => (sort === "delay" ? b.c.overdue - a.c.overdue : sort === "least" ? a.c.overdue - b.c.overdue : sort === "progress" ? b.progress - a.progress : a.p.meta.name.localeCompare(b.p.meta.name, "fa")));
  return (
    <div className="card">
      <FilterBar search={q} onSearch={setQ} searchPlaceholder="عنوان پروژه…">
        <select className="input-field !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="مرتب‌سازی">
          <option value="delay">بیشترین تأخیر</option>
          <option value="least">کمترین تأخیر</option>
          <option value="progress">بیشترین پیشرفت</option>
          <option value="name">عنوان</option>
        </select>
        <label className="flex items-center gap-1.5 text-[13px]">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="w-4 h-4" /> بایگانی‌شده‌ها
        </label>
        <Button size="sm" variant="ghost" icon={<Printer size={14} />} onClick={() => printNode(ref.current, "مانیتورینگ پروژه‌ها", { landscape: true })}>
          چاپ
        </Button>
      </FilterBar>
      <div ref={ref} className="divide-y divide-[var(--color-border)]">
        {rows.map(({ p, c, worst, busiest, progress }) => (
          <div key={p.meta.id} className="p-4 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-3 items-center">
            <div className="min-w-0">
              <Link to={`/projects/${p.meta.id}`} className="font-bold text-ink-900 hover:text-teal-700">
                {p.meta.name}
              </Link>
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={progress} className="flex-1" />
                <span className="text-[12.5px] text-ink-600 tabular-nums">{fa(progress)}٪</span>
                <Badge tone={p.meta.health === "سبز" ? "success" : p.meta.health === "زرد" ? "warning" : "danger"} dot>
                  {p.meta.health}
                </Badge>
              </div>
            </div>
            <div>
              <StatusBar
                segments={[
                  { label: "انجام‌شده", value: c.done, tone: "success" },
                  { label: "دارای تأخیر", value: c.overdue, tone: "danger" },
                  { label: "زمان‌دار", value: c.scheduled, tone: "info" },
                  { label: "بدون زمان", value: c.unscheduled, tone: "neutral" },
                ]}
              />
            </div>
            <div className="text-[12.5px] text-ink-600 space-y-0.5">
              <p>بیشترین تأخیر: {worst ? `«${worst.title}» — ${worst.assignee} (${fa(delayDays(worst, pm.refDate))} روز)` : "ندارد"}</p>
              <p>بیشترین کار باز: {busiest ? `${busiest[0]} (${fa(busiest[1])} کار)` : "—"}</p>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="p-5">
            <EmptyState compact title="پروژه‌ای در دامنه‌ی پایش شما نیست" />
          </div>
        )}
      </div>
    </div>
  );
}
