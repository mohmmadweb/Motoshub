import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { diffKeys, emitSettingsChange } from "../iam/settingsAudit";

// پارامترهای گردش کار — اعداد ثابت روندها از اینجا خوانده می‌شوند. هر پارامتر به یک ماژول تعلق دارد
// (settingsMeta[].module): گردش کار (یادآوری گزارش — مقدار ریشه‌ی تنظیمات لایه‌ای) و زیرساخت (محدودیت نرخ).
// مقدارها در مرورگر می‌مانند (motoshub.workflowSettings.v1)؛ کلیدهای قدیمیِ بخش حذف‌شده‌ی «نوآوری و پژوهش»
// هنگام بارگذاری نادیده گرفته می‌شوند. API قبلی (useSettings، settingsMeta، defaultSettings) بدون تغییر است.
export type WorkflowSettings = {
  reportReminderDays: number; // یادآوری قبل از سررسید گزارش
  rateLimitPerMinute: number; // محدودیت نرخ درخواست
};

export const defaultSettings: WorkflowSettings = {
  reportReminderDays: 7,
  rateLimitPerMinute: 60,
};

/** ماژول صاحب هر پارامتر — مبنای تفکیک در «تنظیمات سامانه» */
export type SettingsModule = "workflow" | "infra";
export const settingsModuleLabel: Record<SettingsModule, string> = { workflow: "گردش کار", infra: "زیرساخت" };

export const settingsMeta: { key: keyof WorkflowSettings; label: string; unit: string; hint: string; module: SettingsModule }[] = [
  { key: "reportReminderDays", module: "workflow", label: "یادآوری سررسید گزارش", unit: "روز قبل", hint: "چند روز قبل از سررسید گزارش، یادآوری سیستمی ارسال شود" },
  { key: "rateLimitPerMinute", module: "infra", label: "محدودیت نرخ درخواست", unit: "درخواست/دقیقه", hint: "حداکثر درخواست هر کاربر به سامانه در دقیقه" },
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
