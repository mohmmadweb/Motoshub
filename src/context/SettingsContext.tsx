import { createContext, useContext, useState, type ReactNode } from "react";

// پارامترهای گردش کار — همه‌ی اعداد ثابت روندها از اینجا خوانده می‌شوند و در
// «پنل راهبری ← پارامترهای گردش کار» قابل تغییرند.
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

export const settingsMeta: { key: keyof WorkflowSettings; label: string; unit: string; hint: string }[] = [
  { key: "reportReminderDays", label: "یادآوری سررسید گزارش", unit: "روز قبل", hint: "چند روز قبل از سررسید گزارش (طبق گانت)، یادآوری سیستمی برای مجری ارسال شود" },
  { key: "reviewEscalationDays", label: "مهلت بررسی گزارش", unit: "روز", hint: "اگر ناظر/راهبر/مدیر صندوق در این مدت بررسی نکند، اعلان اسکالیشن صادر می‌شود" },
  { key: "dormantProjectDays", label: "آستانه پروژه خوابیده", unit: "روز", hint: "نبود گزارش تعاملات معنادار در این بازه، پروژه را «در معرض توقف» می‌کند" },
  { key: "screeningThreshold", label: "حدنصاب غربالگری", unit: "از ۲۰۰", hint: "حداقل امتیاز فرم غربالگری ۲۲ معیاره برای ورود به ارزیابی موشکافانه" },
  { key: "juryThreshold", label: "حدنصاب داوری", unit: "از ۱۰۰", hint: "حداقل امتیاز ارزیابی ۵ بُعدی داوران برای ادامه مسیر" },
  { key: "legalReviewDays", label: "مهلت پاسخ واحد حقوقی", unit: "روز کاری", hint: "حداکثر زمان بررسی پیش‌نویس قرارداد توسط واحد حقوقی" },
  { key: "retentionPercent", label: "حسن انجام کار", unit: "٪", hint: "درصد نگه‌داشت از هر پرداخت تا پایان دوره تضمین" },
  { key: "prepaymentPercent", label: "سقف پیش‌پرداخت", unit: "٪ مبلغ قرارداد", hint: "حداکثر پیش‌پرداخت در قبال ضمانت‌نامه" },
  { key: "rateLimitPerMinute", label: "محدودیت نرخ درخواست", unit: "درخواست/دقیقه", hint: "حداکثر درخواست هر کاربر به سامانه در دقیقه" },
  { key: "editWindowCount", label: "دفعات مجاز ویرایش اثر جایزه", unit: "بار", hint: "تعداد دفعاتی که شرکت‌کننده جایزه نوآوری می‌تواند اثرش را ویرایش کند" },
];

type SettingsValue = {
  settings: WorkflowSettings;
  update: (patch: Partial<WorkflowSettings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WorkflowSettings>(defaultSettings);
  return (
    <SettingsContext.Provider
      value={{
        settings,
        update: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
        reset: () => setSettings(defaultSettings),
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
