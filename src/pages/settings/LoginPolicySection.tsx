// ---------------------------------------------------------------------------
// «سیاست ورود و تأیید دومرحله‌ای» — اختیاری و پیش‌فرض خاموش. ورود عادی همچنان فقط
// نام کاربری + گذرواژه است؛ اگر OTP روشن شود، برای نقش‌های مدیریتی (یا نقش‌های انتخابی)
// بعد از گذرواژه / هنگام «مشاهده به‌عنوان» پرسونا یک مرحله‌ی کد شبیه‌سازی‌شده می‌آید.
// ذخیره: motoshub.loginPolicy.v1 — هر ذخیره در تاریخچه (settings.changed) ثبت می‌شود.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Clock, KeyRound, Network, Plus, RotateCcw, Save, ShieldCheck, Smartphone, Trash2, Users } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { users } from "../../data/mock";
import { ADMIN_PERMS } from "../../iam/model";
import { DEMO_OTP_FA, defaultLoginPolicy, loginPolicyStore, otpRequiredFor, useLoginPolicy, type LoginPolicy } from "../../iam/loginPolicy";
import { diffKeys, emitSettingsChange } from "../../iam/settingsAudit";
import { nowClock } from "../../pm/jalali";
import { Callout, Field, SectionHead, fmtN } from "./iam/shared";

const CIDR = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
const validCidr = (v: string) => {
  const m = CIDR.exec(v.trim());
  return !!m && m.slice(1, 5).every((x) => Number(x) <= 255) && Number(m[5]) <= 32;
};

export default function LoginPolicySection() {
  const t = useTenancy();
  const { notify } = useToast();
  const saved = useLoginPolicy();
  const [d, setD] = useState<LoginPolicy>(saved);
  const [cidr, setCidr] = useState("");
  const [cidrLabel, setCidrLabel] = useState("");
  const canEdit = t.hasPermission("settings.security") && !t.readOnly;
  const dirty = JSON.stringify(d) !== JSON.stringify(saved);
  const set = <K extends keyof LoginPolicy>(k: K, v: LoginPolicy[K]) => setD((x) => ({ ...x, [k]: v }));
  const setPw = <K extends keyof LoginPolicy["password"]>(k: K, v: LoginPolicy["password"][K]) => setD((x) => ({ ...x, password: { ...x.password, [k]: v } }));

  const roles = useMemo(() => t.iam.roles.filter((r) => r.active), [t.iam.roles]);
  const covered = useMemo(() => users.filter((u) => otpRequiredFor({ ...d, otpEnabled: true }, t.iam, u.id, t.today)), [d, t.iam, t.today]);

  const save = () => {
    const strip = (p: LoginPolicy) => ({ ...p, updatedAt: undefined, updatedBy: undefined });
    const diff = diffKeys(strip(saved), strip(d));
    const next = { ...d, updatedAt: `${t.today} ${nowClock()}`, updatedBy: t.actingUser.name };
    loginPolicyStore.set(next);
    setD(next);
    if (diff) emitSettingsChange({ area: "سیاست ورود", summary: `تغییر ${Object.keys(diff.after).join("، ")}${next.otpEnabled !== saved.otpEnabled ? (next.otpEnabled ? " — تأیید دومرحله‌ای روشن شد" : " — تأیید دومرحله‌ای خاموش شد") : ""}`, before: diff.before, after: diff.after });
    notify("سیاست ورود ذخیره شد.", "success");
  };
  const addRange = () => {
    if (!validCidr(cidr)) return notify("بازه را به شکل CIDR بنویسید؛ مثلاً 10.20.0.0/16", "warning");
    if (d.trustedRanges.some((r) => r.cidr === cidr.trim())) return notify("این بازه از قبل هست.", "warning");
    set("trustedRanges", [...d.trustedRanges, { id: `ip${Date.now()}`, cidr: cidr.trim(), label: cidrLabel.trim() || "بدون عنوان" }]);
    setCidr("");
    setCidrLabel("");
  };

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<ShieldCheck size={18} />}
        title="سیاست ورود و تأیید دومرحله‌ای"
        description="ورود پیش‌فرض فقط نام کاربری و گذرواژه است. تأیید دومرحله‌ای اختیاری است و فقط برای نقش‌هایی که انتخاب کنید اعمال می‌شود."
        actions={
          <>
            {saved.updatedAt && <span className="text-[11px] text-ink-400">آخرین ذخیره: {saved.updatedAt} — {saved.updatedBy}</span>}
            <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} disabled={!canEdit} onClick={() => setD({ ...defaultLoginPolicy(), trustedRanges: d.trustedRanges })}>
              پیش‌فرض
            </Button>
            <Button variant="primary" size="sm" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
              ذخیره
            </Button>
          </>
        }
      />

      {/* OTP */}
      <div className="card p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
              <Smartphone size={15} className="text-brand-600" /> رمز یک‌بارمصرف (OTP)
              {d.otpEnabled ? <Badge tone="success">روشن</Badge> : <Badge tone="neutral">خاموش</Badge>}
            </p>
            <p className="text-[12px] text-ink-500 mt-0.5 leading-5">بعد از گذرواژه، کد ۶ رقمی خواسته می‌شود. در این دمو کد شبیه‌سازی‌شده است (کد آزمایشی: {DEMO_OTP_FA}).</p>
          </div>
          <Toggle on={d.otpEnabled} disabled={!canEdit} onChange={() => set("otpEnabled", !d.otpEnabled)} label="رمز یک‌بارمصرف" />
        </div>
        <div className={`space-y-3 ${d.otpEnabled ? "" : "opacity-60"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                ["admins", "همه‌ی نقش‌های مدیریتی", `نقشی که یکی از ${fmtN(ADMIN_PERMS.length)} مجوز مدیریتی (ساخت واحد، تخصیص نقش، …) را دارد`],
                ["roles", "نقش‌های انتخابی", "فقط نقش‌هایی که پایین‌تر علامت می‌زنید"],
              ] as const
            ).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                disabled={!canEdit}
                onClick={() => set("otpTarget", id)}
                className={`text-right rounded-lg border px-3 py-2.5 ${d.otpTarget === id ? "border-brand-400 bg-brand-50" : "border-ink-200 hover:bg-ink-50"} disabled:cursor-not-allowed`}
              >
                <span className="block text-[12.5px] font-semibold text-ink-800">{label}</span>
                <span className="block text-[11px] text-ink-500 leading-5">{hint}</span>
              </button>
            ))}
          </div>
          {d.otpTarget === "roles" && (
            <div className="rounded-lg border border-ink-200 max-h-52 overflow-y-auto divide-y divide-ink-100">
              {roles.map((r) => {
                const on = d.otpRoleIds.includes(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-2 px-3 py-2 text-[12.5px] cursor-pointer hover:bg-ink-50">
                    <input type="checkbox" checked={on} disabled={!canEdit} onChange={() => set("otpRoleIds", on ? d.otpRoleIds.filter((x) => x !== r.id) : [...d.otpRoleIds, r.id])} className="accent-[var(--color-brand-600)]" />
                    <span className="flex-1 min-w-0 truncate text-ink-800">{r.name}</span>
                    {t.isAdminRole(r) && <Badge tone="navy">مدیریتی</Badge>}
                    <span className="text-[10.5px] text-ink-400 shrink-0">{t.scopeLabel(r.createdIn)}</span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-3 items-end">
            <Field label="روش ارسال کد">
              <select className="input-field" value={d.otpChannel} disabled={!canEdit} onChange={(e) => set("otpChannel", e.target.value as LoginPolicy["otpChannel"])}>
                <option value="sms">پیامک (درگاه کانال‌های اطلاع‌رسانی)</option>
                <option value="app">اپلیکیشن احراز هویت (TOTP)</option>
              </select>
            </Field>
            <div className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-[12px] text-ink-600 flex items-center gap-2 flex-wrap">
              <Users size={13} className="text-ink-400" />
              <span>
                <b className="text-ink-900">{fmtN(covered.length)}</b> نفر از کاربران نمونه با این تنظیم کد می‌خواهند
              </span>
              {covered.slice(0, 4).map((u) => (
                <Badge key={u.id} tone="neutral">
                  {u.name}
                </Badge>
              ))}
              {covered.length > 4 && <span className="text-ink-400">…</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* نشست */}
        <div className="card p-4 space-y-3">
          <p className="text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
            <Clock size={15} className="text-brand-600" /> نشست
          </p>
          <Field label="خروج خودکار پس از عدم فعالیت (دقیقه)" hint="بین ۵ تا ۷۲۰ دقیقه. هلدینگ‌ها/شرکت‌ها اگر قفل نشده باشد می‌توانند در «برند و تنظیمات لایه‌ای» بازنویسی کنند.">
            <input type="number" min={5} max={720} className="input-field" value={d.sessionTimeoutMin} disabled={!canEdit} onChange={(e) => set("sessionTimeoutMin", Math.max(5, Math.min(720, Number(e.target.value) || 5)))} />
          </Field>
        </div>

        {/* گذرواژه */}
        <div className="card p-4 space-y-3">
          <p className="text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
            <KeyRound size={15} className="text-brand-600" /> سیاست گذرواژه
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="حداقل طول">
              <input type="number" min={6} max={64} className="input-field" value={d.password.minLength} disabled={!canEdit} onChange={(e) => setPw("minLength", Math.max(6, Math.min(64, Number(e.target.value) || 6)))} />
            </Field>
            <Field label="انقضا (روز)" hint="۰ = بدون انقضا">
              <input type="number" min={0} max={365} className="input-field" value={d.password.expiryDays} disabled={!canEdit} onChange={(e) => setPw("expiryDays", Math.max(0, Math.min(365, Number(e.target.value) || 0)))} />
            </Field>
            <Field label="تکرارنشدن">
              <input type="number" min={0} max={24} className="input-field" value={d.password.history} disabled={!canEdit} onChange={(e) => setPw("history", Math.max(0, Math.min(24, Number(e.target.value) || 0)))} />
            </Field>
          </div>
          {(
            [
              ["requireDigits", "حداقل یک رقم"],
              ["requireMixedCase", "حروف کوچک و بزرگ"],
              ["requireSymbols", "حداقل یک نماد (!@#…)"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-ink-700">{label}</span>
              <Toggle on={d.password[k]} disabled={!canEdit} onChange={() => setPw(k, !d.password[k])} label={label} />
            </div>
          ))}
        </div>
      </div>

      {/* IP */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
            <Network size={15} className="text-brand-600" /> بازه‌های IP مورد اعتماد
          </p>
          <Badge tone="warning">نمایشی — در دمو اعمال نمی‌شود</Badge>
        </div>
        <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
          {d.trustedRanges.map((r) => (
            <li key={r.id} className="flex items-center gap-2 px-3 py-2">
              <span dir="ltr" className="font-mono text-[12px] text-ink-800">
                {r.cidr}
              </span>
              <span className="text-[12px] text-ink-500 flex-1 min-w-0 truncate">{r.label}</span>
              <button type="button" disabled={!canEdit} onClick={() => set("trustedRanges", d.trustedRanges.filter((x) => x.id !== r.id))} className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label="حذف">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
          {!d.trustedRanges.length && <li className="px-3 py-3 text-center text-[12px] text-ink-400">بازه‌ای تعریف نشده است.</li>}
        </ul>
        <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)_auto] gap-2">
          <input dir="ltr" className="input-field font-mono" value={cidr} disabled={!canEdit} onChange={(e) => setCidr(e.target.value)} placeholder="10.20.0.0/16" aria-label="بازه CIDR" />
          <input className="input-field" value={cidrLabel} disabled={!canEdit} onChange={(e) => setCidrLabel(e.target.value)} placeholder="عنوان (مثلاً VPN سازمانی)" aria-label="عنوان بازه" />
          <Button variant="secondary" icon={<Plus size={14} />} disabled={!canEdit} onClick={addRange}>
            افزودن
          </Button>
        </div>
      </div>

      {!canEdit && <Callout tone="neutral">{t.readOnly ? "در حالت مشاهده به‌عنوان، تنظیمات فقط‌خواندنی است." : "برای تغییر این بخش مجوز «تنظیمات امنیت و انطباق» لازم است."}</Callout>}
    </div>
  );
}
