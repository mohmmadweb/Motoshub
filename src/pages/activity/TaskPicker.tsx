// انتخاب‌گر «تسک» فرم ثبت زمان: فقط تسک‌های واگذارشده به کاربر در پروژه‌ها (به تفکیک پروژه)
// و تسک‌های شخصی خودش؛ ساخت تسک شخصی همین‌جا با «+ تسک شخصی».
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus } from "lucide-react";
import { isPersonalTaskId } from "../../timesheet/types";
import { useTs } from "./lib";

/** نشان کوچک «شخصی» — در انتخاب‌گر و ردیف‌های ثبت */
export const PersonalTag = () => (
  <span className="shrink-0 rounded px-1 py-px text-[10px] leading-4 font-bold" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
    شخصی
  </span>
);

export default function TaskPicker({
  value,
  projectId,
  onChange,
  disabled,
  className = "",
}: {
  value: string;
  /** اگر پروژه انتخاب شده باشد فقط تسک‌های همان پروژه (به‌همراه تسک‌های شخصی) نشان داده می‌شود */
  projectId?: string;
  onChange: (taskId: string, projectId: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { ts, me, myTasks, myPersonalTasks, taskTitle, projectName } = useTs();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pos, setPos] = useState<{ top: number; right: number; width: number; maxH: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  const groups = projectId ? myTasks.filter((g) => g.projectId === projectId) : myTasks;
  const personal = isPersonalTaskId(value);
  const label = value ? taskTitle(projectId, value) ?? (personal ? "تسک شخصی حذف‌شده" : "تسک خارج از فهرست") : "";

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(Math.max(r.width, 280), window.innerWidth - 16);
    const right = Math.max(8, Math.min(window.innerWidth - r.right, window.innerWidth - width - 8));
    const below = window.innerHeight - r.bottom - 12;
    setPos({ top: r.bottom + 4, right, width, maxH: Math.max(180, Math.min(320, below)) });
  };
  useLayoutEffect(() => {
    if (open) place();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), setOpen(false));
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) {
      setAdding(false);
      setTitle("");
    }
  }, [open]);

  const pick = (taskId: string, pid: string | undefined) => {
    onChange(taskId, pid);
    setOpen(false);
  };
  const create = () => {
    const t = title.trim();
    if (!t) return;
    const id = ts.addPersonalTask(me.id, t);
    pick(id, undefined);
  };

  const Item = ({ id, text, pid, own }: { id: string; text: string; pid?: string; own?: boolean }) => (
    <button
      type="button"
      role="option"
      aria-selected={value === id}
      onClick={() => pick(id, pid)}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-right text-[13px] hover:bg-ink-50 ${value === id ? "text-brand-700" : "text-ink-800"}`}
    >
      <span className="truncate flex-1">{text}</span>
      {own && <PersonalTag />}
      {value === id && <Check size={13} className="shrink-0" />}
    </button>
  );

  return (
    <>
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="تسک"
        className={`input-field flex items-center gap-1.5 text-right disabled:opacity-50 ${className}`}
      >
        <span className={`truncate flex-1 ${label ? "text-ink-800" : "text-ink-400"}`}>{label || "تسک (اختیاری)"}</span>
        {personal && <PersonalTag />}
        <ChevronDown size={14} className="text-ink-400 shrink-0" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={pop}
            dir="rtl"
            role="listbox"
            className="fixed z-[70] bg-white border border-ink-200 rounded-lg shadow-xl flex flex-col"
            style={{ top: pos.top, right: pos.right, width: pos.width, maxHeight: pos.maxH }}
          >
            <div className="overflow-y-auto py-1">
              <button type="button" onClick={() => pick("", projectId)} className="w-full px-3 py-1.5 text-right text-[13px] text-ink-500 hover:bg-ink-50">
                بدون تسک
              </button>
              {groups.map((g) => (
                <div key={g.projectId}>
                  <p className="px-3 pt-2 pb-0.5 text-[11px] font-bold text-ink-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.color }} />
                    <span className="truncate">{g.projectName}</span>
                  </p>
                  {g.tasks.map((t) => (
                    <Item key={t.id} id={t.id} text={t.title} pid={g.projectId} />
                  ))}
                </div>
              ))}
              {!groups.length && <p className="px-3 py-1.5 text-[11px] text-ink-400">{projectId ? `در «${projectName(projectId)}» تسکی به شما واگذار نشده است.` : "تسکی در پروژه‌ها به شما واگذار نشده است."}</p>}
              <p className="px-3 pt-2 pb-0.5 text-[11px] font-bold text-violet-500">تسک‌های شخصی</p>
              {myPersonalTasks.map((t) => (
                <Item key={t.id} id={t.id} text={t.title} own />
              ))}
            </div>
            <div className="border-t border-ink-100 p-2">
              {adding ? (
                <div className="flex items-center gap-1.5">
                  <input
                    className="input-field !py-1 !text-xs flex-1 min-w-0"
                    placeholder="عنوان تسک شخصی"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        create();
                      }
                    }}
                    autoFocus
                  />
                  <button type="button" onClick={create} disabled={!title.trim()} className="shrink-0 rounded-md bg-brand-600 text-white text-xs px-2.5 py-1 disabled:opacity-50">
                    افزودن
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="w-full flex items-center gap-1 text-xs text-violet-500 hover:underline">
                  <Plus size={13} /> تسک شخصی
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
