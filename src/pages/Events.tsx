import { useState } from "react";
import { CalendarDays, MapPin, Users, Hash, Plus, Calendar, Send } from "lucide-react";
import { events as initialEvents, type EventItem } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [calendar, setCalendar] = useState<"jalali" | "gregorian">("jalali");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [jalaliDate, setJalaliDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
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
    };
    setEvents((prev) => [newEvent, ...prev]);
    notify(`رویداد «${newEvent.title}» منتشر شد و در تقویم سازمان قابل مشاهده است.`);
    setOpen(false);
    setTitle("");
    setJalaliDate("");
    setTime("");
    setLocation("");
    setDescription("");
  };

  const sendInvite = (e: EventItem) => notify(`دعوت‌نامه‌ی رویداد «${e.title}» برای اعضای واجد شرایط ارسال شد.`, "info");

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

      <div className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className="card p-4 flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-navy-900 text-white flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] text-navy-300">{(calendar === "jalali" ? e.jalaliDate : e.date).split("/")[1] ?? "—"}</span>
              <span className="text-base font-bold leading-tight">{(calendar === "jalali" ? e.jalaliDate : e.date).split("/")[2] ?? "—"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-ink-900">{e.title}</h3>
              <p className="text-xs text-ink-500 mt-1 leading-6">{e.description}</p>
              <div className="flex items-center gap-4 mt-2.5 text-[11px] text-ink-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} /> {calendar === "jalali" ? e.jalaliDate : e.date} · {e.time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {e.location}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} /> {e.attendees} شرکت‌کننده
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {e.hashtags.map((h) => (
                  <Badge key={h} tone="neutral" icon={<Hash size={10} />}>
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="secondary" size="sm" icon={<Send size={12} />} onClick={() => sendInvite(e)}>
              دعوت‌نامه
            </Button>
          </div>
        ))}
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
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار رویداد</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
