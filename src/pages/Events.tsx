import { useState } from "react";
import { CalendarDays, MapPin, Users, Plus, Calendar, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { type EventItem, type Visibility } from "../data/mock";
import RowActions from "../components/ui/RowActions";
import DataTable from "../components/ui/DataTable";
import { useConfirm } from "../components/ui/ConfirmProvider";
import JalaliDatePicker from "../components/ui/JalaliDatePicker";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { VisibilityToggle, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useContent } from "../context/ContentContext";

export default function Events() {
  return (
    <div>
      <PageHeader
        title="رویدادها و جلسات"
        description="انتشار رویداد، دعوت از کاربران و مدیریت اسناد جلسات"
        icon={<CalendarDays size={18} />}
      />
      <EventsListTab />
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
        mode: "حضوری",
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

      <DataTable
        columns={[
          {
            key: "title",
            label: "رویداد",
            render: (e) => {
              const dateStr = calendar === "jalali" ? e.jalaliDate : e.date;
              return (
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-11 h-11 rounded-lg bg-navy-900 text-white flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] text-navy-400">{dateStr.split("/")[1] ?? "—"}</span>
                    <span className="text-sm font-bold leading-tight">{dateStr.split("/")[2] ?? "—"}</span>
                  </span>
                  <span className="min-w-0">
                    <Link to={`/dashboard/events/${e.id}`} className="font-semibold text-sm text-ink-900 hover:text-brand-700 transition-colors block">
                      {e.title}
                    </Link>
                    <span className="text-xs text-ink-400 block mt-0.5">{dateStr} · {e.time}</span>
                  </span>
                </span>
              );
            },
          },
          { key: "mode", label: "حالت", render: (e) => <Badge tone={e.mode === "آنلاین" ? "brand" : "navy"}>{e.mode}</Badge> },
          { key: "location", label: "مکان", render: (e) => <span className="text-xs text-ink-400 flex items-center gap-1"><MapPin size={12} className="shrink-0" /> <span className="truncate max-w-[160px]">{e.location}</span></span> },
          { key: "attendees", label: "شرکت‌کنندگان", render: (e) => <span className="text-xs text-ink-400 flex items-center gap-1"><Users size={12} /> {e.attendees.toLocaleString("fa-IR")}</span> },
          { key: "visibility", label: "دسترسی", render: (e) => <VisibilityToggle visibility={e.visibility} onChange={() => toggleVisibility(e.id)} size="xs" /> },
          {
            key: "actions",
            label: "",
            render: (e) => (
              <span className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" icon={<Send size={12} />} onClick={() => sendInvite(e)}>دعوت</Button>
                <RowActions onEdit={() => startEdit(e)} onDelete={() => remove(e)} />
              </span>
            ),
          },
        ]}
        rows={events}
        searchKeys={["title", "location"]}
        searchPlaceholder="جستجو در عنوان یا مکان رویداد…"
        emptyTitle="هنوز رویدادی ثبت نشده"
      />

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
              <JalaliDatePicker value={jalaliDate} onChange={(v) => { setJalaliDate(v); setErrors((p) => ({ ...p, date: false })); }} error={errors.date} />
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
