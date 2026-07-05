import { useState } from "react";
import { CalendarDays, MapPin, Users, Hash, Plus, Calendar, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { type EventItem, type Visibility } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { VisibilityToggle, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useContent } from "../context/ContentContext";

export default function Events() {
  const { events, setEvents } = useContent();
  const [calendar, setCalendar] = useState<"jalali" | "gregorian">("jalali");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [jalaliDate, setJalaliDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
  const { notify } = useToast();

  const submit = () => {
    if (!title.trim() || !jalaliDate.trim()) {
      notify("عنوان و تاریخ رویداد الزامی است.", "warning");
      return;
    }
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
    setOpen(false);
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
      <PageHeader
        title="رویدادها و جلسات"
        description="انتشار رویداد، دعوت از کاربران و مدیریت اسناد جلسات"
        icon={<CalendarDays size={18} />}
        actions={
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
        }
      />

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

              {/* Invite */}
              <Button variant="ghost" size="sm" icon={<Send size={12} />} onClick={() => sendInvite(e)}>
                دعوت
              </Button>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-400">هنوز رویدادی ثبت نشده</div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="ایجاد رویداد جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان رویداد</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: کارگاه آموزشی پنل راهبری برای مدیران سازمان" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">تاریخ (شمسی)</label>
              <input value={jalaliDate} onChange={(e) => setJalaliDate(e.target.value)} placeholder="۱۴۰۵/۰۵/۱۰" className="input-field" />
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
