import { useState } from "react";
import { CalendarCheck2, CalendarPlus, FileText, Mic, MicOff, Video, VideoOff, MonitorUp, Circle, PhoneOff, MessageSquare, UserPlus, Users, Plus, X, ListChecks, ArrowLeftRight, Ban, CheckCircle2 } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { dayNum, fa } from "../../pm/jalali";
import type { ActionItem, PMMeeting, PMMinute } from "../../pm/types";
import { Field, MemberSelect, SectionTitle, taskTitle, useProjectPage } from "./shared";

type MeetDraft = Omit<PMMeeting, "id" | "status"> & { id?: string };
type MinDraft = Omit<PMMinute, "id"> & { id?: string; publish: boolean };

export default function MeetingsTab() {
  const { p, pid, canEdit, refDate, openTask, focusId } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [meet, setMeet] = useState<MeetDraft | null>(null);
  const [room, setRoom] = useState<PMMeeting | null>(null);
  const [minute, setMinute] = useState<MinDraft | null>(null);
  const [viewMin, setViewMin] = useState<string | null>(null);
  const ref = dayNum(refDate)!;
  const upcoming = p.meetings.filter((m) => m.status === "برنامه‌ریزی‌شده").sort((a, b) => (dayNum(a.date) ?? 0) - (dayNum(b.date) ?? 0));
  const past = p.meetings.filter((m) => m.status !== "برنامه‌ریزی‌شده");
  const memberList = p.members.map((m) => m.name);

  const saveMeet = () => {
    if (!meet) return;
    if (!meet.title.trim() || !meet.date || !meet.time) return notify("عنوان، تاریخ و ساعت الزامی است.", "warning");
    if (!meet.participants.length) return notify("حداقل یک شرکت‌کننده انتخاب کنید.", "warning");
    pm.saveMeeting(pid, meet);
    notify(meet.id ? "جلسه به‌روزرسانی شد و به شرکت‌کنندگان اطلاع داده شد." : `جلسه ایجاد شد و دعوت‌نامه برای ${fa(meet.participants.length)} نفر رفت.`);
    setMeet(null);
  };

  const newMinuteFor = (m?: PMMeeting) =>
    setMinute({
      title: m?.title ?? "",
      date: m?.date ?? refDate,
      attendees: m?.participants.length ?? 0,
      decisions: 0,
      followUps: 0,
      meetingId: m?.id,
      participants: m?.participants ?? [],
      topics: [""],
      decisionList: [""],
      actions: [],
      publish: true,
    });

  const saveMinute = () => {
    if (!minute) return;
    if (!minute.title.trim()) return notify("موضوع جلسه الزامی است.", "warning");
    const { publish, ...rest } = minute;
    pm.saveMinutes(pid, { ...rest, topics: rest.topics?.filter((x) => x.trim()), decisionList: rest.decisionList?.filter((x) => x.trim()), actions: rest.actions?.filter((a) => a.text.trim()) }, publish);
    notify(publish ? "صورت‌جلسه منتشر شد و برای شرکت‌کنندگان ارسال شد." : "صورت‌جلسه به‌صورت پیش‌نویس ذخیره شد.");
    setMinute(null);
  };

  const mv = viewMin ? p.minutes.find((x) => x.id === viewMin) : undefined;

  const MeetingRow = ({ m }: { m: PMMeeting }) => {
    const d = dayNum(m.date) ?? 0;
    const hasMin = p.minutes.some((x) => x.meetingId === m.id);
    return (
      <div className={`card p-4 flex items-center justify-between gap-3 flex-wrap ${focusId === m.id ? "ring-2 ring-brand-300" : ""}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.mode === "ویدیویی" ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600"}`}>{m.mode === "ویدیویی" ? <Video size={16} /> : <Users size={16} />}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900">{m.title}</p>
            <p className="text-xs text-ink-400 mt-0.5">
              {m.date} ساعت {m.time} · {fa(m.duration)} دقیقه · {m.mode} · {fa(m.participants.length)} شرکت‌کننده
              {m.status === "برنامه‌ریزی‌شده" && d - ref >= 0 && d - ref <= 1 && <span className="text-amber-600"> · {d === ref ? "امروز" : "فردا"}</span>}
            </p>
            {m.taskIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {m.taskIds.map((id) => (
                  <button key={id} onClick={() => openTask(id)} className="text-[10.5px] px-1.5 rounded bg-ink-100 text-ink-600 hover:text-brand-700">
                    {taskTitle(p, id)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {m.status === "برنامه‌ریزی‌شده" ? (
            <>
              {m.mode === "ویدیویی" && (
                <Button size="sm" variant="primary" icon={<Video size={13} />} onClick={() => setRoom(m)}>
                  ورود به جلسه
                </Button>
              )}
              {canEdit && (
                <>
                  <Button size="sm" variant="secondary" icon={<CheckCircle2 size={13} />} onClick={() => newMinuteFor(m)}>
                    ثبت صورت‌جلسه
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Ban size={13} />} onClick={() => confirm({ title: `لغو جلسه‌ی «${m.title}»؟`, message: "به همه‌ی شرکت‌کنندگان (درون‌برنامه، رایانامه و پیامک) اطلاع داده می‌شود.", confirmLabel: "لغو جلسه", onConfirm: () => pm.setMeetingStatus(pid, m.id, "لغوشده") })}>
                    لغو
                  </Button>
                  <RowActions onEdit={() => setMeet({ ...m })} />
                </>
              )}
            </>
          ) : (
            <>
              <Badge tone={m.status === "لغوشده" ? "danger" : "success"}>{m.status}</Badge>
              {m.status === "برگزارشده" && !hasMin && canEdit && (
                <Button size="sm" variant="secondary" onClick={() => newMinuteFor(m)}>
                  ثبت صورت‌جلسه
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle
          icon={<CalendarPlus size={15} className="text-brand-600" />}
          title="جلسات پیش‌رو"
          hint="ایجاد جلسه: عنوان، تاریخ، ساعت، شرکت‌کنندگان، توضیحات و تسک‌های مرتبط — جلسه‌ی ویدیویی بدون خروج از سامانه برگزار می‌شود."
          action={
            canEdit && (
              <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setMeet({ title: "", date: refDate, time: "۱۰:۰۰", duration: 60, mode: "ویدیویی", participants: [p.meta.manager], description: "", taskIds: [] })}>
                جلسه‌ی جدید
              </Button>
            )
          }
        />
        <div className="space-y-2">
          {upcoming.map((m) => (
            <MeetingRow key={m.id} m={m} />
          ))}
          {upcoming.length === 0 && <p className="text-xs text-ink-400">جلسه‌ی برنامه‌ریزی‌شده‌ای نیست.</p>}
        </div>
      </div>

      <div>
        <SectionTitle
          icon={<FileText size={15} className="text-brand-600" />}
          title="صورت‌جلسات"
          hint="هر اقدام (Action Item) صورت‌جلسه با یک کلیک به تسک تبدیل می‌شود."
          action={
            canEdit && (
              <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => newMinuteFor()}>
                صورت‌جلسه‌ی جدید
              </Button>
            )
          }
        />
        {p.minutes.length > 0 ? (
          <div className="space-y-3">
            {p.minutes.map((mn) => (
              <div key={mn.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                <button className="flex items-center gap-3 min-w-0 text-right" onClick={() => setViewMin(mn.id)}>
                  <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-600 flex items-center justify-center shrink-0">
                    <FileText size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{mn.title}</p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {mn.date} · {fa(mn.attendees)} حاضر {mn.published === false && "· پیش‌نویس"}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Badge tone="brand" icon={<CalendarCheck2 size={11} />}>
                    {fa(mn.decisions)} مصوبه
                  </Badge>
                  <Badge tone="warning">{fa(mn.followUps)} پیگیری</Badge>
                  {mn.actions && mn.actions.length > 0 && (
                    <Badge tone="success">
                      {fa(mn.actions.filter((a) => a.taskId).length)}/{fa(mn.actions.length)} به تسک تبدیل شده
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<FileText size={20} />} title="صورت‌جلسات این پروژه" description="آرشیو صورت‌جلسات از ماژول مدیریت دانش با دسته‌بندی این پروژه نمایش داده می‌شود." />
        )}
      </div>

      {past.length > 0 && (
        <div>
          <SectionTitle title="جلسات برگزارشده / لغوشده" />
          <div className="space-y-2">
            {past.map((m) => (
              <MeetingRow key={m.id} m={m} />
            ))}
          </div>
        </div>
      )}

      {/* ایجاد/ویرایش جلسه */}
      <Modal open={!!meet} onClose={() => setMeet(null)} title={meet?.id ? "ویرایش جلسه" : "ایجاد جلسه"} width="max-w-xl">
        {meet && (
          <div className="space-y-3">
            <Field label="عنوان جلسه">
              <input className="input-field" value={meet.title} onChange={(e) => setMeet({ ...meet, title: e.target.value })} placeholder="مثلاً: بازبینی اسپرینت" />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="تاریخ">
                <JalaliDatePicker value={meet.date} onChange={(v) => setMeet({ ...meet, date: v })} />
              </Field>
              <Field label="ساعت">
                <input className="input-field" value={meet.time} onChange={(e) => setMeet({ ...meet, time: e.target.value })} placeholder="۱۰:۰۰" />
              </Field>
              <Field label="مدت (دقیقه)">
                <input className="input-field" value={fa(meet.duration)} onChange={(e) => setMeet({ ...meet, duration: Number(e.target.value.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))) || 0 })} />
              </Field>
              <Field label="نوع">
                <select className="input-field" value={meet.mode} onChange={(e) => setMeet({ ...meet, mode: e.target.value as PMMeeting["mode"] })}>
                  <option>ویدیویی</option>
                  <option>حضوری</option>
                </select>
              </Field>
            </div>
            <Field label="شرکت‌کنندگان">
              <div className="flex flex-wrap gap-1.5">
                {memberList.map((n) => (
                  <button key={n} onClick={() => setMeet({ ...meet, participants: meet.participants.includes(n) ? meet.participants.filter((x) => x !== n) : [...meet.participants, n] })} className={`text-[11px] px-2 py-1 rounded-md border ${meet.participants.includes(n) ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="تسک‌های مرتبط">
              <div className="max-h-32 overflow-y-auto border border-ink-200 rounded-lg p-2 space-y-1">
                {p.tasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-xs text-ink-700">
                    <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={meet.taskIds.includes(t.id)} onChange={() => setMeet({ ...meet, taskIds: meet.taskIds.includes(t.id) ? meet.taskIds.filter((x) => x !== t.id) : [...meet.taskIds, t.id] })} />
                    {t.title}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="توضیحات / دستور جلسه">
              <textarea className="input-field min-h-[60px]" value={meet.description} onChange={(e) => setMeet({ ...meet, description: e.target.value })} />
            </Field>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1 justify-center" onClick={saveMeet}>
                {meet.id ? "ذخیره و اطلاع به شرکت‌کنندگان" : "ایجاد و ارسال دعوت‌نامه"}
              </Button>
              <Button variant="secondary" onClick={() => setMeet(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ثبت صورت‌جلسه */}
      <Modal open={!!minute} onClose={() => setMinute(null)} title="ثبت صورت‌جلسه" description="موضوعات، تصمیمات و اقدامات موردنیاز با مسئول و سررسید" width="max-w-2xl">
        {minute && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="موضوع جلسه">
                <input className="input-field" value={minute.title} onChange={(e) => setMinute({ ...minute, title: e.target.value })} />
              </Field>
              <Field label="تاریخ جلسه">
                <JalaliDatePicker value={minute.date} onChange={(v) => setMinute({ ...minute, date: v })} />
              </Field>
            </div>
            <Field label="شرکت‌کنندگان">
              <div className="flex flex-wrap gap-1.5">
                {memberList.map((n) => {
                  const on = minute.participants?.includes(n);
                  return (
                    <button key={n} onClick={() => setMinute({ ...minute, participants: on ? minute.participants!.filter((x) => x !== n) : [...(minute.participants ?? []), n] })} className={`text-[11px] px-2 py-1 rounded-md border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500"}`}>
                      {n}
                    </button>
                  );
                })}
              </div>
            </Field>
            {(["topics", "decisionList"] as const).map((k) => (
              <Field key={k} label={k === "topics" ? "موضوعات مطرح‌شده" : "تصمیمات (مصوبات)"}>
                <div className="space-y-1.5">
                  {(minute[k] ?? []).map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input-field" value={v} onChange={(e) => setMinute({ ...minute, [k]: minute[k]!.map((x, j) => (j === i ? e.target.value : x)) })} />
                      <button onClick={() => setMinute({ ...minute, [k]: minute[k]!.filter((_, j) => j !== i) })} className="text-ink-400 hover:text-rose-600" aria-label="حذف">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setMinute({ ...minute, [k]: [...(minute[k] ?? []), ""] })}>
                    افزودن
                  </Button>
                </div>
              </Field>
            ))}
            <Field label="اقدامات موردنیاز (Action Items)">
              <div className="space-y-2">
                {(minute.actions ?? []).map((a, i) => (
                  <div key={a.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_140px_auto] gap-2">
                    <input className="input-field" value={a.text} onChange={(e) => setMinute({ ...minute, actions: minute.actions!.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} placeholder="مثلاً: تکمیل صفحه‌ی ورود" />
                    <MemberSelect p={p} value={a.owner} onChange={(v) => setMinute({ ...minute, actions: minute.actions!.map((x, j) => (j === i ? { ...x, owner: v } : x)) })} allowEmpty={false} />
                    <JalaliDatePicker value={a.due} onChange={(v) => setMinute({ ...minute, actions: minute.actions!.map((x, j) => (j === i ? { ...x, due: v } : x)) })} />
                    <button onClick={() => setMinute({ ...minute, actions: minute.actions!.filter((_, j) => j !== i) })} className="text-ink-400 hover:text-rose-600" aria-label="حذف اقدام">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setMinute({ ...minute, actions: [...(minute.actions ?? []), { id: `ac-${Date.now()}`, text: "", owner: p.meta.manager, due: refDate }] })}>
                  افزودن اقدام
                </Button>
              </div>
            </Field>
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input type="checkbox" checked={minute.publish} onChange={(e) => setMinute({ ...minute, publish: e.target.checked })} className="accent-[var(--color-brand-600)]" />
              انتشار و ارسال برای شرکت‌کنندگان (رویداد MINUTES_PUBLISHED)
            </label>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1 justify-center" onClick={saveMinute}>
                {minute.publish ? "ثبت و انتشار" : "ذخیره‌ی پیش‌نویس"}
              </Button>
              <Button variant="secondary" onClick={() => setMinute(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* مشاهده‌ی صورت‌جلسه */}
      <Modal open={!!mv} onClose={() => setViewMin(null)} title={mv?.title ?? ""} description={mv ? `${mv.date} · ${fa(mv.attendees)} حاضر` : undefined} width="max-w-xl">
        {mv && (
          <div className="space-y-4 text-sm">
            {mv.participants && (
              <div>
                <p className="text-xs font-bold text-ink-700 mb-1">شرکت‌کنندگان</p>
                <p className="text-xs text-ink-600">{mv.participants.join("، ")}</p>
              </div>
            )}
            {mv.topics && mv.topics.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-700 mb-1">موضوعات مطرح‌شده</p>
                <ul className="list-disc pr-5 text-xs text-ink-700 space-y-1">
                  {mv.topics.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {mv.decisionList && mv.decisionList.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-700 mb-1">تصمیمات</p>
                <ul className="list-decimal pr-5 text-xs text-ink-700 space-y-1">
                  {mv.decisionList.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
                <ListChecks size={13} /> اقدامات
              </p>
              {(mv.actions ?? []).map((a: ActionItem) => (
                <div key={a.id} className="flex items-center gap-2 py-1.5 border-b border-ink-100 text-xs flex-wrap">
                  <span className="flex-1 text-ink-800">{a.text}</span>
                  <span className="text-ink-500">
                    {a.owner} · {a.due}
                  </span>
                  {a.taskId ? (
                    <button onClick={() => { setViewMin(null); openTask(a.taskId!); }} className="text-emerald-700 hover:underline">
                      تسک شد ←
                    </button>
                  ) : (
                    canEdit && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<ArrowLeftRight size={12} />}
                        onClick={() => {
                          pm.convertAction(pid, mv.id, a);
                          notify(`اقدام «${a.text}» به تسک تبدیل و به «${a.owner}» واگذار شد.`);
                        }}
                      >
                        تبدیل به تسک
                      </Button>
                    )
                  )}
                </div>
              ))}
              {!mv.actions?.length && <p className="text-[11px] text-ink-400">این صورت‌جلسه فقط خلاصه‌ی عددی دارد ({fa(mv.decisions)} مصوبه، {fa(mv.followUps)} پیگیری).</p>}
            </div>
          </div>
        )}
      </Modal>

      {room && <VideoRoom meeting={room} onLeave={() => { const r = room; setRoom(null); if (canEdit) confirm({ title: "جلسه تمام شد؛ صورت‌جلسه ثبت شود؟", message: "تصمیمات و اقدامات را همین حالا ثبت کنید تا به تسک تبدیل شوند.", confirmLabel: "ثبت صورت‌جلسه", onConfirm: () => newMinuteFor(r) }); }} />}
    </div>
  );
}

/** اتاق جلسه‌ی صوتی/تصویری (نمای دمو) */
function VideoRoom({ meeting, onLeave }: { meeting: PMMeeting; onLeave: () => void }) {
  const { canEdit } = useProjectPage();
  const { actor } = useProjectsPM();
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [share, setShare] = useState(false);
  const [rec, setRec] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ who: string; text: string }[]>([]);
  const [text, setText] = useState("");
  const people = [actor, ...meeting.participants.filter((x) => x !== actor)];
  return (
    <div className="fixed inset-0 z-50 bg-navy-950 text-white flex flex-col" dir="rtl" role="dialog" aria-label={`جلسه‌ی ${meeting.title}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div>
          <p className="font-bold text-sm">{meeting.title}</p>
          <p className="text-[11px] text-white/60">
            {fa(people.length)} شرکت‌کننده {rec && <span className="text-rose-400">· در حال ضبط</span>}
          </p>
        </div>
        <Badge tone="navy">جلسه‌ی ویدیویی درون‌سامانه</Badge>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 grid gap-3 content-start" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))` }}>
          {share && (
            <div className="col-span-full aspect-[16/6] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 text-sm">
              <MonitorUp size={18} className="ml-2" /> {actor} در حال اشتراک‌گذاری صفحه است
            </div>
          )}
          {people.map((n, i) => (
            <div key={n} className="aspect-video rounded-xl bg-white/5 border border-white/10 relative flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-lg font-bold">{n.replace(/^(دکتر|مهندس) /, "").slice(0, 1)}</span>
              <span className="absolute bottom-2 right-2 text-[11px] bg-black/40 rounded px-1.5 py-0.5 flex items-center gap-1">
                {i === 0 && !mic ? <MicOff size={11} className="text-rose-400" /> : <Mic size={11} />} {n}
                {i === 0 && " (شما)"}
              </span>
              {i === 0 && !cam && <VideoOff size={14} className="absolute top-2 left-2 text-rose-400" />}
            </div>
          ))}
        </div>
        {chatOpen && (
          <div className="w-72 border-r border-white/10 flex flex-col">
            <p className="p-3 text-xs font-bold border-b border-white/10">چت جلسه</p>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {msgs.map((m, i) => (
                <p key={i}>
                  <span className="text-white/60">{m.who}: </span>
                  {m.text}
                </p>
              ))}
            </div>
            <form
              className="p-2 border-t border-white/10"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) setMsgs([...msgs, { who: actor, text }]);
                setText("");
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-white/10 rounded-lg px-3 py-2 text-xs outline-none" placeholder="پیام…" />
            </form>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 py-4 border-t border-white/10 flex-wrap">
        {[
          { on: mic, set: setMic, icon: mic ? <Mic size={18} /> : <MicOff size={18} />, label: mic ? "قطع میکروفون" : "وصل میکروفون" },
          { on: cam, set: setCam, icon: cam ? <Video size={18} /> : <VideoOff size={18} />, label: cam ? "خاموش‌کردن دوربین" : "روشن‌کردن دوربین" },
          { on: share, set: setShare, icon: <MonitorUp size={18} />, label: "اشتراک صفحه" },
          { on: chatOpen, set: setChatOpen, icon: <MessageSquare size={18} />, label: "چت جلسه" },
        ].map((b) => (
          <button key={b.label} onClick={() => b.set(!b.on)} title={b.label} aria-label={b.label} className={`w-11 h-11 rounded-full flex items-center justify-center ${b.on ? "bg-white/15" : "bg-white/5 text-white/60"}`}>
            {b.icon}
          </button>
        ))}
        <button disabled={!canEdit} onClick={() => setRec(!rec)} title={canEdit ? "ضبط جلسه" : "ضبط فقط با مجوز مدیر پروژه"} aria-label="ضبط جلسه" className={`w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 ${rec ? "bg-rose-600" : "bg-white/15"}`}>
          <Circle size={16} fill={rec ? "white" : "none"} />
        </button>
        <button onClick={() => navigator.clipboard?.writeText(`${location.href}#join-${meeting.id}`)} title="دعوت اعضا (کپی لینک)" aria-label="دعوت اعضا" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
          <UserPlus size={18} />
        </button>
        <button onClick={onLeave} className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center gap-2 text-sm font-medium">
          <PhoneOff size={16} /> خروج از جلسه
        </button>
      </div>
    </div>
  );
}
