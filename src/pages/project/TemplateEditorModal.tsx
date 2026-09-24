import { useEffect, useState } from "react";
import { Plus, X, Wand2, ArrowUp, ArrowDown } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { defaultColumns } from "../../pm/seed";
import { fa } from "../../pm/jalali";
import type { ProjectTemplate } from "../../pm/templates";
import type { PMPriority } from "../../pm/types";
import { numIn, priorities } from "./shared";

type Row = ProjectTemplate["tasks"][number] & { preds: string[] };
type MsRow = ProjectTemplate["milestones"][number];

const split = (s: string) => s.split(/[،,]/).map((x) => x.trim()).filter(Boolean);
let keySeq = 0;
const newKey = () => `k${Date.now().toString(36)}${keySeq++}`;

/** ساخت/ویرایش قالب پروژه: تسک‌ها با مدت، نقش و پیش‌نیاز + مایل‌ستون‌ها */
export default function TemplateEditorModal({ template, onClose }: { template: ProjectTemplate | "new" | null; onClose: () => void }) {
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [labels, setLabels] = useState("");
  const [roles, setRoles] = useState("");
  const [lines, setLines] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [ms, setMs] = useState<MsRow[]>([]);

  useEffect(() => {
    if (!template) return;
    const t = template === "new" ? null : template;
    setName(t?.name ?? "");
    setDescription(t?.description ?? "");
    setLabels((t?.labels ?? ["طراحی", "توسعه", "مستندات"]).join("، "));
    setRoles((t?.roles ?? ["مدیر پروژه"]).join("، "));
    setLines((t?.budgetLines ?? ["نیروی انسانی", "تجهیزات", "سایر"]).join("، "));
    setRows(t ? t.tasks.map((x) => ({ ...x, preds: t.deps.filter(([, b]) => b === x.key).map(([a]) => a) })) : [{ key: newKey(), title: "", offset: 0, duration: 5, priority: "متوسط", labels: [], hours: 0, preds: [] }]);
    setMs(t ? structuredClone(t.milestones) : []);
  }, [template]);

  const roleList = split(roles);
  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const removeRow = (i: number) => {
    const k = rows[i].key;
    setRows((r) => r.filter((_, j) => j !== i).map((x) => ({ ...x, preds: x.preds.filter((p) => p !== k) })));
    setMs((m) => m.map((x) => ({ ...x, tasks: x.tasks.filter((t) => t !== k) })));
  };
  const moveRow = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const c = [...r];
      const j = i + d;
      if (j < 0 || j >= c.length) return r;
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  /** زمان‌بندی خودکار: شروع هر تسک = بیشترین پایان پیش‌نیازهایش */
  const autoSchedule = () => {
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const start = new Map<string, number>();
    const visit = (k: string, trail: Set<string>): number => {
      if (start.has(k)) return start.get(k)!;
      if (trail.has(k)) return 0;
      trail.add(k);
      const r = byKey.get(k)!;
      const s = r.preds.length ? Math.max(...r.preds.filter((p) => byKey.has(p)).map((p) => visit(p, trail) + byKey.get(p)!.duration), 0) : 0;
      start.set(k, s);
      return s;
    };
    rows.forEach((r) => visit(r.key, new Set()));
    setRows((rs) => rs.map((r) => ({ ...r, offset: start.get(r.key) ?? r.offset })));
    notify("شروع هر تسک از روی پیش‌نیازهایش محاسبه شد.", "info");
  };

  const hasCycle = () => {
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const state = new Map<string, number>();
    const dfs = (k: string): boolean => {
      state.set(k, 1);
      for (const p of byKey.get(k)?.preds ?? []) {
        if (state.get(p) === 1) return true;
        if (!state.get(p) && dfs(p)) return true;
      }
      state.set(k, 2);
      return false;
    };
    return rows.some((r) => !state.get(r.key) && dfs(r.key));
  };

  const save = () => {
    if (!name.trim()) return notify("نام قالب الزامی است.", "warning");
    const tasks = rows.filter((r) => r.title.trim());
    if (!tasks.length) return notify("حداقل یک تسک با عنوان وارد کنید.", "warning");
    if (hasCycle()) return notify("وابستگی‌ها حلقه دارند (تسکی به خودش برمی‌گردد).", "warning");
    const keys = new Set(tasks.map((t) => t.key));
    const tpl: ProjectTemplate = {
      id: template && template !== "new" ? template.id : `ptpl-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      columns: template && template !== "new" ? template.columns : defaultColumns(),
      labels: split(labels),
      roles: roleList,
      budgetLines: split(lines),
      tasks: tasks.map(({ preds: _preds, ...t }) => ({ ...t, title: t.title.trim() })),
      deps: tasks.flatMap((t) => t.preds.filter((p) => keys.has(p)).map((p) => [p, t.key] as [string, string])),
      milestones: ms.filter((m) => m.title.trim()).map((m) => ({ ...m, tasks: m.tasks.filter((k) => keys.has(k)) })),
    };
    pm.saveProjectTemplate(tpl);
    notify(template === "new" ? `قالب «${tpl.name}» ساخته شد.` : `قالب «${tpl.name}» ذخیره شد.`);
    onClose();
  };

  const titleOf = (k: string) => rows.find((r) => r.key === k)?.title || "(بی‌عنوان)";
  const span = Math.max(0, ...rows.map((r) => r.offset + r.duration));

  return (
    <Modal open={!!template} onClose={onClose} title={template === "new" ? "قالب پروژه‌ی جدید" : "ویرایش قالب پروژه"} description="تسک‌ها بر حسب «روز از شروع پروژه» تعریف می‌شوند؛ هنگام ساخت پروژه، تاریخ‌ها از تاریخ شروع پروژه محاسبه و تسک‌ها بر اساس نقش به اعضا واگذار می‌شوند." width="max-w-5xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام قالب</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: استقرار سامانه در یک هلدینگ" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">توضیح</label>
            <input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نقش‌ها (با ، جدا کنید)</label>
            <input className="input-field" value={roles} onChange={(e) => setRoles(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">برچسب‌ها</label>
            <input className="input-field" value={labels} onChange={(e) => setLabels(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-ink-600 block mb-1.5">سرفصل‌های بودجه</label>
            <input className="input-field" value={lines} onChange={(e) => setLines(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-ink-700">
              تسک‌ها ({fa(rows.length)}) · طول کل: {fa(span)} روز
            </p>
            <Button size="sm" variant="ghost" icon={<Wand2 size={13} />} onClick={autoSchedule}>
              زمان‌بندی خودکار از روی وابستگی‌ها
            </Button>
          </div>
          <div className="border border-ink-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="bg-ink-50 text-ink-500">
                <tr className="text-right">
                  <th className="p-2 font-medium w-8" />
                  <th className="p-2 font-medium">عنوان تسک</th>
                  <th className="p-2 font-medium w-28">نقش مسئول</th>
                  <th className="p-2 font-medium w-20">شروع (روز)</th>
                  <th className="p-2 font-medium w-20">مدت (روز)</th>
                  <th className="p-2 font-medium w-24">اولویت</th>
                  <th className="p-2 font-medium w-16">ساعت</th>
                  <th className="p-2 font-medium w-64">پیش‌نیازها</th>
                  <th className="p-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="border-t border-ink-100 align-top">
                    <td className="p-1.5">
                      <div className="flex flex-col">
                        <button onClick={() => moveRow(i, -1)} className="text-ink-300 hover:text-ink-700" aria-label="بالا">
                          <ArrowUp size={12} />
                        </button>
                        <button onClick={() => moveRow(i, 1)} className="text-ink-300 hover:text-ink-700" aria-label="پایین">
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="p-1.5">
                      <input className="input-field !py-1 !text-xs" value={r.title} onChange={(e) => setRow(i, { title: e.target.value })} placeholder="عنوان تسک" />
                    </td>
                    <td className="p-1.5">
                      <select className="input-field !py-1 !text-xs" value={r.role ?? ""} onChange={(e) => setRow(i, { role: e.target.value || undefined })}>
                        <option value="">مدیر پروژه</option>
                        {roleList.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input className="input-field !py-1 !text-xs" inputMode="numeric" value={fa(r.offset)} onChange={(e) => setRow(i, { offset: numIn(e.target.value) })} />
                    </td>
                    <td className="p-1.5">
                      <input className="input-field !py-1 !text-xs" inputMode="numeric" value={fa(r.duration)} onChange={(e) => setRow(i, { duration: Math.max(1, numIn(e.target.value)) })} />
                    </td>
                    <td className="p-1.5">
                      <select className="input-field !py-1 !text-xs" value={r.priority} onChange={(e) => setRow(i, { priority: e.target.value as PMPriority })}>
                        {priorities.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input className="input-field !py-1 !text-xs" inputMode="numeric" value={fa(r.hours)} onChange={(e) => setRow(i, { hours: numIn(e.target.value) })} />
                    </td>
                    <td className="p-1.5">
                      <div className="flex flex-wrap gap-1 items-center">
                        {r.preds.map((k) => (
                          <span key={k} className="inline-flex items-center gap-0.5 bg-brand-50 text-brand-700 rounded px-1.5 py-0.5 text-[10.5px]">
                            {titleOf(k)}
                            <button onClick={() => setRow(i, { preds: r.preds.filter((x) => x !== k) })} aria-label="حذف پیش‌نیاز">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        <select className="text-[11px] border border-dashed border-ink-300 rounded px-1 py-0.5 bg-transparent text-ink-500" value="" onChange={(e) => e.target.value && setRow(i, { preds: [...r.preds, e.target.value] })} aria-label="افزودن پیش‌نیاز">
                          <option value="">+ پیش‌نیاز</option>
                          {rows
                            .filter((x) => x.key !== r.key && !r.preds.includes(x.key))
                            .map((x) => (
                              <option key={x.key} value={x.key}>
                                {x.title || "(بی‌عنوان)"}
                              </option>
                            ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-1.5">
                      <button onClick={() => removeRow(i)} className="text-ink-300 hover:text-rose-600" aria-label="حذف تسک">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} className="mt-2" onClick={() => setRows((r) => [...r, { key: newKey(), title: "", offset: span, duration: 5, priority: "متوسط", labels: [], hours: 0, preds: r.length ? [r[r.length - 1].key] : [] }])}>
            افزودن تسک
          </Button>
        </div>

        <div>
          <p className="text-xs font-bold text-ink-700 mb-2">مایل‌ستون‌ها</p>
          <div className="space-y-2">
            {ms.map((m, i) => (
              <div key={i} className="flex gap-2 flex-wrap items-center">
                <input className="input-field !py-1 !text-xs flex-1 min-w-[180px]" value={m.title} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="عنوان مایل‌ستون" />
                <span className="text-[11px] text-ink-500">روز</span>
                <input className="input-field !py-1 !text-xs !w-16" value={fa(m.offset)} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, offset: numIn(e.target.value) } : x)))} />
                <div className="flex flex-wrap gap-1 items-center">
                  {m.tasks.map((k) => (
                    <span key={k} className="inline-flex items-center gap-0.5 bg-ink-100 rounded px-1.5 py-0.5 text-[10.5px]">
                      {titleOf(k)}
                      <button onClick={() => setMs(ms.map((x, j) => (j === i ? { ...x, tasks: x.tasks.filter((t) => t !== k) } : x)))} aria-label="حذف">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <select className="text-[11px] border border-dashed border-ink-300 rounded px-1 py-0.5 bg-transparent text-ink-500" value="" onChange={(e) => e.target.value && setMs(ms.map((x, j) => (j === i ? { ...x, tasks: [...x.tasks, e.target.value] } : x)))} aria-label="افزودن تسک به مایل‌ستون">
                    <option value="">+ تسک</option>
                    {rows.filter((x) => !m.tasks.includes(x.key)).map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.title || "(بی‌عنوان)"}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={() => setMs(ms.filter((_, j) => j !== i))} className="text-ink-300 hover:text-rose-600" aria-label="حذف مایل‌ستون">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} className="mt-2" onClick={() => setMs([...ms, { title: "", offset: span, tasks: [] }])}>
            افزودن مایل‌ستون
          </Button>
        </div>

        <div className="flex gap-2 pt-3 border-t border-ink-100">
          <Button variant="primary" className="flex-1 justify-center" onClick={save}>
            {template === "new" ? "ساخت قالب" : "ذخیره‌ی قالب"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
}
