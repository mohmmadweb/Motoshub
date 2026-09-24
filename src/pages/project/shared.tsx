import { createContext, useContext, type ReactNode } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import type { BadgeTone } from "../../components/ui/Badge";
import type { ProjectState, PMPriority, PMTask } from "../../pm/types";
import { isOverdue, isWaiting, kindOf } from "../../pm/selectors";
import { fa } from "../../pm/jalali";

export type TabId =
  | "overview"
  | "board"
  | "gantt"
  | "graph"
  | "calendar"
  | "milestones"
  | "budget"
  | "time"
  | "risks"
  | "issues"
  | "team"
  | "communication"
  | "minutes"
  | "documents"
  | "reports"
  | "history"
  | "notifications"
  | "playbooks"
  | "knowledge"
  | "settings";

/** تب مقصد برای هر دسته‌ی رویداد (کلیک روی لاگ یا اعلان) */
export const tabForCategory: Record<string, TabId> = {
  project: "overview",
  member: "team",
  task: "board",
  dependency: "graph",
  board: "board",
  expense: "budget",
  budget: "budget",
  risk: "risks",
  issue: "issues",
  milestone: "milestones",
  meeting: "minutes",
  document: "documents",
  communication: "communication",
  time: "time",
  playbook: "playbooks",
  automation: "notifications",
};

type PageCtx = {
  p: ProjectState;
  pid: string;
  canEdit: boolean;
  /** مدیریت پروژه (حتی وقتی بایگانی است) — برای بازیابی و حذف */
  canManage: boolean;
  /** مجوز ریز ماژول پروژه + امکان ویرایش (پروژه‌ی بایگانی‌نشده، نقش غیرمشاهده‌گر) */
  can: (perm: string) => boolean;
  /** فقط مجوز نقش (برای مشاهده) */
  hasPerm: (perm: string) => boolean;
  refDate: string;
  openTask: (taskId: string) => void;
  goTab: (tab: TabId, entityId?: string) => void;
  focusId?: string;
};

export const ProjectPageContext = createContext<PageCtx | null>(null);
export function useProjectPage() {
  const c = useContext(ProjectPageContext);
  if (!c) throw new Error("useProjectPage outside project page");
  return c;
}

export const priorityTone: Record<PMPriority, BadgeTone> = { کم: "neutral", متوسط: "warning", زیاد: "danger", بحرانی: "navy" };
export const priorities: PMPriority[] = ["کم", "متوسط", "زیاد", "بحرانی"];

export const kindTone: Record<string, BadgeTone> = { backlog: "neutral", todo: "neutral", doing: "brand", review: "warning", blocked: "danger", done: "success" };
/** رنگ نوار/گره بر اساس نوع ستون — از توکن‌ها تا در حالت تیره هم درست دیده شود */
export const kindColor: Record<string, string> = {
  backlog: "var(--color-ink-400)",
  todo: "var(--color-navy-400)",
  doing: "var(--color-brand-500)",
  review: "#d97706",
  blocked: "#e11d48",
  done: "#059669",
};

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-600 block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}

export function Progress({ value, tone = "bg-brand-500", className = "" }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={`h-1.5 rounded-full bg-ink-100 overflow-hidden ${className}`}>
      <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** نشانگرهای وضعیت تسک: منتظر پیش‌نیاز / عقب‌افتاده */
export function TaskFlags({ p, t, refDate }: { p: ProjectState; t: PMTask; refDate: string }) {
  const waiting = isWaiting(p, t);
  const late = isOverdue(p, t, refDate);
  if (!waiting && !late) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {waiting && (
        <span title="منتظر پیش‌نیاز" className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1">
          <Lock size={10} /> منتظر
        </span>
      )}
      {late && (
        <span title="از سررسید گذشته" className="inline-flex items-center gap-0.5 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-1">
          <AlertTriangle size={10} /> عقب
        </span>
      )}
    </span>
  );
}

export const memberNames = (p: ProjectState) => p.members.map((m) => m.name);

export function MemberSelect({ p, value, onChange, allowEmpty = true, className = "input-field" }: { p: ProjectState; value: string; onChange: (v: string) => void; allowEmpty?: boolean; className?: string }) {
  const names = memberNames(p);
  const extra = value && !names.includes(value) && value !== "بدون مسئول" ? [value] : [];
  return (
    <select value={value === "بدون مسئول" ? "" : value} onChange={(e) => onChange(e.target.value)} className={className}>
      {allowEmpty && <option value="">بدون مسئول</option>}
      {[...names, ...extra].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

export function TaskSelect({ p, value, onChange, exclude = [], placeholder = "انتخاب تسک" }: { p: ProjectState; value: string; onChange: (v: string) => void; exclude?: string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
      <option value="">{placeholder}</option>
      {p.tasks
        .filter((t) => !t.archived && !exclude.includes(t.id))
        .map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
    </select>
  );
}

export const taskTitle = (p: ProjectState, id?: string) => (id ? p.tasks.find((t) => t.id === id)?.title ?? "—" : "—");
export const isDoneKind = (p: ProjectState, t: PMTask) => kindOf(p, t.status) === "done";

/** عدد ورودی با ارقام فارسی/لاتین → number */
export function numIn(v: string): number {
  const en = v.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[^\d.]/g, "");
  return Number(en) || 0;
}
export const pct = (n: number) => `${fa(Math.round(n))}٪`;

/** دانلود یک فایل متنی (CSV/JSON) در مرورگر */
export function downloadText(name: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function SectionTitle({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
      <div>
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {hint && <p className="text-xs text-ink-400 mt-0.5 leading-5">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
