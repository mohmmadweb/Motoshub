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

/** نوار گروه‌های پروژه (پورتفولیو): فیلتر + ساخت/ویرایش/حذف گروه */
export default function ProjectGroupsBar({ value, onChange, canManage }: { value: string; onChange: (id: string) => void; canManage: boolean }) {
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [edit, setEdit] = useState<(Omit<ProjectGroup, "id"> & { id?: string }) | null>(null);
  const live = pm.projects.filter((p) => !p.meta.archived);
  const count = (id: string) => live.filter((p) => (id === "none" ? !p.meta.groupId : p.meta.groupId === id)).length;

  const save = () => {
    if (!edit) return;
    if (!edit.name.trim()) return notify("نام گروه الزامی است.", "warning");
    pm.saveGroup({ ...edit, name: edit.name.trim() });
    notify(edit.id ? "گروه ویرایش شد." : `گروه «${edit.name.trim()}» ساخته شد.`);
    setEdit(null);
  };

  const chip = (id: string, label: string, color?: string, g?: ProjectGroup) => (
    <span key={id} className={`group inline-flex items-center rounded-md border text-xs ${value === id ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"}`}>
      <button onClick={() => onChange(id)} className="flex items-center gap-1.5 px-3 py-1.5">
        {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
        {label}
        <span className="opacity-60">({fa(id === "" ? live.length : count(id))})</span>
      </button>
      {g && canManage && (
        <span className="flex items-center pl-1.5 opacity-60 group-hover:opacity-100">
          <button onClick={() => setEdit({ ...g })} className="p-0.5 hover:text-brand-500" aria-label={`ویرایش گروه ${g.name}`} title="ویرایش گروه">
            <Pencil size={11} />
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
            className="p-0.5 hover:text-rose-500"
            aria-label={`حذف گروه ${g.name}`}
            title="حذف گروه"
          >
            <Trash2 size={11} />
          </button>
        </span>
      )}
    </span>
  );

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <FolderKanban size={14} className="text-ink-400" />
      {chip("", "همه‌ی گروه‌ها")}
      {pm.store.groups.map((g) => chip(g.id, g.name, g.color, g))}
      {count("none") > 0 && chip("none", "بدون گروه")}
      {canManage && (
        <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setEdit({ name: "", description: "", color: projectColors[0] })}>
          گروه جدید
        </Button>
      )}

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
    </div>
  );
}
