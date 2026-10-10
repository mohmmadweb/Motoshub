// ---------------------------------------------------------------------------
// نگهبان نوشتن در نگارشگرهای شبکه‌ی اجتماعی — مسدودی فعال کاربر (F12) و سقف نرخ درخواست (F10)
// پیش از ارسال پیام، نظر/پست و بارگذاری بررسی می‌شود (src/iam/useWriteGuard.tsx).
// gate(kind) ← false یعنی ارسال انجام نشود؛ دکمه‌ی ارسال تا پایان شمارش معکوس غیرفعال می‌ماند.
// ---------------------------------------------------------------------------
import { useToast } from "../../../components/ui/ToastProvider";
import { useCooldown, useWriteGuard, WriteBlockNotice } from "../../../iam/useWriteGuard";

export function useComposerGuard() {
  const guard = useWriteGuard();
  const [cool, setCool] = useCooldown();
  const { notify } = useToast();
  const gate = (kind: "message" | "post" | "upload", n = 1) => {
    const r = guard.check(kind, n);
    if (r.ok) return true;
    if (r.retryAfter) setCool(r.retryAfter);
    notify(r.error, "warning");
    return false;
  };
  const blocked = !!guard.block || cool > 0;
  return { gate, blocked, notice: (className = "") => <WriteBlockNotice block={guard.block} cooldown={cool} className={className} /> };
}
