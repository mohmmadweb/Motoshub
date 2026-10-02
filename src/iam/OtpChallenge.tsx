// مرحله‌ی شبیه‌سازی‌شده‌ی رمز یک‌بارمصرف (OTP) — هم در صفحه‌ی ورود و هم هنگام «مشاهده به‌عنوان»
// پرسونایی که نقشش زیر پوشش سیاست ورود است. کد آزمایشی همیشه ۱۲۳۴۵۶ است.
import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import Button from "../components/ui/Button";
import { DEMO_OTP, DEMO_OTP_FA } from "./loginPolicy";

const toEn = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** فرم کد — بدون قاب، برای جاسازی در کارت ورود یا مودال */
export function OtpForm({ userName, channel = "sms", onVerified, onCancel }: { userName: string; channel?: "sms" | "app"; onVerified: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    if (toEn(code.trim()) !== DEMO_OTP) return setErr("کد واردشده درست نیست.");
    onVerified();
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-start gap-2.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-[12px] leading-6 text-brand-800">
        <ShieldCheck size={15} className="shrink-0 mt-1" />
        <span>
          برای «{userName}» تأیید دومرحله‌ای فعال است. کد ۶ رقمی {channel === "sms" ? "پیامک‌شده" : "اپلیکیشن احراز هویت"} را وارد کنید.
        </span>
      </div>
      <div>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErr("");
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          dir="ltr"
          className={`input-field text-center tracking-[0.5em] font-mono text-lg ${err ? "input-error" : ""}`}
          placeholder="••••••"
          aria-label="کد یک‌بارمصرف"
        />
        {err && <p className="field-error">{err}</p>}
        <p className="text-[11px] text-ink-400 mt-1.5 flex items-center gap-1">
          <KeyRound size={11} /> کد آزمایشی: {DEMO_OTP_FA}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="flex-1 justify-center">
          تأیید و ورود
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </form>
  );
}
