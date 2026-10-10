// کپچای شبیه‌سازی‌شده (F11): تصویر SVG با نویز، دکمه‌ی تازه‌سازی، نسخه‌ی صوتی، قابل استفاده با
// صفحه‌کلید؛ پاسخ با ارقام فارسی، عربی یا لاتین پذیرفته می‌شود.
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { RefreshCw, Volume2 } from "lucide-react";
import { checkAnswer, newChallenge, useCaptchaPolicy, type Challenge } from "./captcha";

export type CaptchaHandle = { verify: () => boolean; refresh: () => void };

/** تصویر چالش — حروف چرخیده با خطوط نویز (از روی token تا با هر بازسازی یکسان بماند) */
function CaptchaImage({ c, hard }: { c: Challenge; hard: boolean }) {
  const glyphs = useMemo(() => {
    let seed = [...c.token].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
    const r = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    const chars = [...c.text];
    const w = 168 / Math.max(chars.length, 1);
    return {
      chars: chars.map((ch, i) => ({ ch, x: 14 + i * w + w / 2 - 6, y: 30 + (r() - 0.5) * 10, rot: (r() - 0.5) * (hard ? 50 : 30) })),
      lines: Array.from({ length: hard ? 6 : 4 }, () => ({ x1: r() * 190, y1: r() * 46, x2: r() * 190, y2: r() * 46 })),
      dots: Array.from({ length: hard ? 40 : 22 }, () => ({ x: r() * 190, y: r() * 46 })),
    };
  }, [c.token, c.text, hard]);
  return (
    <svg viewBox="0 0 190 46" className="w-[190px] h-[46px] rounded-lg border border-ink-200 bg-ink-50 select-none shrink-0" role="img" aria-label="تصویر کد امنیتی؛ برای نسخه‌ی صوتی دکمه‌ی پخش را بزنید">
      {glyphs.dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={0.9} className="fill-ink-400" />
      ))}
      {glyphs.lines.map((l, i) => (
        <line key={i} {...l} strokeWidth={1} className="stroke-ink-300" />
      ))}
      {glyphs.chars.map((g, i) => (
        <text key={i} x={g.x} y={g.y} transform={`rotate(${g.rot} ${g.x + 6} ${g.y - 8})`} className="fill-ink-800" style={{ fontSize: 20, fontWeight: 700 }}>
          {g.ch}
        </text>
      ))}
    </svg>
  );
}

export const CaptchaField = forwardRef<CaptchaHandle, { onError?: (msg: string) => void }>(function CaptchaField({ onError }, ref) {
  const p = useCaptchaPolicy();
  const [c, setC] = useState(() => newChallenge(p.type, p.difficulty));
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const refresh = () => {
    setC(newChallenge(p.type, p.difficulty));
    setVal("");
  };
  useImperativeHandle(ref, () => ({
    verify: () => {
      if (!val.trim()) {
        setErr("کد امنیتی را وارد کنید.");
        return false;
      }
      if (!checkAnswer(c, val)) {
        setErr("کد امنیتی نادرست است؛ کد تازه را وارد کنید.");
        onError?.("captcha");
        refresh();
        return false;
      }
      return true;
    },
    refresh,
  }));
  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(c.spoken);
      u.lang = "fa-IR";
      u.rate = 0.7;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      setErr("پخش صوتی در این مرورگر در دسترس نیست.");
    }
  };
  return (
    <div className="rounded-lg border border-ink-200 p-2.5 space-y-2">
      <p className="text-[11.5px] text-ink-500">{p.type === "arithmetic" ? "حاصل عبارت را بنویسید" : "عدد داخل تصویر را بنویسید"} (ارقام فارسی یا لاتین)</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <CaptchaImage c={c} hard={p.difficulty === "hard"} />
        <button type="button" onClick={refresh} className="w-9 h-9 rounded-lg border border-ink-200 text-ink-500 hover:text-brand-700 flex items-center justify-center" aria-label="کد تازه" title="کد تازه">
          <RefreshCw size={15} />
        </button>
        {p.audio && (
          <button type="button" onClick={speak} className="w-9 h-9 rounded-lg border border-ink-200 text-ink-500 hover:text-brand-700 flex items-center justify-center" aria-label="پخش صوتی کد" title="نسخه‌ی صوتی">
            <Volume2 size={15} />
          </button>
        )}
      </div>
      <input
        value={val}
        onChange={(e) => (setVal(e.target.value), setErr(""))}
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        className={`input-field text-center tracking-widest ${err ? "input-error" : ""}`}
        placeholder="کد امنیتی"
        aria-label="کد امنیتی"
      />
      {err && <p className="field-error">{err}</p>}
    </div>
  );
});

export default CaptchaField;
