import { Bug, BookOpen, CheckSquare, CornerDownLeft, Zap } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";
import { typeLabel } from "../../pm/selectors";
import type { PMTask, TaskType } from "../../pm/types";

/** رنگ و آیکون هر نوع کار — هم‌خوان با Jira (باگ قرمز، داستان سبز، اپیک بنفش) */
export const typeMeta: Record<TaskType, { icon: typeof Bug; color: string }> = {
  task: { icon: CheckSquare, color: "#2563eb" },
  bug: { icon: Bug, color: "#e11d48" },
  story: { icon: BookOpen, color: "#059669" },
  epic: { icon: Zap, color: "#7c3aed" },
  subtask: { icon: CornerDownLeft, color: "#64748b" },
};
export const taskTypes: TaskType[] = ["task", "bug", "story", "epic", "subtask"];

export function TypeIcon({ type, size = 12 }: { type?: TaskType; size?: number }) {
  const m = typeMeta[type ?? "task"];
  const I = m.icon;
  return (
    <span title={typeLabel[type ?? "task"]} aria-label={typeLabel[type ?? "task"]} className="inline-flex items-center justify-center shrink-0 rounded" style={{ color: m.color }}>
      <I size={size} />
    </span>
  );
}

/** کلید تسک (مثل QGJ-12) با فونت ثابت؛ کلیک = کپی لینک مستقیم */
export function TaskKey({ t, pid, copy = false, className = "" }: { t: PMTask; pid?: string; copy?: boolean; className?: string }) {
  const { notify } = useToast();
  if (!t.key) return null;
  const cls = `font-mono text-[10.5px] text-ink-400 tracking-tight whitespace-nowrap ${className}`;
  if (!copy || !pid) return <span dir="ltr" className={cls}>{t.key}</span>;
  return (
    <button
      type="button"
      dir="ltr"
      title="کپی لینک مستقیم تسک"
      onClick={(e) => {
        e.stopPropagation();
        const url = `${location.origin}${location.pathname}#/dashboard/projects/${pid}?tab=board&focus=${t.key}`;
        navigator.clipboard?.writeText(url).then(
          () => notify(`لینک ${t.key} کپی شد.`, "info"),
          () => notify(url, "info")
        );
      }}
      className={`${cls} hover:text-brand-700 hover:underline`}
    >
      {t.key}
    </button>
  );
}
