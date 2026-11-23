// مانیتورینگ وظایف (میزیتو): همه‌ی کارهای دامنه با فیلتر، گزارش کل کارهای دارای تأخیر، چاپ فهرست
// فیلترشده، و «کارتابل همکار» فقط‌خواندنی (افراد = اجتماع زیردرخت عضویت‌های مدیر).
import { useMemo, useState } from "react";
import Pill from "../../components/ui/Pill";
import { useProjectsPM } from "../../context/ProjectsContext";
import { delayDays, isAssignedTo } from "../../pm/rules";
import TaskInbox, { type InboxItem } from "../project/TaskInbox";
import { useMonitorScope } from "./shared";

export default function TasksMonitor({ person: initialPerson = "" }: { person?: string }) {
  const pm = useProjectsPM();
  const { projects, people } = useMonitorScope();
  const [mode, setMode] = useState<"all" | "overdue" | "person">(initialPerson ? "person" : "all");
  const [person, setPerson] = useState(initialPerson || people[0]?.name || "");
  const [who, setWho] = useState("");
  const all = useMemo<InboxItem[]>(() => projects.filter((p) => !p.meta.archived).flatMap((p) => p.tasks.filter((t) => !t.archived).map((t) => ({ p, t }))), [projects]);
  const scoped = who ? all.filter((x) => isAssignedTo(x.t, who)) : all;
  const overdue = scoped.filter((x) => delayDays(x.t, pm.refDate) > 0).sort((a, b) => delayDays(b.t, pm.refDate) - delayDays(a.t, pm.refDate));
  const colleague = all.filter((x) => isAssignedTo(x.t, person));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill pressed={mode === "all"} onClick={() => setMode("all")}>
          همه‌ی کارها
        </Pill>
        <Pill pressed={mode === "overdue"} dot="danger" onClick={() => setMode("overdue")}>
          گزارش کل کارهای دارای تأخیر
        </Pill>
        <Pill pressed={mode === "person"} onClick={() => setMode("person")}>
          کارتابل همکار
        </Pill>
        {mode !== "person" ? (
          <select className="input-field !w-auto mr-auto" value={who} onChange={(e) => setWho(e.target.value)} aria-label="مسئول">
            <option value="">همه‌ی مسئولان</option>
            {people.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <select className="input-field !w-auto mr-auto" value={person} onChange={(e) => setPerson(e.target.value)} aria-label="همکار">
            {people.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {mode === "all" && <TaskInbox key="all" person="" items={scoped} readOnly showOwner printTitle="مانیتورینگ وظایف" />}
      {mode === "overdue" && <TaskInbox key="overdue" person="" items={overdue} readOnly showOwner initial="overdue" printTitle="گزارش کل کارهای دارای تأخیر" />}
      {mode === "person" && person && <TaskInbox key={`p-${person}`} person={person} items={colleague} readOnly printTitle={`کارتابل وظایف ${person}`} />}
    </div>
  );
}
