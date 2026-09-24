import { useRef, useState, type ReactNode } from "react";
import { Link2, Paperclip, Upload, X, FileText, Workflow, IdCard, UserRound, KanbanSquare, Lightbulb, BookA } from "lucide-react";
import { useKnowledge, type EntityKind } from "../../context/KnowledgeContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import type { KFile, KRelation, RelationType } from "../../km/types";

export type KSection =
  | "dashboard"
  | "bank"
  | "search"
  | "workflow"
  | "review"
  | "archive"
  | "registry"
  | "processes"
  | "rnd"
  | "glossary"
  | "experience"
  | "experts"
  | "projects"
  | "training"
  | "map"
  | "reports"
  | "assistant"
  | "settings";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-600 block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}

export function SectionHead({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h2 className="text-base font-bold text-ink-900 flex items-center gap-1.5">
          {icon}
          {title}
        </h2>
        {hint && <p className="text-xs text-ink-400 mt-1 leading-5 max-w-3xl">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(Math.round((b / 1024 / 1024) * 10) / 10).toLocaleString("fa-IR")} مگابایت` : `${Math.max(1, Math.round(b / 1024)).toLocaleString("fa-IR")} کیلوبایت`);

/** انتخاب چند فایل با کشیدن‌ورهاکردن یا کلیک */
export function FilePicker({ files, onChange, multiple = true }: { files: KFile[]; onChange: (f: KFile[]) => void; multiple?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const add = (list: FileList | null) => {
    if (!list) return;
    const fresh = Array.from(list).map((f, i) => ({ id: `f${Date.now()}${i}`, name: f.name, size: fmtSize(f.size), ext: f.name.split(".").pop()?.toLowerCase() ?? "" }));
    onChange(multiple ? [...files, ...fresh] : fresh.slice(0, 1));
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={`w-full border-2 border-dashed rounded-xl px-4 py-5 text-center transition-colors ${over ? "border-brand-400 bg-brand-50" : "border-ink-200 hover:border-brand-300 hover:bg-ink-50"}`}
      >
        <Upload size={20} className="mx-auto text-ink-400" />
        <p className="text-xs text-ink-600 mt-1.5">{multiple ? "فایل‌ها را اینجا رها کنید یا برای انتخاب کلیک کنید" : "فایل را اینجا رها کنید یا کلیک کنید"}</p>
        <p className="text-[11px] text-ink-400 mt-0.5">PDF، Word، Excel، تصویر و سایر فایل‌های رایج{multiple ? " — چند فایل هم‌زمان" : ""}</p>
      </button>
      <input ref={ref} type="file" multiple={multiple} className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2.5 py-1.5">
              <Paperclip size={12} className="text-ink-400" />
              <span className="flex-1 truncate text-ink-800">{f.name}</span>
              <span className="text-ink-400">{f.size}</span>
              <button type="button" onClick={() => onChange(files.filter((x) => x.id !== f.id))} className="text-ink-400 hover:text-rose-600" aria-label={`حذف ${f.name}`}>
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const relIcon: Record<RelationType, typeof FileText> = { doc: FileText, process: Workflow, registry: IdCard, expert: UserRound, project: KanbanSquare, lesson: Lightbulb, glossary: BookA };
export const relLabel: Record<RelationType, string> = { doc: "سند", process: "فرآیند", registry: "شناسنامه", expert: "خبره", project: "پروژه", lesson: "دانش/درس‌آموخته", glossary: "واژه" };

/** عنوان هر موجودیت برای نمایش رابطه */
export function useEntityTitle() {
  const km = useKnowledge();
  const pm = useProjectsPM();
  return (r: KRelation): string => {
    switch (r.type) {
      case "doc":
        return km.docs.find((x) => x.id === r.id)?.title ?? "سند حذف‌شده";
      case "process":
        return km.processes.find((x) => x.id === r.id)?.name ?? "—";
      case "registry":
        return km.registry.find((x) => x.id === r.id)?.title ?? "—";
      case "expert":
        return km.experts.find((x) => x.id === r.id)?.name ?? "—";
      case "project":
        return pm.getProject(r.id)?.meta.name ?? "پروژه";
      case "lesson":
        return km.experiences.find((x) => x.id === r.id)?.title ?? "—";
      case "glossary":
        return km.glossary.find((x) => x.id === r.id)?.term ?? "—";
    }
  };
}

/** همه‌ی گزینه‌های قابل اتصال، برای افزودن رابطه */
export function useRelationOptions() {
  const km = useKnowledge();
  const pm = useProjectsPM();
  return (type: RelationType): { id: string; title: string }[] => {
    switch (type) {
      case "doc":
        return km.docs.map((x) => ({ id: x.id, title: x.title }));
      case "process":
        return km.processes.map((x) => ({ id: x.id, title: x.name }));
      case "registry":
        return km.registry.map((x) => ({ id: x.id, title: x.title }));
      case "expert":
        return km.experts.map((x) => ({ id: x.id, title: x.name }));
      case "project":
        return pm.projects.map((x) => ({ id: x.meta.id, title: x.meta.name }));
      case "lesson":
        return km.experiences.map((x) => ({ id: x.id, title: x.title }));
      case "glossary":
        return km.glossary.map((x) => ({ id: x.id, title: x.term }));
    }
  };
}

/** نمایش و ویرایش روابط یک موجودیت با بقیه‌ی دانش‌ها (بند ۱۳) */
export function RelationsEditor({ kind, id, relations, canEdit, onOpen, exclude }: { kind: EntityKind; id: string; relations: KRelation[]; canEdit: boolean; onOpen?: (r: KRelation) => void; exclude?: RelationType[] }) {
  const km = useKnowledge();
  const title = useEntityTitle();
  const options = useRelationOptions();
  const [type, setType] = useState<RelationType>("process");
  const [target, setTarget] = useState("");
  const types = (Object.keys(relLabel) as RelationType[]).filter((t) => !(exclude ?? []).includes(t));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {relations.map((r) => {
          const Icon = relIcon[r.type];
          return (
            <span key={`${r.type}-${r.id}`} className="inline-flex items-center gap-1 text-[11.5px] bg-ink-50 border border-ink-200 rounded-md pr-2 pl-1 py-1">
              <Icon size={12} className="text-ink-400" />
              <span className="text-ink-400">{relLabel[r.type]}:</span>
              <button onClick={() => onOpen?.(r)} className="text-ink-800 hover:text-brand-700 max-w-[260px] truncate">
                {title(r)}
              </button>
              {canEdit && (
                <button onClick={() => km.removeRelation(kind, id, r)} className="text-ink-300 hover:text-rose-600" aria-label="حذف ارتباط">
                  <X size={12} />
                </button>
              )}
            </span>
          );
        })}
        {relations.length === 0 && <p className="text-[11px] text-ink-400">ارتباطی ثبت نشده است.</p>}
      </div>
      {canEdit && (
        <div className="flex gap-2 flex-wrap items-center">
          <select className="input-field !py-1.5 !text-xs !w-auto" value={type} onChange={(e) => { setType(e.target.value as RelationType); setTarget(""); }}>
            {types.map((t) => (
              <option key={t} value={t}>
                {relLabel[t]}
              </option>
            ))}
          </select>
          <select className="input-field !py-1.5 !text-xs flex-1 min-w-[180px]" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">انتخاب…</option>
            {options(type)
              .filter((o) => !(type === kind && o.id === id) && !relations.some((r) => r.type === type && r.id === o.id))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
          </select>
          <button
            onClick={() => {
              if (!target) return;
              km.addRelation(kind, id, { type, id: target });
              setTarget("");
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-ink-200 bg-white hover:bg-ink-50 flex items-center gap-1"
          >
            <Link2 size={12} /> افزودن ارتباط
          </button>
        </div>
      )}
    </div>
  );
}

/** ستاره‌های امتیاز */
export function Stars({ value, onChange, size = 14 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} ستاره`} className={`${n <= Math.round(value) ? "text-amber-500" : "text-ink-200"} ${onChange ? "hover:scale-110" : ""}`} style={{ fontSize: size, lineHeight: 1 }}>
          ★
        </button>
      ))}
    </span>
  );
}

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
