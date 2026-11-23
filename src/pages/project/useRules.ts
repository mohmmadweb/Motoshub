import { useTenancy } from "../../context/TenancyContext";
import { controlOf, isProjectManager, modulesOf } from "../../pm/rules";
import type { ProjectState } from "../../pm/types";

/** قواعد میزیتو برای کاربر جاری در یک پروژه (مدیر/مدیران، ماژول‌ها، تنظیمات کنترلی) */
export function useProjectRules(p: ProjectState | undefined) {
  const { actingUser, hasPermission } = useTenancy();
  const me = actingUser.name;
  const isMgr = !!p && (hasPermission("projects.members") || isProjectManager(p, me));
  const control = p ? controlOf(p) : controlOf({ meta: {} } as ProjectState);
  const modules = p ? modulesOf(p) : modulesOf({ meta: {} } as ProjectState);
  return {
    me,
    isMgr,
    control,
    modules,
    /** بازگرداندن کار انجام‌شده به جریان فقط با مدیر پروژه */
    canReopen: isMgr,
    /** عقب‌بردن سررسید/یادآوری */
    canExtend: isMgr || control.members_extend_due,
    canCreateTasks: isMgr || control.members_create_tasks,
    canEditTasks: isMgr || control.members_edit_tasks,
    /** حذف/بایگانی کار باید به درخواست تبدیل شود */
    removalNeedsApproval: !isMgr && control.board_removal_needs_manager,
  };
}

export const REOPEN_BLOCKED = "فقط مدیر پروژه می‌تواند کار انجام‌شده را دوباره به جریان برگرداند.";
export const EXTEND_BLOCKED = "در این پروژه عقب‌بردن سررسید و یادآوری فقط با مدیر پروژه است.";
