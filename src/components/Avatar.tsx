import type { PresenceStatus } from "../data/mock";

type Props = {
  name: string;
  /** رنگ شخصی کاربر — فقط وقتی `colored` باشد استفاده می‌شود (پیش‌فرض v6.8: زمینه‌ی accent) */
  color?: string;
  colored?: boolean;
  size?: number;
  online?: boolean;
  status?: PresenceStatus;
  className?: string;
};

const statusColor: Record<PresenceStatus, string> = {
  online: "bg-emerald-600",
  away: "bg-amber-500",
  dnd: "bg-rose-600",
  offline: "bg-ink-300",
};

/** آواتار v6.8: دایره‌ی ۳۶px با زمینه‌ی teal-50 و حرف اول ۷۰۰ (xs ۲۴ · lg ۷۲) */
export default function Avatar({ name, color, colored, size = 36, online, status, className = "" }: Props) {
  const initials = name.trim().slice(0, 1);
  const dotClass = status ? statusColor[status] : online ? "bg-emerald-600" : "bg-ink-300";
  const custom = colored && color;
  const dot = Math.max(8, Math.round(size * 0.28));

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <span
        className={`flex items-center justify-center w-full h-full rounded-full font-bold leading-none select-none ${
          custom ? "text-white" : "bg-teal-50 text-teal-700"
        }`}
        style={{ backgroundColor: custom ? color : undefined, fontSize: Math.max(10, Math.round(size * 0.38)) }}
        aria-hidden
      >
        {initials}
      </span>
      {(online !== undefined || status) && (
        <span
          className={`absolute bottom-0 left-0 rounded-full border-2 border-[var(--color-card)] ${dotClass}`}
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  );
}

/** پشته‌ی آواتارها با هم‌پوشانی −۸px و حلقه‌ی ۲px هم‌رنگ کارت؛ مازاد به‌صورت «+n» */
export function AvatarStack({ people, max = 4, size = 28 }: { people: { name: string; color?: string }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="inline-flex items-center" aria-label={people.map((p) => p.name).join("، ")}>
      {shown.map((p, i) => (
        <span key={`${p.name}-${i}`} className={`rounded-full ring-2 ring-[var(--color-card)] ${i > 0 ? "-ms-2" : ""}`}>
          <Avatar name={p.name} color={p.color} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="-ms-2 rounded-full ring-2 ring-[var(--color-card)] bg-ink-100 text-ink-600 text-xs font-bold inline-flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          +{extra.toLocaleString("fa-IR")}
        </span>
      )}
    </span>
  );
}
