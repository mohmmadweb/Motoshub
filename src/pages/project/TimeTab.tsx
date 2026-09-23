import { useState } from "react";
import { Clock, Plus, Timer } from "lucide-react";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import RowActions from "../../components/ui/RowActions";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { taskLoggedHours } from "../../pm/selectors";
import { fa } from "../../pm/jalali";
import { Field, MemberSelect, Progress, SectionTitle, TaskSelect, numIn, taskTitle, useProjectPage } from "./shared";

export default function TimeTab() {
  const { p, pid, canEdit, refDate, openTask, focusId } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [member, setMember] = useState(p.members.find((m) => m.role !== "مشاهده‌گر")?.name ?? "");
  const [taskId, setTaskId] = useState(focusId && p.tasks.some((t) => t.id === focusId) ? focusId : "");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(refDate);
  const [note, setNote] = useState("");

  const total = p.timeLogs.reduce((s, l) => s + l.hours, 0);
  const est = p.tasks.reduce((s, t) => s + t.estHours, 0);
  const byMember = [...new Set(p.timeLogs.map((l) => l.member))].map((m) => ({ m, h: p.timeLogs.filter((l) => l.member === m).reduce((s, l) => s + l.hours, 0) })).sort((a, b) => b.h - a.h);
  const maxM = Math.max(1, ...byMember.map((x) => x.h));
  const byTask = p.tasks.filter((t) => t.estHours > 0 || taskLoggedHours(p, t.id) > 0);

  const add = () => {
    const h = numIn(hours);
    if (!member || !taskId || !h) return notify("عضو، تسک و ساعت الزامی است.", "warning");
    pm.addTimeLog(pid, { member, taskId, hours: h, date, note });
    setHours("");
    setNote("");
    notify(`${fa(h)} ساعت برای «${member}» ثبت شد.`);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="کل زمان ثبت‌شده" value={`${fa(total)} ساعت`} icon={<Clock size={16} />} tone="brand" />
        <StatCard label="برآورد کل تسک‌ها" value={`${fa(est)} ساعت`} icon={<Timer size={16} />} />
        <StatCard label="نسبت صرف‌شده به برآورد" value={`${fa(est ? Math.round((total / est) * 100) : 0)}٪`} tone={total > est ? "danger" : "success"} />
        <StatCard label="تعداد ثبت" value={fa(p.timeLogs.length)} />
      </div>

      {canEdit && (
        <div className="card p-4">
          <SectionTitle icon={<Plus size={15} className="text-brand-600" />} title="ثبت زمان کاری" hint="مثلاً: علی ← طراحی وب‌سایت ← ۱۲ ساعت" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <Field label="عضو">
              <MemberSelect p={p} value={member} onChange={setMember} allowEmpty={false} />
            </Field>
            <Field label="تسک">
              <TaskSelect p={p} value={taskId} onChange={setTaskId} />
            </Field>
            <Field label="تاریخ">
              <JalaliDatePicker value={date} onChange={setDate} />
            </Field>
            <Field label="ساعت">
              <input className="input-field" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="۴" />
            </Field>
            <Button variant="primary" onClick={add} className="justify-center">
              ثبت
            </Button>
          </div>
          <input className="input-field mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت (اختیاری)" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <SectionTitle title="زمان به تفکیک عضو" />
          <div className="space-y-2.5">
            {byMember.map(({ m, h }) => (
              <div key={m}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-800">{m}</span>
                  <span className="text-ink-500">{fa(h)} ساعت</span>
                </div>
                <Progress value={(h / maxM) * 100} />
              </div>
            ))}
            {byMember.length === 0 && <p className="text-xs text-ink-400">هنوز زمانی ثبت نشده.</p>}
          </div>
        </div>
        <div className="card p-4">
          <SectionTitle title="زمان به تفکیک تسک (صرف‌شده / برآورد)" />
          <div className="space-y-2.5">
            {byTask.map((t) => {
              const h = taskLoggedHours(p, t.id);
              const r = t.estHours ? (h / t.estHours) * 100 : 100;
              return (
                <button key={t.id} onClick={() => openTask(t.id)} className="block w-full text-right">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-800 truncate">{t.title}</span>
                    <span className={r > 100 ? "text-rose-600" : "text-ink-500"}>
                      {fa(h)} / {t.estHours ? fa(t.estHours) : "—"}
                    </span>
                  </div>
                  <Progress value={r} tone={r > 100 ? "bg-rose-500" : "bg-emerald-500"} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="text-ink-400 border-b border-ink-100 text-right">
              <th className="p-3 font-medium">تاریخ</th>
              <th className="p-3 font-medium">عضو</th>
              <th className="p-3 font-medium">تسک</th>
              <th className="p-3 font-medium">ساعت</th>
              <th className="p-3 font-medium">یادداشت</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {p.timeLogs.map((l) => (
              <tr key={l.id} className="border-b border-ink-100">
                <td className="p-3 text-ink-500">{l.date}</td>
                <td className="p-3 text-ink-800">{l.member}</td>
                <td className="p-3">
                  <button className="text-brand-700 hover:underline text-right" onClick={() => openTask(l.taskId)}>
                    {taskTitle(p, l.taskId)}
                  </button>
                </td>
                <td className="p-3 font-medium">{fa(l.hours)}</td>
                <td className="p-3 text-ink-500">{l.note || "—"}</td>
                <td className="p-3">{canEdit && <RowActions onDelete={() => pm.removeTimeLog(pid, l.id)} size={12} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
