// ---------------------------------------------------------------------------
// «پیشنهادی» — F13 ضدویروس ClamAV برای فایل‌های پیوست (۱.۱۹.۷ اسکن · ۱.۱۹.۸ عدم ذخیره‌ی آلوده
// و اطلاع‌رسانی · ۱.۱۹.۹ اسکن دوره‌ای همه‌ی فایل‌های میزبان).
// انبار مستقل (localStorage خودش) تا از هر مسیر بارگذاری — شبکه‌ی اجتماعی، مدیریت فایل، رسانه و
// مدیریت دانش — قابل استفاده باشد. در نسخه‌ی متصل، سرور پیش از ذخیره با clamd اسکن می‌کند و
// بارگذاری آلوده پاسخ 422 با کد virus_detected می‌گیرد؛ این‌جا همان رفتار با تأخیر شبیه‌سازی می‌شود.
// در دمو فایلی که نام یا محتوایش EICAR باشد (مثلاً eicar.com.txt) آلوده شناخته می‌شود.
// ---------------------------------------------------------------------------
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { SOCIAL_TODAY, at } from "./seed";
import { addDays, dayNum, nowClock, toEnDigits, weekdayOf } from "../pm/jalali";

export type AvSource = "attachment" | "chat" | "file_manager" | "file_version" | "media" | "knowledge";
export const avSourceLabel: Record<AvSource, string> = { attachment: "پیوست محتوا", chat: "پیوست گفتگو", file_manager: "مدیریت فایل", file_version: "نسخه‌ی جدید فایل", media: "رسانه", knowledge: "مدیریت دانش" };

export type AvSettings = {
  /** اسکن هنگام بارگذاری */
  scan_on_upload: boolean;
  /** حداکثر حجم اسکن (مگابایت) — بزرگ‌تر = «خطای اسکن» */
  max_size_mb: number;
  /** رفتار در خطای سرویس یا حجم بیش از سقف: رد بارگذاری یا قرنطینه برای بررسی راهبر */
  on_error: "reject" | "quarantine";
  schedule: { enabled: boolean; frequency: "daily" | "weekly"; time: string; /** شنبه = ۰ */ weekday: number };
  /** فقط دمو — شبیه‌سازی قطع سرویس clamd */
  engine_online: boolean;
};
export type AvEngine = { engine: "ClamAV"; version: string; signature_version: number; signature_date: string; signatures: number };
export type QuarantineItem = {
  id: string;
  file_name: string;
  size: string;
  mime: string;
  signature: string | null;
  reason: "infected" | "scan_error";
  source: AvSource;
  /** مقصد اصلی (برای آزادسازی) — درایو مدیریت فایل */
  origin: { owner_type: "user" | "group" | "channel"; owner_id: string; folder_id: string | null } | null;
  uploaded_by: string;
  detected_at: string;
  detected_by: "upload" | "schedule" | "manual";
  status: "quarantined" | "released" | "deleted";
  resolved_by?: string | null;
  resolved_at?: string | null;
};
export type AvScanRun = { id: string; started_at: string; finished_at: string; duration_sec: number; files_scanned: number; infected: { file_name: string; signature: string }[]; trigger: "schedule" | "manual"; signature_version: number };
export type AvEventAction = "upload_blocked" | "upload_quarantined" | "scan_run" | "quarantine_release" | "quarantine_delete" | "quarantine_rescan" | "signatures_updated" | "settings_changed";
export type AvEvent = { id: string; at: string; actor_id: string; action: AvEventAction; target: string; note?: string };
export const avEventLabel: Record<AvEventAction, string> = {
  upload_blocked: "ضدویروس: رد بارگذاری آلوده",
  upload_quarantined: "ضدویروس: قرنطینه‌ی بارگذاری",
  scan_run: "ضدویروس: اسکن فایل‌های میزبان",
  quarantine_release: "ضدویروس: آزادسازی از قرنطینه",
  quarantine_delete: "ضدویروس: حذف از قرنطینه",
  quarantine_rescan: "ضدویروس: اسکن دوباره",
  signatures_updated: "ضدویروس: به‌روزرسانی پایگاه امضا",
  settings_changed: "ضدویروس: تغییر تنظیمات",
};

type AvState = { version: number; settings: AvSettings; engine: AvEngine; quarantine: QuarantineItem[]; runs: AvScanRun[]; events: AvEvent[] };

// ------------------------------------------------------------------ امضاها (پایگاه نمونه)
type Sig = { re: RegExp; name: string; since: number };
const SIGNATURES: Sig[] = [
  { re: /eicar/i, name: "Eicar-Test-Signature", since: 0 },
  { re: /\.(pdf|docx?|xlsx?|jpe?g|png|zip)\.(exe|scr|bat|cmd|js|vbs|com)$/i, name: "Heuristics.Phishing.DoubleExtension", since: 0 },
  { re: /(crack|keygen|patch)[^/]*\.(exe|zip|rar)$/i, name: "Win.Trojan.Agent-1036984", since: 0 },
  // امضای تازه — فقط پس از «به‌روزرسانی پایگاه امضا» (نسخه‌ی ۲۷۳۱۹ به بعد) شناخته می‌شود
  { re: /macro[^/]*\.(docm|xlsm)$/i, name: "Doc.Dropper.Agent-7012645", since: 27319 },
];

export type Verdict = { status: "clean" | "infected" | "error"; signature?: string; reason?: string };
const bytesOf = (sz: string | number) => {
  if (typeof sz === "number") return sz;
  const n = Number(toEnDigits(sz).replace(/[٫,]/g, ".").replace(/[^\d.]/g, "")) || 0;
  return sz.includes("گیگ") ? n * 1024 ** 3 : sz.includes("مگ") ? n * 1024 ** 2 : sz.includes("کیلو") ? n * 1024 : n;
};
/** حکم اسکن یک فایل با پایگاه امضای فعلی */
export function verdictOf(file: { name: string; size: string | number }, st: AvState = state): Verdict {
  if (!st.settings.engine_online) return { status: "error", reason: "سرویس ClamAV در دسترس نیست" };
  if (bytesOf(file.size) > st.settings.max_size_mb * 1024 * 1024) return { status: "error", reason: `بزرگ‌تر از سقف اسکن (${st.settings.max_size_mb.toLocaleString("fa-IR")} مگابایت)` };
  const hit = SIGNATURES.find((s) => s.since <= st.engine.signature_version && s.re.test(file.name));
  return hit ? { status: "infected", signature: hit.name } : { status: "clean" };
}

// ------------------------------------------------------------------ انبار
const KEY = "motoshub.av.v1";
const nowStamp = () => at(SOCIAL_TODAY, `${nowClock()}:۰۰`);
const nid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

function seedState(): AvState {
  const d = (n: number) => addDays(SOCIAL_TODAY, -n);
  const runs: AvScanRun[] = [0, 1, 2, 3, 4].map((n) => ({
    id: `avr${n}`,
    started_at: at(d(n), "۰۲:۰۰:۰۰"),
    finished_at: at(d(n), n === 2 ? "۰۲:۰۷:۴۱" : "۰۲:۰۶:۱۲"),
    duration_sec: n === 2 ? 461 : 372,
    files_scanned: 1284 - n * 6,
    infected: n === 2 ? [{ file_name: "eicar.com.txt", signature: "Eicar-Test-Signature" }] : [],
    trigger: "schedule" as const,
    signature_version: 27318 - (n > 1 ? 1 : 0),
  }));
  return {
    version: 1,
    settings: { scan_on_upload: true, max_size_mb: 100, on_error: "reject", schedule: { enabled: true, frequency: "daily", time: "۰۲:۰۰", weekday: 6 }, engine_online: true },
    engine: { engine: "ClamAV", version: "1.4.2", signature_version: 27318, signature_date: at(d(1), "۲۳:۴۵:۰۰"), signatures: 8_712_406 },
    quarantine: [
      { id: "q1", file_name: "eicar.com.txt", size: "۱ کیلوبایت", mime: "text/plain", signature: "Eicar-Test-Signature", reason: "infected", source: "file_manager", origin: { owner_type: "group", owner_id: "g2", folder_id: null }, uploaded_by: "u8", detected_at: at(d(2), "۰۲:۰۳:۱۰"), detected_by: "schedule", status: "quarantined" },
      { id: "q2", file_name: "فاکتور-خرید.pdf.exe", size: "۸۴۰ کیلوبایت", mime: "application/x-msdownload", signature: "Heuristics.Phishing.DoubleExtension", reason: "infected", source: "chat", origin: null, uploaded_by: "u10", detected_at: at(d(1), "۱۴:۲۲:۰۵"), detected_by: "upload", status: "quarantined" },
      { id: "q3", file_name: "نقشه‌ی-سه‌بعدی-سایت.zip", size: "۲۳۰ مگابایت", mime: "application/zip", signature: null, reason: "scan_error", source: "file_manager", origin: { owner_type: "channel", owner_id: "ch2", folder_id: null }, uploaded_by: "u4", detected_at: at(d(3), "۱۱:۰۸:۳۰"), detected_by: "upload", status: "released", resolved_by: "u1", resolved_at: at(d(3), "۱۲:۰۰:۰۰") },
    ],
    runs,
    events: [
      { id: "ave1", at: at(d(2), "۰۲:۰۷:۴۱"), actor_id: "u1", action: "scan_run", target: "۱٬۲۷۲ فایل میزبان", note: "۱ فایل آلوده قرنطینه شد (Eicar-Test-Signature)" },
      { id: "ave2", at: at(d(1), "۱۴:۲۲:۰۵"), actor_id: "u10", action: "upload_blocked", target: "فاکتور-خرید.pdf.exe", note: "Heuristics.Phishing.DoubleExtension — پیوست گفتگو" },
      { id: "ave3", at: at(d(1), "۲۳:۴۵:۰۰"), actor_id: "u1", action: "signatures_updated", target: "پایگاه امضا ۲۷۳۱۸", note: "به‌روزرسانی خودکار freshclam" },
    ],
  };
}

function load(): AvState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<AvState>;
      const base = seedState();
      // بارگذاری مدارا: فیلدهای ناموجود از داده‌ی نمونه
      return { ...base, ...s, settings: { ...base.settings, ...(s.settings ?? {}), schedule: { ...base.settings.schedule, ...(s.settings?.schedule ?? {}) } }, engine: { ...base.engine, ...(s.engine ?? {}) } } as AvState;
    }
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return seedState();
}

let state: AvState = load();
const listeners = new Set<() => void>();
function set(fn: (s: AvState) => AvState) {
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* دمو بدون ماندگاری */
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const ev = (s: AvState, actor: string, action: AvEventAction, target: string, note?: string): AvState => ({ ...s, events: [{ id: nid("ave"), at: nowStamp(), actor_id: actor, action, target, note }, ...s.events].slice(0, 500) });

/** وضعیت زنده‌ی ضدویروس (برای بخش تنظیمات و لاگ ممیزی) */
export function useAntivirus() {
  return useSyncExternalStore(subscribe, () => state);
}
export const getAntivirus = () => state;

// ------------------------------------------------------------------ اکشن‌ها (معادل endpointهای پیشنهادی)
export const av = {
  updateSettings(actor: string, patch: Partial<AvSettings>, note: string) {
    set((s) => ev({ ...s, settings: { ...s.settings, ...patch, schedule: { ...s.settings.schedule, ...(patch.schedule ?? {}) } } }, actor, "settings_changed", "تنظیمات ضدویروس", note));
  },
  updateSignatures(actor: string) {
    set((s) => {
      const v = s.engine.signature_version + 1;
      return ev({ ...s, engine: { ...s.engine, signature_version: v, signature_date: nowStamp(), signatures: s.engine.signatures + 1_843 } }, actor, "signatures_updated", `پایگاه امضا ${v.toLocaleString("fa-IR", { useGrouping: false })}`, "به‌روزرسانی دستی (freshclam)");
    });
  },
  /** ثبت نتیجه‌ی بارگذاری آلوده/خطا — فایل ذخیره نمی‌شود؛ قرنطینه فقط برای خطای سرویس با رفتار «قرنطینه» */
  recordUpload(actor: string, file: { name: string; size: string; mime?: string }, source: AvSource, v: Verdict, origin: QuarantineItem["origin"] = null) {
    const quarantine = v.status === "infected" || (v.status === "error" && state.settings.on_error === "quarantine");
    set((s) => {
      const q: QuarantineItem | null = quarantine
        ? { id: nid("q"), file_name: file.name, size: file.size, mime: file.mime ?? "application/octet-stream", signature: v.signature ?? null, reason: v.status === "infected" ? "infected" : "scan_error", source, origin, uploaded_by: actor, detected_at: nowStamp(), detected_by: "upload", status: "quarantined" }
        : null;
      const next = q ? { ...s, quarantine: [q, ...s.quarantine] } : s;
      return ev(next, actor, quarantine && v.status !== "infected" ? "upload_quarantined" : "upload_blocked", file.name, `${v.signature ?? v.reason ?? ""} — ${avSourceLabel[source]}`);
    });
  },
  /** اسکن همه‌ی فایل‌های میزبان؛ فایل‌های آلوده برگردانده می‌شوند تا انبار مالک آن‌ها را بردارد */
  scanHosted<T extends { id: string; name: string; size: string; mime?: string; owner?: QuarantineItem["origin"]; by?: string }>(actor: string, files: T[], trigger: "schedule" | "manual"): { run: AvScanRun; infected: T[] } {
    const infected = files.filter((f) => {
      const v = verdictOf(f);
      return v.status === "infected";
    });
    const sec = Math.max(4, Math.round(files.length * 0.29));
    const startClock = trigger === "schedule" ? state.settings.schedule.time : nowClock();
    const run: AvScanRun = {
      id: nid("avr"),
      started_at: at(SOCIAL_TODAY, `${startClock}:۰۰`),
      finished_at: nowStamp(),
      duration_sec: sec,
      files_scanned: files.length,
      infected: infected.map((f) => ({ file_name: f.name, signature: verdictOf(f).signature ?? "" })),
      trigger,
      signature_version: state.engine.signature_version,
    };
    set((s) =>
      ev(
        {
          ...s,
          runs: [run, ...s.runs].slice(0, 60),
          quarantine: [
            ...infected.map((f): QuarantineItem => ({ id: nid("q"), file_name: f.name, size: f.size, mime: f.mime ?? "application/octet-stream", signature: verdictOf(f).signature ?? null, reason: "infected", source: "file_manager", origin: f.owner ?? null, uploaded_by: f.by ?? actor, detected_at: nowStamp(), detected_by: trigger === "schedule" ? "schedule" : "manual", status: "quarantined" })),
            ...s.quarantine,
          ],
        },
        actor,
        "scan_run",
        `${files.length.toLocaleString("fa-IR")} فایل میزبان`,
        `${trigger === "schedule" ? "زمان‌بندی‌شده" : "اسکن اکنون"} — ${infected.length ? `${infected.length.toLocaleString("fa-IR")} فایل آلوده قرنطینه شد` : "فایل آلوده‌ای پیدا نشد"}`
      )
    );
    return { run, infected };
  },
  resolve(actor: string, id: string, status: "released" | "deleted") {
    const q = state.quarantine.find((x) => x.id === id);
    if (!q) return;
    set((s) => ev({ ...s, quarantine: s.quarantine.map((x) => (x.id === id ? { ...x, status, resolved_by: actor, resolved_at: nowStamp() } : x)) }, actor, status === "released" ? "quarantine_release" : "quarantine_delete", q.file_name, q.signature ?? "خطای اسکن"));
  },
  /** اسکن دوباره‌ی فایل قرنطینه با پایگاه امضای فعلی */
  rescan(actor: string, id: string): Verdict | null {
    const q = state.quarantine.find((x) => x.id === id);
    if (!q) return null;
    const v = verdictOf({ name: q.file_name, size: q.size });
    set((s) => ev(s, actor, "quarantine_rescan", q.file_name, v.status === "clean" ? "سالم — قابل آزادسازی" : v.signature ?? v.reason));
    return v;
  },
};

/** آیا اسکن زمان‌بندی‌شده الان سررسید است؟ (امروزِ دمو + ساعت واقعی) */
export function scheduleDue(st: AvState = state): boolean {
  const sc = st.settings.schedule;
  if (!sc.enabled || !st.settings.engine_online) return false;
  if (sc.frequency === "weekly" && weekdayOf(SOCIAL_TODAY) !== sc.weekday) return false;
  const toMin = (clock: string) => {
    const [h, m] = toEnDigits(clock).split(":").map((x) => parseInt(x, 10) || 0);
    return h * 60 + m;
  };
  if (toMin(nowClock()) < toMin(sc.time)) return false;
  const today = dayNum(SOCIAL_TODAY);
  // امروز پس از ساعت زمان‌بندی، اجرای زمان‌بندی‌شده‌ای ثبت نشده باشد
  return !st.runs.some((r) => r.trigger === "schedule" && dayNum(r.started_at.split(" ")[0]) === today && toMin(r.started_at.split(" ")[1]?.slice(0, 5) ?? "00:00") >= toMin(sc.time));
}
/** زمان اجرای بعدی برای نمایش */
export function nextRunLabel(st: AvState = state): string {
  const sc = st.settings.schedule;
  if (!sc.enabled) return "زمان‌بندی خاموش است";
  const days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  if (sc.frequency === "weekly") return `هر ${days[sc.weekday]} ساعت ${sc.time}`;
  return scheduleDue(st) ? `امروز ساعت ${sc.time} (در صف اجرا)` : `هر روز ساعت ${sc.time}`;
}

// ------------------------------------------------------------------ اسکن هنگام بارگذاری
export type ScanJob = { id: string; name: string; size: string; state: "queued" | "scanning" | "clean" | "infected" | "error" | "rejected"; detail?: string };
export const scanStateLabel: Record<ScanJob["state"], string> = { queued: "در صف اسکن", scanning: "در حال اسکن…", clean: "سالم", infected: "آلوده — ذخیره نشد", error: "خطای اسکن — قرنطینه شد", rejected: "خطای اسکن — رد شد" };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** اسکن یک فایل (برای مسیرهای بارگذاریِ خارج از شبکه‌ی اجتماعی — مثلاً مدیریت دانش) */
export async function scanFile(file: { name: string; size: string | number }, opts: { actor: string; source?: AvSource; mime?: string } = { actor: "u1" }): Promise<Verdict & { accepted: boolean }> {
  if (!state.settings.scan_on_upload) return { status: "clean", accepted: true };
  await wait(450 + Math.random() * 400);
  const size = typeof file.size === "number" ? `${Math.max(1, Math.round(file.size / 1024)).toLocaleString("fa-IR")} کیلوبایت` : file.size;
  const v = verdictOf({ name: file.name, size });
  if (v.status !== "clean") av.recordUpload(opts.actor, { name: file.name, size, mime: opts.mime }, opts.source ?? "knowledge", v);
  return { ...v, accepted: v.status === "clean" };
}

/**
 * هوک اسکن صف بارگذاری: هر فایل «در صف اسکن» ← «در حال اسکن…» ← «سالم» یا «آلوده — ذخیره نشد».
 * فقط فایل‌های سالم به onClean می‌رسند. notify اختیاری برای اعلان کاربر/راهبر.
 */
export function useUploadScan(source: AvSource, opts: { actor: string; onBlocked?: (file: { name: string }, v: Verdict) => void; origin?: QuarantineItem["origin"] }) {
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const patch = (id: string, p: Partial<ScanJob>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)));
  const scan = useCallback(
    async <T extends { id: string; name: string; size: string; mime?: string }>(files: T[], onClean: (clean: T[]) => void) => {
      if (!files.length) return;
      if (!state.settings.scan_on_upload) return onClean(files);
      const batch = files.map((f) => ({ f, job: { id: `${f.id}-${Date.now().toString(36)}`, name: f.name, size: f.size, state: "queued" as ScanJob["state"] } }));
      setJobs((js) => [...js.filter((j) => j.state !== "clean"), ...batch.map((b) => b.job)]);
      const clean: T[] = [];
      for (const { f, job } of batch) {
        patch(job.id, { state: "scanning" });
        await wait(380 + Math.random() * 420);
        const v = verdictOf(f);
        if (v.status === "clean") {
          clean.push(f);
          patch(job.id, { state: "clean" });
          continue;
        }
        const q = v.status === "error" && state.settings.on_error === "quarantine";
        patch(job.id, { state: v.status === "infected" ? "infected" : q ? "error" : "rejected", detail: v.signature ?? v.reason });
        av.recordUpload(optsRef.current.actor, f, source, v, optsRef.current.origin ?? null);
        optsRef.current.onBlocked?.(f, v);
      }
      if (clean.length) onClean(clean);
      // ردیف‌های «سالم» پس از چند ثانیه جمع می‌شوند؛ ردیف‌های آلوده تا بستن کاربر می‌مانند
      window.setTimeout(() => setJobs((js) => js.filter((j) => j.state !== "clean")), 3500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source]
  );
  const dismiss = (id: string) => setJobs((js) => js.filter((j) => j.id !== id));
  return { jobs, scan, dismiss, busy: jobs.some((j) => j.state === "queued" || j.state === "scanning") };
}
