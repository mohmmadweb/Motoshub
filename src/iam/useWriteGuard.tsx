// نگهبان ارسال: پیش از هر «نوشتن» (پاسخ، پرسش، پیام، نظر، بارگذاری) مسدودی فعال کاربر (F12)
// و سقف نرخ درخواست (F10) را بررسی می‌کند. ماژول‌های دیگر (پیام‌رسان، نظرها، بارگذاری) هم
// می‌توانند همین هوک را صدا بزنند: const g = useWriteGuard(); const r = g.check("message");
import { useEffect, useState } from "react";
import { Ban, Clock } from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import { activeBlockOf, blockMessage, blocksStore, type UserBlock } from "./blocks";
import { hit, type RateKind } from "./rateLimit";
import { useLocalStore } from "./store";

export type GuardResult = { ok: true } | { ok: false; error: string; retryAfter: number; block?: UserBlock };

export function useWriteGuard() {
  const t = useTenancy();
  useLocalStore(blocksStore);
  const me = t.actingUser.id;
  const block = activeBlockOf(me);
  const roleIds = () => t.rolesOf(me).filter((b) => b.live).map((b) => b.role.id);
  return {
    /** مسدودی فعال کاربر جاری (هر نوع) */
    block,
    /** n واحد از نوع kind؛ ok=false یعنی ارسال انجام نشود و error به کاربر نشان داده شود */
    check: (kind: Exclude<RateKind, "api">, n = 1): GuardResult => {
      const b = activeBlockOf(me);
      if (b) return { ok: false, error: blockMessage(b), retryAfter: 0, block: b };
      const r = hit(me, kind, { roleIds: roleIds(), n });
      if (!r.ok) return r;
      // هر نوشتن یک درخواست API هم هست
      const a = hit(me, "api", { roleIds: roleIds() });
      return a.ok ? { ok: true } : a;
    },
  };
}

/** شمارش معکوس برای غیرفعال‌کردن موقت دکمه‌ی ارسال پس از ۴۲۹ */
export function useCooldown(): [number, (sec: number) => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const h = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(h);
  }, [until]);
  return [Math.max(0, Math.ceil((until - now) / 1000)), (sec) => (setNow(Date.now()), setUntil(Date.now() + sec * 1000))];
}

/** پیام کوچک برای کاربر فقط‌خواندنی یا محدودشده — زیر فرم ارسال */
export function WriteBlockNotice({ block, cooldown = 0, className = "" }: { block: UserBlock | null; cooldown?: number; className?: string }) {
  if (!block && cooldown <= 0) return null;
  return (
    <p role="alert" className={`text-[11.5px] leading-6 rounded-lg border px-2.5 py-1.5 flex items-start gap-1.5 ${block ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800"} ${className}`}>
      {block ? <Ban size={13} className="shrink-0 mt-1" /> : <Clock size={13} className="shrink-0 mt-1" />}
      <span>{block ? blockMessage(block) : `تعداد درخواست‌های شما از حد مجاز بیشتر است؛ ${cooldown.toLocaleString("fa-IR")} ثانیه دیگر تلاش کنید.`}</span>
    </p>
  );
}
