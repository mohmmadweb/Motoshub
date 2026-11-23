import type { ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert, CircleAlert } from "lucide-react";

export type NoteTone = "info" | "success" | "warning" | "danger";

const tones: Record<NoteTone, { box: string; icon: typeof Info }> = {
  info: { box: "bg-info-soft border-info/40 text-info-fg", icon: Info },
  success: { box: "bg-emerald-50 border-emerald-600/40 text-emerald-700", icon: CircleCheck },
  warning: { box: "bg-amber-50 border-amber-600/40 text-amber-700", icon: TriangleAlert },
  danger: { box: "bg-rose-50 border-rose-600/40 text-rose-700", icon: CircleAlert },
};

/** یادداشت/هشدار درون‌خطی (v6.8 `.note`): گوشه‌ی ۱۰، حاشیه‌ی رنگ وضعیت روی زمینه‌ی کم‌رنگ */
export default function Note({
  tone = "info",
  title,
  children,
  icon,
  actions,
  className = "",
}: {
  tone?: NoteTone;
  title?: ReactNode;
  children?: ReactNode;
  /** `false` = بدون آیکون */
  icon?: ReactNode | false;
  actions?: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  const I = t.icon;
  return (
    <div className={`flex items-start gap-3 px-3.5 py-3 rounded-[10px] border text-sm leading-6 ${t.box} ${className}`} role={tone === "danger" || tone === "warning" ? "alert" : "note"}>
      {icon !== false && <span className="shrink-0 mt-0.5">{icon ?? <I size={20} strokeWidth={1.5} />}</span>}
      <div className="flex-1 min-w-0">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
