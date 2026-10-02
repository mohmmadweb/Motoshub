// ---------------------------------------------------------------------------
// «کانال‌های اطلاع‌رسانی (پیامک/ایمیل)» — درگاه پیامک، فرستنده‌ی ایمیل و روشن/خاموش هر کانال
// (پیامک، ایمیل، اعلان push) + ارسال آزمایشی شبیه‌سازی‌شده و سهمیه‌ی ماهانه.
// ذخیره در localStorage با کلید motoshub.channels.v1 (در بک‌اند: /settings/notifications/channels).
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Eye, EyeOff, Mail, MessageSquareText, RotateCcw, Save, Send, Smartphone, XCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { nowClock, toEnDigits } from "../../pm/jalali";
import { Field, SectionHead } from "./iam/shared";

const KEY = "motoshub.channels.v1";

export type SmsProvider = "kavenegar" | "melipayamak" | "magfa" | "smsir";
export const providerLabel: Record<SmsProvider, string> = { kavenegar: "کاوه‌نگار", melipayamak: "ملی‌پیامک", magfa: "مگفا", smsir: "اس‌ام‌اس دات آی‌آر" };

export type TestLog = { id: string; at: string; to: string; ok: boolean; message: string; provider: SmsProvider };
export type ChannelsConfig = {
  provider: SmsProvider;
  sender: string;
  apiKey: string;
  emailFrom: string;
  emailName: string;
  enabled: { sms: boolean; email: boolean; push: boolean };
  monthlyQuota: number;
  usedThisMonth: number;
  log: TestLog[];
  updatedAt?: string;
  updatedBy?: string;
};

const DEFAULTS: ChannelsConfig = {
  provider: "kavenegar",
  sender: "10008663",
  apiKey: "",
  emailFrom: "no-reply@shub.ir",
  emailName: "موتوشاب",
  enabled: { sms: true, email: true, push: false },
  monthlyQuota: 50000,
  usedThisMonth: 18240,
  log: [],
};

export function loadChannels(): ChannelsConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ChannelsConfig>) };
  } catch {
    /* بدون حافظه */
  }
  return DEFAULTS;
}
function save(c: ChannelsConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* نادیده */
  }
}

const mask = (k: string) => (k.length <= 6 ? "•".repeat(k.length) : `${k.slice(0, 3)}${"•".repeat(Math.min(16, k.length - 6))}${k.slice(-3)}`);
const fa = (n: number) => n.toLocaleString("fa-IR");

export default function ChannelsSection() {
  const { today, actingUser, hasPermission } = useTenancy();
  const { notify } = useToast();
  const [saved, setSaved] = useState<ChannelsConfig>(loadChannels);
  const [d, setD] = useState<ChannelsConfig>(saved);
  const [showKey, setShowKey] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testText, setTestText] = useState("پیام آزمایشی موتوشاب");
  const [sending, setSending] = useState(false);
  const canEdit = hasPermission("settings.system");

  useEffect(() => save(saved), [saved]);

  const dirty = JSON.stringify({ ...d, log: [] }) !== JSON.stringify({ ...saved, log: [] });
  const set = <K extends keyof ChannelsConfig>(k: K, v: ChannelsConfig[K]) => setD((x) => ({ ...x, [k]: v }));

  const commit = () => {
    const next = { ...d, log: saved.log, updatedAt: `${today} ${nowClock()}`, updatedBy: actingUser.name };
    setSaved(next);
    setD(next);
    notify("تنظیمات کانال‌ها ذخیره شد.", "success");
  };

  const pct = Math.min(100, Math.round((saved.usedThisMonth / Math.max(1, saved.monthlyQuota)) * 100));

  const testSend = () => {
    const num = toEnDigits(testTo).replace(/[\s-]/g, "");
    if (!/^(\+98|0)?9\d{9}$/.test(num)) return notify("شماره‌ی همراه معتبر نیست (مثلاً ۰۹۱۲۱۲۳۴۵۶۷).", "warning");
    setSending(true);
    setTimeout(() => {
      // شبیه‌سازی پاسخ درگاه: بدون کلید ← خطای احراز هویت، کانال خاموش ← رد، سهمیه پر ← رد
      let ok = true;
      let message = `ارسال شد — شناسه‌ی پیگیری ${Math.floor(1e8 + Math.random() * 9e8).toLocaleString("fa-IR", { useGrouping: false })}`;
      if (!saved.enabled.sms) [ok, message] = [false, "کانال پیامک خاموش است."];
      else if (!saved.apiKey.trim()) [ok, message] = [false, "خطای ۴۰۱ — کلید API ثبت نشده یا نامعتبر است."];
      else if (saved.usedThisMonth >= saved.monthlyQuota) [ok, message] = [false, "سهمیه‌ی ماهانه تمام شده است."];
      const entry: TestLog = { id: `t${Date.now()}`, at: `${today} ${nowClock()}`, to: testTo, ok, message, provider: saved.provider };
      setSaved((x) => ({ ...x, usedThisMonth: x.usedThisMonth + (ok ? 1 : 0), log: [entry, ...x.log].slice(0, 20) }));
      setSending(false);
      notify(ok ? `پیامک آزمایشی از طریق ${providerLabel[saved.provider]} ارسال شد.` : message, ok ? "success" : "warning");
    }, 700);
  };

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<BellRing size={18} />}
        title="کانال‌های اطلاع‌رسانی (پیامک/ایمیل)"
        description="درگاه پیامک و فرستنده‌ی ایمیل سامانه؛ اعلان‌های هر ماژول فقط از کانال‌های روشن ارسال می‌شوند."
        actions={
          canEdit && (
            <>
              {dirty && (
                <Button variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setD(saved)}>
                  لغو تغییرات
                </Button>
              )}
              <Button variant="primary" icon={<Save size={14} />} onClick={commit} disabled={!dirty} className="disabled:opacity-45">
                ذخیره
              </Button>
            </>
          )
        }
      />

      <div className="card p-4">
        <h3 className="text-sm font-bold text-ink-900 mb-3">کانال‌ها</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              { k: "sms", label: "پیامک", hint: "کد ورود، هشدار فوری، اطلاعیه‌ی رسمی", icon: Smartphone },
              { k: "email", label: "ایمیل", hint: "خلاصه‌ی روزانه و اعلان‌های عادی", icon: Mail },
              { k: "push", label: "اعلان push", hint: "اپلیکیشن نصب‌شده (PWA)", icon: BellRing },
            ] as const
          ).map((c) => (
            <div key={c.k} className="flex items-start gap-2.5 border border-ink-100 rounded-lg p-3">
              <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                <c.icon size={15} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-ink-800">{c.label}</span>
                <span className="block text-[11.5px] text-ink-400 leading-5">{c.hint}</span>
              </span>
              <Toggle on={d.enabled[c.k]} disabled={!canEdit} onChange={() => set("enabled", { ...d.enabled, [c.k]: !d.enabled[c.k] })} label={c.label} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <MessageSquareText size={15} className="text-brand-600" /> درگاه پیامک
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="ارائه‌دهنده">
              <select className="input-field" value={d.provider} disabled={!canEdit} onChange={(e) => set("provider", e.target.value as SmsProvider)}>
                {(Object.keys(providerLabel) as SmsProvider[]).map((p) => (
                  <option key={p} value={p}>
                    {providerLabel[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="خط فرستنده">
              <input className="input-field" dir="ltr" value={d.sender} disabled={!canEdit} onChange={(e) => set("sender", e.target.value)} placeholder="10008663" />
            </Field>
          </div>
          <Field label="کلید API" hint="کلید فقط در سرور نگه‌داری می‌شود؛ اینجا به‌صورت پوشیده نمایش داده می‌شود.">
            <div className="flex gap-2">
              <input
                className="input-field flex-1 min-w-0 font-mono"
                dir="ltr"
                type={showKey ? "text" : "password"}
                value={d.apiKey}
                disabled={!canEdit}
                onChange={(e) => set("apiKey", e.target.value)}
                placeholder="کلید را وارد کنید"
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowKey((x) => !x)} className="w-10 shrink-0 rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 flex items-center justify-center" aria-label={showKey ? "پنهان کردن کلید" : "نمایش کلید"}>
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {saved.apiKey && !showKey && (
              <p className="text-[11px] text-ink-400 mt-1" dir="ltr">
                {mask(saved.apiKey)}
              </p>
            )}
          </Field>

          <div>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="font-semibold text-ink-700">سهمیه‌ی ماهانه</span>
              <span className="text-ink-500">
                {fa(saved.usedThisMonth)} از {fa(saved.monthlyQuota)} پیامک ({fa(pct)}٪)
              </span>
            </div>
            <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
              <div className={`h-full rounded-full ${pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[12px] text-ink-500 shrink-0">سقف:</span>
                <input className="input-field w-32" dir="ltr" inputMode="numeric" value={String(d.monthlyQuota)} onChange={(e) => set("monthlyQuota", Math.max(0, parseInt(toEnDigits(e.target.value), 10) || 0))} aria-label="سقف ماهانه" />
                <span className="text-[12px] text-ink-400">پیامک در ماه</span>
              </div>
            )}
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <Mail size={15} className="text-brand-600" /> فرستنده‌ی ایمیل
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="نشانی فرستنده">
              <input className="input-field" dir="ltr" value={d.emailFrom} disabled={!canEdit} onChange={(e) => set("emailFrom", e.target.value)} />
            </Field>
            <Field label="نام نمایشی">
              <input className="input-field" value={d.emailName} disabled={!canEdit} onChange={(e) => set("emailName", e.target.value)} />
            </Field>
          </div>

          <div className="border-t border-ink-100 pt-3">
            <h4 className="text-[13px] font-bold text-ink-900 mb-2 flex items-center gap-1.5">
              <Send size={14} className="text-brand-600" /> ارسال آزمایشی پیامک
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="input-field sm:w-44" dir="ltr" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="09121234567" aria-label="شماره‌ی گیرنده" />
              <input className="input-field flex-1 min-w-0" value={testText} onChange={(e) => setTestText(e.target.value)} aria-label="متن پیام" />
              <Button variant="secondary" icon={<Send size={14} />} onClick={testSend} disabled={sending || !testTo.trim()} className="disabled:opacity-45 justify-center">
                {sending ? "در حال ارسال…" : "ارسال"}
              </Button>
            </div>
            {dirty && <p className="text-[11px] text-amber-700 mt-1.5">آزمایش با تنظیمات ذخیره‌شده انجام می‌شود؛ ابتدا تغییرات را ذخیره کنید.</p>}
            <ul className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
              {saved.log.length === 0 && <li className="text-[12px] text-ink-400">هنوز ارسال آزمایشی انجام نشده.</li>}
              {saved.log.map((l) => (
                <li key={l.id} className="flex items-start gap-2 text-[12px]">
                  {l.ok ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> : <XCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />}
                  <span className="flex-1 min-w-0">
                    <span className="text-ink-700">{l.message}</span>
                    <span className="block text-[11px] text-ink-400">
                      <span dir="ltr">{l.to}</span> · {providerLabel[l.provider]} · {l.at}
                    </span>
                  </span>
                  <Badge tone={l.ok ? "success" : "danger"}>{l.ok ? "موفق" : "ناموفق"}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {saved.updatedAt && (
        <p className="text-[11.5px] text-ink-400">
          آخرین تغییر: {saved.updatedBy} · {saved.updatedAt}
        </p>
      )}
    </div>
  );
}
