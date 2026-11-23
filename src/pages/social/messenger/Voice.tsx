// ---------------------------------------------------------------------------
// پیام صوتی در گفتگوی دو نفره (MZ «امکان ارسال پیام صوتی در گفتگوی دو نفره» · v6.8 03_chat_thread_direct).
// ارسال = MessageStoreSerializer با type: "audio" + audio_duration + فایل صوتی (uploaded_files).
// سقف مدت و حجم از تنظیمات پیام‌رسان (audio_max_duration_seconds = ۳۰۰، audio_max_size_mb = ۲۵).
// ضبط با MediaRecorder مرورگر؛ اگر میکروفون در دسترس نباشد (دمو روی سرور/بدون اجازه) ضبط نمایشی است.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { Mic, Square, X, SendHorizontal, Play, Pause } from "lucide-react";
import type { Attachment, Message } from "../../../social/types";

const fa = (n: number) => n.toLocaleString("fa-IR");
export const clock = (sec: number) => `${fa(Math.floor(sec / 60))}:${String(Math.floor(sec % 60)).padStart(2, "0").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d])}`;
const fmtSize = (b: number) => (b >= 1024 ** 2 ? `${(b / 1024 ** 2).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت` : `${fa(Math.max(1, Math.round(b / 1024)))} کیلوبایت`);

/** نشانی پخش فایل‌های صوتیِ همین نشست (blob) — پس از بارگذاری دوباره، پخش نمایشی است */
const voiceUrls = new Map<string, string>();

/** نوار ضبط: شمارنده، توقف، انصراف و ارسال */
export function VoiceRecorder({ maxSec, maxMb, onSend, onCancel }: { maxSec: number; maxMb: number; onSend: (file: Attachment, duration: number) => void; onCancel: () => void }) {
  const [sec, setSec] = useState(0);
  const [state, setState] = useState<"recording" | "stopped">("recording");
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia || typeof MediaRecorder === "undefined") setSimulated(true);
    else
      md.getUserMedia({ audio: true })
        .then((st) => {
          if (cancelled) return st.getTracks().forEach((t) => t.stop());
          stream.current = st;
          const r = new MediaRecorder(st);
          r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
          r.onstop = () => {
            blob.current = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
            st.getTracks().forEach((t) => t.stop());
          };
          r.start();
          rec.current = r;
          started.current = Date.now();
        })
        .catch(() => !cancelled && setSimulated(true));
    const h = window.setInterval(() => setSec((x) => x + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(h);
      if (rec.current?.state === "recording") rec.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stop = () => {
    if (state !== "recording") return;
    setState("stopped");
    if (rec.current?.state === "recording") rec.current.stop();
  };
  // سقف مدت: ضبط خودکار متوقف می‌شود
  useEffect(() => {
    if (state === "recording" && sec >= maxSec) {
      stop();
      setError(`حداکثر مدت پیام صوتی ${fa(maxSec)} ثانیه است؛ ضبط متوقف شد.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec, maxSec, state]);
  // پس از توقف، شمارنده نمی‌رود
  const shown = useRef(0);
  if (state === "recording") shown.current = sec;
  const duration = Math.max(1, Math.min(maxSec, shown.current));

  const send = () => {
    stop();
    // کمی صبر تا onstop داده را جمع کند
    window.setTimeout(() => {
      const b = blob.current;
      const bytes = b?.size || Math.round(duration * 2000); // ضبط نمایشی ≈ ۱۶ کیلوبیت بر ثانیه
      if (bytes > maxMb * 1024 * 1024) return setError(`حجم پیام صوتی بیش از ${fa(maxMb)} مگابایت است.`);
      const id = `att-voice-${Date.now().toString(36)}`;
      if (b) voiceUrls.set(id, URL.createObjectURL(b));
      onSend({ id, name: "پیام-صوتی.webm", size: fmtSize(bytes), mime: b?.type || "audio/webm" }, duration);
    }, 120);
  };

  return (
    <div className="flex items-center gap-2 p-2" role="group" aria-label="ضبط پیام صوتی">
      <button type="button" onClick={onCancel} className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-rose-600" aria-label="انصراف از پیام صوتی" title="انصراف">
        <X size={18} />
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${state === "recording" ? "bg-rose-500 animate-pulse" : "bg-ink-300"}`} aria-hidden />
        <span className="text-[13px] tabular-nums text-ink-800">{clock(shown.current)}</span>
        <span className="text-[11px] text-ink-400 truncate">
          {error || (state === "recording" ? `در حال ضبط… (حداکثر ${clock(maxSec)})` : "آماده‌ی ارسال")}
          {simulated && !error && " · ضبط نمایشی (میکروفون در دسترس نیست)"}
        </span>
        {state === "recording" && (
          <button type="button" onClick={stop} className="mr-auto p-1 rounded-md text-ink-500 hover:bg-white" aria-label="توقف ضبط" title="توقف">
            <Square size={14} />
          </button>
        )}
      </div>
      <button type="button" onClick={send} className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700" aria-label="ارسال پیام صوتی">
        <SendHorizontal size={17} className="-scale-x-100" />
      </button>
    </div>
  );
}

/** دکمه‌ی میکروفون نوار نوشتن */
export function MicButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700" aria-label="ضبط پیام صوتی" title="پیام صوتی">
      <Mic size={17} />
    </button>
  );
}

/** پخش پیام صوتی داخل حباب پیام */
export function VoicePlayer({ m }: { m: Message }) {
  const total = Math.max(1, m.audio_duration ?? 1);
  const att = m.attachments[0];
  const url = att ? voiceUrls.get(att.id) : undefined;
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!playing || url) return;
    // پخش نمایشی (فایل واقعی در این نشست نیست)
    const h = window.setInterval(() => setPos((p) => (p + 0.25 >= total ? (setPlaying(false), 0) : p + 0.25)), 250);
    return () => window.clearInterval(h);
  }, [playing, url, total]);
  const toggle = () => {
    if (url && audio.current) {
      if (playing) audio.current.pause();
      else void audio.current.play();
    }
    setPlaying((v) => !v);
  };
  const pct = Math.min(100, (pos / total) * 100);
  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-0.5">
      {url && <audio ref={audio} src={url} preload="metadata" onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} onEnded={() => (setPlaying(false), setPos(0))} className="hidden" />}
      <button type="button" onClick={toggle} className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 hover:bg-brand-700" aria-label={playing ? "توقف پخش" : "پخش پیام صوتی"}>
        {playing ? <Pause size={16} /> : <Play size={16} className="-scale-x-100" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className="block h-1.5 rounded-full bg-ink-200 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <span className="block h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
        </span>
        <span className="block text-[10.5px] text-ink-400 mt-1 tabular-nums">
          {clock(playing || pos ? pos : total)} · پیام صوتی{att ? ` · ${att.size}` : ""}
        </span>
      </div>
    </div>
  );
}
