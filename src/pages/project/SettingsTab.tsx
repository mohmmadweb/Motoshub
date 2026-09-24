import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, ArchiveRestore, Copy, Save, Trash2, RotateCcw, FastForward, Settings } from "lucide-react";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import type { ProjectMeta } from "../../pm/types";
import { Field, MemberSelect, SectionTitle, useProjectPage } from "./shared";
import { phases } from "./OverviewTab";
import CustomFieldsCard from "./CustomFieldsCard";
import { ProjectIcon, projectColors, projectIconNames } from "./projectIcons";

export default function SettingsTab() {
  const { p, pid, canEdit, canManage, hasPerm, refDate, goTab } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [d, setD] = useState<ProjectMeta>(p.meta);
  const [tags, setTags] = useState(p.meta.tags.join("، "));
  const [tplName, setTplName] = useState(`قالب ${p.meta.name}`);

  useEffect(() => {
    setD(p.meta);
    setTags(p.meta.tags.join("، "));
    // با تغییر از جای دیگر (مثلاً بایگانی) فرم تازه می‌شود
  }, [p.meta]);

  const save = () => {
    if (!d.name.trim()) return notify("نام پروژه الزامی است.", "warning");
    pm.updateMeta(pid, { ...d, tags: tags.split(/[،,]/).map((x) => x.trim()).filter(Boolean) });
    notify("تنظیمات ذخیره شد؛ هر تغییر با کد رویداد خودش در تاریخچه ثبت شد.");
  };

  if (!canManage) return <p className="text-sm text-ink-500">فقط مالک و مدیر پروژه به تنظیمات دسترسی دارند.</p>;

  return (
    <div className="space-y-5">
      {canEdit && (
      <div className="card p-4">
        <SectionTitle icon={<Settings size={15} className="text-brand-600" />} title="اطلاعات پروژه" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="نام پروژه">
            <input className="input-field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="کارفرما">
            <input className="input-field" value={d.client} onChange={(e) => setD({ ...d, client: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="توضیحات">
              <textarea className="input-field min-h-[70px]" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
            </Field>
          </div>
          <Field label="مدیر پروژه">
            <MemberSelect p={p} value={d.manager} onChange={(v) => setD({ ...d, manager: v })} allowEmpty={false} />
          </Field>
          <Field label="حامی مالی / اسپانسر">
            <input className="input-field" value={d.sponsor} onChange={(e) => setD({ ...d, sponsor: e.target.value })} />
          </Field>
          <Field label="مسئول مالی (گیرنده‌ی هشدارهای بودجه)">
            <MemberSelect p={p} value={d.financeOfficer} onChange={(v) => setD({ ...d, financeOfficer: v })} allowEmpty={false} />
          </Field>
          <Field label="فضای کاری">
            <input className="input-field" value={d.workspace} onChange={(e) => setD({ ...d, workspace: e.target.value })} />
          </Field>
          <Field label="تاریخ شروع">
            <JalaliDatePicker value={d.start} onChange={(v) => setD({ ...d, start: v })} />
          </Field>
          <Field label="تاریخ پایان (مهلت)">
            <JalaliDatePicker value={d.deadline} onChange={(v) => setD({ ...d, deadline: v })} />
          </Field>
          <Field label="وضعیت سلامت">
            <select className="input-field" value={d.health} onChange={(e) => setD({ ...d, health: e.target.value as ProjectMeta["health"] })}>
              {["سبز", "زرد", "قرمز"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="اولویت">
            <select className="input-field" value={d.priority} onChange={(e) => setD({ ...d, priority: e.target.value as ProjectMeta["priority"] })}>
              {["کم", "متوسط", "زیاد"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="مرحله‌ی چرخه‌ی عمر">
            <select className="input-field" value={d.phase} onChange={(e) => setD({ ...d, phase: e.target.value as ProjectMeta["phase"] })}>
              {phases.map((x) => (
                <option key={x.id}>{x.id}</option>
              ))}
            </select>
          </Field>
          <Field label="سطح دسترسی (Visibility)">
            <select className="input-field" value={d.visibility} onChange={(e) => setD({ ...d, visibility: e.target.value as ProjectMeta["visibility"] })}>
              {["عمومی سازمان", "فقط اعضا", "خصوصی"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="دسته‌بندی">
            <input className="input-field" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} />
          </Field>
          <Field label="گروه پروژه">
            <select className="input-field" value={d.groupId ?? ""} onChange={(e) => setD({ ...d, groupId: e.target.value || undefined })}>
              <option value="">بدون گروه</option>
              {pm.store.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="برچسب‌ها (با ، جدا کنید)">
            <input className="input-field" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <Field label="آیکون">
            <div className="flex flex-wrap gap-1.5">
              {projectIconNames.map((n) => (
                <button key={n} onClick={() => setD({ ...d, icon: n })} className={`w-9 h-9 rounded-lg border flex items-center justify-center ${d.icon === n ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500"}`} aria-label={n}>
                  <ProjectIcon name={n} size={16} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="رنگ">
            <div className="flex flex-wrap gap-1.5">
              {projectColors.map((c) => (
                <button key={c} onClick={() => setD({ ...d, color: c })} className={`w-8 h-8 rounded-full border-2 ${d.color === c ? "border-ink-900" : "border-transparent"}`} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </Field>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="primary" icon={<Save size={14} />} onClick={save}>
            ذخیره‌ی تنظیمات
          </Button>
          <Button variant="ghost" onClick={() => { setD(p.meta); setTags(p.meta.tags.join("، ")); }}>
            بازگردانی
          </Button>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button onClick={() => goTab("team")} className="card p-4 text-right hover:border-brand-300">
          <p className="text-sm font-bold text-ink-900">اعضا و دسترسی‌ها</p>
          <p className="text-xs text-ink-400 mt-1">{fa(p.members.length)} عضو · نقش‌ها</p>
        </button>
        <button onClick={() => goTab("notifications")} className="card p-4 text-right hover:border-brand-300">
          <p className="text-sm font-bold text-ink-900">اعلان‌ها و خودکارسازی</p>
          <p className="text-xs text-ink-400 mt-1">{fa(Object.keys(p.notifRules).length)} قاعده‌ی سفارشی · {fa(p.automation.filter((a) => a.enabled).length)} قاعده‌ی خودکار فعال</p>
        </button>
        <button onClick={() => goTab("budget")} className="card p-4 text-right hover:border-brand-300">
          <p className="text-sm font-bold text-ink-900">تنظیمات مالی</p>
          <p className="text-xs text-ink-400 mt-1">آستانه‌ها: {p.budget.thresholds.map((x) => `${fa(x)}٪`).join("، ")}</p>
        </button>
      </div>

      <CustomFieldsCard />

      <div className="card p-4 space-y-4">
        <SectionTitle title="قالب، بایگانی و حذف" />
        {hasPerm("projects.templates") && <div className="flex items-end gap-2 flex-wrap">
          <Field label="ذخیره به‌عنوان قالب پروژه (بورد، تسک‌ها، وابستگی‌ها، برچسب‌ها، مایل‌ستون‌ها، نقش‌ها)">
            <input className="input-field w-72" value={tplName} onChange={(e) => setTplName(e.target.value)} />
          </Field>
          <Button variant="secondary" icon={<Copy size={14} />} onClick={() => { pm.saveAsTemplate(pid, tplName.trim() || p.meta.name); notify("قالب ذخیره شد؛ هنگام ایجاد پروژه‌ی جدید قابل انتخاب است."); }}>
            ذخیره‌ی قالب
          </Button>
        </div>}
        <div className="flex gap-2 flex-wrap border-t border-ink-100 pt-4">
          {!hasPerm("projects.archive") ? null : p.meta.archived ? (
            <Button variant="secondary" icon={<ArchiveRestore size={14} />} onClick={() => pm.updateMeta(pid, { archived: false })}>
              بازیابی از بایگانی
            </Button>
          ) : (
            <Button variant="secondary" icon={<Archive size={14} />} onClick={() => confirm({ title: "بایگانی پروژه؟", message: "اطلاعات حذف نمی‌شود و هر زمان قابل بازیابی است.", confirmLabel: "بایگانی", onConfirm: () => pm.updateMeta(pid, { archived: true }) })}>
              بایگانی پروژه
            </Button>
          )}
          {hasPerm("projects.delete") && <Button
            variant="danger"
            icon={<Trash2 size={14} />}
            onClick={() =>
              confirm({
                title: `حذف دائمی «${p.meta.name}»؟`,
                message: `${fa(p.tasks.length)} تسک، ${fa(p.logs.length)} رکورد تاریخچه و همه‌ی اسناد و هزینه‌ها حذف می‌شود. به‌جای حذف، بایگانی را در نظر بگیرید.`,
                onConfirm: () => {
                  pm.deleteProject(pid);
                  navigate("/dashboard/projects");
                },
              })
            }
          >
            حذف پروژه
          </Button>}
        </div>
      </div>

      <div className="card p-4 border-dashed">
        <SectionTitle title="ابزار دمو" hint="فقط در پروتوتایپ — برای نمایش اعلان‌های زمان‌محور و بازگرداندن داده‌ی نمونه." />
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-ink-600">
            امروزِ دمو: <b>{refDate}</b>
          </span>
          <Button size="sm" variant="secondary" icon={<FastForward size={13} />} onClick={() => { pm.advanceDays(1); notify("یک روز جلو رفت؛ زمان‌بند اجرا شد."); }}>
            +۱ روز
          </Button>
          <Button size="sm" variant="secondary" icon={<FastForward size={13} />} onClick={() => { pm.advanceDays(7); notify("یک هفته جلو رفت؛ زمان‌بند اجرا شد."); }}>
            +۷ روز
          </Button>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => confirm({ title: "بازگرداندن همه‌ی داده‌های مدیریت پروژه به حالت اولیه؟", message: "همه‌ی تغییرات دمو، تاریخچه و اعلان‌های پروژه‌ها پاک می‌شود.", confirmLabel: "بازنشانی", onConfirm: () => { pm.resetDemo(); notify("داده‌ی نمونه بازنشانی شد.", "info"); } })}>
            بازنشانی داده‌ی دمو
          </Button>
        </div>
      </div>
    </div>
  );
}
