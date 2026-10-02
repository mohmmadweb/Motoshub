// نشان برند: لوگوی تصویری یا (اگر لوگو خالی باشد) حروف اول نام روی رنگ برند.
export function BrandMark({ logo, initials, color, size = 36 }: { logo: string; initials: string; color: string; size?: number }) {
  if (logo)
    return (
      <span className="rounded-lg bg-white flex items-center justify-center px-1.5 shrink-0" style={{ height: size }}>
        <img src={logo} alt="" className="w-auto" style={{ height: size - 8 }} />
      </span>
    );
  return (
    <span className="rounded-lg flex items-center justify-center shrink-0 text-white font-black text-[13px]" style={{ height: size, width: size, background: color }}>
      {initials}
    </span>
  );
}
