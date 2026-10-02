// برجسته‌سازی واژه‌های جستجو با نرمال‌سازی فارسی (ی/ي، ک/ك، نیم‌فاصله، ارقام)
import { Fragment } from "react";
import { matchRanges } from "../../km/text";

export default function Highlight({ text, terms, className = "" }: { text: string; terms: string[]; className?: string }) {
  const ranges = matchRanges(text, terms);
  if (!ranges.length) return <span className={className}>{text}</span>;
  const out: (string | { m: string })[] = [];
  let i = 0;
  ranges.forEach(([a, b]) => {
    if (a > i) out.push(text.slice(i, a));
    out.push({ m: text.slice(a, b) });
    i = b;
  });
  if (i < text.length) out.push(text.slice(i));
  return (
    <span className={className}>
      {out.map((p, k) =>
        typeof p === "string" ? (
          <Fragment key={k}>{p}</Fragment>
        ) : (
          <mark key={k} className="bg-amber-300/40 text-inherit rounded-sm px-0.5">
            {p.m}
          </mark>
        )
      )}
    </span>
  );
}
