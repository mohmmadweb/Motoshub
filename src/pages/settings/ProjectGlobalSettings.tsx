// ---------------------------------------------------------------------------
// «تنظیمات پروژه» (سراسری) — پیش‌فرض‌های پروژه‌های جدید: تقویم کاری، مشخصات پروژه، وضعیت‌ها و
// انواع کار، جلسات، خودکارسازی، دسترسی عضو تازه و پیوند قالب‌های پروژه.
// کامپوننت مستقل است تا بعداً زیر منوی «پروژه‌ها» هم سوار شود (فعلاً در «تنظیمات سامانه ← پروژه‌ها»).
// ذخیره در projectDefaults.ts (motoshub.projectDefaults.v1)؛ ساعت موظف/پنجشنبه/تعطیلات = تنظیمات کارکرد.
// ---------------------------------------------------------------------------
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpLeft, CalendarDays, FolderKanban, KeyRound, LayoutTemplate, ListChecks, Plus, RotateCcw, Save, Settings2, Trash2, Video, Workflow } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useTimesheet } from "../../context/TimesheetContext";
import { fa, nowClock } from "../../pm/jalali";
import { defaultAutomation, kindLabel } from "../../pm/seed";
import { typeLabel } from "../../pm/selectors";
import { ACCESS_TEMPLATES } from "../../pm/access";
import type { ColumnKind, PMMeeting, PMPriority, ProjectPriority, Visibility } from "../../pm/types";
import TimesheetSettingsModal from "../activity/SettingsModal";
import { allTaskTypes, defaultProjectDefaults, saveProjectDefaults, useProjectDefaults, type ProjectDefaults } from "./projectDefaults";

const kinds = Object.keys(kindLabel) as ColumnKind[];
const priorities: PMPriority[] = ["کم", "متوسط", "زیاد", "بحرانی"];
const projectPriorities: ProjectPriority[] = ["کم", "متوسط", "زیاد"];
const visibilities: Visibility[] = ["عمومی سازمان", "فقط اعضا", "خصوصی"];

function Card({ icon, title, hint, children, actions }: { icon: ReactNode; title: string; hint?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="card p-4 min-w-0">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
            <span className="text-brand-600">{icon}</span> {title}
          </p>
          {hint && <p className="text-[11.5px] text-ink-500 mt-0.5 leading-5">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function F({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[11.5px] font-semibold text-ink-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10.5px] text-ink-400 mt-1">{hint}</span>}
    </label>
  );
}

export default function ProjectGlobalSettings() {
  const t = useTenancy();
  const ts = useTimesheet();
  const { notify } = useToast();
  const saved = useProjectDefaults();
  const [d, setD] = useState<ProjectDefaults>(saved);
  const [tsOpen, setTsOpen] = useState(false);
  const [thresholds, setThresholds] = useState(saved.project.budgetThresholds.map((n) => fa(n)).join("، "));
  useEffect(() => {
    setD(saved);
    setThresholds(saved.project.budgetThresholds.map((n) => fa(n)).join("، "));
  }, [saved]);
  const canEdit = (t.hasPermission("settings.system") || t.hasPermission("projects.templates")) && !t.readOnly;
  const strip = (p: ProjectDefaults) => JSON.stringify({ ...p, updatedAt: undefined, updatedBy: undefined });
  const dirty = strip(d) !== strip(saved) || thresholds !== saved.project.budgetThresholds.map((n) => fa(n)).join("، ");
  const set = <K extends keyof ProjectDefaults>(k: K, v: ProjectDefaults[K]) => setD((x) => ({ ...x, [k]: v }));
  const setProject = (p: Partial<ProjectDefaults["project"]>) => setD((x) => ({ ...x, project: { ...x.project, ...p } }));
  const setMeeting = (p: Partial<ProjectDefaults["meeting"]>) => setD((x) => ({ ...x, meeting: { ...x.meeting, ...p } }));

  const save = () => {
    const nums = thresholds
      .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
      .split(/[،,\s]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 200);
    if (!nums.length) return notify("حداقل یک آستانه‌ی بودجه (درصد) وارد کنید.", "warning");
    if (!d.columns.length || d.columns.some((c) => !c.label.trim())) return notify("هر وضعیت بورد باید عنوان داشته باشد.", "warning");
    if (!d.columns.some((c) => c.kind === "done")) return notify("حداقل یک وضعیت از نوع «انجام‌شده» لازم است.", "warning");
    if (!d.taskTypes.length) return notify("حداقل یک نوع کار فعال باشد.", "warning");
    if (d.workHours.start >= d.workHours.end) return notify("ساعت پایان کار باید بعد از ساعت شروع باشد.", "warning");
    if (d.meeting.defaultDuration < 5) return notify("مدت جلسه باید حداقل ۵ دقیقه باشد.", "warning");
    const next: ProjectDefaults = { ...d, defaultTaskType: d.taskTypes.includes(d.defaultTaskType) ? d.defaultTaskType : d.taskTypes[0], project: { ...d.project, budgetThresholds: [...new Set(nums)].sort((a, b) => a - b) } };
    saveProjectDefaults(next, t.actingUser.name, `${t.today} ${nowClock()}`);
    notify("پیش‌فرض‌های پروژه ذخیره شد؛ پروژه‌های جدید با این تنظیمات ساخته می‌شوند.", "success");
  };

  const moveCol = (i: number, dir: -1 | 1) =>
    setD((x) => {
      const cols = [...x.columns];
      const j = i + dir;
      if (j < 0 || j >= cols.length) return x;
      [cols[i], cols[j]] = [cols[j], cols[i]];
      return { ...x, columns: cols };
    });
  const s = ts.settings;
  const thursday = s.thursdayHours === 0 ? "تعطیل" : s.thursdayHours >= s.dailyHours ? "کامل" : `${fa(s.thursdayHours)} ساعت`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <FolderKanban size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-ink-900">تنظیمات پروژه</h2>
            <p className="text-[12px] text-ink-500 mt-0.5 leading-5">پیش‌فرض‌های پروژه‌های جدید در کل سازمان. هر پروژه بعد از ساخت، در تب «تنظیمات» خودش قابل تغییر است.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saved.updatedAt && <span className="text-[11px] text-ink-400">آخرین ذخیره: {saved.updatedAt} — {saved.updatedBy}</span>}
          <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} disabled={!canEdit} onClick={() => { const def = defaultProjectDefaults(); setD(def); setThresholds(def.project.budgetThresholds.map((n) => fa(n)).join("، ")); }}>
            پیش‌فرض
          </Button>
          <Button variant="primary" size="sm" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
            ذخیره
          </Button>
        </div>
      </div>
      {!canEdit && <p className="rounded-lg bg-ink-100 text-ink-600 text-xs p-2.5">{t.readOnly ? "در حالت مشاهده به‌عنوان، تنظیمات فقط‌خواندنی است." : "تغییر این بخش نیازمند مجوز «قالب‌های پروژه» یا «تنظیمات سیستم» است."}</p>}

      <fieldset disabled={!canEdit} className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0 border-0 p-0 m-0">
        <Card
          icon={<CalendarDays size={15} />}
          title="تقویم و ساعت کاری"
          hint="مبنای ظرفیت بار کاری، تشخیص روز تعطیل و پیشنهاد «زمان مشترک» جلسات."
          actions={
            <Button size="sm" variant="secondary" icon={<Settings2 size={13} />} onClick={() => setTsOpen(true)}>
              تقویم کاری سازمان
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <F label="شروع ساعت کاری">
              <input type="time" className="input-field" dir="ltr" value={d.workHours.start} onChange={(e) => set("workHours", { ...d.workHours, start: e.target.value })} />
            </F>
            <F label="پایان ساعت کاری">
              <input type="time" className="input-field" dir="ltr" value={d.workHours.end} onChange={(e) => set("workHours", { ...d.workHours, end: e.target.value })} />
            </F>
          </div>
          <p className="text-[11.5px] text-ink-500 mt-3 leading-6">
            این بازه فقط ساعت شروع و پایان روز را برای پیشنهاد زمان جلسه و «زمان مشترک» تعیین می‌کند. ساعت موظف ({fa(s.dailyHours)} ساعت)، پنجشنبه ({thursday}) و {fa(s.holidays.length)} روز تعطیل از تقویم کاری «کارکرد و مرخصی» می‌آید · جمعه تعطیل.
          </p>
        </Card>

        <Card icon={<FolderKanban size={15} />} title="مشخصات پروژه‌ی جدید">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <F label="سطح دسترسی (Visibility)">
              <select className="input-field" value={d.project.visibility} onChange={(e) => setProject({ visibility: e.target.value as Visibility })}>
                {visibilities.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </F>
            <F label="اولویت">
              <select className="input-field" value={d.project.priority} onChange={(e) => setProject({ priority: e.target.value as ProjectPriority })}>
                {projectPriorities.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </F>
            <F label="آستانه‌های هشدار بودجه (٪)" hint="با ، جدا کنید؛ مثلاً ۸۰، ۱۰۰">
              <input className="input-field" value={thresholds} onChange={(e) => setThresholds(e.target.value)} />
            </F>
            <div className="flex items-center justify-between gap-2 self-end pb-2">
              <span className="text-[12px] text-ink-700">فرم درخواست برای اعضا باز باشد</span>
              <Toggle on={d.project.intakeOpen} disabled={!canEdit} onChange={() => setProject({ intakeOpen: !d.project.intakeOpen })} label="فرم درخواست" />
            </div>
          </div>
        </Card>

        <Card icon={<ListChecks size={15} />} title="وضعیت‌های بورد" hint="ستون‌های پیش‌فرض و نوع هر وضعیت (برای گزارش‌ها و خودکارسازی)؛ WIP = سقف کار هم‌زمان.">
          <ul className="space-y-2">
            {d.columns.map((c, i) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_150px_64px_auto] gap-2 items-center">
                <input className="input-field" value={c.label} aria-label="عنوان وضعیت" onChange={(e) => set("columns", d.columns.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <span className="flex items-center gap-0.5 sm:order-last">
                  <button type="button" onClick={() => moveCol(i, -1)} disabled={i === 0} className="p-1.5 rounded-md text-ink-400 hover:bg-ink-100 disabled:opacity-30" aria-label="بالا">
                    <ArrowUp size={13} />
                  </button>
                  <button type="button" onClick={() => moveCol(i, 1)} disabled={i === d.columns.length - 1} className="p-1.5 rounded-md text-ink-400 hover:bg-ink-100 disabled:opacity-30" aria-label="پایین">
                    <ArrowDown size={13} />
                  </button>
                  <button type="button" onClick={() => set("columns", d.columns.filter((_, j) => j !== i))} disabled={d.columns.length <= 2} className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30" aria-label="حذف وضعیت">
                    <Trash2 size={13} />
                  </button>
                </span>
                <select className="input-field" value={c.kind} aria-label="نوع وضعیت" onChange={(e) => set("columns", d.columns.map((x, j) => (j === i ? { ...x, kind: e.target.value as ColumnKind } : x)))}>
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {kindLabel[k]}
                    </option>
                  ))}
                </select>
                <input className="input-field text-center" inputMode="numeric" placeholder="WIP" aria-label="سقف WIP" value={c.wip ? fa(c.wip) : ""} onChange={(e) => { const n = Number(e.target.value.replace(/[۰-۹]/g, (ch) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch)))); set("columns", d.columns.map((x, j) => (j === i ? { ...x, wip: n > 0 ? n : undefined } : x))); }} />
              </li>
            ))}
          </ul>
          <Button className="mt-2" size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set("columns", [...d.columns, { id: `col-${Date.now()}`, label: "وضعیت جدید", kind: "doing" }])}>
            افزودن وضعیت
          </Button>
        </Card>

        <Card icon={<LayoutTemplate size={15} />} title="انواع کار و تسک تازه">
          <div className="flex flex-wrap gap-2 mb-3">
            {allTaskTypes.map((ty) => {
              const on = d.taskTypes.includes(ty);
              return (
                <button key={ty} type="button" onClick={() => set("taskTypes", on ? d.taskTypes.filter((x) => x !== ty) : [...d.taskTypes, ty])} aria-pressed={on} className={`px-3 py-1.5 rounded-lg border text-[12px] ${on ? "border-brand-400 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500"}`}>
                  {typeLabel[ty]}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="نوع پیش‌فرض">
              <select className="input-field" value={d.defaultTaskType} onChange={(e) => set("defaultTaskType", e.target.value as ProjectDefaults["defaultTaskType"])}>
                {d.taskTypes.map((ty) => (
                  <option key={ty} value={ty}>
                    {typeLabel[ty]}
                  </option>
                ))}
              </select>
            </F>
            <F label="اولویت پیش‌فرض">
              <select className="input-field" value={d.defaultTaskPriority} onChange={(e) => set("defaultTaskPriority", e.target.value as PMPriority)}>
                {priorities.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </F>
          </div>
        </Card>

        <Card icon={<Video size={15} />} title="جلسات" hint="پیش‌فرض جلسه‌های پروژه‌های جدید؛ هر پروژه در «تنظیمات جلسات» خودش بازنویسی می‌کند.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <F label="مدت (دقیقه)">
              <input type="number" min={5} className="input-field" value={d.meeting.defaultDuration} onChange={(e) => setMeeting({ defaultDuration: Number(e.target.value) || 0 })} />
            </F>
            <F label="یادآوری">
              <select className="input-field" value={d.meeting.reminderMinutes} onChange={(e) => setMeeting({ reminderMinutes: Number(e.target.value) })}>
                {[10, 15, 30, 60, 120, 1440].map((x) => (
                  <option key={x} value={x}>
                    {x === 1440 ? "یک روز قبل" : x >= 60 ? `${fa(x / 60)} ساعت قبل` : `${fa(x)} دقیقه قبل`}
                  </option>
                ))}
              </select>
            </F>
            <F label="حالت">
              <select className="input-field" value={d.meeting.defaultMode} onChange={(e) => setMeeting({ defaultMode: e.target.value as PMMeeting["mode"] })}>
                <option>ویدیویی</option>
                <option>صوتی</option>
                <option>حضوری</option>
              </select>
            </F>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3">
            <span className="text-[12px] text-ink-700">اجازه‌ی ضبط جلسه (با مجوز مدیر)</span>
            <Toggle on={d.meeting.recordingAllowed} disabled={!canEdit} onChange={() => setMeeting({ recordingAllowed: !d.meeting.recordingAllowed })} label="اجازه‌ی ضبط جلسه" />
          </div>
        </Card>

        <Card icon={<Workflow size={15} />} title="خودکارسازی پیش‌فرض" hint="قواعد داخلی که در پروژه‌ی جدید روشن‌اند.">
          <ul className="divide-y divide-ink-100">
            {defaultAutomation().map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-[12px] text-ink-700 leading-5 min-w-0">{a.name}</span>
                <Toggle on={!!d.automation[a.id]} disabled={!canEdit} onChange={() => set("automation", { ...d.automation, [a.id]: !d.automation[a.id] })} label={a.name} />
              </li>
            ))}
          </ul>
        </Card>

        <Card icon={<KeyRound size={15} />} title="دسترسی پیش‌فرض عضو تازه" hint="وقتی عضوی به پروژه اضافه می‌شود، دسترسی اولیه‌اش از این قالب پر می‌شود.">
          <div className="space-y-2">
            {[{ id: "overview" as const, label: "نمای کلی", hint: "مشاهده‌ی وظایف، مایل‌ستون‌ها و جلسات." }, ...ACCESS_TEMPLATES].map((tp) => (
              <button key={tp.id} type="button" onClick={() => set("memberAccess", tp.id)} className={`w-full text-right rounded-lg border px-3 py-2 ${d.memberAccess === tp.id ? "border-brand-400 bg-brand-50" : "border-ink-200 hover:bg-ink-50"}`}>
                <span className="block text-[12.5px] font-semibold text-ink-800">{tp.label}</span>
                <span className="block text-[11px] text-ink-500 leading-5">{tp.hint}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card icon={<LayoutTemplate size={15} />} title="قالب‌های پروژه" hint="قالب‌ها (بورد، تسک‌ها، وابستگی‌ها، مایل‌ستون‌ها و نقش‌ها) در بخش «قالب‌های پروژه» صفحه‌ی پروژه‌ها مدیریت می‌شوند؛ هر پروژه هم از تب تنظیمات خودش «ذخیره به‌عنوان قالب» دارد.">
          <Link to="/dashboard/projects?section=templates" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-700 hover:underline">
            مدیریت قالب‌های پروژه <ArrowUpLeft size={13} />
          </Link>
        </Card>
      </fieldset>
      <TimesheetSettingsModal open={tsOpen} onClose={() => setTsOpen(false)} />
    </div>
  );
}
