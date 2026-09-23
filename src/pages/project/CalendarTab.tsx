import { useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Video, CircleDot, PlayCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import { dayNum, fa, formatJalali, monthLength, monthNames, parseJalali, weekDayNames, weekdayOf } from "../../pm/jalali";
import { isDone } from "../../pm/selectors";
import { useProjectPage } from "./shared";

type Ev = { id: string; kind: "due" | "start" | "milestone" | "meeting"; title: string; onClick: () => void; tone: string };

export default function CalendarTab() {
  const { p, refDate, openTask, goTab } = useProjectPage();
  const r = parseJalali(refDate)!;
  const [view, setView] = useState<[number, number]>([r[0], r[1]]);
  const [showStarts, setShowStarts] = useState(false);
  const [picked, setPicked] = useState<string | null>(refDate);
  const [vy, vm] = view;
  const len = monthLength(vy, vm);
  const first = formatJalali(vy, vm, 1);
  const lead = weekdayOf(first);

  const eventsOn = (date: string): Ev[] => {
    const d = dayNum(date);
    const out: Ev[] = [];
    p.tasks.forEach((t) => {
      if (t.archived) return;
      if (dayNum(t.due) === d) out.push({ id: `d-${t.id}`, kind: "due", title: t.title, onClick: () => openTask(t.id), tone: isDone(p, t) ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700" });
      if (showStarts && dayNum(t.start) === d) out.push({ id: `s-${t.id}`, kind: "start", title: t.title, onClick: () => openTask(t.id), tone: "bg-sky-50 text-sky-700" });
    });
    p.milestones.forEach((m) => dayNum(m.due) === d && out.push({ id: `m-${m.id}`, kind: "milestone", title: m.title, onClick: () => goTab("milestones", m.id), tone: "bg-brand-50 text-brand-700" }));
    p.meetings.forEach((m) => m.status !== "لغوشده" && dayNum(m.date) === d && out.push({ id: `mt-${m.id}`, kind: "meeting", title: `${m.time} ${m.title}`, onClick: () => goTab("minutes", m.id), tone: "bg-amber-50 text-amber-700" }));
    return out;
  };

  const icon = (k: Ev["kind"]) => (k === "due" ? <CircleDot size={10} /> : k === "start" ? <PlayCircle size={10} /> : k === "milestone" ? <Flag size={10} /> : <Video size={10} />);
  const cells = Array.from({ length: lead + len }, (_, i) => (i < lead ? null : i - lead + 1));
  const pickedEvents = picked ? eventsOn(picked) : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => setView(vm === 1 ? [vy - 1, 12] : [vy, vm - 1])} className="p-1.5 rounded-lg hover:bg-ink-100" aria-label="ماه قبل">
              <ChevronRight size={16} />
            </button>
            <p className="text-sm font-bold text-ink-900 w-32 text-center">
              {monthNames[vm - 1]} {fa(vy)}
            </p>
            <button onClick={() => setView(vm === 12 ? [vy + 1, 1] : [vy, vm + 1])} className="p-1.5 rounded-lg hover:bg-ink-100" aria-label="ماه بعد">
              <ChevronLeft size={16} />
            </button>
            <Button size="sm" variant="ghost" onClick={() => setView([r[0], r[1]])}>
              امروز
            </Button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-ink-500 flex-wrap">
            <span className="flex items-center gap-1 text-rose-700"><CircleDot size={11} /> سررسید تسک</span>
            <span className="flex items-center gap-1 text-brand-700"><Flag size={11} /> مایل‌ستون</span>
            <span className="flex items-center gap-1 text-amber-700"><Video size={11} /> جلسه</span>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showStarts} onChange={(e) => setShowStarts(e.target.checked)} className="accent-[var(--color-brand-600)]" /> شروع تسک‌ها
            </label>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-400 mb-1">
          {weekDayNames.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`x${i}`} />;
            const date = formatJalali(vy, vm, day);
            const evs = eventsOn(date);
            const isToday = date === refDate;
            return (
              <button key={date} onClick={() => setPicked(date)} className={`min-h-[84px] rounded-lg border p-1 text-right align-top flex flex-col ${picked === date ? "border-brand-400 bg-brand-50/50" : "border-ink-100 hover:bg-ink-50"}`}>
                <span className={`text-[11px] w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-rose-500 text-white" : "text-ink-500"}`}>{fa(day)}</span>
                <div className="space-y-0.5 mt-0.5 w-full">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.id} className={`flex items-center gap-0.5 text-[10px] rounded px-1 truncate ${e.tone}`}>
                      {icon(e.kind)}
                      <span className="truncate">{e.title}</span>
                    </span>
                  ))}
                  {evs.length > 3 && <span className="text-[10px] text-ink-400">+{fa(evs.length - 3)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="card p-4">
        <p className="text-xs font-bold text-ink-900 mb-3">{picked ? `${picked}${picked === refDate ? " (امروز)" : ""}` : "یک روز را انتخاب کنید"}</p>
        <div className="space-y-1.5">
          {pickedEvents.map((e) => (
            <button key={e.id} onClick={e.onClick} className={`w-full text-right text-xs rounded-md px-2 py-1.5 flex items-center gap-1.5 ${e.tone}`}>
              {icon(e.kind)} {e.title}
            </button>
          ))}
          {picked && pickedEvents.length === 0 && <p className="text-[11px] text-ink-400">رویدادی در این روز نیست.</p>}
        </div>
      </div>
    </div>
  );
}
