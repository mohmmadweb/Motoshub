// سیاست ورود (اختیاری، پیش‌فرض خاموش): رمز یک‌بارمصرف (OTP) برای نقش‌های مدیریتی یا نقش‌های
// انتخابی، مهلت نشست، سیاست گذرواژه و بازه‌های IP مورد اعتماد (نمایشی).
// ذخیره: motoshub.loginPolicy.v1 — ورود پیش‌فرض همچنان فقط نام کاربری + گذرواژه است.
import { ADMIN_PERMS, bindingLive, type IamState } from "./model";
import { createLocalStore, useLocalStore } from "./store";

export type LoginPolicy = {
  otpEnabled: boolean;
  /** admins = هر نقشی که یکی از ADMIN_PERMS را دارد · roles = نقش‌های انتخاب‌شده */
  otpTarget: "admins" | "roles";
  otpRoleIds: string[];
  otpChannel: "sms" | "app";
  sessionTimeoutMin: number;
  password: { minLength: number; requireDigits: boolean; requireSymbols: boolean; requireMixedCase: boolean; expiryDays: number; history: number };
  trustedRanges: { id: string; cidr: string; label: string }[];
  updatedAt?: string;
  updatedBy?: string;
};

export const DEMO_OTP = "123456";
export const DEMO_OTP_FA = "۱۲۳۴۵۶";

export const defaultLoginPolicy = (): LoginPolicy => ({
  otpEnabled: false,
  otpTarget: "admins",
  otpRoleIds: [],
  otpChannel: "sms",
  sessionTimeoutMin: 60,
  password: { minLength: 10, requireDigits: true, requireSymbols: false, requireMixedCase: true, expiryDays: 0, history: 3 },
  trustedRanges: [
    { id: "ip1", cidr: "10.20.0.0/16", label: "شبکه‌ی داخلی ستاد" },
    { id: "ip2", cidr: "185.112.32.0/24", label: "VPN سازمانی" },
  ],
});

export const loginPolicyStore = createLocalStore<LoginPolicy>("motoshub.loginPolicy.v1", defaultLoginPolicy, (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const d = defaultLoginPolicy();
  const r = raw as Partial<LoginPolicy>;
  return { ...d, ...r, password: { ...d.password, ...(r.password ?? {}) }, trustedRanges: Array.isArray(r.trustedRanges) ? r.trustedRanges : d.trustedRanges };
});

export const useLoginPolicy = () => useLocalStore(loginPolicyStore);

/** آیا ورود/جابه‌جایی به این کاربر طبق سیاست فعلی رمز یک‌بارمصرف لازم دارد؟ */
export function otpRequiredFor(policy: LoginPolicy, iam: IamState, userId: string, today: string) {
  if (!policy.otpEnabled) return false;
  const roles = iam.bindings.filter((b) => b.userId === userId && bindingLive(b, today)).map((b) => iam.roles.find((r) => r.id === b.roleId));
  if (policy.otpTarget === "admins") return roles.some((r) => r?.active && r.permissions.some((p) => ADMIN_PERMS.includes(p)));
  return roles.some((r) => r?.active && policy.otpRoleIds.includes(r.id));
}
