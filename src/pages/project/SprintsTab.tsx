import { useMemo, useState } from "react";
import { Flag, Play, CheckCircle2, Plus, Target, TrendingDown, BarChart3, Inbox } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { columnLabel, isDone, kindOf } from "../../pm/selectors";
import { addDays, dayNum, fa, fromDayNum } from "../../pm/jalali";
import type { PMTask, ProjectState, Sprint } from "../../pm/types";
import { Field, SectionTitle, kindTone, priorityTone, useProjectPage } from "./shared";

const pointsOf = (ts: PMTask[]) => ts.reduce((a, t) => a + (t.storyPoints ?? 0), 0);

/** تاریخ انجام‌شدن تسک از روی تاریخچه (آخرین انتقال به ستون «انجام‌شده») */
function doneDay(p: ProjectState, t: PMTask): number | null {
  if (!isDone(p, t)) return null;
  const log = [...p.logs].filter((l) => l.entity?.id === t.id && l.event === "TASK_STATUS_CHANGED" && l.metadata.new_kind === "done").sort((a, b) => b.seq - a.seq)[0];
  return dayNum(log?.date ?? t.due);
}

/** نمودار فرسایش (Burndown): خط ایده‌آل در برابر امتیاز باقی‌مانده‌ی واقعی — زمان از راست به چپ */
function Burndown({ p, sp, refDate }: { p: ProjectState; sp: Sprint; refDate: string }) {
  const s = dayNum(sp.start)!;
  const e = dayNum(sp.end)!;
  const ref = dayNum(refDate)!;
  const ts = p.tasks.filter((t) => t.sprintId === sp.id);
  const total = Math.max(sp.committedPoints ?? 0, pointsOf(ts), 1);
  const n = Math.max(1, e - s);
  const W = 560;
  const H = 210;
  const pad = { l: 30, r: 16, t: 14, b: 26 };
  const x = (i: number) => W - pad.r - (i / n) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / total) * (H - pad.t - pad.b);
  const last = Math.min(ref, e) - s;
  const actual: [number, number][] = [];
  for (let i = 0; i <= Math.max(0, last); i++) {
    const done = ts.filter((t) => {
      const d = doneDay(p, t);
      return d !== null && d <= s + i;
    });
    actual.push([i, total - pointsOf(done)]);
  }
  const remaining = actual.length ? actual[actual.length - 1][1] : total;
  const ideal = total - (total * Math.min(Math.max(0, last), n)) / n;
  const behind = remaining > ideal + 0.5;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="نمودار فرسایش اسپرینت">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(total * f)} y2={y(total * f)} stroke="var(--color-ink-100)" />
            <text x={pad.l - 6} y={y(total * f) + 3} fontSize="9" textAnchor="end" fill="var(--color-ink-400)">
              {fa(Math.round(total * f))}
            </text>
          </g>
        ))}
        {Array.from({ length: n + 1 }, (_, i) => i)
          .filter((i) => i === 0 || i === n || i % Math.ceil(n / 7) === 0)
          .map((i) => (
            <text key={i} x={x(i)} y={H - 8} fontSize="9" textAnchor="middle" fill="var(--color-ink-400)">
              {fromDayNum(s + i).slice(5)}
            </text>
          ))}
        <line x1={x(0)} y1={y(total)} x2={x(n)} y2={y(0)} stroke="var(--color-ink-300)" strokeDasharray="5 4" strokeWidth={1.5} />
        {ref >= s && ref <= e && <line x1={x(ref - s)} x2={x(ref - s)} y1={pad.t} y2={H - pad.b} stroke="#e11d48" strokeOpacity={0.6} />}
        {actual.length > 0 && (
          <polyline points={actual.map(([i, v]) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={behind ? "#e11d48" : "var(--color-brand-600)"} strokeWidth={2.2} strokeLinejoin="round" />
        )}
        {actual.map(([i, v]) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={2.4} fill={behind ? "#e11d48" : "var(--color-brand-600)"} />
        ))}
      </svg>
      <div className="flex items-center gap-4 text-[11px] text-ink-500 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed border-ink-300" /> مسیر ایده‌آل
        </span>
        <span className="flex items-center gap-1">
          <span className={`w-4 h-0.5 ${behind ? "bg-rose-600" : "bg-brand-600"}`} /> امتیاز باقی‌مانده
        </span>
        <span className={`mr-auto font-medium ${behind ? "text-rose-600" : "text-emerald-700"}`}>
          {fa(remaining)} امتیاز باقی‌مانده · {behind ? `${fa(Math.round(remaining - ideal))} امتیاز عقب‌تر از برنامه` : "مطابق یا جلوتر از برنامه"}
        </span>
      </div>
    </div>
  );
}

/** سرعت تیم (Velocity): امتیاز تعهدشده و تحویل‌شده در اسپرینت‌های گذشته */
function Velocity({ sprints }: { sprints: Sprint[] }) {
  const done = sprints.filter((x) => x.status === "تکمیل‌شده");
  if (!done.length) return <p className="text-[11px] text-ink-400">پس از بستن اولین اسپرینت، سرعت تیم این‌جا نمایش داده می‌شود.</p>;
  const max = Math.max(...done.flatMap((x) => [x.committedPoints ?? 0, x.completedPoints ?? 0]), 1);
  const avg = Math.round(done.reduce((a, x) => a + (x.completedPoints ?? 0), 0) / done.length);
  return (
    <div>
      <div className="flex items-end gap-4 h-40 border-b border-ink-100 px-2">
        {done.map((x) => (
          <div key={x.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="flex items-end gap-1 h-32 w-full justify-center">
              <div className="w-5 rounded-t bg-ink-200" style={{ height: `${((x.committedPoints ?? 0) / max) * 100}%` }} title={`تعهد: ${fa(x.committedPoints ?? 0)}`} />
              <div className="w-5 rounded-t bg-brand-500" style={{ height: `${((x.completedPoints ?? 0) / max) * 100}%` }} title={`تحویل: ${fa(x.completedPoints ?? 0)}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 px-2 mt-1">
        {done.map((x) => (
          <p key={x.id} className="flex-1 text-[10px] text-ink-500 text-center truncate" title={x.name}>
            {x.name.split("—")[0]}
            <br />
            {fa(x.completedPoints ?? 0)}/{fa(x.committedPoints ?? 0)}
          </p>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-ink-500 mt-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-ink-200" /> تعهدشده
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-brand-500" /> تحویل‌شده
        </span>
        <span className="mr-auto">
          میانگین سرعت: <b className="text-ink-800">{fa(avg)} امتیاز</b> در هر اسپرینت
        </span>
      </div>
    </div>
  );
}

export default function SprintsTab() {
  const { p, pid, canEdit, refDate, openTask } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const sprints = p.sprints ?? [];
  const active = sprints.find((x) => x.status === "فعال");
  const planned = sprints.filter((x) => x.status === "برنامه‌ریزی");
  const [form, setForm] = useState<(Omit<Sprint, "id" | "status"> & { id?: string }) | null>(null);
  const [closing, setClosing] = useState<Sprint | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const backlog = useMemo(() => p.tasks.filter((t) => !t.archived && !t.sprintId && !isDone(p, t)), [p]);

  const openNew = () => {
    const lastEnd = [...sprints].map((x) => dayNum(x.end) ?? 0).sort((a, b) => b - a)[0];
    const start = lastEnd && lastEnd >= (dayNum(refDate) ?? 0) ? addDays(fromDayNum(lastEnd), 1) : refDate;
    setForm({ name: `اسپرینت ${fa(sprints.length + 1)}`, goal: "", start, end: addDays(start, 13) });
  };

  const TaskRow = ({ t, withSprint }: { t: PMTask; withSprint?: boolean }) => (
    <div className="flex items-center gap-2 px-3 py-2 text-xs">
      <button onClick={() => openTask(t.id)} className="flex-1 min-w-0 text-right text-ink-800 hover:text-brand-700 truncate">
        {t.title}
      </button>
      <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
      <Badge tone={kindTone[kindOf(p, t.status)]}>{columnLabel(p, t.status)}</Badge>
      <span className="text-ink-500 w-24 truncate hidden sm:block">{t.assignee}</span>
      <span className="text-[10px] font-bold bg-ink-100 text-ink-600 rounded-full min-w-5 h-5 px-1 flex items-center justify-center" title="امتیاز">
        {t.storyPoints ? fa(t.storyPoints) : "–"}
      </span>
      {withSprint && canEdit && (
        <select
          value={t.sprintId ?? ""}
          onChange={(e) => pm.updateTask(pid, t.id, { sprintId: e.target.value })}
          className="input-field !py-1 !text-[11px] !w-36"
          aria-label={`اسپرینت ${t.title}`}
        >
          <option value="">بک‌لاگ</option>
          {sprints
            .filter((x) => x.status !== "تکمیل‌شده")
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
        </select>
      )}
    </div>
  );

  const sprintTasks = (id: string) => p.tasks.filter((t) => t.sprintId === id && !t.archived);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-ink-500 leading-6 max-w-2xl">
          کار را در دوره‌های کوتاه (معمولاً دو هفته‌ای) برنامه‌ریزی کنید: تسک‌ها را از بک‌لاگ به اسپرینت بیاورید، با شروع اسپرینت تعهد تیم ثبت می‌شود و نمودار فرسایش نشان می‌دهد تیم طبق برنامه پیش می‌رود یا نه.
        </p>
        {canEdit && (
          <Button variant="primary" icon={<Plus size={14} />} onClick={openNew}>
            اسپرینت جدید
          </Button>
        )}
      </div>

      {active ? (
        <div className="card p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
                <Flag size={15} className="text-brand-600" /> {active.name} <Badge tone="brand">فعال</Badge>
              </p>
              <p className="text-xs text-ink-500 mt-1 flex items-center gap-1">
                <Target size={12} /> {active.goal || "بدون هدف ثبت‌شده"}
              </p>
              <p className="text-[11px] text-ink-400 mt-1">
                {active.start} تا {active.end} · {fa(Math.max(0, (dayNum(active.end) ?? 0) - (dayNum(refDate) ?? 0)))} روز مانده · {fa(pointsOf(sprintTasks(active.id).filter((t) => isDone(p, t))))} از {fa(active.committedPoints ?? pointsOf(sprintTasks(active.id)))} امتیاز انجام شده
              </p>
            </div>
            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                icon={<CheckCircle2 size={13} />}
                onClick={() => {
                  setClosing(active);
                  setMoveTo(planned[0]?.id ?? "");
                }}
              >
                پایان اسپرینت
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
            <div>
              <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
                <TrendingDown size={13} /> نمودار فرسایش (Burndown)
              </p>
              <Burndown p={p} sp={active} refDate={refDate} />
            </div>
            <div className="border border-ink-100 rounded-lg divide-y divide-ink-100 max-h-[300px] overflow-y-auto">
              {sprintTasks(active.id).map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
              {sprintTasks(active.id).length === 0 && <p className="text-xs text-ink-400 p-3">تسکی در این اسپرینت نیست.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4 text-xs text-ink-500">اسپرینت فعالی وجود ندارد. یک اسپرینت برنامه‌ریزی‌شده را شروع کنید.</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <SectionTitle icon={<Flag size={15} className="text-brand-600" />} title="اسپرینت‌های آینده" hint="تسک‌ها را از بک‌لاگ اضافه و سپس اسپرینت را شروع کنید." />
          {planned.map((sp) => {
            const ts = sprintTasks(sp.id);
            return (
              <div key={sp.id} className="card">
                <div className="flex items-start justify-between gap-2 p-3 border-b border-ink-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{sp.name}</p>
                    <p className="text-[11px] text-ink-400 mt-0.5">
                      {sp.start} تا {sp.end} · {fa(ts.length)} تسک · {fa(pointsOf(ts))} امتیاز
                    </p>
                    {sp.goal && <p className="text-[11px] text-ink-500 mt-0.5">هدف: {sp.goal}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Play size={12} />}
                        disabled={!!active || ts.length === 0}
                        title={active ? "ابتدا اسپرینت فعال را ببندید" : ts.length === 0 ? "ابتدا تسک اضافه کنید" : undefined}
                        onClick={() => {
                          pm.startSprint(pid, sp.id);
                          notify(`«${sp.name}» با ${fa(pointsOf(ts))} امتیاز شروع شد و به تیم اطلاع داده شد.`);
                        }}
                      >
                        شروع
                      </Button>
                      <RowActions
                        onEdit={() => setForm({ id: sp.id, name: sp.name, goal: sp.goal, start: sp.start, end: sp.end })}
                        onDelete={() => confirm({ title: `حذف «${sp.name}»؟`, message: "تسک‌های این اسپرینت به بک‌لاگ برمی‌گردند.", onConfirm: () => pm.deleteSprint(pid, sp.id) })}
                      />
                    </div>
                  )}
                </div>
                <div className="divide-y divide-ink-100">
                  {ts.map((t) => (
                    <TaskRow key={t.id} t={t} withSprint />
                  ))}
                  {ts.length === 0 && <p className="text-[11px] text-ink-400 p-3">خالی — از بک‌لاگ تسک اضافه کنید.</p>}
                </div>
              </div>
            );
          })}
          {planned.length === 0 && <p className="text-[11px] text-ink-400">اسپرینت برنامه‌ریزی‌شده‌ای نیست.</p>}
          <div className="card p-4">
            <p className="text-xs font-bold text-ink-700 mb-3 flex items-center gap-1">
              <BarChart3 size={13} /> سرعت تیم (Velocity)
            </p>
            <Velocity sprints={sprints} />
          </div>
        </div>

        <div className="card self-start">
          <div className="p-3 border-b border-ink-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
              <Inbox size={15} className="text-ink-500" /> بک‌لاگ
            </p>
            <span className="text-[11px] text-ink-400">
              {fa(backlog.length)} تسک · {fa(pointsOf(backlog))} امتیاز
            </span>
          </div>
          <div className="divide-y divide-ink-100 max-h-[560px] overflow-y-auto">
            {backlog.map((t) => (
              <TaskRow key={t.id} t={t} withSprint />
            ))}
            {backlog.length === 0 && <p className="text-[11px] text-ink-400 p-3">همه‌ی تسک‌های باز در اسپرینت‌ها برنامه‌ریزی شده‌اند.</p>}
          </div>
        </div>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "ویرایش اسپرینت" : "اسپرینت جدید"}>
        {form && (
          <div className="space-y-3">
            <Field label="نام">
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="هدف اسپرینت" hint="یک جمله: در پایان این دوره چه چیزی تحویل می‌شود؟">
              <input className="input-field" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="مثلاً: تحویل موقت مدارس" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="شروع">
                <JalaliDatePicker value={form.start} onChange={(v) => setForm({ ...form, start: v })} />
              </Field>
              <Field label="پایان">
                <JalaliDatePicker value={form.end} onChange={(v) => setForm({ ...form, end: v })} />
              </Field>
            </div>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                if (!form.name.trim()) return notify("نام اسپرینت الزامی است.", "warning");
                if ((dayNum(form.end) ?? 0) <= (dayNum(form.start) ?? 0)) return notify("پایان باید بعد از شروع باشد.", "warning");
                pm.saveSprint(pid, { ...form, name: form.name.trim() });
                notify(form.id ? "اسپرینت ویرایش شد." : "اسپرینت ساخته شد.");
                setForm(null);
              }}
            >
              {form.id ? "ذخیره" : "ساخت اسپرینت"}
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!closing} onClose={() => setClosing(null)} title={`پایان «${closing?.name ?? ""}»`}>
        {closing && (
          <div className="space-y-3">
            {(() => {
              const ts = sprintTasks(closing.id);
              const open = ts.filter((t) => !isDone(p, t));
              return (
                <>
                  <p className="text-xs text-ink-600 leading-6">
                    {fa(pointsOf(ts.filter((t) => isDone(p, t))))} از {fa(closing.committedPoints ?? pointsOf(ts))} امتیاز تحویل شد. {open.length ? `${fa(open.length)} تسک ناتمام (${fa(pointsOf(open))} امتیاز) باید منتقل شود.` : "همه‌ی تسک‌ها انجام شده‌اند."}
                  </p>
                  {open.length > 0 && (
                    <Field label="انتقال تسک‌های ناتمام به">
                      <select className="input-field" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                        <option value="">بک‌لاگ</option>
                        {planned.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </>
              );
            })()}
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                pm.completeSprint(pid, closing.id, moveTo);
                notify(`«${closing.name}» بسته شد و نتیجه به تیم و کارفرما اعلام شد.`);
                setClosing(null);
              }}
            >
              بستن اسپرینت
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
