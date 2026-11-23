import type { LucideIcon, LucideProps } from "lucide-react";
import { LucideProvider } from "lucide-react";
import type { ReactNode } from "react";

/** اندازه‌های آیکون v6.8: md ۲۴ · sm ۲۰ · lg ۳۲ · xl ۴۸ */
const sizes = { xs: 16, sm: 20, md: 24, lg: 32, xl: 48 } as const;
export type IconSize = keyof typeof sizes;

/** ضخامت خط پیش‌فرض v6.8 (آیتم انتخاب‌شده‌ی منو ۲٫۲۵) */
export const ICON_STROKE = 1.5;
export const ICON_STROKE_ACTIVE = 2.25;

/**
 * پوشش نازک روی آیکون‌های Lucide با اندازه و ضخامت خط v6.8.
 * `<Icon icon={Users} size="sm" active />`
 */
export default function Icon({
  icon: Cmp,
  size = "md",
  active,
  strokeWidth,
  ...rest
}: Omit<LucideProps, "size" | "ref"> & { icon: LucideIcon; size?: IconSize | number; active?: boolean }) {
  return (
    <Cmp
      size={typeof size === "number" ? size : sizes[size]}
      strokeWidth={strokeWidth ?? (active ? ICON_STROKE_ACTIVE : ICON_STROKE)}
      aria-hidden={rest["aria-label"] ? undefined : true}
      {...rest}
    />
  );
}

/** پیش‌فرض سراسری ضخامت خط برای همه‌ی آیکون‌های Lucide زیر این درخت */
export function IconDefaults({ children }: { children: ReactNode }) {
  return <LucideProvider strokeWidth={ICON_STROKE}>{children}</LucideProvider>;
}
