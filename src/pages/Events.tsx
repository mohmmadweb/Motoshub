import { useState } from "react";
import { CalendarDays, MapPin, Users, Hash, Plus, Calendar, Send, Trophy, PencilLine, ShieldQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { type EventItem, type Visibility } from "../data/mock";
import { awardTracks, awardEntries, type AwardEntry } from "../data/mockDaneshmand";
import Tabs from "../components/ui/Tabs";
import StatCard from "../components/ui/StatCard";
import RowActions from "../components/ui/RowActions";
import { useConfirm } from "../components/ui/ConfirmProvider";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { VisibilityToggle, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useContent } from "../context/ContentContext";

export default function Events() {
  const [tab, setTab] = useState<"events" | "award">("events");
  return (
    <div>
      <PageHeader
        title="رویدادها و جلسات"
        description="انتشار رویداد، دعوت از کاربران، مدیریت اسناد جلسات و رویداد سالانه جایزه نوآوری"
        icon={<CalendarDays size={18} />}
      />
      <Tabs
        tabs={[
          { id: "events", label: "رویدادها و جلسات" },
          { id: "award", label: "جایزه نوآوری و فناوری بنیاد", count: awardEntries.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "events" ? <EventsListTab /> : <AwardTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// رویداد جایزه نوآوری و فناوری بنیاد — سه محور، ثبت‌نام سامانه‌ای، صحت‌سنجی
// هلدینگ، داوری و امتیازدهی (مطابق کتاب فرآیندهای معاونت ترویج نوآوری)
// ---------------------------------------------------------------------------
const entryStatusTone = {
  "ثبت‌شده": "neutral",
  "صحت‌سنجی هلدینگ": "warning",
  "در حال داوری": "brand",
  "امتیازدهی شده": "success",
  "منتخب مرحله نهایی": "navy",
} as const;

function AwardTab() {
  const { notify } = useToast();
  const totalSubmissions = awardTracks.reduce((s, t) => s + t.submissions, 0);
  const totalJudged = awardTracks.reduce((s, t) => s + t.judged, 0);

  const requestEdit = (e: AwardEntry) =>
    notify(
      e.editUsed
        ? `اثر «${e.title}» قبلاً یک بار ویرایش شده — طبق آیین‌نامه، امکان ویرایش مجدد وجود ندارد.`
        : `فرم ویرایش اثر «${e.title}» باز شد. توجه: فقط یک بار امکان ویرایش وجود دارد.`,
      e.editUsed ? "warning" : "info"
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="آثار ثبت‌شده" value={totalSubmissions.toLocaleString("fa-IR")} tone="brand" icon={<Trophy size={16} />} />
        <StatCard label="داوری‌شده" value={totalJudged.toLocaleString("fa-IR")} tone="success" />
        <StatCard label="محورهای رویداد" value={awardTracks.length.toLocaleString("fa-IR")} />
        <StatCard label="در صحت‌سنجی هلدینگ" value={awardEntries.filter((e) => e.status === "صحت‌سنجی هلدینگ").length.toLocaleString("fa-IR")} tone="warning" icon={<ShieldQuestion size={16} />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {awardTracks.map((t) => (
          <div key={t.id} className="card p-4">
            <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5 mb-2">
              <Trophy size={14} className="text-amber-500" /> {t.title}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {t.categories.map((c) => (
                <Badge key={c} tone="neutral">{c}</Badge>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-ink-100">
              <span>{t.submissions.toLocaleString("fa-IR")} اثر ثبت‌شده</span>
              <span>{t.judged.toLocaleString("fa-IR")} داوری‌شده</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-2">آثار در جریان (نمونه)</h3>
        <div className="card divide-y divide-ink-100">
          {awardEntries.map((e) => (
            <div key={e.id} className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{e.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{e.track} · {e.company}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.score !== undefined && <Badge tone="success">امتیاز {e.score.toLocaleString("fa-IR")}</Badge>}
                <Badge tone={entryStatusTone[e.status]}>{e.status}</Badge>
                <button onClick={() => requestEdit(e)} className="text-ink-400 hover:text-brand-600 p-1" title="ویرایش (یک بار مجاز)">
                  <PencilLine size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-400 mt-2 leading-5">
          روند رویداد: ثبت‌نام از طریق سامانه ← صحت‌سنجی توسط هلدینگ همکار ← (یک بار امکان ویرایش) ← کمیته داوری و
          امتیازدهی ← انتخاب برگزیدگان سه محور.
        </p>
      </div>
    </div>
  );
}

function EventsListTab() {
  const { events, setEvents } = useContent();
  const [calendar, setCalendar] = useState<"jalali" | "gregorian">("jalali");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [jalaliDate, setJalaliDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: boolean; date?: boolean }>({});
  const { notify } = useToast();
  const confirm = useConfirm();

  const startEdit = (ev: EventItem) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setJalaliDate(ev.jalaliDate);
    setTime(ev.time);
    setLocation(ev.location);
    setDescription(ev.description);
    setVisibility(ev.visibility);
    setOpen(true);
  };

  const remove = (ev: EventItem) =>
    confirm({
      title: `حذف رویداد «${ev.title}»؟`,
      message: "لغو رویداد به همه‌ی دعوت‌شدگان اطلاع‌رسانی می‌شود.",
      onConfirm: () => {
        setEvents((prev) => prev.filter((e) => e.id !== ev.id));
        notify(`رویداد «${ev.title}» حذف شد و لغو آن به دعوت‌شدگان اطلاع‌رسانی گردید.`, "info");
      },
    });

  const submit = () => {
    const errs = { title: !title.trim(), date: !jalaliDate.trim() };
    setErrors(errs);
    if (errs.title || errs.date) return;
    if (editingId) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, title: title.trim(), jalaliDate: jalaliDate.trim(), time: time.trim() || "—", location: location.trim() || "نامشخص", description: description.trim() || e.description, visibility }
            : e
        )
      );
      notify(`رویداد «${title.trim()}» ویرایش شد و تغییرات به شرکت‌کنندگان اطلاع داده شد.`);
    } else {
      const newEvent: EventItem = {
        id: `e-${Date.now()}`,
        title: title.trim(),
        date: jalaliDate.trim(),
        jalaliDate: jalaliDate.trim(),
        time: time.trim() || "—",
        location: location.trim() || "نامشخص",
        attendees: 0,
        hashtags: [],
        description: description.trim() || "بدون توضیحات",
        visibility,
      };
      setEvents((prev) => [newEvent, ...prev]);
      notify(`رویداد «${newEvent.title}» منتشر شد (${visibility}).`);
    }
    setOpen(false);
    setEditingId(null);
    setTitle(""); setJalaliDate(""); setTime(""); setLocation(""); setDescription(""); setVisibility("عمومی");
  };

  const sendInvite = (e: EventItem) =>
    notify(`دعوت‌نامه‌ی رویداد «${e.title}» برای اعضای واجد شرایط ارسال شد.`, "info");

  const toggleVisibility = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const next = ev.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, visibility: next } : e));
    notify(`«${ev.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-4">
        <>
            <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1">
              <button
                onClick={() => setCalendar("jalali")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 ${calendar === "jalali" ? "bg-white shadow text-brand-700" : "text-ink-500"}`}
              >
                <Calendar size={12} /> شمسی
              </button>
              <button
                onClick={() => setCalendar("gregorian")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${calendar === "gregorian" ? "bg-white shadow text-brand-700" : "text-ink-500"}`}
              >
                میلادی
              </button>
            </div>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
              رویداد جدید
            </Button>
          </>
      </div>

      <div className="card divide-y divide-ink-100">
        {/* header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-ink-50 text-[11px] font-semibold text-ink-400 uppercase tracking-wide items-center">
          <span>تاریخ</span>
          <span>رویداد</span>
          <span className="text-center">مکان</span>
          <span className="text-center">شرکت‌کنندگان</span>
          <span className="text-center">دسترسی</span>
          <span />
        </div>

        {events.map((e) => {
          const dateStr = calendar === "jalali" ? e.jalaliDate : e.date;
          return (
            <div
              key={e.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-ink-50/60 transition-colors"
            >
              {/* Date block */}
              <div className="w-12 h-12 rounded-lg bg-navy-900 text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] text-navy-400">{dateStr.split("/")[1] ?? "—"}</span>
                <span className="text-sm font-bold leading-tight">{dateStr.split("/")[2] ?? "—"}</span>
              </div>

              {/* Title + meta */}
              <div className="min-w-0">
                <Link
                  to={`/dashboard/events/${e.id}`}
                  className="font-semibold text-sm text-ink-900 hover:text-brand-700 transition-colors truncate block"
                >
                  {e.title}
                </Link>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-ink-400 flex-wrap">
                  <span>{dateStr} · {e.time}</span>
                  {e.hashtags.slice(0, 2).map((h) => (
                    <Badge key={h} tone="neutral" icon={<Hash size={9} />}>{h}</Badge>
                  ))}
                </div>
              </div>

              {/* Location */}
              <span className="text-xs text-ink-400 flex items-center gap-1 whitespace-nowrap max-w-[140px] truncate">
                <MapPin size={12} className="shrink-0" /> {e.location}
              </span>

              {/* Attendees */}
              <span className="text-xs text-ink-400 flex items-center gap-1 whitespace-nowrap">
                <Users size={12} /> {e.attendees}
              </span>

              {/* Visibility */}
              <VisibilityToggle
                visibility={e.visibility}
                onChange={() => toggleVisibility(e.id)}
                size="xs"
              />

              {/* Invite + actions */}
              <span className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" icon={<Send size={12} />} onClick={() => sendInvite(e)}>
                  دعوت
                </Button>
                <RowActions onEdit={() => startEdit(e)} onDelete={() => remove(e)} />
              </span>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-400">هنوز رویدادی ثبت نشده</div>
        )}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(null); }} title={editingId ? "ویرایش رویداد" : "ایجاد رویداد جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان رویداد <span className="text-rose-500">*</span></label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: false })); }} placeholder="مثلاً: کارگاه آموزشی پنل راهبری برای مدیران سازمان" className={`input-field ${errors.title ? "input-error" : ""}`} />
            {errors.title && <p className="field-error">عنوان رویداد الزامی است.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">تاریخ (شمسی) <span className="text-rose-500">*</span></label>
              <input value={jalaliDate} onChange={(e) => { setJalaliDate(e.target.value); setErrors((p) => ({ ...p, date: false })); }} placeholder="۱۴۰۵/۰۵/۱۰" className={`input-field ${errors.date ? "input-error" : ""}`} />
              {errors.date && <p className="field-error">تاریخ الزامی است.</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">ساعت</label>
              <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="۱۰:۰۰" className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">محل برگزاری</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="سالن جلسات طبقه چهارم / لینک آنلاین" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">توضیحات</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-20" />
          </div>
          <VisibilityPicker value={visibility} onChange={setVisibility} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار رویداد</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
