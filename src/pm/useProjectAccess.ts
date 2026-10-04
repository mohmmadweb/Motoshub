import { useMemo } from "react";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { ROLE_PRESETS, TAB_RESOURCE, atLeast, canManageAccess, effectiveMatrix, type AccessLevel, type AccessMatrix, type Editor, type ResourceId } from "./access";
import type { PMMember, ProjectRole } from "./types";

export type ProjectAccess = {
  /** آیا کاربر جاری حداقل این سطح را روی بخش دارد؟ */
  can: (res: ResourceId, level?: AccessLevel) => boolean;
  level: (res: ResourceId) => AccessLevel;
  /** آیا تب صفحه‌ی پروژه برای کاربر جاری قابل مشاهده است؟ */
  canSeeTab: (tab: string) => boolean;
  matrix: AccessMatrix;
  member?: PMMember;
  role?: ProjectRole;
  /** ویرایشگر جاری (برای کنترل اعطای دسترسی) */
  editor: Editor;
  /** امکان ویرایش دسترسی‌های اعضا */
  canManageAccess: boolean;
};

/**
 * دسترسی ریز کاربر جاری در یک پروژه.
 * عضو پروژه ← ماتریس مؤثر (پیش‌فرض نقش + بازنویسی‌ها).
 * غیرعضو ← دارنده‌ی مجوز سراسری projects.members مثل مدیر پروژه، دارنده‌ی projects.tasks مثل عضو، بقیه مثل مشاهده‌گر.
 */
export function useProjectAccess(pid?: string): ProjectAccess {
  const { actingUser, hasPermission } = useTenancy();
  const pm = useProjectsPM();
  const p = pm.getProject(pid);
  const globalAdmin = hasPermission("projects.members");
  const canTasks = hasPermission("projects.tasks");
  return useMemo(() => {
    const member = p?.members.find((m) => m.userId === actingUser.id || m.name === actingUser.name);
    const matrix: AccessMatrix = member ? effectiveMatrix(member) : globalAdmin ? { ...ROLE_PRESETS["مدیر پروژه"] } : canTasks ? { ...ROLE_PRESETS["عضو"] } : { ...ROLE_PRESETS["مشاهده‌گر"] };
    const editor: Editor = { role: member?.role, matrix, globalAdmin, name: actingUser.name };
    const can = (res: ResourceId, level: AccessLevel = "read") => atLeast(matrix[res] ?? "none", level);
    return {
      can,
      level: (res: ResourceId) => matrix[res] ?? "none",
      canSeeTab: (tab: string) => {
        const r = TAB_RESOURCE[tab];
        return r === null || r === undefined ? true : can(r, "read");
      },
      matrix,
      member,
      role: member?.role,
      editor,
      canManageAccess: canManageAccess(editor),
    };
  }, [p, actingUser.id, actingUser.name, globalAdmin, canTasks]);
}
