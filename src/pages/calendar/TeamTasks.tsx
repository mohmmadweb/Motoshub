// ---------------------------------------------------------------------------
// «تقویم تیم» (میزیتو: نمایش وظایف فعال کلیه همکاران در تقویم کاری مشترک، توسط مدیر).
// افراد = اجتماع زیردرخت عضویت‌های مدیر (visibleUserIds)؛ نمایش بر اساس سررسید یا یادآوری؛
// فیلتر همکار/پروژه؛ کارهای بدون زمان جدا شمرده می‌شوند.
// ---------------------------------------------------------------------------
import { useMemo, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { users as allUsers } from "../../data/mock";
import { dayNum, fa } from "../../pm/jalali";
import { isDone } from "../../pm/selectors";
import { assigneesOf } from "../../pm/rules";
import { MonthView, AgendaView } from "./views";
import { taskLink, type CalItem } from "./model";

const palette = ["var(--color-teal-600)", "var(--color-navy-600)", "var(--color-amber-600)", "var(--color-rose-600)", "var(--color-emerald-600)", "var(--color-ink-500)"];

export default function TeamTasks({ jy, jm, todayN, from, to, view }: { jy: number; jm: number; todayN: number; from: number; to: number; view: "month" | "list" }) {
  const { visibleUserIds, actingUser } = useTenancy();
  const pm = useProjectsPM();
  const navigate = useNavigate();
  const [by, setBy] = useState<"due" | "reminder">("due");
  const [who, setWho] = useState("");
  const [proj, setProj] = useState("");
  const people = useMemo(() => {
    const ids = new Set(visibleUserIds());
    return allUsers.filter((u) => ids.has(u.id) && u.id !== actingUser.id);
  }, [visibleUserIds, actingUser.id]);
  const names = new Set(people.map((u) => u.name));
  const colorOf = (n: string) => palette[[...names].indexOf(n) % palette.length] ?? palette[0];
  const rows = pm.projects
    .filter((p) => !p.meta.archived && (!proj || p.meta.id === proj))
    .flatMap((p) => p.tasks.filter((t) => !t.archived && !isDone(p, t)).flatMap((t) => assigneesOf(t).filter((n) => names.has(n) && (!who || n === who)).map((n) => ({ p, t, n }))));
  const items: CalItem[] = rows
    .map(({ p, t, n }) => {
      const d = dayNum(by === "reminder" ? t.reminder ?? t.due : t.due);
      return d === null
        ? null
        : ({ key: `tt:${p.meta.id}:${t.id}:${n}`, layer: "tasks", title: `${n.split(" ").slice(-1)[0]}: ${t.title}`, day: d, start: null, end: null, color: colorOf(n), sub: p.meta.name, link: taskLink(p.meta.id, t.id), details: [["مسئول", n], ["پروژه", p.meta.name], ["سررسید", t.due], ["یادآوری", t.reminder ?? "—"]] } as CalItem);
    })
    .filter((x): x is CalItem => !!x && x.day >= from && x.day <= to);
  const unscheduled = rows.filter(({ t }) => dayNum(t.due) === null).length;
  const open = (it: CalItem, _e: MouseEvent) => it.link && navigate(it.link);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input-field !w-auto" value={who} onChange={(e) => setWho(e.target.value)} aria-label="همکار">
          <option value="">همه‌ی همکاران ({fa(people.length)})</option>
          {people.map((u) => (
            <option key={u.id} value={u.name}>
              {u.name}
            </option>
          ))}
        </select>
        <select className="input-field !w-auto" value={proj} onChange={(e) => setProj(e.target.value)} aria-label="پروژه">
          <option value="">همه‌ی پروژه‌ها</option>
          {pm.projects.filter((p) => !p.meta.archived).map((p) => (
            <option key={p.meta.id} value={p.meta.id}>
              {p.meta.name}
            </option>
          ))}
        </select>
        <select className="input-field !w-auto" value={by} onChange={(e) => setBy(e.target.value as "due" | "reminder")} aria-label="نمایش بر اساس">
          <option value="due">بر اساس سررسید</option>
          <option value="reminder">بر اساس یادآوری</option>
        </select>
        <span className="text-[12.5px] text-ink-500">
          {fa(items.length)} کار فعال در این بازه{unscheduled ? ` · ${fa(unscheduled)} کار بدون زمان` : ""}
        </span>
      </div>
      {view === "month" ? <MonthView jy={jy} jm={jm} todayN={todayN} items={items} onItem={open} /> : <AgendaView from={from} to={to} todayN={todayN} items={items} onItem={open} />}
      <p className="text-[12px] text-ink-500">فقط همکارانی دیده می‌شوند که در واحدهای زیرمجموعه‌ی عضویت‌های شما هستند.</p>
    </div>
  );
}
