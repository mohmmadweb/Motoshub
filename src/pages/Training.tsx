import { useState } from "react";
import { GraduationCap, CalendarDays, Users, Award, Gauge, CheckCircle2, Plus } from "lucide-react";
import { trainingCourses as initialCourses, type TrainingCourse } from "../data/mockDaneshmand";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import Drawer from "../components/ui/Drawer";
import Modal from "../components/ui/Modal";
import RowActions from "../components/ui/RowActions";
import JalaliDatePicker from "../components/ui/JalaliDatePicker";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useToast } from "../components/ui/ToastProvider";

const statusTone: Record<TrainingCourse["status"], BadgeTone> = {
  "ثبت‌نام باز": "success",
  "در حال برگزاری": "brand",
  "برگزار شده": "neutral",
};

export default function Training() {
  const [courses, setCourses] = useState<TrainingCourse[]>(initialCourses);
  const [selected, setSelected] = useState<TrainingCourse | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("۸");
  const [capacity, setCapacity] = useState("۳۰");
  const [titleError, setTitleError] = useState(false);
  const { notify } = useToast();

  const trainingCourses = courses;
  const totalCerts = trainingCourses.reduce((s, c) => s + (c.certificates ?? 0), 0);
  const openCourses = trainingCourses.filter((c) => c.status === "ثبت‌نام باز").length;

  const enroll = (c: TrainingCourse) => {
    if (enrolledIds.includes(c.id)) {
      notify("شما قبلاً در این دوره ثبت‌نام کرده‌اید.", "warning");
      return;
    }
    setEnrolledIds((prev) => [...prev, c.id]);
    notify(`ثبت‌نام شما در دوره «${c.title}» انجام شد. جزئیات از طریق اعلان و پیامک ارسال می‌شود.`);
  };

  const toNum = (s: string) => Number(s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))) || 0;

  const startEdit = (c: TrainingCourse) => {
    setEditingId(c.id);
    setTitle(c.title);
    setInstructor(c.instructor);
    setDate(c.date);
    setHours(String(c.hours));
    setCapacity(String(c.capacity));
    setOpen(true);
  };

  const confirm = useConfirm();
  const removeCourse = (c: TrainingCourse) =>
    confirm({
      title: `حذف دوره «${c.title}»؟`,
      message: "لغو دوره به همه‌ی ثبت‌نام‌کنندگان اطلاع‌رسانی می‌شود.",
      onConfirm: () => {
        setCourses((prev) => prev.filter((x) => x.id !== c.id));
        notify(`دوره «${c.title}» حذف شد و به ثبت‌نام‌کنندگان اطلاع‌رسانی گردید.`, "info");
      },
    });

  const submit = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    if (editingId) {
      setCourses((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, title: title.trim(), instructor: instructor.trim() || c.instructor, date: date.trim() || c.date, hours: toNum(hours) || c.hours, capacity: toNum(capacity) || c.capacity } : c))
      );
      notify(`دوره «${title.trim()}» ویرایش شد.`);
    } else {
      setCourses((prev) => [
        {
          id: `tc-${Date.now()}`,
          title: title.trim(),
          instructor: instructor.trim() || "مدیریت آموزش‌های تخصصی",
          date: date.trim() || "متعاقباً اعلام می‌شود",
          hours: toNum(hours) || 8,
          capacity: toNum(capacity) || 30,
          enrolled: 0,
          status: "ثبت‌نام باز",
        },
        ...prev,
      ]);
      notify(`دوره «${title.trim()}» تعریف شد و در تقویم آموزشی قرار گرفت.`);
    }
    setOpen(false);
    setEditingId(null);
    setTitle(""); setInstructor(""); setDate(""); setHours("۸"); setCapacity("۳۰");
  };

  return (
    <div>
      <PageHeader
        title="آموزش و توانمندسازی"
        description="دوره‌های تخصصی، تقویم آموزشی، حضور و غیاب، ارزشیابی، سنجش اثربخشی و صدور گواهینامه"
        icon={<GraduationCap size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            تعریف دوره جدید
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="دوره‌های تعریف‌شده" value={trainingCourses.length.toLocaleString("fa-IR")} tone="brand" icon={<GraduationCap size={16} />} />
        <StatCard label="ثبت‌نام باز" value={openCourses.toLocaleString("fa-IR")} tone="success" icon={<CalendarDays size={16} />} />
        <StatCard label="مجموع فراگیران" value={trainingCourses.reduce((s, c) => s + c.enrolled, 0).toLocaleString("fa-IR")} icon={<Users size={16} />} />
        <StatCard label="گواهینامه صادرشده" value={totalCerts.toLocaleString("fa-IR")} tone="warning" icon={<Award size={16} />} />
      </div>

      <div className="card divide-y divide-ink-100">
        <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-ink-50 text-[11px] font-semibold text-ink-400 uppercase tracking-wide">
          <span>دوره</span>
          <span className="hidden sm:block text-center">تاریخ</span>
          <span className="text-center">ظرفیت</span>
          <span className="text-center">وضعیت</span>
          <span className="hidden sm:block" />
        </div>
        {trainingCourses.map((c) => (
          <div key={c.id} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-ink-50/60">
            <button onClick={() => setSelected(c)} className="min-w-0 text-right">
              <p className="font-medium text-sm text-ink-900 hover:text-brand-700 truncate">{c.title}</p>
              <p className="text-[11px] text-ink-400 mt-0.5">{c.instructor} · {c.hours.toLocaleString("fa-IR")} ساعت</p>
            </button>
            <span className="text-xs text-ink-400 whitespace-nowrap hidden sm:block">{c.date}</span>
            <span className="text-xs text-ink-500 whitespace-nowrap">{c.enrolled.toLocaleString("fa-IR")} / {c.capacity.toLocaleString("fa-IR")}</span>
            <Badge tone={statusTone[c.status]}>{c.status}</Badge>
            <span className="hidden sm:flex items-center gap-1">
              {c.status === "ثبت‌نام باز" && (
                <Button variant={enrolledIds.includes(c.id) ? "secondary" : "primary"} size="sm" onClick={() => enroll(c)}>
                  {enrolledIds.includes(c.id) ? "ثبت‌نام شد" : "ثبت‌نام"}
                </Button>
              )}
              <RowActions onEdit={() => startEdit(c)} onDelete={() => removeCourse(c)} />
            </span>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(null); }} title={editingId ? "ویرایش دوره" : "تعریف دوره آموزشی جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان دوره <span className="text-rose-500">*</span></label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(false); }} placeholder="مثلاً: آشنایی با ارزیابی TRL" className={`input-field ${titleError ? "input-error" : ""}`} />
            {titleError && <p className="field-error">عنوان دوره الزامی است.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">مدرس / مجری</label>
            <input value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="مدیریت آموزش‌های تخصصی" className="input-field" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">تاریخ شروع</label>
              <JalaliDatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">ساعت آموزشی</label>
              <input value={hours} onChange={(e) => setHours(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">ظرفیت</label>
              <input value={capacity} onChange={(e) => setCapacity(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>{editingId ? "ذخیره تغییرات" : "تعریف دوره"}</Button>
            <Button variant="secondary" onClick={() => { setOpen(false); setEditingId(null); }}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="شناسنامه دوره آموزشی">
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-ink-900 leading-6">{selected.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
                <Badge tone="neutral">{selected.hours.toLocaleString("fa-IR")} ساعت</Badge>
              </div>
            </div>
            <div className="text-xs text-ink-600 space-y-1.5">
              <p><span className="text-ink-400">مدرس/مجری:</span> {selected.instructor}</p>
              <p><span className="text-ink-400">تاریخ شروع:</span> {selected.date}</p>
              <p><span className="text-ink-400">ثبت‌نام:</span> {selected.enrolled.toLocaleString("fa-IR")} نفر از ظرفیت {selected.capacity.toLocaleString("fa-IR")} نفر</p>
            </div>

            {(selected.attendanceRate !== undefined || selected.satisfaction !== undefined) && (
              <div className="border-t border-ink-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-ink-900">پایش دوره</h4>
                {selected.attendanceRate !== undefined && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink-700 flex items-center gap-1"><Users size={12} /> نرخ حضور و غیاب</span>
                      <span className="text-ink-500">{selected.attendanceRate.toLocaleString("fa-IR")}٪</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${selected.attendanceRate}%` }} />
                    </div>
                  </div>
                )}
                {selected.satisfaction !== undefined && (
                  <p className="text-xs text-ink-600 flex items-center gap-1.5">
                    <Gauge size={13} className="text-ink-400" /> ارزشیابی فراگیران: <span className="font-bold text-ink-900">{selected.satisfaction.toLocaleString("fa-IR")}</span> از ۵
                  </p>
                )}
                {selected.effectiveness && (
                  <p className="text-xs text-ink-600 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-ink-400" /> سنجش اثربخشی: <Badge tone={selected.effectiveness === "اثربخش" ? "success" : "warning"}>{selected.effectiveness}</Badge>
                  </p>
                )}
                {selected.certificates !== undefined && (
                  <p className="text-xs text-ink-600 flex items-center gap-1.5">
                    <Award size={13} className="text-ink-400" /> گواهینامه صادرشده: <span className="font-bold text-ink-900">{selected.certificates.toLocaleString("fa-IR")}</span> مورد
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-ink-100 pt-3 text-[11px] text-ink-400 leading-5">
              روند: نیازسنجی آموزشی ← درج در تقویم ← ثبت‌نام سامانه‌ای ← حضور و غیاب ← ارزشیابی پایان دوره ←
              سنجش اثربخشی ← صدور گواهینامه و ثبت در شناسنامه آموزشی فراگیر.
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
