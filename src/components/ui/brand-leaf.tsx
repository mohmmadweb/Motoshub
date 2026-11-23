import type { CSSProperties } from "react";

/** مسیر «برگ» نشان کاریز (نماد leafT نمونه‌ی v6.8) */
const LEAF_PATH =
  "M100.084 97.7476C90.8029 99.8555 69.9943 98.051 58.7164 93.8831C47.4386 89.7152 37.6712 80.6284 37.6712 80.6284C37.6712 80.6284 43.3877 71.5519 53.2481 68.2496C63.1084 64.9474 81.0946 72.5353 95.455 68.0359C109.815 63.5366 119.156 53.282 129.58 50.9143C140.004 48.5466 151.329 54.8148 151.329 54.8148C138.101 68.1921 125.754 91.9171 100.084 97.7476Z";

/** یک برگ؛ رنگ از currentColor */
export function BrandLeaf({ className = "", style, width = 117 }: { className?: string; style?: CSSProperties; width?: number }) {
  return (
    <svg viewBox="36 49 117 51" width={width} height={(width * 51) / 117} className={className} style={style} aria-hidden focusable="false">
      <path d={LEAF_PATH} fill="currentColor" />
    </svg>
  );
}

/** سه برگ شناور پشت کاشی حالت خالی (primary ۱۴٪ / accent ۳۸٪) */
export function EmptyLeaves() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <BrandLeaf width={92} className="absolute text-brand-600 opacity-[0.14] -translate-x-10 -translate-y-6 -rotate-12" />
      <BrandLeaf width={64} className="absolute text-teal-500 opacity-[0.38] translate-x-12 -translate-y-2 rotate-[160deg]" />
      <BrandLeaf width={48} className="absolute text-brand-600 opacity-[0.14] translate-x-4 translate-y-9 rotate-6" />
    </span>
  );
}

/** برگ‌ها و هاله‌های قهرمان «امروز» (سفید ۹٪ / teal-300 ۳۸٪) */
export function HeroLeaves() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="hero-glow w-56 h-56 -top-16 end-[18%]" />
      <span className="hero-glow w-44 h-44 -bottom-20 start-[30%] [animation-delay:-6s]" />
      <span className="hero-glow w-32 h-32 top-6 start-[6%] [animation-delay:-11s]" />
      <BrandLeaf width={360} className="hero-leaf text-white opacity-[0.09] -bottom-10 -start-16" style={{ ["--r" as string]: "-8deg" }} />
      <BrandLeaf width={220} className="hero-leaf text-teal-300 opacity-[0.38] -top-12 start-[34%] [animation-delay:-5s]" style={{ ["--r" as string]: "164deg" }} />
      <BrandLeaf width={150} className="hero-leaf text-white opacity-[0.09] bottom-4 end-[42%] [animation-delay:-9s]" style={{ ["--r" as string]: "12deg" }} />
    </span>
  );
}
