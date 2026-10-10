// ---------------------------------------------------------------------------
// «کپچا» (F11 · قلم ۱.۱۹.۴) — تنظیمات سامانه ← ورود و امنیت.
// کی نمایش داده شود (همیشه / پس از N تلاش ناموفق / فقط IP مشکوک / هرگز) جدا برای ورود، ثبت‌نام و
// بازیابی گذرواژه؛ نوع (تصویر عددی / ریاضی)، دشواری، نسخه‌ی صوتی و پیش‌نمایش زنده.
// + مدت نگهداری تاریخچه‌ی ورود (F07 — تنظیمات امنیت).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Bot, History, RotateCcw, Save } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { diffKeys, emitSettingsChange } from "../../iam/settingsAudit";
import { captchaFormLabel, captchaModeLabel, captchaStore, captchaTypeLabel, defaultCaptchaPolicy, difficultyLabel, isSuspiciousIp, useCaptchaPolicy, type CaptchaDifficulty, type CaptchaForm, type CaptchaMode, type CaptchaPolicy, type CaptchaType } from "../../iam/captcha";
import { CaptchaField } from "../../iam/CaptchaField";
import { THIS_DEVICE_IP, setLoginRetention, useLoginHistory } from "../../iam/loginHistory";
import { securityEndpoints } from "../../iam/securityEndpoints";
import { stampAt } from "../../iam/securityClock";
import { ApiChip } from "../social/kit";
import { Callout, Field, SectionHead, fmtN } from "./iam/shared";

const FORMS: CaptchaForm[] = ["login", "register", "password_reset"];
const MODES: CaptchaMode[] = ["always", "after_failures", "suspicious_ip", "never"];

export default function CaptchaSection() {
  const t = useTenancy();
  const saved = useCaptchaPolicy();
  const lh = useLoginHistory();
  const { notify } = useToast();
  const canEdit = t.hasPermission("settings.security") && !t.readOnly;
  const [d, setD] = useState<CaptchaPolicy>(saved);
  const [retention, setRetention] = useState(lh.retention_days);
  const [previewKey, setPreviewKey] = useState(0);
  const dirty = JSON.stringify(d) !== JSON.stringify(saved) || retention !== lh.retention_days;
  const set = <K extends keyof CaptchaPolicy>(k: K, v: CaptchaPolicy[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = () => {
    const strip = (p: CaptchaPolicy) => ({ ...p, updatedAt: undefined, updatedBy: undefined });
    const diff = diffKeys(strip(saved), strip(d));
    captchaStore.set({ ...d, updatedAt: stampAt(Date.now()), updatedBy: t.actingUser.name });
    if (diff) emitSettingsChange({ area: "کپچا", summary: `تغییر ${Object.keys(diff.after).join("، ")}`, before: diff.before, after: diff.after });
    if (retention !== lh.retention_days) {
      emitSettingsChange({ area: "تاریخچه‌ی ورود", summary: "تغییر مدت نگهداری", before: { retention_days: lh.retention_days }, after: { retention_days: retention } });
      setLoginRetention(retention);
    }
    notify("تنظیمات کپچا ذخیره شد.", "success");
  };

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<Bot size={18} />}
        title="کپچا در فرم‌های احراز هویت"
        description="جلوگیری از ورود خودکار بی‌آنکه کاربران عادی اذیت شوند. پیشنهاد: ورود «پس از ۳ تلاش ناموفق» (کپچا از تلاش چهارم)."
        actions={
          <>
            <ApiChip items={[{ label: "دریافت کپچا (تصویر + token)", ep: securityEndpoints.captcha() }, { label: "سیاست کپچا", ep: securityEndpoints.captchaPolicy() }, { label: "ذخیره‌ی سیاست", ep: securityEndpoints.captchaPolicySave() }]} />
            {saved.updatedAt && <span className="text-[11px] text-ink-400">آخرین ذخیره: {saved.updatedAt} — {saved.updatedBy}</span>}
            <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} disabled={!canEdit} onClick={() => setD(defaultCaptchaPolicy())}>
              پیش‌فرض
            </Button>
            <Button variant="primary" size="sm" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
              ذخیره
            </Button>
          </>
        }
      />

      <div className="card p-0 overflow-hidden">
        <ul className="divide-y divide-ink-100">
          {FORMS.map((f) => (
            <li key={f} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)_120px] gap-2 items-center">
              <span className="text-[12.5px] font-semibold text-ink-800">فرم {captchaFormLabel[f]}</span>
              <select className="input-field" aria-label={`نمایش کپچا در فرم ${captchaFormLabel[f]}`} value={d[f]} disabled={!canEdit} onChange={(e) => set(f, e.target.value as CaptchaMode)}>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {captchaModeLabel[m]}
                  </option>
                ))}
              </select>
              {d[f] === "after_failures" || d[f] === "suspicious_ip" ? (
                <label className="flex items-center gap-1.5 text-[12px] text-ink-600">
                  N =
                  <input type="number" min={1} max={20} className="input-field !w-16" aria-label={`تعداد تلاش ناموفق برای ${captchaFormLabel[f]}`} value={d[`${f}_after`]} disabled={!canEdit} onChange={(e) => set(`${f}_after`, Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
                </label>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
        <div className="px-4 py-2.5 border-t border-ink-100 text-[11.5px] text-ink-500 leading-6">
          «پس از N تلاش» یعنی کپچا از تلاش N+۱ ظاهر می‌شود و ورود بدون پاسخ درست ممکن نیست. «IP مشکوک» = خارج از «بازه‌های IP مورد اعتماد» سیاست ورود (IP دمو <span dir="ltr">{THIS_DEVICE_IP}</span> {isSuspiciousIp() ? "مشکوک حساب می‌شود" : "مورد اعتماد است"}). صفحه‌ی ثبت‌نام عمومی در این دمو نیست؛ تنظیم آن برای استقرار ذخیره می‌شود.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع کپچا">
              <select className="input-field" value={d.type} disabled={!canEdit} onChange={(e) => (set("type", e.target.value as CaptchaType), setPreviewKey((k) => k + 1))}>
                {(Object.keys(captchaTypeLabel) as CaptchaType[]).map((k) => (
                  <option key={k} value={k}>
                    {captchaTypeLabel[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="دشواری">
              <select className="input-field" value={d.difficulty} disabled={!canEdit} onChange={(e) => (set("difficulty", e.target.value as CaptchaDifficulty), setPreviewKey((k) => k + 1))}>
                {(Object.keys(difficultyLabel) as CaptchaDifficulty[]).map((k) => (
                  <option key={k} value={k}>
                    {difficultyLabel[k]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] text-ink-700">نسخه‌ی صوتی (دسترس‌پذیری)</span>
            <Toggle on={d.audio} disabled={!canEdit} onChange={() => set("audio", !d.audio)} label="نسخه‌ی صوتی کپچا" />
          </div>
          <Callout tone="neutral">پاسخ با ارقام فارسی، عربی یا لاتین پذیرفته می‌شود؛ فرم با صفحه‌کلید قابل استفاده است.</Callout>
        </div>
        <div className="card p-4 space-y-2">
          <p className="text-[12.5px] font-semibold text-ink-800">پیش‌نمایش (پس از ذخیره)</p>
          <CaptchaField key={`${previewKey}-${saved.type}-${saved.difficulty}`} />
        </div>
      </div>

      <div className="card p-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="text-[13px] font-bold text-ink-800 flex items-center gap-1.5 mb-1">
            <History size={15} className="text-brand-600" /> تاریخچه‌ی ورودهای موفق
          </p>
          <p className="text-[11.5px] text-ink-500 leading-5">کاربران ۲۰ ورود آخر خود را در «پروفایل ← امنیت و نشست‌ها» می‌بینند؛ مدیر همین فهرست را در «اعضا ← جزئیات عضو». رکوردهای قدیمی‌تر حذف می‌شوند.</p>
        </div>
        <Field label="مدت نگهداری (روز)">
          <input type="number" min={7} max={730} className="input-field !w-28" value={retention} disabled={!canEdit} onChange={(e) => setRetention(Math.max(7, Math.min(730, Number(e.target.value) || 7)))} />
        </Field>
        <span className="text-[11px] text-ink-400 pb-2">{fmtN(lh.events.length)} رکورد</span>
      </div>
    </div>
  );
}
