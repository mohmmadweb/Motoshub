// مانیتورینگ وضعیت عملکرد اعضا (میزیتو): برای هر همکار کارهای باز/انجام‌شده/دارای تأخیر، پروژه‌ها و جلسات
import { useState } from "react";
import { Printer } from "lucide-react";
import { useRef } from "react";
import Button from "../../components/ui/Button";
import Avatar from "../../components/Avatar";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useMeetings } from "../../context/MeetingsContext";
import { fa } from "../../pm/jalali";
import { isDone } from "../../pm/selectors";
import { delayDays, isAssignedTo } from "../../pm/rules";
import { printNode } from "../../pm/print";
import { useMonitorScope } from "./shared";

export default function MembersMonitor({ onCartable }: { onCartable: (name: string) => void }) {
  const pm = useProjectsPM();
  const m = useMeetings();
  const { projects, people } = useMonitorScope();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const rows = people
    .filter((u) => !q || u.name.includes(q))
    .map((u) => {
      const tasks = projects.filter((p) => !p.meta.archived).flatMap((p) => p.tasks.filter((t) => !t.archived && isAssignedTo(t, u.name)).map((t) => ({ p, t })));
      const open = tasks.filter((x) => !isDone(x.p, x.t));
      return {
        u,
        open: open.length,
        done: tasks.length - open.length,
        late: open.filter((x) => delayDays(x.t, pm.refDate) > 0).length,
        projects: projects.filter((p) => p.meta.manager === u.name || p.members.some((x) => x.name === u.name || x.userId === u.id)).length,
        meetings: m.views.filter((v) => v.participants.some((x) => (x.principal_id === u.id || x.name === u.name) && x.attendance === "present")).length,
      };
    })
    .sort((a, b) => b.late - a.late || b.open - a.open);
  const th = "px-3 py-2 text-right text-[12.5px] font-medium text-ink-500 bg-ink-50";
  const td = "px-3 py-2.5 text-sm border-t border-[var(--color-border)] tabular-nums";
  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)]">
        <input className="input-field flex-1" placeholder="نام همکار…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" variant="ghost" icon={<Printer size={14} />} onClick={() => printNode(ref.current, "مانیتورینگ اعضا")}>
          چاپ
        </Button>
      </div>
      <div ref={ref} className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              {["همکار", "کار باز", "دارای تأخیر", "انجام‌شده", "پروژه‌ها", "حضور در جلسه", ""].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.u.id}>
                <td className={td}>
                  <span className="flex items-center gap-2">
                    <Avatar name={r.u.name} size={28} />
                    {r.u.name}
                  </span>
                </td>
                <td className={td}>{fa(r.open)}</td>
                <td className={`${td} ${r.late ? "text-rose-700 font-bold" : ""}`}>{fa(r.late)}</td>
                <td className={td}>{fa(r.done)}</td>
                <td className={td}>{fa(r.projects)}</td>
                <td className={td}>{fa(r.meetings)}</td>
                <td className={td}>
                  <Button size="sm" variant="link" className="no-print" onClick={() => onCartable(r.u.name)}>
                    کارتابل
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
