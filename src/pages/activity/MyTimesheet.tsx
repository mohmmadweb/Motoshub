// تب «کارکرد من»: ثبت روزانه‌ی زمان در نمای هفته یا کل دوره‌ی حقوق، ثبت سریع، کپی هفته‌ی قبل،
// جمع روز/هفته/دوره، اضافه‌کار/کسری، مانده‌ی مرخصی و ارسال دوره برای تأیید.
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Check, ChevronLeft, ChevronRight, Copy, Inbox, Plus, Rows3, Send, Settings2, Undo2, X, Clock, Scale, Plane, CalendarX2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import RowActions from "../../components/ui/RowActions";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { addDays, dayNum, fa, formatJalali, parseJalali, weekDayNames, weekdayOf } from "../../pm/jalali";
import {
  counts,
  daysBetween,
  entryTypeLabel,
  entryTypes,
  expectedOn,
  fh,
  fmtHM,
  holidayOf,
  isLeave,
  parseHours,
  periodOf,
  periodStatusLabel,
  periodStatusTone,
  shortDate,
  summarize,
  weekStart,
  type EntryType,
  type Period,
  type Person,
  type TimeEntry,
  type TsSettings,
} from "../../timesheet/types";
import { useTimesheet } from "../../context/TimesheetContext";
import { daysToDate, useTs } from "./lib";
import { SourceIcon } from "./ui";
import EntryModal from "./EntryModal";
import SettingsModal from "./SettingsModal";

const LOCKED = ["submitted", "approved"];
const clampDate = (d: string, a: string, b: string) => ((dayNum(d) ?? 0) < (dayNum(a) ?? 0) ? a : (dayNum(d) ?? 0) > (dayNum(b) ?? 0) ? b : d);

export default function MyTimesheet({ period, onReview }: { period: Period; onReview: () => void }) {
  const { ts, ten, me, myProjects, projectName, projectColor, taskTitle, entriesOf } = useTs();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canLog = ten.hasPermission("timesheet.log");
  const today = ts.today;
  const s = ts.settings;

  const [view, setView] = useState<"week" | "period">("week");
  const [ws, setWs] = useState(() => weekStart(clampDate(today, period.start, period.end)));
  useEffect(() => setWs(weekStart(clampDate(today, period.start, period.end))), [period.key, today, period.start, period.end]);
  const [modal, setModal] = useState<{ entry: TimeEntry | null; date: string } | null>(null);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const rec = ts.periodRecord(me.id, period.key);
  const lockedOn = (date: string) => LOCKED.includes(ts.periodRecord(me.id, periodOf(date).key).status);
  const isFuture = (dayNum(period.start) ?? 0) > (dayNum(today) ?? 0);

  const rangeStart = view === "week" ? ws : period.start;
  const rangeEnd = view === "week" ? addDays(ws, 6) : period.end;
  const entries = entriesOf(me, rangeStart, rangeEnd, { pending: true });
  const periodEntries = entriesOf(me, period.start, period.end);
  const sumToDate = summarize(periodEntries, s, daysToDate(period.start, period.end, today), me);
  const fullExpected = daysBetween(period.start, period.end).reduce((a, d) => a + expectedOn(s, d, me), 0);
  const leaveLeft = useMemo(() => {
    const ys = formatJalali(period.jy, 1, 1);
    const y = summarize(entriesOf(me, ys, today), s, daysBetween(ys, today), me);
    return s.annualLeaveDays - me.leaveUsedBefore - y.leaveDays;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ts.entries, s, me, period.jy, today]);
  const pending = ts.entries.filter((e) => e.personId === me.id && e.review === "pending").length;

  const byDate = (date: string) => entries.filter((e) => dayNum(e.date) === dayNum(date));

  // ------------------------------------------------ اکشن‌ها
  const save = (d: { date: string; hours: number; type: EntryType; projectId?: string; taskId?: string; description: string }, entry: TimeEntry | null) => {
    if (lockedOn(d.date)) {
      notify("دوره‌ی این تاریخ ارسال یا تأیید شده و قابل ویرایش نیست.", "warning");
      return false;
    }
    if (entry) {
      ts.updateEntry(entry.id, { ...d, review: "accepted", duplicateOf: undefined });
      notify(entry.review === "pending" ? "ورودی ویرایش و پذیرفته شد." : "تغییرات ذخیره شد.");
    } else {
      ts.ensurePerson(me);
      ts.addEntry({ ...d, personId: me.id, source: "manual", review: "accepted" });
      notify(`${fmtHM(d.hours)} ساعت برای ${shortDate(d.date)} ثبت شد.`);
    }
    return true;
  };
  const remove = (e: TimeEntry) =>
    confirm({
      title: "حذف این ثبت؟",
      message: `${fmtHM(e.hours)} ساعت — ${e.description || projectName(e.projectId)}`,
      confirmLabel: "حذف",
      onConfirm: () => {
        ts.removeEntry(e.id);
        notify("ثبت حذف شد.", "info");
      },
    });

  const copyLastWeek = () => {
    const prevStart = addDays(ws, -7);
    const src = ts.entries.filter(
      (e) => e.personId === me.id && e.review === "accepted" && !e.readOnly && !isLeave(e.type) && (dayNum(e.date) ?? 0) >= (dayNum(prevStart) ?? 0) && (dayNum(e.date) ?? 0) < (dayNum(ws) ?? 0),
    );
    const list = src
      .map((e) => ({ ...e, date: addDays(e.date, 7) }))
      .filter((e) => expectedOn(s, e.date, me) > 0 && !lockedOn(e.date) && !ts.entries.some((x) => x.personId === me.id && x.review !== "rejected" && dayNum(x.date) === dayNum(e.date)));
    if (!list.length) {
      notify("موردی برای کپی نبود — روزهای این هفته پر هستند یا هفته‌ی قبل ثبتی نداشت.", "info");
      return;
    }
    confirm({
      title: "کپی هفته‌ی قبل",
      message: `${fa(list.length)} ثبت از هفته‌ی قبل به روزهای خالیِ این هفته کپی می‌شود (روزهای تعطیل و پرشده نادیده گرفته می‌شوند).`,
      confirmLabel: "کپی کن",
      onConfirm: () => {
        ts.ensurePerson(me);
        ts.addEntries(list.map(({ id: _id, createdAt: _c, externalRef: _r, duplicateOf: _d, ...e }) => ({ ...e, source: "manual" as const, review: "accepted" as const })));
        notify(`${fa(list.length)} ثبت کپی شد.`);
      },
    });
  };

  const submit = () =>
    confirm({
      title: `ارسال کارکرد ${period.label} برای تأیید`,
      message:
        sumToDate.missingDays > 0
          ? `${fa(sumToDate.missingDays)} روز کاری بدون ثبت دارید. پس از ارسال تا تصمیم مدیر، ثبت‌های این دوره قفل می‌شود.`
          : `جمع کارکرد ${fh(sumToDate.worked)} ساعت. پس از ارسال تا تصمیم مدیر، ثبت‌های این دوره قفل می‌شود.`,
      confirmLabel: "ارسال",
      onConfirm: () => {
        ts.ensurePerson(me);
        ts.submitPeriod(me.id, period.key, me.name);
        notify("کارکرد دوره برای تأیید ارسال شد.");
      },
    });

  const lastReturn = [...rec.history].reverse().find((h) => h.action === "returned");

  return (
    <div>
      {/* نوار ابزار */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden text-xs" role="tablist" aria-label="نما">
          {(
            [
              ["week", "هفته", Rows3],
              ["period", "کل دوره", CalendarRange],
            ] as const
          ).map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`px-3 py-1.5 flex items-center gap-1.5 ${view === id ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        {view === "week" && (
          <div className="flex items-center gap-1">
            <button onClick={() => setWs(addDays(ws, -7))} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center" aria-label="هفته‌ی قبل">
              <ChevronRight size={15} />
            </button>
            <span className="text-xs text-ink-600 whitespace-nowrap">
              {shortDate(ws)} – {shortDate(addDays(ws, 6))}
            </span>
            <button onClick={() => setWs(addDays(ws, 7))} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center" aria-label="هفته‌ی بعد">
              <ChevronLeft size={15} />
            </button>
          </div>
        )}
        <div className="flex-1" />
        <Badge tone={periodStatusTone[rec.status]}>{periodStatusLabel[rec.status]}</Badge>
        {canLog && view === "week" && (
          <Button size="sm" variant="ghost" icon={<Copy size={13} />} onClick={copyLastWeek} title="کپی ثبت‌های هفته‌ی قبل در روزهای خالی">
            <span className="hidden sm:inline">کپی هفته‌ی قبل</span>
          </Button>
        )}
        {canLog && !isFuture && (rec.status === "draft" || rec.status === "returned") && (
          <Button size="sm" variant="secondary" icon={<Send size={13} />} onClick={submit}>
            ارسال دوره
          </Button>
        )}
        {canLog && rec.status === "submitted" && (
          <Button size="sm" variant="ghost" icon={<Undo2 size={13} />} onClick={() => (ts.reopenPeriod(me.id, period.key, me.name), notify("دوره برای ویرایش بازگشایی شد.", "info"))}>
            بازپس‌گیری
          </Button>
        )}
        <button onClick={() => setSettingsOpen(true)} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-500" aria-label="تنظیمات ساعت کاری" title="تنظیمات ساعت کاری">
          <Settings2 size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="کارکرد دوره" value={`${fh(sumToDate.worked)} ساعت`} hint={`موظف کل دوره: ${fh(fullExpected)} ساعت`} icon={<Clock size={16} />} tone="brand" />
        <StatCard
          label={sumToDate.balance >= 0 ? "اضافه‌کار تا امروز" : "کسری تا امروز"}
          value={`${fh(Math.abs(sumToDate.balance))} ساعت`}
          hint={`موظف تا امروز: ${fh(sumToDate.expected)}`}
          icon={<Scale size={16} />}
          tone={sumToDate.balance >= 0 ? "success" : "danger"}
        />
        <StatCard label="مرخصی این دوره" value={`${fa(sumToDate.leaveDays)} روز`} hint={`مانده‌ی سالانه: ${fa(Math.round(leaveLeft * 10) / 10)} از ${fa(s.annualLeaveDays)} روز`} icon={<Plane size={16} />} tone="neutral" />
        <StatCard label="روز کاری بدون ثبت" value={fa(sumToDate.missingDays)} hint={sumToDate.missingDays ? "تا پیش از ارسال تکمیل کنید" : "همه‌ی روزها ثبت شده"} icon={<CalendarX2 size={16} />} tone={sumToDate.missingDays ? "warning" : "success"} />
      </div>

      {rec.status === "returned" && lastReturn && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs p-3 leading-6">
          <b>برگشت از «{lastReturn.by}»:</b> {lastReturn.comment || "بدون توضیح"} — پس از اصلاح، دوباره ارسال کنید.
        </div>
      )}
      {pending > 0 && (
        <button onClick={onReview} className="w-full mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs p-3 flex items-center gap-2 text-right hover:opacity-90">
          <Inbox size={14} className="shrink-0" />
          <span className="flex-1">{fa(pending)} ثبت از ابزارهای متصل منتظر بررسی شماست (تا پذیرش، در جمع حساب نمی‌شوند).</span>
          <span className="underline shrink-0">بررسی</span>
        </button>
      )}

      {canLog && rec.status !== "approved" && rec.status !== "submitted" && !isFuture && (
        <QuickAdd
          days={daysBetween(rangeStart, rangeEnd)}
          today={today}
          projects={myProjects}
          onAdd={(d) => save(d, null)}
        />
      )}

      {view === "week" ? (
        <div className="card divide-y divide-ink-100">
          {daysBetween(ws, addDays(ws, 6)).map((date) => (
            <DayBlock
              key={date}
              date={date}
              entries={byDate(date)}
              canEdit={canLog && !lockedOn(date)}
              onAdd={() => setModal({ entry: null, date })}
              onEdit={(e) => setModal({ entry: e, date: e.date })}
              onDelete={remove}
              onReview={(e, ok) => (ts.reviewEntries([e.id], ok), notify(ok ? "ثبت پذیرفته شد." : "ثبت رد شد.", ok ? "success" : "info"))}
              ctx={{ projectName, projectColor, taskTitle, today, s, me }}
            />
          ))}
          <WeekFooter entries={entries.filter((e) => counts(e))} days={daysBetween(ws, addDays(ws, 6))} me={me} />
        </div>
      ) : (
        <PeriodCalendar period={period} entries={entries} onOpen={setDayOpen} today={today} me={me} />
      )}

      <Modal open={!!dayOpen} onClose={() => setDayOpen(null)} title={dayOpen ? `${weekDayNames[weekdayOf(dayOpen)]} ${shortDate(dayOpen)}` : ""} width="max-w-xl">
        {dayOpen && (
          <div className="-m-5">
            <DayBlock
              date={dayOpen}
              entries={byDate(dayOpen)}
              canEdit={canLog && !lockedOn(dayOpen)}
              onAdd={() => setModal({ entry: null, date: dayOpen })}
              onEdit={(e) => setModal({ entry: e, date: e.date })}
              onDelete={remove}
              onReview={(e, ok) => ts.reviewEntries([e.id], ok)}
              ctx={{ projectName, projectColor, taskTitle, today, s, me }}
            />
          </div>
        )}
      </Modal>

      <EntryModal
        open={!!modal}
        onClose={() => setModal(null)}
        entry={modal?.entry ?? null}
        defaultDate={modal?.date ?? today}
        projects={myProjects}
        readOnly={!canLog || !!modal?.entry?.readOnly || (modal ? lockedOn(modal.entry?.date ?? modal.date) : false)}
        onSave={(d) => save(d, modal?.entry ?? null) && setModal(null)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------- ثبت سریع
function QuickAdd({ days, today, projects, onAdd }: { days: string[]; today: string; projects: ReturnType<typeof useTs>["myProjects"]; onAdd: (d: { date: string; hours: number; type: EntryType; projectId?: string; taskId?: string; description: string }) => boolean }) {
  const def = days.find((d) => dayNum(d) === dayNum(today)) ?? days[0];
  const [date, setDate] = useState(def);
  const [hours, setHours] = useState("");
  const [type, setType] = useState<EntryType>("work");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState(false);
  useEffect(() => setDate(def), [def]);
  const project = projects.find((p) => p.id === projectId);
  const leave = isLeave(type);
  const add = () => {
    const h = type === "leave_daily" && !hours.trim() ? 8 : parseHours(hours);
    if (h === null) {
      setErr(true);
      return;
    }
    const ok = onAdd({ date, hours: h, type, projectId: leave ? undefined : projectId || undefined, taskId: leave ? undefined : taskId || undefined, description: desc.trim() || (leave ? entryTypeLabel[type] : "") });
    if (ok) {
      setHours("");
      setDesc("");
      setErr(false);
    }
  };
  return (
    <div className="card p-3 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
        <select className="input-field sm:col-span-2" value={date} onChange={(e) => setDate(e.target.value)} aria-label="روز">
          {days.map((d) => (
            <option key={d} value={d}>
              {weekDayNames[weekdayOf(d)]} {shortDate(d)}
            </option>
          ))}
        </select>
        <input
          className={`input-field sm:col-span-1 text-center ${err ? "border-rose-400" : ""}`}
          placeholder="۷:۳۰"
          inputMode="decimal"
          value={hours}
          onChange={(e) => (setHours(e.target.value), setErr(false))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          aria-label="ساعت"
          title="ساعت: ۸ یا ۷:۳۰ یا ۷٫۵"
        />
        <select className="input-field sm:col-span-2" value={type} onChange={(e) => setType(e.target.value as EntryType)} aria-label="نوع">
          {entryTypes.map((t) => (
            <option key={t} value={t}>
              {entryTypeLabel[t]}
            </option>
          ))}
        </select>
        <select className="input-field sm:col-span-2" value={projectId} onChange={(e) => (setProjectId(e.target.value), setTaskId(""))} disabled={leave} aria-label="پروژه">
          <option value="">بدون پروژه</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="input-field col-span-2 sm:col-span-2" value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={!project || leave} aria-label="تسک">
          <option value="">تسک (اختیاری)</option>
          {project?.tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <input className="input-field col-span-2 sm:col-span-2" placeholder="شرح کار" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} aria-label="شرح" />
        <Button variant="primary" icon={<Plus size={14} />} onClick={add} className="col-span-2 sm:col-span-1 justify-center">
          ثبت
        </Button>
      </div>
      {err && <p className="text-[11px] text-rose-600 mt-1.5">ساعت را به شکل ۸ یا ۷:۳۰ یا ۷٫۵ وارد کنید.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- یک روز
type Ctx = { projectName: (id?: string) => string; projectColor: (id?: string) => string; taskTitle: (p?: string, t?: string) => string | undefined; today: string; s: TsSettings; me: Person };

function DayBlock({
  date,
  entries,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
  onReview,
  ctx,
}: {
  date: string;
  entries: TimeEntry[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (e: TimeEntry) => void;
  onDelete: (e: TimeEntry) => void;
  onReview: (e: TimeEntry, ok: boolean) => void;
  ctx: Ctx;
}) {
  const exp = expectedOn(ctx.s, date, ctx.me);
  const hol = holidayOf(ctx.s, date);
  const counted = entries.filter((e) => counts(e));
  const worked = counted.filter((e) => !isLeave(e.type)).reduce((a, e) => a + e.hours, 0);
  const leaveH = counted.filter((e) => isLeave(e.type)).reduce((a, e) => a + (e.type === "leave_daily" ? exp || 8 : e.hours), 0);
  const isToday = dayNum(date) === dayNum(ctx.today);
  const past = (dayNum(date) ?? 0) < (dayNum(ctx.today) ?? 0);
  const missing = exp > 0 && past && counted.length === 0;
  const tone = exp === 0 ? "text-ink-400" : worked + leaveH >= exp ? "text-emerald-700" : missing ? "text-rose-600" : worked > 0 ? "text-amber-700" : "text-ink-400";
  return (
    <div className={`px-3 py-2.5 ${exp === 0 ? "bg-ink-50" : ""}`}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className={`text-[13px] font-bold ${isToday ? "text-brand-700" : "text-ink-800"}`}>{weekDayNames[weekdayOf(date)]}</span>
          <span className="text-xs text-ink-400">{shortDate(date)}</span>
          {isToday && <Badge tone="brand">امروز</Badge>}
          {hol && <Badge tone="warning">{hol.title}</Badge>}
          {!hol && exp === 0 && <span className="text-[11px] text-ink-400">تعطیل</span>}
          {missing && <span className="text-[11px] text-rose-600">ثبت نشده</span>}
        </div>
        <span className={`text-xs tabular-nums shrink-0 ${tone}`}>
          <b className="text-[13px]">{fmtHM(worked)}</b>
          {exp > 0 && <span className="text-ink-400"> / {fmtHM(exp)}</span>}
        </span>
        {canEdit && (
          <button onClick={onAdd} className="w-7 h-7 rounded-md text-ink-400 hover:text-brand-700 hover:bg-brand-50 flex items-center justify-center shrink-0" aria-label={`افزودن زمان برای ${shortDate(date)}`}>
            <Plus size={15} />
          </button>
        )}
      </div>
      {entries.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {entries.map((e) => (
            <EntryLine key={e.id} e={e} ctx={ctx} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} onReview={onReview} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EntryLine({
  e,
  ctx,
  canEdit,
  onEdit,
  onDelete,
  onReview,
}: {
  e: TimeEntry;
  ctx: Pick<Ctx, "projectName" | "projectColor" | "taskTitle">;
  canEdit: boolean;
  onEdit: (e: TimeEntry) => void;
  onDelete?: (e: TimeEntry) => void;
  onReview?: (e: TimeEntry, ok: boolean) => void;
}) {
  const task = ctx.taskTitle(e.projectId, e.taskId);
  const pending = e.review === "pending";
  return (
    <div className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${pending ? "border border-dashed border-amber-300 bg-amber-50/60" : "hover:bg-ink-50"}`}>
      <SourceIcon source={e.source} />
      <button onClick={() => onEdit(e)} className="min-w-0 flex-1 text-right">
        <p className="text-[13px] text-ink-800 truncate">{e.description || task || ctx.projectName(e.projectId)}</p>
        <p className="text-[11px] text-ink-400 truncate flex items-center gap-1">
          {isLeave(e.type) ? (
            <span>{entryTypeLabel[e.type]}</span>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ctx.projectColor(e.projectId) }} />
              <span className="truncate">
                {e.projectId ? ctx.projectName(e.projectId) : e.externalProject ? `نگاشت‌نشده: ${e.externalProject}` : "بدون پروژه"}
                {task && e.description ? ` · ${task}` : ""}
              </span>
            </>
          )}
        </p>
      </button>
      {e.type !== "work" && !isLeave(e.type) && <Badge tone="navy">{entryTypeLabel[e.type]}</Badge>}
      {isLeave(e.type) && <Badge tone="brand">مرخصی</Badge>}
      {e.aggregate && <Badge tone="neutral">تجمیعی</Badge>}
      {e.duplicateOf && pending && <Badge tone="danger">تکراری؟</Badge>}
      <span className="text-[13px] font-bold text-ink-800 tabular-nums shrink-0 w-10 text-left">{fmtHM(e.hours)}</span>
      {pending && onReview && canEdit ? (
        <span className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onReview(e, true)} className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-50" title="پذیرش" aria-label="پذیرش">
            <Check size={14} />
          </button>
          <button onClick={() => onReview(e, false)} className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50" title="رد" aria-label="رد">
            <X size={14} />
          </button>
        </span>
      ) : canEdit && !e.readOnly && onDelete ? (
        <RowActions onEdit={() => onEdit(e)} onDelete={() => onDelete(e)} size={13} />
      ) : (
        <span className="w-[54px] shrink-0" />
      )}
    </div>
  );
}

function WeekFooter({ entries, days, me }: { entries: TimeEntry[]; days: string[]; me: Person }) {
  const ts = useTimesheet();
  const sm = summarize(entries, ts.settings, days, me);
  return (
    <div className="px-3 py-2.5 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs bg-ink-50 rounded-b-[0.625rem]">
      <span className="text-ink-600">
        جمع هفته: <b className="text-ink-900">{fh(sm.worked)}</b> ساعت
      </span>
      <span className="text-ink-500">موظف: {fh(sm.expected)}</span>
      {sm.leaveHours > 0 && <span className="text-ink-500">مرخصی: {fh(sm.leaveHours)} ساعت</span>}
      <span className={sm.balance >= 0 ? "text-emerald-700" : "text-rose-600"}>
        {sm.balance >= 0 ? "اضافه‌کار" : "کسری"}: {fh(Math.abs(sm.balance))}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- تقویم دوره (شبیه گوگل‌شیت)
function PeriodCalendar({ period, entries, onOpen, today, me }: { period: Period; entries: TimeEntry[]; onOpen: (d: string) => void; today: string; me: Person }) {
  const s = useTimesheet().settings;
  const first = weekStart(period.start);
  const weeks: string[][] = [];
  for (let w = first; (dayNum(w) ?? 0) <= (dayNum(period.end) ?? 0); w = addDays(w, 7)) weeks.push(daysBetween(w, addDays(w, 6)));
  const inP = (d: string) => (dayNum(d) ?? 0) >= (dayNum(period.start) ?? 0) && (dayNum(d) ?? 0) <= (dayNum(period.end) ?? 0);
  const t = dayNum(today) ?? 0;
  return (
    <div className="card p-2 sm:p-3">
      <div className="grid grid-cols-8 gap-1 text-center text-[10px] text-ink-400 mb-1">
        {["ش", "ی", "د", "س", "چ", "پ", "ج", "جمع"].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((wk) => {
          const wkEntries = entries.filter((e) => counts(e) && wk.some((d) => dayNum(d) === dayNum(e.date)) && inP(e.date));
          const wkSum = wkEntries.filter((e) => !isLeave(e.type)).reduce((a, e) => a + e.hours, 0);
          return (
            <div key={wk[0]} className="grid grid-cols-8 gap-1">
              {wk.map((d) => {
                if (!inP(d)) return <span key={d} />;
                const n = dayNum(d) ?? 0;
                const es = entries.filter((e) => counts(e) && dayNum(e.date) === n);
                const pend = entries.some((e) => e.review === "pending" && dayNum(e.date) === n);
                const exp = expectedOn(s, d, me);
                const worked = es.filter((e) => !isLeave(e.type)).reduce((a, e) => a + e.hours, 0);
                const leaveDay = es.some((e) => e.type === "leave_daily");
                const mission = es.some((e) => e.type === "mission");
                const hol = holidayOf(s, d);
                let cls = "bg-white border-ink-200";
                if (exp === 0) cls = "bg-ink-100 border-transparent";
                else if (leaveDay) cls = "bg-sky-50 border-transparent";
                else if (worked >= exp) cls = "bg-emerald-50 border-transparent";
                else if (worked > 0) cls = "bg-amber-50 border-transparent";
                else if (n < t) cls = "bg-rose-50 border-transparent";
                return (
                  <button
                    key={d}
                    onClick={() => onOpen(d)}
                    title={hol ? hol.title : undefined}
                    className={`relative rounded-md border h-12 sm:h-14 flex flex-col items-center justify-center hover:ring-2 hover:ring-brand-200 ${cls} ${n === t ? "ring-2 ring-brand-500" : ""}`}
                  >
                    <span className="absolute top-0.5 right-1 text-[9px] text-ink-400">{fa(parseJalali(d)?.[2] ?? 0)}</span>
                    <span className="text-[12px] sm:text-[13px] font-bold text-ink-800 tabular-nums mt-1.5">{leaveDay ? "مرخصی" : worked ? fmtHM(worked) : ""}</span>
                    {mission && <span className="text-[9px] text-navy-700">مأموریت</span>}
                    {pend && <span className="absolute bottom-0.5 left-1 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </button>
                );
              })}
              <span className="rounded-md bg-navy-50 h-12 sm:h-14 flex items-center justify-center text-[12px] font-bold text-ink-700 tabular-nums">{fh(wkSum)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-3 text-[10px] text-ink-500">
        <Legend cls="bg-emerald-50" label="کامل" />
        <Legend cls="bg-amber-50" label="ناقص" />
        <Legend cls="bg-rose-50" label="ثبت نشده" />
        <Legend cls="bg-sky-50" label="مرخصی" />
        <Legend cls="bg-ink-100" label="تعطیل" />
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> منتظر بررسی
        </span>
      </div>
    </div>
  );
}

const Legend = ({ cls, label }: { cls: string; label: string }) => (
  <span className="flex items-center gap-1">
    <span className={`w-3 h-3 rounded-sm border border-ink-200 ${cls}`} /> {label}
  </span>
);
