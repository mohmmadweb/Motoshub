import ModuleReportsButton from "../reports/ModuleReportsButton";
import { useMemo, useState, type ReactNode } from "react";
import { GraduationCap, CalendarDays, Users, Award, Plus, PlayCircle, FileText, ListChecks, Lock, CheckCircle2, Printer, Route, Briefcase, HelpCircle, Star, ClipboardList, Trash2 } from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import { useInnovation } from "../context/InnovationContext";
import { ScopeBadge } from "../components/ui/ScopeControl";
import type { Scoped } from "../data/tenancy";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import Drawer from "../components/ui/Drawer";
import Modal from "../components/ui/Modal";
import Tabs from "../components/ui/Tabs";
import RowActions from "../components/ui/RowActions";
import EmptyState from "../components/ui/EmptyState";
import JalaliDatePicker from "../components/ui/JalaliDatePicker";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useToast } from "../components/ui/ToastProvider";
import { useTabParam } from "../lib/useTabParam";
import { users } from "../data/mock";
import { dayNum, diffDays } from "../pm/jalali";
import type { AttendanceStatus, ContentItem, Course, CourseSession, CourseStatus, Enrollment, Question, Quiz } from "../innovation/types";
import { evaluationQuestions } from "../innovation/types";
import { faN, mean, num, printHtml, uid } from "../innovation/util";
import { ActivityLogButton, Bar, Field, Info2 } from "./innovation/shared";

// ---------------------------------------------------------------------------
// آموزش و توانمندسازی — دوره، محتوای آنلاین با پیشرفت، آزمون با بانک سؤال و تصحیح
// خودکار، حضور و غیاب جلسات، فرم ارزشیابی، گواهی قابل چاپ، مسیر یادگیری و
// الزامات آموزشی هر جایگاه شغلی.
// ---------------------------------------------------------------------------
const statusTone: Record<CourseStatus, BadgeTone> = { "ثبت‌نام باز": "success", "در حال برگزاری": "brand", "برگزار شده": "neutral" };
const attTone: Record<AttendanceStatus, string> = { حاضر: "bg-emerald-50 text-emerald-700", غایب: "bg-rose-50 text-rose-700", تأخیر: "bg-amber-50 text-amber-700", موجه: "bg-ink-100 text-ink-500" };
const ATT: AttendanceStatus[] = ["حاضر", "غایب", "تأخیر", "موجه"];

// ---------------------------------------------------------------- محاسبات
function heldSessions(c: Course, today: string) {
  return c.sessions.filter((s) => dayNum(s.date) !== null && diffDays(s.date, today) >= 0);
}
function attendancePct(en: Enrollment, c: Course, today: string): number | undefined {
  const held = heldSessions(c, today).filter((s) => en.attendance[s.id] !== "موجه");
  if (!held.length) return undefined;
  const present = held.filter((s) => en.attendance[s.id] === "حاضر" || en.attendance[s.id] === "تأخیر").length;
  return Math.round((present / held.length) * 100);
}
function contentPct(en: Enrollment, c: Course): number {
  if (!c.items.length) return 100;
  return Math.round(c.items.reduce((s, i) => s + Math.min(100, en.progress[i.id] ?? 0), 0) / c.items.length);
}
function eligibility(en: Enrollment, c: Course, quizzes: Quiz[], today: string): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const att = attendancePct(en, c, today);
  if (c.sessions.length && heldSessions(c, today).length < c.sessions.length) reasons.push("همه‌ی جلسات برگزار نشده");
  if (att !== undefined && att < 80) reasons.push(`حضور ${faN(att)}٪ (حداقل ۸۰٪)`);
  c.items.filter((i) => i.kind === "quiz" && i.quizId).forEach((i) => {
    const q = quizzes.find((x) => x.id === i.quizId);
    const best = en.quiz[i.quizId!]?.best;
    if (q && (best === undefined || best < q.passScore)) reasons.push(`آزمون «${q.title}» قبول نشده`);
  });
  c.items.filter((i) => i.kind !== "quiz").forEach((i) => (en.progress[i.id] ?? 0) < 100 && reasons.push(`«${i.title}» کامل نشده`));
  return { ok: reasons.length === 0, reasons };
}
const completed = (en?: Enrollment) => !!en?.certificateNo;

function certHtml(name: string, c: Course, en: Enrollment) {
  return `<div class="cert"><h1>گواهی پایان دوره</h1><p>بدین‌وسیله گواهی می‌شود</p><div class="name">${name}</div><p>دوره‌ی «${c.title}» به مدت ${c.hours.toLocaleString("fa-IR")} ساعت (${c.mode}) را با موفقیت به پایان رسانده است.</p><div class="meta"><span>شماره گواهی: ${en.certificateNo}</span><span class="sign">${c.instructor}</span><span>تاریخ صدور: ${en.certifiedAt ?? ""}</span></div></div>`;
}

export default function Training() {
  const [tab, setTab] = useTabParam<"courses" | "paths" | "bank" | "certs" | "jobs">("courses", ["courses", "paths", "bank", "certs", "jobs"]);
  const inn = useInnovation();
  const { filterScoped, actingUser } = useTenancy();
  const courses = filterScoped(inn.courses);
  const mine = inn.enrollments.filter((e) => e.user === actingUser.name);
  return (
    <div>
      <PageHeader
        title="آموزش و توانمندسازی"
        description="دوره‌ها و محتوای آنلاین، آزمون، حضور و غیاب، ارزشیابی، گواهی، مسیر یادگیری و الزامات شغلی"
        icon={<GraduationCap size={18} />}
        actions={
          <>
            <ModuleReportsButton module="innovation" />
            <ActivityLogButton module="training" />
          </>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="دوره‌ها" value={faN(courses.length)} tone="brand" icon={<GraduationCap size={16} />} />
        <StatCard label="ثبت‌نام باز" value={faN(courses.filter((c) => c.status === "ثبت‌نام باز").length)} tone="success" icon={<CalendarDays size={16} />} />
        <StatCard label="دوره‌های من" value={faN(mine.length)} hint={`${faN(mine.filter(completed).length)} با گواهی`} icon={<Users size={16} />} />
        <StatCard label="گواهی صادرشده" value={faN(inn.enrollments.filter(completed).length)} tone="warning" icon={<Award size={16} />} />
      </div>
      <Tabs
        tabs={[
          { id: "courses", label: "دوره‌ها", count: courses.length },
          { id: "paths", label: "مسیرهای یادگیری", count: inn.paths.length },
          { id: "bank", label: "بانک سؤال و آزمون", count: inn.questions.length },
          { id: "certs", label: "گواهی‌ها" },
          { id: "jobs", label: "الزامات شغلی" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "courses" && <CoursesTab />}
      {tab === "paths" && <PathsTab />}
      {tab === "bank" && <BankTab />}
      {tab === "certs" && <CertsTab />}
      {tab === "jobs" && <JobsTab />}
    </div>
  );
}

// ---------------------------------------------------------------- دوره‌ها
type CForm = { title: string; instructor: string; date: string; hours: string; capacity: string; mode: Course["mode"]; field: string; status: CourseStatus; jobTitles: string[]; sessions: CourseSession[]; items: ContentItem[] };

function CoursesTab() {
  const inn = useInnovation();
  const { filterScoped, defaultScopeForNew, hasPermission, canManageItem, actingUser } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<CForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemScope, setItemScope] = useState<Scoped>({ scope: "سراسری" });
  const courses = filterScoped(inn.courses);
  const open = openId ? inn.courses.find((c) => c.id === openId) : undefined;
  const jobTitles = useMemo(() => Array.from(new Set([...inn.courses.flatMap((c) => c.jobTitles), ...inn.jobAssignments.map((j) => j.jobTitle)])), [inn.courses, inn.jobAssignments]);

  const enroll = (c: Course) => {
    if (inn.enrollments.some((e) => e.courseId === c.id && e.user === actingUser.name)) return notify("قبلاً ثبت‌نام کرده‌اید.", "warning");
    const n = inn.enrollments.filter((e) => e.courseId === c.id).length;
    if (n >= c.capacity) return notify("ظرفیت دوره تکمیل است.", "warning");
    inn.commit("training", "در دوره ثبت‌نام کرد", { id: c.id, title: c.title }, (s) => ({ ...s, enrollments: [...s.enrollments, { id: uid("en"), courseId: c.id, user: actingUser.name, enrolledAt: inn.today, progress: {}, quiz: {}, attendance: {} }] }));
    notify(`ثبت‌نام در «${c.title}» انجام شد.`);
  };

  const save = () => {
    if (!form || !form.title.trim()) return;
    const patch = { title: form.title.trim(), instructor: form.instructor.trim() || "مدیریت آموزش‌های تخصصی", date: form.date || form.sessions[0]?.date || "متعاقباً اعلام می‌شود", hours: num(form.hours) || 8, capacity: num(form.capacity) || 30, mode: form.mode, field: form.field.trim() || "عمومی", status: form.status, jobTitles: form.jobTitles, sessions: form.sessions, items: form.items };
    if (editingId) {
      inn.commit("training", "دوره را ویرایش کرد", { id: editingId, title: patch.title }, (s) => ({ ...s, courses: s.courses.map((c) => (c.id === editingId ? { ...c, ...patch, ...itemScope } : c)) }));
    } else {
      const id = uid("tc");
      inn.commit("training", "دوره‌ی جدید تعریف کرد", { id, title: patch.title }, (s) => ({ ...s, courses: [{ id, ...patch, createdAt: inn.today, ...itemScope, authorId: actingUser.id }, ...s.courses] }), { to: "*", text: `دوره‌ی آموزشی «${patch.title}» برای ثبت‌نام باز شد.`, link: "/dashboard/training" });
    }
    notify(editingId ? "دوره ویرایش شد." : "دوره تعریف شد.");
    setForm(null);
    setEditingId(null);
  };

  return (
    <div>
      {hasPermission("training.create") && (
        <div className="flex justify-end mb-3">
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setItemScope(defaultScopeForNew()); setEditingId(null); setForm({ title: "", instructor: "", date: "", hours: "۸", capacity: "۳۰", mode: "حضوری", field: "", status: "ثبت‌نام باز", jobTitles: [], sessions: [], items: [] }); }}>تعریف دوره جدید</Button>
        </div>
      )}
      <div className="card divide-y divide-ink-100">
        {courses.length === 0 && <EmptyState title="دوره‌ای تعریف نشده" />}
        {courses.map((c) => {
          const n = inn.enrollments.filter((e) => e.courseId === c.id).length;
          const me = inn.enrollments.find((e) => e.courseId === c.id && e.user === actingUser.name);
          return (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50/60 flex-wrap">
              <button onClick={() => setOpenId(c.id)} className="min-w-0 flex-1 text-right">
                <p className="font-medium text-sm text-ink-900 hover:text-brand-700 truncate">{c.title}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{c.instructor} · {faN(c.hours)} ساعت · {c.mode} · {c.date}</p>
                {me && <div className="flex items-center gap-2 mt-1.5 max-w-[260px]"><Bar value={contentPct(me, c)} tone={completed(me) ? "emerald" : "brand"} /><span className="text-[10.5px] text-ink-400 shrink-0">{completed(me) ? "گواهی‌دار" : `${faN(contentPct(me, c))}٪`}</span></div>}
              </button>
              <span className="text-xs text-ink-500 whitespace-nowrap">{faN(n)} / {faN(c.capacity)}</span>
              <Badge tone={statusTone[c.status]}>{c.status}</Badge>
              <span className="hidden sm:inline-flex"><ScopeBadge item={c} /></span>
              {!me && c.status !== "برگزار شده" && hasPermission("training.enroll") && <Button variant="primary" size="sm" onClick={() => enroll(c)}>ثبت‌نام</Button>}
              <RowActions
                onEdit={canManageItem(c, "training.create") ? () => { setEditingId(c.id); setItemScope({ scope: c.scope, holdingId: c.holdingId, companyId: c.companyId }); setForm({ title: c.title, instructor: c.instructor, date: c.date, hours: faN(c.hours), capacity: faN(c.capacity), mode: c.mode, field: c.field, status: c.status, jobTitles: c.jobTitles, sessions: c.sessions, items: c.items }); } : undefined}
                onDelete={canManageItem(c, "training.create") ? () => confirm({ title: `حذف دوره «${c.title}»؟`, message: "ثبت‌نام‌ها و سوابق حضور این دوره نیز حذف می‌شود.", onConfirm: () => inn.commit("training", "دوره را حذف کرد", { id: c.id, title: c.title }, (s) => ({ ...s, courses: s.courses.filter((x) => x.id !== c.id), enrollments: s.enrollments.filter((e) => e.courseId !== c.id) }), { to: inn.enrollments.filter((e) => e.courseId === c.id).map((e) => e.user), text: `دوره‌ی «${c.title}» لغو شد.`, link: "/dashboard/training" }) }) : undefined}
              />
            </div>
          );
        })}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={editingId ? "ویرایش دوره" : "تعریف دوره آموزشی"} width="max-w-2xl">
          <div className="space-y-3">
            <Field label="عنوان دوره" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" /></Field>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="مدرس / مجری"><input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} className="input-field" /></Field>
              <Field label="حوزه"><input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className="input-field" /></Field>
              <Field label="نوع"><select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Course["mode"] })} className="input-field">{(["حضوری", "آنلاین", "ترکیبی"] as const).map((m) => <option key={m}>{m}</option>)}</select></Field>
              <Field label="تاریخ شروع"><JalaliDatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></Field>
              <Field label="ساعت آموزشی"><input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className="input-field" /></Field>
              <Field label="ظرفیت"><input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="input-field" /></Field>
              <Field label="وضعیت"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CourseStatus })} className="input-field">{(["ثبت‌نام باز", "در حال برگزاری", "برگزار شده"] as const).map((m) => <option key={m}>{m}</option>)}</select></Field>
            </div>
            <Field label="الزامی برای جایگاه‌های شغلی">
              <div className="flex flex-wrap gap-2">
                {jobTitles.map((j) => <label key={j} className="flex items-center gap-1.5 text-xs text-ink-600"><input type="checkbox" checked={form.jobTitles.includes(j)} onChange={(e) => setForm({ ...form, jobTitles: e.target.checked ? [...form.jobTitles, j] : form.jobTitles.filter((x) => x !== j) })} /> {j}</label>)}
              </div>
            </Field>
            <ListEditor
              title="جلسات حضوری/برخط"
              items={form.sessions}
              render={(s) => `${s.date} · ${s.start}–${s.end} · ${s.place}`}
              onRemove={(id) => setForm({ ...form, sessions: form.sessions.filter((s) => s.id !== id) })}
              adder={<SessionAdder onAdd={(s) => setForm({ ...form, sessions: [...form.sessions, s] })} />}
            />
            <ListEditor
              title="محتوای آنلاین و آزمون"
              items={form.items}
              render={(i) => `${i.kind === "video" ? "ویدئو" : i.kind === "doc" ? "متن" : "آزمون"} · ${i.title} · ${faN(i.minutes)} دقیقه`}
              onRemove={(id) => setForm({ ...form, items: form.items.filter((s) => s.id !== id) })}
              adder={<ItemAdder quizzes={inn.quizzes} onAdd={(i) => setForm({ ...form, items: [...form.items, i] })} />}
            />
            <div className="flex gap-2"><Button variant="primary" className="flex-1 justify-center" onClick={save}>{editingId ? "ذخیره تغییرات" : "تعریف دوره"}</Button><Button variant="secondary" onClick={() => setForm(null)}>انصراف</Button></div>
          </div>
        </Modal>
      )}
      <Drawer open={!!open} onClose={() => setOpenId(null)} title="شناسنامه دوره آموزشی" width="max-w-2xl">
        {open && <CourseFile c={open} />}
      </Drawer>
    </div>
  );
}

function ListEditor<T extends { id: string }>({ title, items, render, onRemove, adder }: { title: string; items: T[]; render: (t: T) => string; onRemove: (id: string) => void; adder: ReactNode }) {
  return (
    <div className="border-t border-ink-100 pt-3">
      <p className="text-xs font-bold text-ink-900 mb-2">{title}</p>
      <div className="space-y-1 mb-2">
        {items.length === 0 && <p className="text-[11px] text-ink-400">موردی تعریف نشده است.</p>}
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 text-[11.5px] bg-ink-50 rounded-md px-2 py-1">
            <span className="truncate">{render(t)}</span>
            <button type="button" onClick={() => onRemove(t.id)} className="text-ink-400 hover:text-rose-600"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      {adder}
    </div>
  );
}

function SessionAdder({ onAdd }: { onAdd: (s: CourseSession) => void }) {
  const [s, setS] = useState({ date: "", start: "۰۹:۰۰", end: "۱۲:۰۰", place: "" });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
      <JalaliDatePicker value={s.date} onChange={(v) => setS({ ...s, date: v })} />
      <input value={s.start} onChange={(e) => setS({ ...s, start: e.target.value })} className="input-field" placeholder="شروع" />
      <input value={s.end} onChange={(e) => setS({ ...s, end: e.target.value })} className="input-field" placeholder="پایان" />
      <input value={s.place} onChange={(e) => setS({ ...s, place: e.target.value })} className="input-field" placeholder="محل / پیوند" />
      <Button size="sm" variant="secondary" onClick={() => { if (!s.date) return; onAdd({ id: uid("s"), ...s, place: s.place || "—" }); setS({ ...s, date: "" }); }}>افزودن جلسه</Button>
    </div>
  );
}

function ItemAdder({ quizzes, onAdd }: { quizzes: Quiz[]; onAdd: (i: ContentItem) => void }) {
  const [i, setI] = useState<{ title: string; kind: ContentItem["kind"]; minutes: string; quizId: string }>({ title: "", kind: "video", minutes: "۱۰", quizId: "" });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
      <select value={i.kind} onChange={(e) => setI({ ...i, kind: e.target.value as ContentItem["kind"] })} className="input-field"><option value="video">ویدئو</option><option value="doc">متن / جزوه</option><option value="quiz">آزمون</option></select>
      {i.kind === "quiz" ? (
        <select value={i.quizId} onChange={(e) => setI({ ...i, quizId: e.target.value, title: quizzes.find((q) => q.id === e.target.value)?.title ?? "" })} className="input-field sm:col-span-2"><option value="">انتخاب آزمون از بانک…</option>{quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</select>
      ) : (
        <input value={i.title} onChange={(e) => setI({ ...i, title: e.target.value })} className="input-field sm:col-span-2" placeholder="عنوان" />
      )}
      <input value={i.minutes} onChange={(e) => setI({ ...i, minutes: e.target.value })} className="input-field" placeholder="دقیقه" />
      <Button size="sm" variant="secondary" onClick={() => { if (!i.title.trim() || (i.kind === "quiz" && !i.quizId)) return; onAdd({ id: uid("i"), title: i.title.trim(), kind: i.kind, minutes: num(i.minutes) || 10, quizId: i.kind === "quiz" ? i.quizId : undefined }); setI({ ...i, title: "", quizId: "" }); }}>افزودن</Button>
    </div>
  );
}

// ---------------------------------------------------------------- شناسنامه دوره
function CourseFile({ c }: { c: Course }) {
  const inn = useInnovation();
  const { hasPermission, actingUser, today } = useTenancy();
  const { notify } = useToast();
  const [tab, setTab] = useState<"content" | "sessions" | "learners" | "eval">("content");
  const [video, setVideo] = useState<ContentItem | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [evalOpen, setEvalOpen] = useState(false);
  const ens = inn.enrollments.filter((e) => e.courseId === c.id);
  const me = ens.find((e) => e.user === actingUser.name);
  const canEval = hasPermission("training.evaluate");
  const canCert = hasPermission("training.certificate");
  const updEn = (id: string, action: string, fn: (e: Enrollment) => Enrollment) => inn.commit("training", action, { id: c.id, title: c.title }, (s) => ({ ...s, enrollments: s.enrollments.map((e) => (e.id === id ? fn(e) : e)) }));
  const evals = ens.filter((e) => e.evaluation);
  const satisfaction = mean(evals.map((e) => mean(e.evaluation!.answers) ?? 0));
  const attAvg = mean(ens.map((e) => attendancePct(e, c, today)).filter((x): x is number => x !== undefined));
  const eligibleNow = ens.filter((e) => !e.certificateNo && eligibility(e, c, inn.quizzes, today).ok);

  const issue = (list: Enrollment[]) => {
    let n = inn.enrollments.filter((e) => e.certificateNo).length + 100;
    const yr = today.slice(0, 4);
    const ids = new Set(list.map((e) => e.id));
    inn.commit("training", `${faN(list.length)} گواهی پایان دوره صادر کرد`, { id: c.id, title: c.title }, (s) => ({
      ...s,
      enrollments: s.enrollments.map((e) => (ids.has(e.id) ? { ...e, certificateNo: `TR-${yr}-${String(++n).padStart(4, "0")}`, certifiedAt: today } : e)),
    }), { to: list.map((e) => e.user), text: `گواهی دوره‌ی «${c.title}» برای شما صادر شد.`, link: "/dashboard/training?tab=certs" });
    notify(`${faN(list.length)} گواهی صادر شد.`, "success");
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-ink-900 leading-6">{c.title}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge tone={statusTone[c.status]}>{c.status}</Badge>
          <Badge tone="neutral">{faN(c.hours)} ساعت · {c.mode}</Badge>
          {c.jobTitles.map((j) => <Badge key={j} tone="navy" icon={<Briefcase size={10} />}>{j}</Badge>)}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info2 label="فراگیران" value={`${faN(ens.length)} / ${faN(c.capacity)}`} />
        <Info2 label="میانگین حضور" value={attAvg !== undefined ? `${faN(attAvg)}٪` : "—"} />
        <Info2 label="رضایت (از ۵)" value={satisfaction !== undefined ? faN(satisfaction, 1) : "—"} />
        <Info2 label="گواهی" value={faN(ens.filter(completed).length)} />
      </div>
      <Tabs
        tabs={[
          { id: "content", label: "محتوا و آزمون", count: c.items.length },
          { id: "sessions", label: "جلسات و حضور", count: c.sessions.length },
          { id: "learners", label: "فراگیران", count: ens.length },
          { id: "eval", label: "ارزشیابی", count: evals.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "content" && (
        <div className="space-y-2">
          {!me && <p className="text-[11px] text-ink-400">برای دسترسی به محتوا در دوره ثبت‌نام کنید.</p>}
          {c.items.length === 0 && <p className="text-xs text-ink-400">محتوای آنلاینی تعریف نشده است.</p>}
          {c.items.map((i) => {
            const p = me?.progress[i.id] ?? 0;
            const q = i.quizId ? inn.quizzes.find((x) => x.id === i.quizId) : undefined;
            const qr = i.quizId ? me?.quiz[i.quizId] : undefined;
            return (
              <div key={i.id} className="rounded-lg border border-ink-100 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink-800 flex items-center gap-1.5 min-w-0">
                    {i.kind === "video" ? <PlayCircle size={14} className="text-brand-600 shrink-0" /> : i.kind === "doc" ? <FileText size={14} className="text-brand-600 shrink-0" /> : <ListChecks size={14} className="text-brand-600 shrink-0" />}
                    <span className="truncate">{i.title}</span>
                  </p>
                  <span className="text-ink-400 shrink-0">{faN(i.minutes)} دقیقه</span>
                </div>
                {me && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1"><Bar value={p} tone={p >= 100 ? "emerald" : "brand"} /></div>
                    {i.kind === "video" && <Button size="sm" variant={p >= 100 ? "ghost" : "secondary"} onClick={() => setVideo(i)}>{p > 0 && p < 100 ? "ادامه از جایی که ماندید" : p >= 100 ? "مشاهده دوباره" : "پخش"}</Button>}
                    {i.kind === "doc" && p < 100 && <Button size="sm" variant="secondary" onClick={() => updEn(me.id, `«${i.title}» را مطالعه کرد`, (e) => ({ ...e, progress: { ...e.progress, [i.id]: 100 } }))}>مطالعه شد</Button>}
                    {i.kind === "quiz" && q && <Button size="sm" variant={qr && qr.best >= q.passScore ? "ghost" : "primary"} onClick={() => setQuiz(q)}>{qr ? `بهترین نمره ${faN(qr.best)} · تلاش مجدد` : "شروع آزمون"}</Button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "sessions" && (
        c.sessions.length === 0 ? <p className="text-xs text-ink-400">این دوره جلسه‌ی حضوری/برخط ندارد.</p> : (
          <div className="space-y-3">
            <div className="space-y-1">{c.sessions.map((s, i) => <p key={s.id} className="text-xs text-ink-600">جلسه {faN(i + 1)}: {s.date} · {s.start}–{s.end} · {s.place}</p>)}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] min-w-[420px]">
                <thead><tr className="text-ink-400 text-right"><th className="font-medium pb-2">فراگیر</th>{c.sessions.map((s, i) => <th key={s.id} className="font-medium pb-2 text-center">ج{faN(i + 1)}</th>)}<th className="font-medium pb-2 text-center">حضور</th></tr></thead>
                <tbody>
                  {ens.map((e) => (
                    <tr key={e.id} className="border-t border-ink-100">
                      <td className="py-1.5 text-ink-800">{e.user}</td>
                      {c.sessions.map((s) => {
                        const st = e.attendance[s.id];
                        return (
                          <td key={s.id} className="py-1.5 text-center">
                            <button disabled={!canEval} onClick={() => { const nx = ATT[(ATT.indexOf(st ?? "موجه") + 1) % ATT.length]; updEn(e.id, `حضور «${e.user}» را «${nx}» ثبت کرد`, (x) => ({ ...x, attendance: { ...x.attendance, [s.id]: nx } })); }} className={`px-1.5 py-0.5 rounded-md text-[10.5px] ${st ? attTone[st] : "text-ink-300"} ${canEval ? "hover:ring-1 hover:ring-brand-300" : ""}`}>{st ?? "—"}</button>
                          </td>
                        );
                      })}
                      <td className="py-1.5 text-center font-bold">{attendancePct(e, c, today) !== undefined ? `${faN(attendancePct(e, c, today))}٪` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {canEval && <p className="text-[10.5px] text-ink-400">برای تغییر وضعیت روی هر خانه بزنید (حاضر ← غایب ← تأخیر ← موجه).</p>}
          </div>
        )
      )}

      {tab === "learners" && (
        <div className="space-y-2">
          {canCert && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 p-2.5 text-xs flex-wrap">
              <span className="text-ink-600">شرط گواهی: حضور ≥ ۸۰٪، قبولی آزمون‌ها و تکمیل محتوا · {faN(eligibleNow.length)} نفر واجد شرایط</span>
              <Button size="sm" variant="primary" icon={<Award size={12} />} disabled={!eligibleNow.length} onClick={() => issue(eligibleNow)}>صدور گروهی گواهی</Button>
            </div>
          )}
          {ens.length === 0 && <p className="text-xs text-ink-400">هنوز کسی ثبت‌نام نکرده است.</p>}
          {ens.map((e) => {
            const el = eligibility(e, c, inn.quizzes, today);
            return (
              <div key={e.id} className="rounded-lg border border-ink-100 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-ink-800">{e.user}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge tone="neutral">محتوا {faN(contentPct(e, c))}٪</Badge>
                    {attendancePct(e, c, today) !== undefined && <Badge tone="neutral">حضور {faN(attendancePct(e, c, today))}٪</Badge>}
                    {e.certificateNo ? <Badge tone="success">{e.certificateNo}</Badge> : el.ok ? <Badge tone="brand">واجد شرایط</Badge> : <Badge tone="warning">ناقص</Badge>}
                    {e.certificateNo && <Button size="sm" variant="ghost" icon={<Printer size={12} />} onClick={() => printHtml(`گواهی ${e.certificateNo}`, certHtml(e.user, c, e))}>چاپ</Button>}
                  </div>
                </div>
                {!e.certificateNo && !el.ok && <p className="text-[10.5px] text-ink-400 mt-1">{el.reasons.join(" · ")}</p>}
              </div>
            );
          })}
        </div>
      )}

      {tab === "eval" && (
        <div className="space-y-3">
          {me && !me.evaluation && <Button size="sm" variant="primary" icon={<ClipboardList size={12} />} onClick={() => setEvalOpen(true)}>تکمیل فرم ارزشیابی دوره</Button>}
          {evals.length === 0 ? <p className="text-xs text-ink-400">هنوز ارزشیابی ثبت نشده است.</p> : (
            <div className="space-y-2">
              {evaluationQuestions.map((q, i) => {
                const avg = mean(evals.map((e) => e.evaluation!.answers[i]));
                return (
                  <div key={q} className="text-xs">
                    <div className="flex items-center justify-between mb-1"><span className="text-ink-700">{q}</span><span className="font-bold">{faN(avg, 1)} از ۵</span></div>
                    <Bar value={avg ?? 0} max={5} tone="amber" />
                  </div>
                );
              })}
              {evals.filter((e) => e.evaluation!.comment).map((e) => <p key={e.id} className="text-[11px] text-ink-500 bg-ink-50 rounded-md p-2">«{e.evaluation!.comment}»</p>)}
              <p className="text-[10.5px] text-ink-400">اثربخشی: {satisfaction !== undefined && satisfaction >= 4 ? "اثربخش" : satisfaction !== undefined ? "نیازمند دوره‌ی تکمیلی" : "در انتظار سنجش"} (بر اساس میانگین ارزشیابی فراگیران)</p>
            </div>
          )}
        </div>
      )}

      {video && me && <VideoModal item={video} start={me.progress[video.id] ?? 0} onClose={() => setVideo(null)} onProgress={(p) => updEn(me.id, `ویدئوی «${video.title}» را تا ${faN(p)}٪ دید`, (e) => ({ ...e, progress: { ...e.progress, [video.id]: Math.max(e.progress[video.id] ?? 0, p) } }))} />}
      {quiz && me && (
        <QuizModal
          quiz={quiz}
          questions={inn.questions}
          onClose={() => setQuiz(null)}
          onDone={(score) => {
            const item = c.items.find((i) => i.quizId === quiz.id);
            updEn(me.id, `در آزمون «${quiz.title}» نمره‌ی ${faN(score)} گرفت`, (e) => ({
              ...e,
              quiz: { ...e.quiz, [quiz.id]: { best: Math.max(e.quiz[quiz.id]?.best ?? 0, score), attempts: (e.quiz[quiz.id]?.attempts ?? 0) + 1 } },
              progress: item && score >= quiz.passScore ? { ...e.progress, [item.id]: 100 } : e.progress,
            }));
          }}
        />
      )}
      {evalOpen && me && <EvalModal onClose={() => setEvalOpen(false)} onSave={(answers, comment) => updEn(me.id, "فرم ارزشیابی دوره را تکمیل کرد", (e) => ({ ...e, evaluation: { answers, comment, at: inn.stamp() } }))} />}
    </div>
  );
}

function VideoModal({ item, start, onClose, onProgress }: { item: ContentItem; start: number; onClose: () => void; onProgress: (p: number) => void }) {
  const [p, setP] = useState(start >= 100 ? 0 : start);
  return (
    <Modal open onClose={onClose} title={item.title} description={`${faN(item.minutes)} دقیقه`}>
      <div className="space-y-3">
        <div className="aspect-video rounded-lg bg-navy-900 flex flex-col items-center justify-center gap-2 text-white">
          <PlayCircle size={44} className="opacity-80" />
          <p className="text-xs opacity-80">پخش‌کننده‌ی نمایشی — {faN(Math.round((p / 100) * item.minutes))} از {faN(item.minutes)} دقیقه</p>
        </div>
        <Bar value={p} />
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1 justify-center" disabled={p >= 100} onClick={() => { const n = Math.min(100, p + 25); setP(n); onProgress(n); }}>{p >= 100 ? "تمام شد" : "ادامه‌ی پخش (+۲۵٪)"}</Button>
          <Button variant="secondary" onClick={onClose}>بستن</Button>
        </div>
      </div>
    </Modal>
  );
}

function QuizModal({ quiz, questions, onClose, onDone }: { quiz: Quiz; questions: Question[]; onClose: () => void; onDone: (score: number) => void }) {
  const qs = quiz.questionIds.map((id) => questions.find((q) => q.id === id)).filter((q): q is Question => !!q);
  const [ans, setAns] = useState<Record<string, number>>({});
  const [result, setResult] = useState<number | null>(null);
  const submit = () => {
    const correct = qs.filter((q) => ans[q.id] === q.correct).length;
    const score = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    setResult(score);
    onDone(score);
  };
  return (
    <Modal open onClose={onClose} title={quiz.title} description={`${faN(qs.length)} سؤال · حد قبولی ${faN(quiz.passScore)}`} width="max-w-xl">
      <div className="space-y-4">
        {qs.map((q, i) => (
          <div key={q.id} className="text-xs">
            <p className="font-medium text-ink-800 mb-1.5">{faN(i + 1)}. {q.text}</p>
            <div className="space-y-1">
              {q.options.map((o, oi) => {
                const show = result !== null;
                const cls = show ? (oi === q.correct ? "border-emerald-300 bg-emerald-50" : ans[q.id] === oi ? "border-rose-300 bg-rose-50" : "border-ink-100") : ans[q.id] === oi ? "border-brand-400 bg-brand-50" : "border-ink-100 hover:bg-ink-50";
                return (
                  <label key={oi} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer ${cls}`}>
                    <input type="radio" disabled={show} name={q.id} checked={ans[q.id] === oi} onChange={() => setAns({ ...ans, [q.id]: oi })} /> {o}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {result !== null ? (
          <div className={`rounded-lg p-3 text-sm font-bold text-center ${result >= quiz.passScore ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            نمره‌ی شما: {faN(result)} از ۱۰۰ — {result >= quiz.passScore ? "قبول" : "مردود (می‌توانید دوباره تلاش کنید)"}
          </div>
        ) : (
          <Button variant="primary" className="w-full justify-center" disabled={Object.keys(ans).length < qs.length} onClick={submit}>ثبت پاسخ‌ها و تصحیح خودکار</Button>
        )}
      </div>
    </Modal>
  );
}

function EvalModal({ onClose, onSave }: { onClose: () => void; onSave: (answers: number[], comment: string) => void }) {
  const [a, setA] = useState<number[]>(evaluationQuestions.map(() => 4));
  const [comment, setComment] = useState("");
  return (
    <Modal open onClose={onClose} title="فرم ارزشیابی پایان دوره">
      <div className="space-y-3">
        {evaluationQuestions.map((q, i) => (
          <div key={q} className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <span className="text-ink-700">{q}</span>
            <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setA(a.map((x, j) => (j === i ? n : x)))}><Star size={18} className={n <= a[i] ? "text-amber-500 fill-amber-400" : "text-ink-300"} /></button>)}</div>
          </div>
        ))}
        <Field label="پیشنهاد یا نظر"><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="input-field" /></Field>
        <Button variant="primary" className="w-full justify-center" onClick={() => { onSave(a, comment.trim()); onClose(); }}>ثبت ارزشیابی</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- مسیرها
function PathsTab() {
  const inn = useInnovation();
  const { actingUser, hasPermission } = useTenancy();
  const [form, setForm] = useState<{ title: string; audience: string; courseIds: string[] } | null>(null);
  const done = (cid: string) => completed(inn.enrollments.find((e) => e.courseId === cid && e.user === actingUser.name));
  return (
    <div className="space-y-3">
      {hasPermission("training.create") && <div className="flex justify-end"><Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setForm({ title: "", audience: "", courseIds: [] })}>مسیر جدید</Button></div>}
      {inn.paths.map((p) => {
        const n = p.courseIds.filter(done).length;
        return (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5"><Route size={14} className="text-brand-600" /> {p.title}</p>
              <Badge tone={n === p.courseIds.length ? "success" : "neutral"}>{faN(n)} از {faN(p.courseIds.length)}</Badge>
            </div>
            <p className="text-[11px] text-ink-400 mb-3">مخاطب: {p.audience}</p>
            <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
              {p.courseIds.map((cid, i) => {
                const c = inn.courses.find((x) => x.id === cid);
                const locked = i > 0 && !done(p.courseIds[i - 1]);
                return (
                  <div key={cid} className={`flex-1 min-w-[150px] rounded-lg border p-2.5 text-[11px] ${done(cid) ? "border-emerald-200 bg-emerald-50/60" : locked ? "border-ink-100 bg-ink-50 opacity-70" : "border-brand-200 bg-brand-50/50"}`}>
                    <p className="text-ink-400 flex items-center gap-1">مرحله {faN(i + 1)} {done(cid) ? <CheckCircle2 size={11} className="text-emerald-600" /> : locked ? <Lock size={11} /> : null}</p>
                    <p className="font-medium text-ink-900 mt-0.5 leading-5">{c?.title ?? cid}</p>
                    <p className="text-ink-400 mt-1">{done(cid) ? "تکمیل‌شده" : locked ? "قفل تا اتمام پیش‌نیاز" : "قابل شروع"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {form && (
        <Modal open onClose={() => setForm(null)} title="مسیر یادگیری جدید">
          <div className="space-y-3">
            <Field label="عنوان" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" /></Field>
            <Field label="مخاطب"><input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="input-field" /></Field>
            <Field label="دوره‌ها به ترتیب" hint="ترتیب انتخاب = ترتیب پیش‌نیاز">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {inn.courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.courseIds.includes(c.id)} onChange={(e) => setForm({ ...form, courseIds: e.target.checked ? [...form.courseIds, c.id] : form.courseIds.filter((x) => x !== c.id) })} />{form.courseIds.includes(c.id) && <Badge tone="brand">{faN(form.courseIds.indexOf(c.id) + 1)}</Badge>} {c.title}</label>
                ))}
              </div>
            </Field>
            <Button variant="primary" className="w-full justify-center" onClick={() => { if (!form.title.trim() || form.courseIds.length < 2) return; const id = uid("lp"); inn.commit("training", "مسیر یادگیری تعریف کرد", { id, title: form.title }, (s) => ({ ...s, paths: [...s.paths, { id, title: form.title.trim(), audience: form.audience.trim() || "همه", courseIds: form.courseIds }] })); setForm(null); }}>ذخیره مسیر</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- بانک سؤال
function BankTab() {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const confirm = useConfirm();
  const [qForm, setQForm] = useState<{ topic: string; text: string; options: string[]; correct: number } | null>(null);
  const [zForm, setZForm] = useState<{ title: string; ids: string[]; pass: string } | null>(null);
  const canEdit = hasPermission("training.create");
  const topics = Array.from(new Set(inn.questions.map((q) => q.topic)));
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {canEdit && <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setZForm({ title: "", ids: [], pass: "۶۰" })}>آزمون جدید</Button>}
        {canEdit && <Button size="sm" variant="primary" icon={<HelpCircle size={14} />} onClick={() => setQForm({ topic: topics[0] ?? "", text: "", options: ["", "", "", ""], correct: 0 })}>سؤال جدید</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {inn.quizzes.map((z) => (
          <div key={z.id} className="card p-3.5 text-xs">
            <p className="font-bold text-ink-900 flex items-center gap-1.5"><ListChecks size={13} className="text-brand-600" /> {z.title}</p>
            <p className="text-ink-400 mt-1">{faN(z.questionIds.length)} سؤال · حد قبولی {faN(z.passScore)} · در {faN(inn.courses.filter((c) => c.items.some((i) => i.quizId === z.id)).length)} دوره</p>
          </div>
        ))}
      </div>
      {topics.map((t) => (
        <div key={t}>
          <p className="text-xs font-bold text-ink-900 mb-2">{t}</p>
          <div className="card divide-y divide-ink-100">
            {inn.questions.filter((q) => q.topic === t).map((q) => (
              <div key={q.id} className="p-3 text-xs flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-ink-800">{q.text}</p>
                  <p className="text-[10.5px] text-emerald-700 mt-1">پاسخ: {q.options[q.correct]}</p>
                </div>
                {canEdit && <RowActions onDelete={() => confirm({ title: "حذف سؤال؟", onConfirm: () => inn.commit("training", "سؤال را از بانک حذف کرد", { id: q.id, title: q.text.slice(0, 40) }, (s) => ({ ...s, questions: s.questions.filter((x) => x.id !== q.id), quizzes: s.quizzes.map((z) => ({ ...z, questionIds: z.questionIds.filter((id) => id !== q.id) })) })) })} />}
              </div>
            ))}
          </div>
        </div>
      ))}
      {qForm && (
        <Modal open onClose={() => setQForm(null)} title="سؤال جدید">
          <div className="space-y-3">
            <Field label="موضوع"><input value={qForm.topic} onChange={(e) => setQForm({ ...qForm, topic: e.target.value })} className="input-field" list="q-topics" /><datalist id="q-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist></Field>
            <Field label="متن سؤال" required><textarea value={qForm.text} onChange={(e) => setQForm({ ...qForm, text: e.target.value })} rows={2} className="input-field" /></Field>
            {qForm.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2"><input type="radio" checked={qForm.correct === i} onChange={() => setQForm({ ...qForm, correct: i })} title="پاسخ صحیح" /><input value={o} onChange={(e) => setQForm({ ...qForm, options: qForm.options.map((x, j) => (j === i ? e.target.value : x)) })} className="input-field" placeholder={`گزینه ${faN(i + 1)}`} /></div>
            ))}
            <Button variant="primary" className="w-full justify-center" onClick={() => { if (!qForm.text.trim() || qForm.options.some((o) => !o.trim())) return; const id = uid("q"); inn.commit("training", "سؤال به بانک افزود", { id, title: qForm.text.slice(0, 40) }, (s) => ({ ...s, questions: [...s.questions, { id, topic: qForm.topic.trim() || "عمومی", text: qForm.text.trim(), options: qForm.options.map((o) => o.trim()), correct: qForm.correct }] })); setQForm(null); }}>افزودن به بانک</Button>
          </div>
        </Modal>
      )}
      {zForm && (
        <Modal open onClose={() => setZForm(null)} title="آزمون جدید از بانک سؤال">
          <div className="space-y-3">
            <Field label="عنوان آزمون" required><input value={zForm.title} onChange={(e) => setZForm({ ...zForm, title: e.target.value })} className="input-field" /></Field>
            <Field label="حد قبولی (از ۱۰۰)"><input value={zForm.pass} onChange={(e) => setZForm({ ...zForm, pass: e.target.value })} className="input-field w-24" /></Field>
            <div className="max-h-56 overflow-y-auto space-y-1">{inn.questions.map((q) => <label key={q.id} className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={zForm.ids.includes(q.id)} onChange={(e) => setZForm({ ...zForm, ids: e.target.checked ? [...zForm.ids, q.id] : zForm.ids.filter((x) => x !== q.id) })} /> <span><span className="text-ink-400">[{q.topic}]</span> {q.text}</span></label>)}</div>
            <Button variant="primary" className="w-full justify-center" onClick={() => { if (!zForm.title.trim() || !zForm.ids.length) return; const id = uid("qz"); inn.commit("training", "آزمون جدید ساخت", { id, title: zForm.title }, (s) => ({ ...s, quizzes: [...s.quizzes, { id, title: zForm.title.trim(), questionIds: zForm.ids, passScore: num(zForm.pass) || 60 }] })); setZForm(null); }}>ساخت آزمون</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- گواهی‌ها
function CertsTab() {
  const inn = useInnovation();
  const { actingUser, hasPermission } = useTenancy();
  const all = hasPermission("training.certificate");
  const list = inn.enrollments.filter((e) => e.certificateNo && (all || e.user === actingUser.name));
  const hours = inn.enrollments.filter((e) => e.certificateNo && e.user === actingUser.name).reduce((s, e) => s + (inn.courses.find((c) => c.id === e.courseId)?.hours ?? 0), 0);
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-500">شناسنامه‌ی آموزشی شما: {faN(hours)} ساعت آموزش گواهی‌دار{all ? " · نمایش همه‌ی گواهی‌های سازمان" : ""}</p>
      <div className="card divide-y divide-ink-100">
        {list.length === 0 && <EmptyState title="گواهی‌ای صادر نشده" />}
        {list.map((e) => {
          const c = inn.courses.find((x) => x.id === e.courseId);
          return (
            <div key={e.id} className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{c?.title}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{e.user} · {e.certificateNo} · صدور {e.certifiedAt} · {faN(c?.hours)} ساعت</p>
              </div>
              {c && <Button size="sm" variant="secondary" icon={<Printer size={13} />} onClick={() => printHtml(`گواهی ${e.certificateNo}`, certHtml(e.user, c, e))}>چاپ گواهی</Button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- الزامات شغلی
function JobsTab() {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const [add, setAdd] = useState({ user: "", job: "" });
  const titles = Array.from(new Set([...inn.courses.flatMap((c) => c.jobTitles), ...inn.jobAssignments.map((j) => j.jobTitle)]));
  const canEdit = hasPermission("training.create");
  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-500 leading-6">هر دوره می‌تواند برای یک یا چند جایگاه شغلی الزامی باشد (در فرم دوره). انطباق = داشتن گواهی همه‌ی دوره‌های الزامی آن جایگاه.</p>
      {canEdit && (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={add.user} onChange={(e) => setAdd({ ...add, user: e.target.value })} className="input-field w-auto"><option value="">همکار…</option>{users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select>
          <input value={add.job} onChange={(e) => setAdd({ ...add, job: e.target.value })} className="input-field w-auto" placeholder="جایگاه شغلی" list="job-titles" />
          <datalist id="job-titles">{titles.map((t) => <option key={t} value={t} />)}</datalist>
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => { if (!add.user || !add.job.trim()) return; inn.commit("training", `«${add.user}» را به جایگاه «${add.job}» منتسب کرد`, undefined, (s) => ({ ...s, jobAssignments: [...s.jobAssignments, { id: uid("j"), user: add.user, jobTitle: add.job.trim() }] })); setAdd({ user: "", job: "" }); }}>انتساب</Button>
        </div>
      )}
      {titles.map((t) => {
        const req = inn.courses.filter((c) => c.jobTitles.includes(t));
        const people = inn.jobAssignments.filter((j) => j.jobTitle === t);
        const ok = people.filter((p) => req.every((c) => completed(inn.enrollments.find((e) => e.courseId === c.id && e.user === p.user)))).length;
        return (
          <div key={t} className="card p-4">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5"><Briefcase size={14} className="text-brand-600" /> {t}</p>
              <Badge tone={people.length && ok === people.length ? "success" : "warning"}>انطباق {faN(people.length ? Math.round((ok / people.length) * 100) : 0)}٪</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">{req.length ? req.map((c) => <Badge key={c.id} tone="neutral">{c.title}</Badge>) : <span className="text-[11px] text-ink-400">دوره‌ی الزامی تعریف نشده</span>}</div>
            {people.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] min-w-[360px]">
                  <thead><tr className="text-ink-400 text-right"><th className="font-medium pb-1.5">همکار</th>{req.map((c) => <th key={c.id} className="font-medium pb-1.5 text-center max-w-[120px] truncate">{c.title.slice(0, 22)}</th>)}{canEdit && <th />}</tr></thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.id} className="border-t border-ink-100">
                        <td className="py-1.5 text-ink-800">{p.user}</td>
                        {req.map((c) => {
                          const en = inn.enrollments.find((e) => e.courseId === c.id && e.user === p.user);
                          return <td key={c.id} className="py-1.5 text-center">{completed(en) ? <CheckCircle2 size={14} className="inline text-emerald-600" /> : en ? <span className="text-amber-600">در حال یادگیری</span> : <span className="text-rose-500">ثبت‌نام نشده</span>}</td>;
                        })}
                        {canEdit && <td className="py-1.5 text-left"><button onClick={() => inn.commit("training", `انتساب «${p.user}» به «${t}» را حذف کرد`, undefined, (s) => ({ ...s, jobAssignments: s.jobAssignments.filter((x) => x.id !== p.id) }))} className="text-ink-400 hover:text-rose-600"><Trash2 size={12} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
