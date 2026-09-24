import { useState } from "react";
import { FolderKanban, Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import type { ProjectGroup } from "../../pm/types";
import { projectColors } from "./projectIcons";

/** انتخاب گروه پروژه (پورتفولیو) در نوار ابزار + ساخت/ویرایش/حذف گروه در پنجره‌ی مدیریت */
export default function ProjectGroupsBar({ value, onChange, canManage }: { value: string; onChange: (id: string) => void; canManage: boolean }) {
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [edit, setEdit] = useState<(Omit<ProjectGroup, "id"> & { id?: string }) | null>(null);
  const [manage, setManage] = useState(false);
  const live = pm.projects.filter((p) => !p.meta.archived);
  const count = (id: string) => live.filter((p) => (id === "none" ? !p.meta.groupId : p.meta.groupId === id)).length;

  const save = () => {
    if (!edit) return;
    if (!edit.name.trim()) return notify("نام گروه الزامی است.", "warning");
    pm.saveGroup({ ...edit, name: edit.name.trim() });
    notify(edit.id ? "گروه ویرایش شد." : `گروه «${edit.name.trim()}» ساخته شد.`);
    setEdit(null);
  };

  return (
    <>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto" aria-label="گروه پروژه">
        <option value="">همه‌ی گروه‌ها ({fa(live.length)})</option>
        {pm.store.groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name} ({fa(count(g.id))})
          </option>
        ))}
        {count("none") > 0 && <option value="none">بدون گروه ({fa(count("none"))})</option>}
      </select>
      {canManage && (
        <>
          <button onClick={() => setManage(true)} className="p-2 rounded-lg border border-ink-200 bg-white text-ink-500 hover:text-ink-800" title="مدیریت گروه‌ها" aria-label="مدیریت گروه‌ها">
            <FolderKanban size={14} />
          </button>
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setEdit({ name: "", description: "", color: projectColors[0] })}>
            گروه جدید
          </Button>
        </>
      )}

      <Modal open={manage} onClose={() => setManage(false)} title="گروه‌های پروژه" description="پروژه‌های هم‌خانواده را در یک گروه (پورتفولیو) جمع کنید تا جداگانه دیده و گزارش شوند.">
        <div className="space-y-2">
          {pm.store.groups.map((g) => (
            <div key={g.id} className="flex items-center gap-2 border border-ink-200 rounded-lg px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
              <button onClick={() => { onChange(g.id); setManage(false); }} className="flex-1 text-right min-w-0">
                <p className="text-sm text-ink-900 truncate">{g.name}</p>
                {g.description && <p className="text-[11px] text-ink-400 truncate">{g.description}</p>}
              </button>
              <span className="text-[11px] text-ink-400">{fa(count(g.id))} پروژه</span>
              <button onClick={() => setEdit({ ...g })} className="p-1 text-ink-400 hover:text-brand-600" aria-label={`ویرایش گروه ${g.name}`} title="ویرایش گروه">
                <Pencil size={13} />
              </button>
              <button
                onClick={() =>
                  confirm({
                    title: `حذف گروه «${g.name}»؟`,
                    message: `${fa(count(g.id))} پروژه‌ی این گروه حذف نمی‌شوند؛ فقط از گروه خارج می‌شوند.`,
                    onConfirm: () => {
                      pm.removeGroup(g.id);
                      if (value === g.id) onChange("");
                      notify("گروه حذف شد.", "info");
                    },
                  })
                }
                className="p-1 text-ink-400 hover:text-rose-600"
                aria-label={`حذف گروه ${g.name}`}
                title="حذف گروه"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {pm.store.groups.length === 0 && <p className="text-xs text-ink-400">هنوز گروهی ساخته نشده است.</p>}
          <Button variant="secondary" icon={<Plus size={13} />} className="w-full justify-center" onClick={() => setEdit({ name: "", description: "", color: projectColors[0] })}>
            گروه جدید
          </Button>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "ویرایش گروه پروژه" : "ساخت گروه پروژه"} description="پروژه‌های هم‌خانواده (مثلاً «تحول دیجیتال») را در یک گروه جمع کنید تا جداگانه دیده و گزارش شوند.">
        {edit && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">نام گروه</label>
              <input className="input-field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="مثلاً: پروژه‌های عمرانی استان هرمزگان" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">توضیح</label>
              <textarea className="input-field min-h-[60px]" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">رنگ</label>
              <div className="flex gap-1.5">
                {projectColors.map((c) => (
                  <button key={c} onClick={() => setEdit({ ...edit, color: c })} className={`w-7 h-7 rounded-full border-2 ${edit.color === c ? "border-ink-900" : "border-transparent"}`} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1 justify-center" onClick={save}>
                {edit.id ? "ذخیره" : "ساخت گروه"}
              </Button>
              <Button variant="secondary" onClick={() => setEdit(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
