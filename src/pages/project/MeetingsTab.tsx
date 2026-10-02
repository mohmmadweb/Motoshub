import { useEffect, useState } from "react";
import { CalendarCheck2, CalendarPlus, FileText, Mic, MicOff, Video, VideoOff, MonitorUp, Circle, PhoneOff, MessageSquare, UserPlus, Users, Plus, X, ListChecks, ArrowLeftRight, Ban, CheckCircle2, Phone, Paperclip, BellRing, Upload, Repeat, ChevronDown, ListOrdered } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { dayNum, fa, fromDayNum } from "../../pm/jalali";
import type { ActionItem, AgendaItem, DocType, PMMeeting, PMMinute } from "../../pm/types";
import { endBefore, nextOccurrence, reminderLabel, ruleLabel, splitEdit, withException, type EditScope } from "../../pm/recurrence";
import AvailabilityPanel from "../calendar/AvailabilityPanel";
import { attendeeFromName } from "../calendar/availability";
import { RecurrenceEditor, RemindersEditor, SeriesScopeDialog } from "../calendar/RecurrenceFields";
import { fmtMin, toMin } from "../calendar/model";
import { defaultMeetingSettings } from "../../pm/selectors";
import { Field, MemberSelect, SectionTitle, taskTitle, useProjectPage } from "./shared";

type MeetDraft = Omit<PMMeeting, "id" | "status"> & { id?: string; /** تاریخ وقوعی از سری که ویرایش می‌شود */ occDate?: string };
type MinDraft = Omit<PMMinute, "id"> & { id?: string; publish: boolean; newFiles: { name: string; type: DocType; size: string }[] };

const modeIcon = (mode: PMMeeting["mode"], size = 16) => (mode === "ویدیویی" ? <Video size={size} /> : mode === "صوتی" ? <Phone size={size} /> : <Users size={size} />);
const kb = (bytes: number) => (bytes > 1_000_000 ? `${(bytes / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت` : `${Math.max(1, Math.round(bytes / 1000)).toLocaleString("fa-IR")} کیلوبایت`);
const docTypeOf = (name: string): DocType => (/\.(xlsx?|csv)$/i.test(name) ? "فایل مالی" : /\.(pptx?|key)$/i.test(name) ? "ارائه" : /\.(dwg|fig|psd|ai)$/i.test(name) ? "فایل طراحی" : /صورت/.test(name) ? "صورت‌جلسه" : "گزارش");

export default function MeetingsTab() {
  const { p, pid, can, refDate, openTask, focusId, goTab } = useProjectPage();
  const canEdit = can("projects.meetings");
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [meet, setMeet] = useState<MeetDraft | null>(null);
  const [room, setRoom] = useState<PMMeeting | null>(null);
  const [minute, setMinute] = useState<MinDraft | null>(null);
  const [viewMin, setViewMin] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [scopeAsk, setScopeAsk] = useState<{ title: string; run: (s: EditScope) => void } | null>(null);
  const ms = p.meetingSettings ?? defaultMeetingSettings;
  // پرش از جستجو/اعلان به یک صورت‌جلسه
  useEffect(() => {
    if (focusId && p.minutes.some((m) => m.id === focusId)) setViewMin(focusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);
  const ref = dayNum(refDate)!;
  /** تاریخ وقوع بعدی (برای جلسات تکرارشونده) */
  const nextOf = (m: PMMeeting) => (m.recurrence ? nextOccurrence(m.recurrence, m.date, ref) ?? dayNum(m.date) ?? 0 : dayNum(m.date) ?? 0);
  const upcoming = p.meetings.filter((m) => m.status === "برنامه‌ریزی‌شده").sort((a, b) => nextOf(a) - nextOf(b));
  const past = p.meetings.filter((m) => m.status !== "برنامه‌ریزی‌شده");
  const memberList = p.members.map((m) => m.name);

  const saveMeet = () => {
    if (!meet) return;
    if (!meet.title.trim() || !meet.date || !meet.time) return notify("عنوان، تاریخ و ساعت الزامی است.", "warning");
    if (toMin(meet.time) === null) return notify("ساعت را به شکل ۱۰:۳۰ وارد کنید.", "warning");
    if (!meet.participants.length) return notify("حداقل یک شرکت‌کننده انتخاب کنید.", "warning");
    const { occDate, ...draft } = meet;
    const agenda = (draft.agenda ?? []).filter((a) => a.title.trim());
    const clean = { ...draft, agenda: agenda.length ? agenda : undefined, reminders: draft.reminders?.length ? draft.reminders : undefined };
    const orig = draft.id ? p.meetings.find((x) => x.id === draft.id) : undefined;
    if (orig?.recurrence && occDate) {
      setScopeAsk({
        title: `ویرایش «${orig.title}»`,
        run: (scope) => {
          const r = splitEdit(orig, occDate, scope, { ...orig, ...clean, id: orig.id }, (x) => x.recurrence, (x, rr) => ({ ...x, recurrence: rr }));
          if (r.update) pm.saveMeeting(pid, r.update);
          r.create.forEach((c) => pm.saveMeeting(pid, { ...c, id: undefined, seriesOf: orig.id }));
          notify(scope === "one" ? "فقط همین جلسه تغییر کرد و به شرکت‌کنندگان اطلاع داده شد." : scope === "following" ? "این جلسه و جلسات بعدی سری تغییر کرد." : "همه‌ی جلسات سری به‌روزرسانی شد.");
          setScopeAsk(null);
          setMeet(null);
        },
      });
      return;
    }
    pm.saveMeeting(pid, clean);
    notify(meet.id ? "جلسه به‌روزرسانی شد و به شرکت‌کنندگان اطلاع داده شد." : `جلسه ایجاد شد و دعوت‌نامه برای ${fa(meet.participants.length)} نفر رفت.`);
    setMeet(null);
  };

  const editMeet = (m: PMMeeting) => {
    const occ = m.recurrence ? nextOccurrence(m.recurrence, m.date, ref) : null;
    setMore(!!(m.recurrence || m.reminders?.length || m.agenda?.length));
    setMeet({ ...m, date: occ !== null ? fromDayNum(occ) : m.date, occDate: occ !== null ? fromDayNum(occ) : undefined });
  };

  const cancelMeet = (m: PMMeeting) => {
    const occ = m.recurrence ? nextOccurrence(m.recurrence, m.date, ref) : null;
    if (!m.recurrence || occ === null)
      return confirm({ title: `لغو جلسه‌ی «${m.title}»؟`, message: "به همه‌ی شرکت‌کنندگان (درون‌برنامه، رایانامه و پیامک) اطلاع داده می‌شود.", confirmLabel: "لغو جلسه", onConfirm: () => pm.setMeetingStatus(pid, m.id, "لغوشده") });
    const occDate = fromDayNum(occ);
    setScopeAsk({
      title: `لغو «${m.title}» (${occDate})`,
      run: (scope) => {
        if (scope === "all") pm.setMeetingStatus(pid, m.id, "لغوشده");
        else pm.saveMeeting(pid, { ...m, recurrence: scope === "one" ? withException(m.recurrence!, occDate) : endBefore(m.recurrence!, m.date, occDate) });
        notify(scope === "one" ? `جلسه‌ی ${occDate} لغو شد.` : scope === "following" ? "جلسات این سری از این تاریخ به بعد لغو شد." : "کل سری جلسه لغو شد.");
        setScopeAsk(null);
      },
    });
  };

  const newMinuteFor = (m?: PMMeeting) =>
    setMinute({
      title: m?.title ?? "",
      date: m ? (m.recurrence ? fromDayNum(Math.min(nextOf(m), ref)) : m.date) : refDate,
      attendees: m?.participants.length ?? 0,
      decisions: 0,
      followUps: 0,
      meetingId: m?.id,
      participants: m?.participants ?? [],
      // دستور جلسه، موضوعات صورت‌جلسه را پیش‌پر می‌کند
      topics: m?.agenda?.length ? m.agenda.map((a) => `${a.title}${a.owner ? ` — ${a.owner}` : ""}${a.minutes ? ` (${fa(a.minutes)} دقیقه)` : ""}`) : [""],
      decisionList: [""],
      actions: [],
      publish: true,
      fileIds: m ? p.documents.filter((d) => d.meetingId === m.id).map((d) => d.id) : [],
      newFiles: [],
    });

  const saveMinute = () => {
    if (!minute) return;
    if (!minute.title.trim()) return notify("موضوع جلسه الزامی است.", "warning");
    const { publish, newFiles, ...rest } = minute;
    pm.saveMinutes(pid, { ...rest, topics: rest.topics?.filter((x) => x.trim()), decisionList: rest.decisionList?.filter((x) => x.trim()), actions: rest.actions?.filter((a) => a.text.trim()) }, publish, newFiles);
    notify(publish ? "صورت‌جلسه منتشر شد و برای شرکت‌کنندگان ارسال شد." : "صورت‌جلسه به‌صورت پیش‌نویس ذخیره شد.");
    setMinute(null);
  };

  const mv = viewMin ? p.minutes.find((x) => x.id === viewMin) : undefined;

  const MeetingRow = ({ m }: { m: PMMeeting }) => {
    const d = nextOf(m);
    const hasMin = p.minutes.some((x) => x.meetingId === m.id);
    return (
      <div className={`card p-4 flex items-center justify-between gap-3 flex-wrap ${focusId === m.id ? "ring-2 ring-brand-300" : ""}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.mode === "ویدیویی" ? "bg-brand-50 text-brand-700" : m.mode === "صوتی" ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-600"}`}>{modeIcon(m.mode)}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900">{m.title}</p>
            <p className="text-xs text-ink-400 mt-0.5">
              {m.recurrence && m.status === "برنامه‌ریزی‌شده" ? fromDayNum(d) : m.date} ساعت {m.time} · {fa(m.duration)} دقیقه · {m.mode} · {fa(m.participants.length)} شرکت‌کننده
              {m.status === "برنامه‌ریزی‌شده" && d - ref >= 0 && d - ref <= 1 && <span className="text-amber-600"> · {d === ref ? "امروز" : "فردا"}</span>}
              {m.status === "برنامه‌ریزی‌شده" && d >= ref && (
                <span className="inline-flex items-center gap-0.5 mr-1" title={m.reminders?.length ? m.reminders.map(reminderLabel).join("، ") : "یادآوری خودکار به شرکت‌کنندگان"}>
                  · <BellRing size={10} /> {m.reminders?.length ? reminderLabel(m.reminders[0]) : `${fa(ms.reminderMinutes)} دقیقه قبل`}
                  {(m.reminders?.length ?? 0) > 1 && ` +${fa(m.reminders!.length - 1)}`}
                </span>
              )}
            </p>
            {(m.recurrence || m.agenda?.length) && (
              <p className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-2 flex-wrap">
                {m.recurrence && (
                  <span className="inline-flex items-center gap-1" title="جلسه‌ی تکرارشونده">
                    <Repeat size={11} className="text-brand-600" /> {ruleLabel(m.recurrence, m.date)}
                  </span>
                )}
                {m.agenda?.length ? (
                  <span className="inline-flex items-center gap-1" title={m.agenda.map((a) => a.title).join("، ")}>
                    <ListOrdered size={11} /> دستور جلسه: {fa(m.agenda.length)} بند
                  </span>
                ) : null}
              </p>
            )}
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
              {m.mode !== "حضوری" && (
                <Button size="sm" variant="primary" icon={m.mode === "صوتی" ? <Phone size={13} /> : <Video size={13} />} onClick={() => setRoom(m)}>
                  {m.mode === "صوتی" ? "پیوستن به تماس" : "ورود به جلسه"}
                </Button>
              )}
              {canEdit && (
                <>
                  <Button size="sm" variant="secondary" icon={<CheckCircle2 size={13} />} onClick={() => newMinuteFor(m)}>
                    ثبت صورت‌جلسه
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Ban size={13} />} onClick={() => cancelMeet(m)}>
                    لغو
                  </Button>
                  <RowActions onEdit={() => editMeet(m)} />
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
          hint="ایجاد جلسه: عنوان، تاریخ، ساعت، شرکت‌کنندگان، توضیحات و تسک‌های مرتبط — جلسه‌ی ویدیویی یا تماس صوتی بدون خروج از سامانه برگزار می‌شود."
          action={
            canEdit && (
              <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => { setMore(false); setMeet({ title: "", date: refDate, time: "۱۰:۰۰", duration: ms.defaultDuration, mode: ms.defaultMode, participants: [p.meta.manager], description: "", taskIds: [], reminders: [{ minutes: ms.reminderMinutes, channel: "inapp" }] }); }}>
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
                  {(mn.fileIds ?? []).length > 0 && (
                    <Badge tone="neutral" icon={<Paperclip size={11} />}>
                      {fa((mn.fileIds ?? []).length)} فایل
                    </Badge>
                  )}
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
                  <option>صوتی</option>
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
            <AvailabilityPanel
              attendees={meet.participants.map((n) => attendeeFromName(n, p.members))}
              date={meet.date}
              start={toMin(meet.time)}
              duration={meet.duration || 60}
              exclude={meet.id ? [`mt:${pid}:${meet.id}`] : []}
              onPick={(d, st) => setMeet({ ...meet, date: d, time: fmtMin(st) })}
            />
            <div className="rounded-lg border border-ink-100">
              <button type="button" onClick={() => setMore((v) => !v)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-ink-700" aria-expanded={more}>
                <span className="flex items-center gap-1.5">
                  <Repeat size={13} className="text-brand-600" /> تکرار، یادآوری و دستور جلسه
                  <span className="text-ink-400">
                    {[meet.recurrence ? ruleLabel(meet.recurrence, meet.date) : "", meet.reminders?.length ? `${fa(meet.reminders.length)} یادآوری` : "", meet.agenda?.length ? `${fa(meet.agenda.length)} بند` : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronDown size={14} className={`transition-transform ${more ? "rotate-180" : ""}`} />
              </button>
              {more && (
                <div className="px-3 pb-3 space-y-3">
                  <Field label="تکرار">
                    <RecurrenceEditor value={meet.recurrence} onChange={(r) => setMeet({ ...meet, recurrence: r })} startDate={meet.date} />
                  </Field>
                  <Field label="یادآوری به شرکت‌کنندگان">
                    <RemindersEditor value={meet.reminders} onChange={(r) => setMeet({ ...meet, reminders: r })} />
                  </Field>
                  <Field label="دستور جلسه" hint="بندهای دستور جلسه هنگام ثبت صورت‌جلسه، موضوعات را پیش‌پر می‌کنند.">
                    <AgendaEditor items={meet.agenda ?? []} duration={meet.duration} members={memberList} onChange={(agenda) => setMeet({ ...meet, agenda })} />
                  </Field>
                </div>
              )}
            </div>
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
            <Field label="فایل‌های مرتبط صورت‌جلسه">
              <div className="space-y-2">
                {p.documents.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border border-ink-200 rounded-lg p-2 space-y-1">
                    {p.documents.map((d) => {
                      const on = (minute.fileIds ?? []).includes(d.id);
                      return (
                        <label key={d.id} className="flex items-center gap-2 text-xs text-ink-700">
                          <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={on} onChange={() => setMinute({ ...minute, fileIds: on ? (minute.fileIds ?? []).filter((x) => x !== d.id) : [...(minute.fileIds ?? []), d.id] })} />
                          <Paperclip size={11} className="text-ink-400" />
                          <span className="flex-1 truncate">{d.name}</span>
                          <span className="text-ink-400 shrink-0">{d.type}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {minute.newFiles.map((nf, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-brand-50 text-brand-800 rounded-md px-2 py-1.5">
                    <Upload size={12} /> <span className="flex-1 truncate">{nf.name}</span>
                    <span className="text-brand-600/70">{nf.size} · بارگذاری با ثبت</span>
                    <button onClick={() => setMinute({ ...minute, newFiles: minute.newFiles.filter((_, j) => j !== i) })} aria-label="حذف فایل">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="inline-flex items-center gap-1.5 text-xs text-brand-700 cursor-pointer hover:underline">
                  <Upload size={13} /> بارگذاری فایل جدید
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = [...(e.target.files ?? [])].map((f) => ({ name: f.name, type: docTypeOf(f.name), size: kb(f.size) }));
                      setMinute({ ...minute, newFiles: [...minute.newFiles, ...files] });
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-[11px] text-ink-400">فایل‌های تازه در «اسناد» پروژه هم با پیوند به این جلسه ثبت می‌شوند.</p>
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
            {(mv.fileIds ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-700 mb-1 flex items-center gap-1">
                  <Paperclip size={13} /> فایل‌های مرتبط
                </p>
                <div className="space-y-1">
                  {(mv.fileIds ?? []).map((fid) => {
                    const d = p.documents.find((x) => x.id === fid);
                    if (!d) return null;
                    return (
                      <button key={fid} onClick={() => { setViewMin(null); goTab("documents", d.id); }} className="flex items-center gap-1.5 text-xs text-brand-700 hover:underline">
                        <FileText size={12} /> {d.name} <span className="text-ink-400">({d.type} · نسخه‌ی {fa(d.version)})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {canEdit && (
              <Button size="sm" variant="ghost" onClick={() => { const { id, ...rest } = mv; setViewMin(null); setMinute({ ...rest, id, publish: !!mv.published, newFiles: [], topics: mv.topics ?? [""], decisionList: mv.decisionList ?? [""], actions: mv.actions ?? [], participants: mv.participants ?? [] }); }}>
                ویرایش صورت‌جلسه / افزودن فایل
              </Button>
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

      <SeriesScopeDialog open={!!scopeAsk} title={scopeAsk?.title ?? ""} onPick={(sc) => scopeAsk?.run(sc)} onClose={() => setScopeAsk(null)} />
      {room && <VideoRoom meeting={room} recordingAllowed={ms.recordingAllowed} onLeave={() => { const r = room; setRoom(null); if (canEdit) confirm({ title: "جلسه تمام شد؛ صورت‌جلسه ثبت شود؟", message: "تصمیمات و اقدامات را همین حالا ثبت کنید تا به تسک تبدیل شوند.", confirmLabel: "ثبت صورت‌جلسه", onConfirm: () => newMinuteFor(r) }); }} />}
    </div>
  );
}

/** ویرایشگر دستور جلسه: عنوان، مسئول، دقیقه */
function AgendaEditor({ items, duration, members, onChange }: { items: AgendaItem[]; duration: number; members: string[]; onChange: (a: AgendaItem[]) => void }) {
  const total = items.reduce((s, a) => s + (a.minutes || 0), 0);
  return (
    <div className="space-y-1.5">
      {items.map((a, i) => (
        <div key={a.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_70px_auto] gap-1.5 items-center">
          <input className="input-field !py-1.5 text-xs col-span-1" value={a.title} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder={`بند ${fa(i + 1)}`} aria-label="عنوان بند" />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 text-ink-400 hover:text-rose-600 sm:order-last" aria-label="حذف بند">
            <X size={13} />
          </button>
          <select className="input-field !py-1.5 text-xs" value={a.owner} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)))} aria-label="مسئول بند">
            <option value="">بدون مسئول</option>
            {members.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <input className="input-field !py-1.5 text-xs text-center" value={fa(a.minutes || 0)} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/\D/g, "")) || 0 } : x)))} aria-label="دقیقه" />
        </div>
      ))}
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => onChange([...items, { id: `ag-${Date.now().toString(36)}`, title: "", owner: "", minutes: 10 }])}>
          افزودن بند
        </Button>
        {items.length > 0 && <span className={`text-[11px] ${total > duration ? "text-rose-600" : "text-ink-400"}`}>{fa(total)} از {fa(duration)} دقیقه</span>}
      </div>
    </div>
  );
}

/** اتاق جلسه‌ی صوتی/تصویری (نمای دمو) */
function VideoRoom({ meeting, onLeave, recordingAllowed }: { meeting: PMMeeting; onLeave: () => void; recordingAllowed: boolean }) {
  const audio = meeting.mode === "صوتی";
  const { canEdit } = useProjectPage();
  const { actor } = useProjectsPM();
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(!audio);
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
        <Badge tone="navy">{audio ? "تماس صوتی درون‌سامانه" : "جلسه‌ی ویدیویی درون‌سامانه"}</Badge>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 grid gap-3 content-start" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))` }}>
          {share && (
            <div className="col-span-full aspect-[16/6] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 text-sm">
              <MonitorUp size={18} className="ml-2" /> {actor} در حال اشتراک‌گذاری صفحه است
            </div>
          )}
          {people.map((n, i) => (
            <div key={n} className={`${audio ? "aspect-[4/3]" : "aspect-video"} rounded-xl bg-white/5 border border-white/10 relative flex items-center justify-center`}>
              {audio && i === 0 && mic && <span className="absolute inset-3 rounded-xl border-2 border-emerald-400/60 animate-pulse" />}
              <span className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-lg font-bold">{n.replace(/^(دکتر|مهندس) /, "").slice(0, 1)}</span>
              <span className="absolute bottom-2 right-2 text-[11px] bg-black/40 rounded px-1.5 py-0.5 flex items-center gap-1">
                {i === 0 && !mic ? <MicOff size={11} className="text-rose-400" /> : <Mic size={11} />} {n}
                {i === 0 && " (شما)"}
              </span>
              {!audio && i === 0 && !cam && <VideoOff size={14} className="absolute top-2 left-2 text-rose-400" />}
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
          ...(audio
            ? []
            : [
                { on: cam, set: setCam, icon: cam ? <Video size={18} /> : <VideoOff size={18} />, label: cam ? "خاموش‌کردن دوربین" : "روشن‌کردن دوربین" },
                { on: share, set: setShare, icon: <MonitorUp size={18} />, label: "اشتراک صفحه" },
              ]),
          { on: chatOpen, set: setChatOpen, icon: <MessageSquare size={18} />, label: "چت جلسه" },
        ].map((b) => (
          <button key={b.label} onClick={() => b.set(!b.on)} title={b.label} aria-label={b.label} className={`w-11 h-11 rounded-full flex items-center justify-center ${b.on ? "bg-white/15" : "bg-white/5 text-white/60"}`}>
            {b.icon}
          </button>
        ))}
        <button disabled={!canEdit || !recordingAllowed} onClick={() => setRec(!rec)} title={!recordingAllowed ? "ضبط در تنظیمات جلسات این پروژه غیرفعال است" : canEdit ? "ضبط جلسه" : "ضبط فقط با مجوز مدیر پروژه"} aria-label="ضبط جلسه" className={`w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 ${rec ? "bg-rose-600" : "bg-white/15"}`}>
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
