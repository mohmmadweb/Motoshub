import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { diffKeys, emitSettingsChange } from "../iam/settingsAudit";

// پارامترهای گردش کار — همه‌ی اعداد ثابت روندها از اینجا خوانده می‌شوند. هر پارامتر به یک
// ماژول تعلق دارد (settingsMeta[].module) و در «تنظیمات سامانه» زیر همان ماژول ویرایش می‌شود:
// نوآوری (صندوق / قراردادها / جایزه) و زیرساخت (محدودیت نرخ). مقدارها در مرورگر می‌مانند
// (motoshub.workflowSettings.v1). API قبلی (useSettings، settingsMeta، defaultSettings) بدون تغییر است.
export type WorkflowSettings = {
  reportReminderDays: number; // یادآوری قبل از سررسید گزارش
  reviewEscalationDays: number; // مهلت بررسی ناظر/راهبر/مدیر
  dormantProjectDays: number; // آستانه پروژه خوابیده (بدون تعامل)
  screeningThreshold: number; // حدنصاب غربالگری (از ۲۰۰)
  juryThreshold: number; // حدنصاب داوری (از ۱۰۰)
  legalReviewDays: number; // مهلت پاسخ واحد حقوقی به پیش‌نویس قرارداد
  retentionPercent: number; // درصد حسن انجام کار
  prepaymentPercent: number; // سقف درصد پیش‌پرداخت
  rateLimitPerMinute: number; // محدودیت نرخ درخواست
  editWindowCount: number; // دفعات مجاز ویرایش اثر جایزه نوآوری
};

export const defaultSettings: WorkflowSettings = {
  reportReminderDays: 7,
  reviewEscalationDays: 15,
  dormantProjectDays: 30,
  screeningThreshold: 80,
  juryThreshold: 50,
  legalReviewDays: 7,
  retentionPercent: 10,
  prepaymentPercent: 25,
  rateLimitPerMinute: 60,
  editWindowCount: 1,
};

/** ماژول صاحب هر پارامتر — مبنای تفکیک در «تنظیمات سامانه» */
export type SettingsModule = "funds" | "contracts" | "award" | "infra";
export const settingsModuleLabel: Record<SettingsModule, string> = { funds: "صندوق نوآوری", contracts: "قراردادهای فناورانه", award: "جایزه‌ی نوآوری", infra: "زیرساخت" };

export const settingsMeta: { key: keyof WorkflowSettings; label: string; unit: string; hint: string; module: SettingsModule }[] = [
  { key: "reportReminderDays", module: "funds", label: "یادآوری سررسید گزارش", unit: "روز قبل", hint: "چند روز قبل از سررسید گزارش (طبق گانت)، یادآوری سیستمی برای مجری ارسال شود" },
  { key: "reviewEscalationDays", module: "funds", label: "مهلت بررسی گزارش", unit: "روز", hint: "اگر ناظر/راهبر/مدیر صندوق در این مدت بررسی نکند، اعلان اسکالیشن صادر می‌شود" },
  { key: "dormantProjectDays", module: "funds", label: "آستانه پروژه خوابیده", unit: "روز", hint: "نبود گزارش تعاملات معنادار در این بازه، پروژه را «در معرض توقف» می‌کند (همان مقداری که «تنظیمات صندوق» ویرایش می‌کند)" },
  { key: "screeningThreshold", module: "funds", label: "حدنصاب غربالگری", unit: "از ۲۰۰", hint: "حداقل امتیاز فرم غربالگری ۲۲ معیاره برای ورود به ارزیابی موشکافانه" },
  { key: "juryThreshold", module: "funds", label: "حدنصاب داوری", unit: "از ۱۰۰", hint: "حداقل امتیاز ارزیابی ۵ بُعدی داوران برای ادامه مسیر" },
  { key: "legalReviewDays", module: "contracts", label: "مهلت پاسخ واحد حقوقی", unit: "روز کاری", hint: "حداکثر زمان بررسی پیش‌نویس قرارداد توسط واحد حقوقی" },
  { key: "retentionPercent", module: "contracts", label: "حسن انجام کار", unit: "٪", hint: "درصد نگه‌داشت از هر پرداخت تا پایان دوره تضمین" },
  { key: "prepaymentPercent", module: "contracts", label: "سقف پیش‌پرداخت", unit: "٪ مبلغ قرارداد", hint: "حداکثر پیش‌پرداخت در قبال ضمانت‌نامه" },
  { key: "rateLimitPerMinute", module: "infra", label: "محدودیت نرخ درخواست", unit: "درخواست/دقیقه", hint: "حداکثر درخواست هر کاربر به سامانه در دقیقه" },
  { key: "editWindowCount", module: "award", label: "دفعات مجاز ویرایش اثر جایزه", unit: "بار", hint: "تعداد دفعاتی که شرکت‌کننده جایزه نوآوری می‌تواند اثرش را ویرایش کند" },
];
export const settingsMetaOf = (module: SettingsModule) => settingsMeta.filter((m) => m.module === module);

const STORAGE_KEY = "motoshub.workflowSettings.v1";
function loadSettings(): WorkflowSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<WorkflowSettings>;
      const out = { ...defaultSettings };
      (Object.keys(defaultSettings) as (keyof WorkflowSettings)[]).forEach((k) => {
        if (typeof v[k] === "number" && Number.isFinite(v[k])) out[k] = v[k] as number;
      });
      return out;
    }
  } catch {
    /* بدون حافظه‌ی مرورگر */
  }
  return defaultSettings;
}

// مقدار زنده برای کدهای غیر React (مثل مقدار ریشه‌ی تنظیمات لایه‌ای در src/iam/scopedSettings.ts)
let live: WorkflowSettings | null = null;
/** پارامترهای گردش کار فعلی (بیرون از React) */
export function getWorkflowSettings(): WorkflowSettings {
  if (!live) live = loadSettings();
  return live;
}

type SettingsValue = {
  settings: WorkflowSettings;
  update: (patch: Partial<WorkflowSettings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

// هر تغییر با رویداد settings.changed (قبل/بعد) در تاریخچه‌ی IAM ثبت می‌شود (از راه گذرگاه settingsAudit)
const labelOf = (k: string) => settingsMeta.find((m) => m.key === k)?.label ?? k;
function audit(before: WorkflowSettings, after: WorkflowSettings, what: string) {
  const d = diffKeys(before, after);
  if (!d) return;
  const names = Object.keys(d.after).map(labelOf).join("، ");
  emitSettingsChange({ area: "پارامترهای گردش کار", summary: `${what}: ${names}`, before: d.before, after: d.after });
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WorkflowSettings>(loadSettings);
  live = settings;
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* نادیده */
    }
  }, [settings]);
  return (
    <SettingsContext.Provider
      value={{
        settings,
        update: (patch) => {
          const next = { ...settings, ...patch };
          audit(settings, next, "تغییر");
          setSettings((prev) => ({ ...prev, ...patch }));
        },
        reset: () => {
          audit(settings, defaultSettings, "بازگشت به پیش‌فرض");
          setSettings(defaultSettings);
        },
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
