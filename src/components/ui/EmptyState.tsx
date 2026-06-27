import type { ReactNode } from "react";

export default function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center gap-2">
      {icon && <span className="w-12 h-12 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mb-1">{icon}</span>}
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && <p className="text-xs text-ink-400 max-w-sm">{description}</p>}
    </div>
  );
}
