import { useState } from "react";
import { FolderTree, Tags, Plus, Pencil, Trash2, Check, X, CornerDownLeft } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useKnowledge } from "../../context/KnowledgeContext";
import { fa } from "../../pm/jalali";

const palette = ["#1f4f99", "#059669", "#d97706", "#7c3aed", "#0d9488", "#dc2626", "#475569", "#b45309"];

/** مدیریت دسته‌بندی سلسله‌مراتبی و انواع سند (بند ۱۴) */
export function TaxonomyManager() {
  const km = useKnowledge();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [editCat, setEditCat] = useState<{ id?: string; name: string; parentId?: string } | null>(null);
  const [editType, setEditType] = useState<{ id?: string; name: string; color: string } | null>(null);
  const roots = km.categories.filter((c) => !c.parentId);
  const countIn = (id: string) => km.docs.filter((d) => d.categoryId === id || km.categories.find((c) => c.id === d.categoryId)?.parentId === id).length;

  const saveCat = () => {
    if (!editCat?.name.trim()) return notify("نام دسته‌بندی الزامی است.", "warning");
    km.saveCategory({ id: editCat.id, name: editCat.name.trim(), parentId: editCat.parentId || undefined });
    notify(editCat.id ? "دسته‌بندی ویرایش شد." : "دسته‌بندی ساخته شد.");
    setEditCat(null);
  };
  const saveType = () => {
    if (!editType?.name.trim()) return notify("نام نوع سند الزامی است.", "warning");
    km.saveDocType({ id: editType.id, name: editType.name.trim(), color: editType.color });
    notify(editType.id ? "نوع سند ویرایش شد." : "نوع سند ساخته شد.");
    setEditType(null);
  };

  const catForm = (parentFixed?: string) =>
    editCat && (
      <div className="flex gap-2 items-center flex-wrap bg-brand-50/40 border border-brand-200 rounded-lg p-2">
        <input className="input-field !py-1.5 !text-xs flex-1 min-w-[160px]" value={editCat.name} onChange={(e) => setEditCat({ ...editCat, name: e.target.value })} placeholder="نام دسته‌بندی" autoFocus onKeyDown={(e) => e.key === "Enter" && saveCat()} />
        {!parentFixed && (
          <select className="input-field !py-1.5 !text-xs !w-auto" value={editCat.parentId ?? ""} onChange={(e) => setEditCat({ ...editCat, parentId: e.target.value || undefined })}>
            <option value="">دسته‌ی اصلی</option>
            {roots.filter((r) => r.id !== editCat.id).map((r) => (
              <option key={r.id} value={r.id}>
                زیرمجموعه‌ی {r.name}
              </option>
            ))}
          </select>
        )}
        <button onClick={saveCat} className="p-1.5 rounded-md bg-brand-600 text-white" aria-label="ذخیره">
          <Check size={13} />
        </button>
        <button onClick={() => setEditCat(null)} className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100" aria-label="انصراف">
          <X size={13} />
        </button>
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <FolderTree size={15} className="text-brand-600" /> دسته‌بندی‌ها ({fa(km.categories.length)})
          </p>
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setEditCat({ name: "" })}>
            دسته‌ی جدید
          </Button>
        </div>
        {editCat && !editCat.id && !editCat.parentId && <div className="mb-2">{catForm()}</div>}
        <ul className="space-y-1">
          {roots.map((r) => (
            <li key={r.id}>
              {editCat?.id === r.id ? (
                catForm()
              ) : (
                <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-ink-50">
                  <FolderTree size={13} className="text-ink-400" />
                  <span className="text-sm font-medium text-ink-800 flex-1">{r.name}</span>
                  <span className="text-[11px] text-ink-400">{fa(countIn(r.id))} سند</span>
                  <span className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                    <button onClick={() => setEditCat({ name: "", parentId: r.id })} className="p-1 text-ink-400 hover:text-brand-600" title="زیرمجموعه‌ی جدید" aria-label="زیرمجموعه‌ی جدید">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => setEditCat({ ...r })} className="p-1 text-ink-400 hover:text-brand-600" aria-label="ویرایش">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => confirm({ title: `حذف دسته‌ی «${r.name}»؟`, message: "زیرمجموعه‌ها به دسته‌ی اصلی تبدیل و اسناد آن به دسته‌ی دیگری منتقل می‌شوند.", onConfirm: () => km.deleteCategory(r.id) })} className="p-1 text-ink-400 hover:text-rose-600" aria-label="حذف">
                      <Trash2 size={12} />
                    </button>
                  </span>
                </div>
              )}
              <ul className="mr-5 border-r border-ink-100 pr-2 space-y-0.5">
                {km.categories.filter((c) => c.parentId === r.id).map((c) => (
                  <li key={c.id}>
                    {editCat?.id === c.id ? (
                      catForm()
                    ) : (
                      <div className="group flex items-center gap-2 px-2 py-1 rounded-md hover:bg-ink-50">
                        <CornerDownLeft size={11} className="text-ink-300" />
                        <span className="text-xs text-ink-700 flex-1">{c.name}</span>
                        <span className="text-[11px] text-ink-400">{fa(km.docs.filter((d) => d.categoryId === c.id).length)}</span>
                        <span className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                          <button onClick={() => setEditCat({ ...c })} className="p-1 text-ink-400 hover:text-brand-600" aria-label="ویرایش">
                            <Pencil size={11} />
                          </button>
                          <button onClick={() => confirm({ title: `حذف «${c.name}»؟`, message: "اسناد این دسته به دسته‌ی دیگری منتقل می‌شوند.", onConfirm: () => km.deleteCategory(c.id) })} className="p-1 text-ink-400 hover:text-rose-600" aria-label="حذف">
                            <Trash2 size={11} />
                          </button>
                        </span>
                      </div>
                    )}
                  </li>
                ))}
                {editCat && !editCat.id && editCat.parentId === r.id && <li>{catForm(r.id)}</li>}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <Tags size={15} className="text-brand-600" /> انواع سند ({fa(km.docTypes.length)})
          </p>
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setEditType({ name: "", color: palette[0] })}>
            نوع جدید
          </Button>
        </div>
        {editType && (
          <div className="flex gap-2 items-center flex-wrap bg-brand-50/40 border border-brand-200 rounded-lg p-2 mb-2">
            <input className="input-field !py-1.5 !text-xs flex-1 min-w-[140px]" value={editType.name} onChange={(e) => setEditType({ ...editType, name: e.target.value })} placeholder="مثلاً: شیوه‌نامه" autoFocus onKeyDown={(e) => e.key === "Enter" && saveType()} />
            <span className="flex gap-1">
              {palette.map((c) => (
                <button key={c} onClick={() => setEditType({ ...editType, color: c })} className={`w-5 h-5 rounded-full border-2 ${editType.color === c ? "border-ink-900" : "border-transparent"}`} style={{ background: c }} aria-label={c} />
              ))}
            </span>
            <button onClick={saveType} className="p-1.5 rounded-md bg-brand-600 text-white" aria-label="ذخیره">
              <Check size={13} />
            </button>
            <button onClick={() => setEditType(null)} className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100" aria-label="انصراف">
              <X size={13} />
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {km.docTypes.map((t) => (
            <span key={t.id} className="group inline-flex items-center gap-1.5 text-xs border border-ink-200 rounded-md pr-2 pl-1 py-1">
              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              {t.name}
              <span className="text-[10.5px] text-ink-400">({fa(km.docs.filter((d) => d.type === t.name).length)})</span>
              <button onClick={() => setEditType({ ...t })} className="text-ink-300 hover:text-brand-600" aria-label={`ویرایش ${t.name}`}>
                <Pencil size={11} />
              </button>
              <button onClick={() => confirm({ title: `حذف نوع «${t.name}»؟`, message: "اسناد موجود با همین نوع باقی می‌مانند.", onConfirm: () => km.deleteDocType(t.id) })} className="text-ink-300 hover:text-rose-600" aria-label={`حذف ${t.name}`}>
                <Trash2 size={11} />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TaxonomyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="دسته‌بندی‌ها و انواع سند" description="ساخت، ویرایش و حذف دسته‌بندی سلسله‌مراتبی و انواع سند مخزن دانش" width="max-w-4xl">
      <TaxonomyManager />
    </Modal>
  );
}
