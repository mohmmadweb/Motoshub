import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { HeroLeaves } from "./brand-leaf";
import StatCard from "./StatCard";

export type HeroStat = { label: string; value: number | string; onClick?: () => void; href?: string };
export type HeroAction = { label: string; icon?: ReactNode; onClick?: () => void; solid?: boolean };

function greetingFor(h: number) {
  if (h < 12) return "صبح بخیر";
  if (h < 17) return "ظهر بخیر";
  if (h < 20) return "عصر بخیر";
  return "شب بخیر";
}

/** تایپ تدریجی متن (با کاهش حرکت: فوری) */
function useTyped(text: string, speed = 45) {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => setN((x) => (x >= text.length ? (window.clearInterval(id), x) : x + 1)), speed);
    return () => window.clearInterval(id);
  }, [text, speed, reduce]);
  return { shown: n, done: n >= text.length };
}

/**
 * قهرمان «امروز» میزکار (v6.8 `.hero-day`): گرادیان متحرک سرمه‌ای→فیروزه‌ای، برگ‌های برند،
 * تراشه‌ی تاریخ شمسی + ساعت زنده، سلام تایپی «صبح بخیر، {name}»، جمله‌ی خلاصه،
 * دکمه‌های اقدام و تا سه کاشی شیشه‌ای آمار. (بدون دکمه‌ی دستیار — فاز ۲)
 */
export default function HeroToday({
  name,
  greeting,
  summary,
  actions = [],
  stats = [],
}: {
  name: string;
  /** پیش‌فرض بر اساس ساعت: صبح/ظهر/عصر/شب بخیر */
  greeting?: string;
  summary?: ReactNode;
  actions?: HeroAction[];
  stats?: HeroStat[];
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);
  const hello = `${greeting ?? greetingFor(now.getHours())}، `;
  const full = hello + name;
  const { shown, done } = useTyped(full);
  const typedHello = full.slice(0, Math.min(shown, hello.length));
  const typedName = shown > hello.length ? full.slice(hello.length, shown) : "";
  const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  const time = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);

  return (
    <section className="hero-day px-5 py-6 md:px-8 md:py-7" aria-label={full}>
      <HeroLeaves />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0 flex-1 basis-[28rem]">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/12 border border-white/20 text-[13px]">
              <CalendarDays size={16} strokeWidth={1.5} /> {date}
            </span>
            <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/12 border border-white/20 text-[13px] tabular-nums">
              <Clock size={16} strokeWidth={1.5} /> {time}
            </span>
          </div>
          <h1 className="t-hero" aria-hidden>
            {typedHello}
            <em className="not-italic text-teal-300">{typedName}</em>
            {!done && <span className="hero-caret" />}
          </h1>
          {summary && <p className="text-base leading-8 text-white/85 mt-2 max-w-[42rem] [&_b]:text-white [&_b]:font-bold">{summary}</p>}
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {actions.map((a, i) => (
                <button key={a.label} type="button" onClick={a.onClick} className={`hero-btn ${a.solid ?? i === 0 ? "is-solid" : ""}`}>
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {stats.length > 0 && (
          <div className="flex gap-3 w-full md:w-auto">
            {stats.slice(0, 3).map((s) => (
              <StatCard key={s.label} variant="hero" label={s.label} value={s.value} onClick={s.onClick} href={s.href} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
