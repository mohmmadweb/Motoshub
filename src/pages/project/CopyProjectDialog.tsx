import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import type { ProjectState } from "../../pm/types";
import { Field } from "./shared";

/** میزیتو «کپی پروژه به همراه ساختار بورد و کلیه وظایف» — تاریخچه، زمان، جلسات و گزارش‌ها کپی نمی‌شوند */
export default function CopyProjectDialog({ p, onClose }: { p: ProjectState; onClose: () => void }) {
  const pm = useProjectsPM();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(`کپی ${p.meta.name}`);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeMembers, setIncludeMembers] = useState(true);
  const [resetProgress, setResetProgress] = useState(true);
  const n = p.tasks.filter((t) => !t.archived).length;
  const go = () => {
    if (!name.trim()) return notify("نام پروژه‌ی تازه لازم است.", "warning");
    const id = pm.copyProject(p.meta.id, { name: name.trim(), includeTasks, includeMembers, resetProgress });
    notify(`پروژه‌ی «${name.trim()}» از روی «${p.meta.name}» ساخته شد.`);
    onClose();
    navigate(`/projects/${id}?tab=board`);
  };
  const check = (on: boolean, set: (v: boolean) => void, label: string, disabled = false) => (
    <label className={`flex items-center gap-2 text-sm text-ink-800 ${disabled ? "opacity-50" : ""}`}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => set(e.target.checked)} className="w-4 h-4 accent-[var(--color-brand-600)]" />
      {label}
    </label>
  );
  return (
    <Modal open onClose={onClose} title="کپی پروژه" description="ستون‌های بورد، فازها، تنظیمات و الگوها همیشه کپی می‌شوند؛ تاریخچه، زمان ثبت‌شده، جلسات و هزینه‌ها کپی نمی‌شوند.">
      <div className="space-y-3">
        <Field label="نام پروژه‌ی تازه">
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        {check(includeTasks, setIncludeTasks, `همه‌ی کارها (${fa(n)} کار) با زیرکارها و وابستگی‌ها`)}
        {check(includeMembers, setIncludeMembers, "اعضا و مسئولان کارها")}
        {check(resetProgress, setResetProgress, "کارها از ابتدا شروع شوند (وضعیت «برای انجام»، پیشرفت صفر)", !includeTasks)}
        <div className="flex gap-2 pt-1">
          <Button variant="primary" onClick={go}>
            ساخت کپی
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
}
