import { BrandLeaf } from "../components/ui/brand-leaf";

// نشان برند: لوگوی تصویری، یا حروف اول نام روی رنگ برند؛ اگر نه لوگو و نه نامی باشد
// (واحد بدون برند و بدون برند سازمانِ بالادست) نشان پیش‌فرض محصول «کاریز» (برگ v6.8) — ۴.۱۱.
export function BrandMark({ logo, initials, color, size = 36 }: { logo: string; initials: string; color: string; size?: number }) {
  if (logo)
    return (
      <span className="rounded-lg bg-white flex items-center justify-center px-1.5 shrink-0" style={{ height: size }}>
        <img src={logo} alt="" className="w-auto" style={{ height: size - 8 }} />
      </span>
    );
  if (!initials.trim())
    return (
      <span className="rounded-lg flex items-center justify-center shrink-0 bg-navy-700 text-teal-300" style={{ height: size, width: size }} aria-label="کاریز">
        <BrandLeaf width={Math.round(size * 0.72)} />
      </span>
    );
  return (
    <span className="rounded-lg flex items-center justify-center shrink-0 text-white font-black text-[13px]" style={{ height: size, width: size, background: color }}>
      {initials}
    </span>
  );
}
