// ---------------------------------------------------------------------------
// پیش‌فرض‌های سراسری پروژه‌های جدید — «تنظیمات پروژه» در سطح سازمان.
// هر پروژه پس از ساخت تنظیمات خودش را دارد (تب «تنظیمات» پروژه)؛ این‌ها فقط نقطه‌ی شروع
// پروژه‌های تازه‌اند. ذخیره: motoshub.projectDefaults.v1 — هر ذخیره در تاریخچه ثبت می‌شود.
//
// برای سازنده‌ی پروژه (ProjectsContext / src/pm): useProjectDefaults() یا projectDefaultsStore.get()
// را بخوانید و هنگام ساخت پروژه‌ی جدید columns، automation (enabled)، meetingSettings،
// meta.visibility/priority، budget.thresholds و دسترسی عضو تازه (memberAccess) را از آن بگیرید.
// ساعت موظف، پنجشنبه و تعطیلات سازمانی منبع جدا دارند: تنظیمات کارکرد (TimesheetContext).
// ---------------------------------------------------------------------------
import { createLocalStore, useLocalStore } from "../../iam/store";
import { diffKeys, emitSettingsChange } from "../../iam/settingsAudit";
import { defaultAutomation, defaultColumns } from "../../pm/seed";
import { defaultMeetingSettings, typeLabel } from "../../pm/selectors";
import type { AccessTemplateId } from "../../pm/access";
import type { BoardColumn, MeetingSettings, PMPriority, ProjectPriority, TaskType, Visibility } from "../../pm/types";

export type ProjectDefaults = {
  version: 1;
  /** بازه‌ی ساعت کاری روز (برای پیشنهاد زمان جلسه و «زمان مشترک») */
  workHours: { start: string; end: string };
  meeting: MeetingSettings;
  /** ستون‌ها/وضعیت‌های پیش‌فرض بورد */
  columns: BoardColumn[];
  /** انواع کار فعال در پروژه‌ی جدید + نوع پیش‌فرض تسک تازه */
  taskTypes: TaskType[];
  defaultTaskType: TaskType;
  defaultTaskPriority: PMPriority;
  project: { visibility: Visibility; priority: ProjectPriority; budgetThresholds: number[]; intakeOpen: boolean };
  /** قواعد خودکارسازی داخلی: شناسه → روشن/خاموش */
  automation: Record<string, boolean>;
  /** دسترسی عضو تازه: قالب آماده یا «نمای کلی» (مشاهده‌ی وظایف، مایل‌ستون‌ها و جلسات) */
  memberAccess: AccessTemplateId | "overview";
  updatedAt?: string;
  updatedBy?: string;
};

export const allTaskTypes = Object.keys(typeLabel) as TaskType[];

export const defaultProjectDefaults = (): ProjectDefaults => ({
  version: 1,
  workHours: { start: "08:00", end: "16:00" },
  meeting: { ...defaultMeetingSettings },
  columns: defaultColumns(),
  taskTypes: allTaskTypes,
  defaultTaskType: "task",
  defaultTaskPriority: "متوسط",
  project: { visibility: "فقط اعضا", priority: "متوسط", budgetThresholds: [80, 100], intakeOpen: false },
  automation: Object.fromEntries(defaultAutomation().map((a) => [a.id, a.enabled])),
  memberAccess: "overview",
});

export const projectDefaultsStore = createLocalStore<ProjectDefaults>("motoshub.projectDefaults.v1", defaultProjectDefaults, (raw) => {
  const r = raw as Partial<ProjectDefaults> | null;
  if (!r || r.version !== 1) return null;
  const d = defaultProjectDefaults();
  return { ...d, ...r, workHours: { ...d.workHours, ...r.workHours }, meeting: { ...d.meeting, ...r.meeting }, project: { ...d.project, ...r.project }, automation: { ...d.automation, ...r.automation } } as ProjectDefaults;
});

/** پیش‌فرض‌های سراسری پروژه (زنده؛ با هر ذخیره به‌روز می‌شود) */
export function useProjectDefaults(): ProjectDefaults {
  return useLocalStore(projectDefaultsStore);
}

export function saveProjectDefaults(next: ProjectDefaults, actor: string, at: string) {
  const prev = projectDefaultsStore.get();
  const strip = (p: ProjectDefaults) => ({ ...p, updatedAt: undefined, updatedBy: undefined });
  const d = diffKeys(strip(prev), strip(next));
  projectDefaultsStore.set({ ...next, updatedAt: at, updatedBy: actor });
  if (d) emitSettingsChange({ area: "پیش‌فرض‌های پروژه", summary: `تغییر ${Object.keys(d.after).map((k) => sectionLabel[k] ?? k).join("، ")}`, before: d.before, after: d.after });
}

const sectionLabel: Record<string, string> = {
  workHours: "ساعت کاری",
  meeting: "جلسات",
  columns: "وضعیت‌های بورد",
  taskTypes: "انواع کار",
  defaultTaskType: "نوع پیش‌فرض تسک",
  defaultTaskPriority: "اولویت پیش‌فرض تسک",
  project: "مشخصات پروژه‌ی جدید",
  automation: "خودکارسازی",
  memberAccess: "دسترسی عضو تازه",
};
