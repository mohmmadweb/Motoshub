import type { ReactNode, KeyboardEvent } from "react";
import { Link } from "react-router-dom";

/** برچسب‌های اولویت واقعی کار (Task.Priority) و هم‌ارزهای v6.8 */
export type RowPriority = "زیاد" | "متوسط" | "کم" | "high" | "medium" | "low";

const priorityBar: Record<RowPriority, string> = {
  زیاد: "bg-rose-600",
  high: "bg-rose-600",
  متوسط: "bg-amber-500",
  medium: "bg-amber-500",
  کم: "bg-emerald-600",
  low: "bg-emerald-600",
};

/**
 * ردیف فهرست v6.8 (`.li`): فاصله‌ی ۱۲، padding ۱۲/۱۴، خط زیرین، hover کم‌رنگ؛
 * خط بالایی نشان‌ها + موعد، عنوان ۵۰۰، زیرعنوان ۱۲٫۵ کم‌رنگ، اقدام‌ها در سمت دیگر؛
 * نوار ۴px اولویت در ابتدای ردیف؛ ردیف خوانده‌نشده با ته‌رنگ accent.
 */
export default function ListRow({
  title,
  subtitle,
  badges,
  due,
  lead,
  actions,
  priority,
  unread,
  href,
  onClick,
  selected,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** خط بالایی: نشان‌ها (Badge) */
  badges?: ReactNode;
  /** متن موعد/زمان کنار نشان‌ها */
  due?: ReactNode;
  /** کاشی ابتدای ردیف: آواتار، ListRowTime، ListRowDate، ListRowThumb */
  lead?: ReactNode;
  actions?: ReactNode;
  priority?: RowPriority;
  unread?: boolean;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  const clickable = !!(href || onClick);
  const cls = `relative flex items-center gap-3 px-3.5 py-3 border-b border-[var(--color-border)] last:border-b-0 transition-colors ${
    unread ? "bg-teal-50/45" : ""
  } ${selected ? "bg-teal-50" : ""} ${clickable ? "hover:bg-ink-50 cursor-pointer" : ""} ${priority ? "ps-4" : ""} ${className}`;

  const body = (
    <>
      {priority && <span className={`absolute inset-y-0 start-0 w-1 ${priorityBar[priority]}`} aria-label={`اولویت ${priority}`} />}
      {lead && <span className="shrink-0">{lead}</span>}
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        {(badges || due) && (
          <span className="flex items-center gap-1.5 flex-wrap">
            {badges}
            {due && <span className="text-xs text-ink-500">{due}</span>}
          </span>
        )}
        <b className={`text-[15px] leading-6 text-ink-900 break-words ${unread ? "font-bold" : "font-medium"}`}>{title}</b>
        {subtitle && <small className="text-[12.5px] leading-5 text-ink-500">{subtitle}</small>}
      </span>
    </>
  );

  // اقدام‌ها خارج از ناحیه‌ی کلیک ردیف تا کلیکشان ردیف را باز نکند
  const acts = actions && (
    <span className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {actions}
    </span>
  );

  if (href) {
    return (
      <div className={cls}>
        <Link to={href} className="flex-1 min-w-0 flex items-center gap-3 after:absolute after:inset-0 after:content-['']">
          {body}
        </Link>
        {acts && <span className="relative z-[1]">{acts}</span>}
      </div>
    );
  }
  return (
    <div
      className={cls}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) : undefined}
    >
      {body}
      {acts}
    </div>
  );
}

/** کاشی زمان ۶۴px (جلسه/رویداد): ساعت شروع + پایان */
export function ListRowTime({ start, end }: { start: string; end?: string }) {
  return (
    <span className="w-16 py-1.5 rounded-[10px] bg-teal-50 text-teal-700 flex flex-col items-center leading-5">
      <b className="text-sm font-bold">{start}</b>
      {end && <small className="text-xs opacity-80">تا {end}</small>}
    </span>
  );
}

/** کاشی تاریخ ۵۲px: روز ۲۰/۲۸ + ماه ۱۲ */
export function ListRowDate({ day, month }: { day: string | number; month: string }) {
  return (
    <span className="w-[52px] h-[52px] rounded-[10px] bg-ink-100 text-ink-800 flex flex-col items-center justify-center">
      <b className="text-xl leading-7 font-bold">{typeof day === "number" ? day.toLocaleString("fa-IR") : day}</b>
      <small className="text-xs leading-4 text-ink-500">{month}</small>
    </span>
  );
}

/** تصویر کوچک ۵۲×۵۲ با گوشه‌ی ۱۰ */
export function ListRowThumb({ src, alt = "" }: { src: string; alt?: string }) {
  return <img src={src} alt={alt} loading="lazy" className="w-[52px] h-[52px] rounded-[10px] object-cover bg-ink-100" />;
}

/** ظرف فهرست (کارت بدون padding) */
export function List({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card overflow-hidden ${className}`}>{children}</div>;
}
