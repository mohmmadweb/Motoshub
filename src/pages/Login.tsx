import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Ban, Eye, EyeOff, MailCheck } from "lucide-react";
import { useEffectiveBranding } from "../iam/hooks";
import { KarizLogo, PRODUCT_NAME } from "../components/Sidebar";
import { ROOT_ID } from "../iam/model";
import { demoPersonas, users } from "../data/mock";
import { useTenancy } from "../context/TenancyContext";
import { useInbox } from "../context/InboxContext";
import Button from "../components/ui/Button";
import { OtpForm } from "../iam/OtpChallenge";
import { loginPolicyStore } from "../iam/loginPolicy";
import { captchaRequired, formFailures, setFormFailures, useCaptchaPolicy, type CaptchaForm } from "../iam/captcha";
import { CaptchaField, type CaptchaHandle } from "../iam/CaptchaField";
import { activeBlockOf, blockMessage, clearLoginFailures, registerLoginFailure } from "../iam/blocks";

// ورود ساده: فقط نام کاربری و گذرواژه.
// جابه‌جایی بین کاربران/نقش‌های نمایشی بعد از ورود، از «مشاهده به‌عنوان» در هدر انجام می‌شود.
// اگر در «تنظیمات ← سیاست ورود و تأیید دومرحله‌ای» OTP روشن باشد و نقش کاربر زیر پوشش باشد،
// بعد از گذرواژه یک مرحله‌ی کد (شبیه‌سازی‌شده) نمایش داده می‌شود؛ پیش‌فرض خاموش است.
// امنیت (F11/F12): کپچا طبق «تنظیمات ← کپچا» (پیش‌فرض: از تلاش چهارم)، قفل خودکار پس از N تلاش
// ناموفق و پیام دلیل و زمان پایان برای حساب مسدود. در دمو گذرواژه‌ی کوتاه‌تر از ۴ نویسه «نادرست» است.
// نام کاربری: نام یا شناسه‌ی یکی از اعضا (مثلاً «محسن مردعلی»)؛ در غیر این صورت پرسونای پیش‌فرض دمو.

const DEMO_MIN_PASSWORD = 4;

function resolveUser(username: string) {
  const q = username.trim().replace(/ي/g, "ی").replace(/ك/g, "ک");
  return (users.find((u) => u.id === q || u.name === q) ?? (q.length >= 3 ? users.find((u) => u.name.includes(q)) : undefined))?.id ?? demoPersonas[0].id;
}

export default function Login() {
  const navigate = useNavigate();
  const { setActingUser, otpRequired } = useTenancy();
  const inbox = useInbox();
  const captchaPolicy = useCaptchaPolicy();
  const [mode, setMode] = useState<CaptchaForm>("login");
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ u?: string; p?: string; form?: string; blocked?: boolean }>({});
  const [failures, setFailures] = useState(() => formFailures("login"));
  const [resetSent, setResetSent] = useState(false);
  const captcha = useRef<CaptchaHandle>(null);
  const needCaptcha = captchaRequired(captchaPolicy, mode, mode === "login" ? failures : formFailures(mode));

  const fail = (n: number) => {
    setFailures(n);
    setFormFailures("login", n);
  };

  const submit = () => {
    const errs = {
      u: username.trim() ? undefined : "نام کاربری الزامی است.",
      p: password.trim() ? undefined : "گذرواژه الزامی است.",
    };
    setErrors(errs);
    if (errs.u || errs.p) return;
    const id = resolveUser(username);
    // حساب مسدود: پیام دلیل و زمان پایان (فقط‌خواندنی مانع ورود نیست)
    const b = activeBlockOf(id);
    if (b && b.kind !== "read_only") return setErrors({ form: blockMessage(b), blocked: true });
    if (needCaptcha && !captcha.current?.verify()) return;
    if (password.trim().length < DEMO_MIN_PASSWORD) {
      fail(failures + 1);
      captcha.current?.refresh();
      const r = registerLoginFailure(id);
      if (r.locked) {
        const name = users.find((u) => u.id === id)?.name ?? "";
        inbox.send([name], "security", `حساب شما پس از ${r.max.toLocaleString("fa-IR")} تلاش ناموفق ورود تا ${r.locked.until ?? "اطلاع بعدی"} قفل شد. اگر کار شما نبوده، پس از ورود گذرواژه را عوض کنید.`, `/profile/${id}?tab=security`, { urgent: true, system: true });
        return setErrors({ form: blockMessage(r.locked), blocked: true });
      }
      const left = r.max ? r.max - r.count : 0;
      return setErrors({ form: `نام کاربری یا گذرواژه نادرست است${left > 0 && r.count > 1 ? ` — ${left.toLocaleString("fa-IR")} تلاش دیگر تا قفل موقت حساب` : ""}. (در دمو هر گذرواژه‌ی ${DEMO_MIN_PASSWORD.toLocaleString("fa-IR")} نویسه‌ای یا بیشتر پذیرفته می‌شود.)` });
    }
    fail(0);
    clearLoginFailures(id);
    if (otpRequired(id)) return setOtpFor(id);
    setActingUser(id, { method: "password" });
    navigate("/dashboard");
  };

  const submitReset = () => {
    if (!username.trim()) return setErrors({ u: "نام کاربری یا شماره‌ی همراه را وارد کنید." });
    if (needCaptcha && !captcha.current?.verify()) {
      setFormFailures("password_reset", formFailures("password_reset") + 1);
      return;
    }
    setFormFailures("password_reset", 0);
    setResetSent(true);
  };

  // ورود با برند محصول «کاریز» (v6.8)؛ لوگوی سازمان (لایه‌ی سامانه در «تنظیمات سازمان») اگر باشد کنارش می‌آید
  const title = mode === "login" ? `ورود به ${PRODUCT_NAME}` : "بازیابی گذرواژه";
  const brand = useEffectiveBranding(ROOT_ID);
  useEffect(() => {
    document.title = `${title} | ${PRODUCT_NAME}`;
  }, [title]);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[25rem] card !p-7 shadow-md animate-rise">
        <div className="mb-7">
          <div className="flex items-center justify-between gap-3 mb-5">
            <KarizLogo size={34} />
            {brand.logo && <img src={brand.logo} alt={brand.name} className="h-9 w-auto max-w-[45%] object-contain" />}
          </div>
          <h1 className="text-[24px] leading-9 font-bold text-ink-900">{title}</h1>
          <p className="text-[14px] text-ink-500 mt-1">{mode === "login" ? "با حساب سازمانی خود وارد شوید." : "نام کاربری یا شماره‌ی همراه خود را وارد کنید."}</p>
        </div>

        {otpFor ? (
          <OtpForm
            userName={users.find((u) => u.id === otpFor)?.name ?? username}
            channel={loginPolicyStore.get().otpChannel}
            onCancel={() => setOtpFor(null)}
            onVerified={() => {
              setActingUser(otpFor, { otpVerified: true });
              navigate("/dashboard");
            }}
          />
        ) : mode === "password_reset" ? (
          resetSent ? (
            <div className="space-y-4 text-center">
              <p className="text-[12.5px] text-ink-700 leading-6 flex flex-col items-center gap-2">
                <MailCheck size={28} className="text-emerald-600" />
                اگر حسابی با این مشخصات وجود داشته باشد، پیوند بازیابی به شماره‌ی همراه و ایمیل ثبت‌شده ارسال شد (نمایشی).
              </p>
              <Button variant="secondary" className="w-full justify-center" icon={<ArrowRight size={14} />} onClick={() => (setMode("login"), setResetSent(false))}>
                بازگشت به ورود
              </Button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitReset();
              }}
            >
              <div>
                <input value={username} onChange={(e) => (setUsername(e.target.value), setErrors({}))} className={`input-field ${errors.u ? "input-error" : ""}`} placeholder="نام کاربری یا شماره‌ی همراه" aria-label="نام کاربری یا شماره‌ی همراه" autoFocus />
                {errors.u && <p className="field-error">{errors.u}</p>}
              </div>
              {needCaptcha && <CaptchaField key="reset" ref={captcha} />}
              <Button type="submit" variant="primary" className="w-full justify-center !mt-5">
                ارسال پیوند بازیابی
              </Button>
              <button type="button" onClick={() => (setMode("login"), setErrors({}))} className="w-full text-[12px] text-ink-500 hover:text-brand-700">
                بازگشت به ورود
              </button>
            </form>
          )
        ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label htmlFor="login-user" className="block text-[13px] font-medium text-ink-800 mb-1.5">نام کاربری</label>
            <input
              id="login-user"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, u: undefined, form: undefined })); }}
              className={`input-field ${errors.u ? "input-error" : ""}`}
              autoComplete="username"
              autoFocus
            />
            {errors.u && <p className="field-error">{errors.u}</p>}
          </div>
          <div>
            <label htmlFor="login-pass" className="block text-[13px] font-medium text-ink-800 mb-1.5">گذرواژه</label>
            <div className="relative">
              <input
                id="login-pass"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, p: undefined, form: undefined })); }}
                className={`input-field pl-10 ${errors.p ? "input-error" : ""}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "پنهان کردن گذرواژه" : "نمایش گذرواژه"}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-ink-400 hover:text-ink-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.p && <p className="field-error">{errors.p}</p>}
          </div>

          {needCaptcha && <CaptchaField key="login" ref={captcha} />}

          {errors.form && (
            <p role="alert" className={`text-[12px] leading-6 rounded-lg border px-3 py-2 flex items-start gap-1.5 ${errors.blocked ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {errors.blocked && <Ban size={14} className="shrink-0 mt-1" />}
              <span>{errors.form}</span>
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full justify-center !mt-6">
            ورود
          </Button>
          <button type="button" onClick={() => (setMode("password_reset"), setErrors({}))} className="w-full text-[13px] text-ink-500 hover:text-teal-700">
            گذرواژه را فراموش کرده‌اید؟
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
