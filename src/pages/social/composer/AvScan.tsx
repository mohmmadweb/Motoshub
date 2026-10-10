// ---------------------------------------------------------------------------
// «پیشنهادی» — F13 وضعیت اسکن ضدویروس در هر مسیر بارگذاری (۱.۱۹.۷ و ۱.۱۹.۸)
// «در صف اسکن» ← «در حال اسکن…» ← «سالم» یا «آلوده — ذخیره نشد (نام امضا)».
// فایل آلوده ذخیره نمی‌شود؛ کاربر (اعلان + پیام) و راهبر امنیت (اعلان فوری) مطلع می‌شوند.
// ---------------------------------------------------------------------------
import { ShieldAlert, ShieldCheck, Loader2, Clock, X, ShieldX } from "lucide-react";
import { useInbox } from "../../../context/InboxContext";
import { useTenancy } from "../../../context/TenancyContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { users } from "../../../data/mock";
import { ROOT_ID } from "../../../iam/model";
import { scanStateLabel, useUploadScan, type AvSource, type QuarantineItem, type ScanJob } from "../../../social/av";
import { useComposerGuard } from "./WriteGate";

/** اسکن پیش از ذخیره با اعلان‌ها — scan(files, onClean) فقط فایل‌های سالم را تحویل می‌دهد */
export function useScannedUpload(source: AvSource, origin?: QuarantineItem["origin"]) {
  const t = useTenancy();
  const inbox = useInbox();
  const { notify } = useToast();
  const me = t.actingUser;
  const g = useComposerGuard();
  const up = useUploadScan(source, {
    actor: me.id,
    origin: origin ?? null,
    onBlocked: (f, v) => {
      const why = v.status === "infected" ? `آلوده به «${v.signature}»` : v.reason ?? "خطای اسکن";
      notify(`«${f.name}» ذخیره نشد — ${why}.`, "warning");
      inbox.send([me.name], "report", `ضدویروس: فایل «${f.name}» ${why} بود و ذخیره نشد.`, "/dashboard/notifications", { system: true });
      const admins = users.filter((u) => u.id !== me.id && t.effectiveOf(u.id, ROOT_ID).has("settings.security")).map((u) => u.name);
      if (admins.length) inbox.send(admins, "report", `رخداد امنیتی: بارگذاری «${f.name}» توسط «${me.name}» مسدود شد (${why}).`, "/dashboard/settings?section=antivirus", { urgent: true });
    },
  });
  // سقف نرخ بارگذاری (F10) و مسدودی کاربر (F12) پیش از اسکن
  const scan: typeof up.scan = (files, onClean) => (files.length && !g.gate("upload", files.length) ? Promise.resolve() : up.scan(files, onClean));
  return { ...up, scan, blocked: g.blocked, notice: g.notice };
}

const icon: Record<ScanJob["state"], typeof Clock> = { queued: Clock, scanning: Loader2, clean: ShieldCheck, infected: ShieldAlert, error: ShieldX, rejected: ShieldX };
const tone: Record<ScanJob["state"], string> = {
  queued: "text-ink-500 bg-ink-50 border-ink-100",
  scanning: "text-brand-700 bg-brand-50 border-brand-100",
  clean: "text-emerald-700 bg-emerald-50 border-emerald-200",
  infected: "text-rose-700 bg-rose-50 border-rose-200",
  error: "text-amber-700 bg-amber-50 border-amber-200",
  rejected: "text-rose-700 bg-rose-50 border-rose-200",
};

/** فهرست جمع‌وجور وضعیت اسکن فایل‌ها (فقط وقتی کاری در جریان است دیده می‌شود) */
export function ScanStatusList({ jobs, onDismiss, className = "" }: { jobs: ScanJob[]; onDismiss: (id: string) => void; className?: string }) {
  if (!jobs.length) return null;
  return (
    <div className={`space-y-1 ${className}`} aria-live="polite">
      {jobs.map((j) => {
        const I = icon[j.state];
        const done = j.state === "infected" || j.state === "error" || j.state === "rejected";
        return (
          <div key={j.id} className={`flex items-center gap-2 text-[11.5px] rounded-md border px-2 py-1 ${tone[j.state]}`}>
            <I size={13} className={`shrink-0 ${j.state === "scanning" ? "animate-spin" : ""}`} />
            <span className="truncate flex-1 min-w-0" dir="auto">
              {j.name}
            </span>
            <span className="shrink-0 font-medium">
              {scanStateLabel[j.state]}
              {done && j.detail ? ` (${j.detail})` : ""}
            </span>
            {done && (
              <button type="button" onClick={() => onDismiss(j.id)} className="shrink-0 opacity-70 hover:opacity-100" aria-label="بستن">
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      <p className="text-[10px] text-ink-400">اسکن با ClamAV پیش از ذخیره — فایل آلوده ذخیره نمی‌شود.</p>
    </div>
  );
}
