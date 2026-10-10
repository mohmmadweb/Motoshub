// گذرگاه رویدادهای امنیتی (ورود، «این من نبودم»، مسدودسازی، محدودسازی نرخ) — انبارهای امنیت
// بیرون از React هستند؛ TenancyProvider این رویدادها را با نوع `security.*` در تاریخچه‌ی
// تغییرناپذیر IAM ثبت می‌کند و «لاگ ممیزی» یکپارچه آن‌ها را بی‌تغییر نشان می‌دهد.
import type { AuditEvent } from "./model";

export type SecurityAuditEvent = Extract<AuditEvent, `security.${string}`>;

export type SecurityAudit = {
  event: SecurityAuditEvent;
  summary: string;
  /** کاربری که رویداد درباره‌ی اوست */
  affectedUserId?: string;
  /** انجام‌دهنده؛ پیش‌فرض: کاربر واقعی فعلی. «system» برای قواعد خودکار */
  actorId?: string;
  scopeId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

const listeners = new Set<(a: SecurityAudit) => void>();

export function emitSecurityAudit(a: SecurityAudit) {
  listeners.forEach((l) => l(a));
}

export function onSecurityAudit(fn: (a: SecurityAudit) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
