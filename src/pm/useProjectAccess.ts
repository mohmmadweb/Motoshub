import { useMemo } from "react";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { TAB_RESOURCE, atLeast, canManageAccess, effectiveMatrix, fullMatrix, isOwner, isViewOnly, templateById, type AccessLevel, type AccessMatrix, type Editor, type ResourceId } from "./access";
import type { PMMember } from "./types";

export type ProjectAccess = {
  /** آیا کاربر جاری حداقل این سطح را روی بخش دارد؟ */
  can: (res: ResourceId, level?: AccessLevel) => boolean;
  level: (res: ResourceId) => AccessLevel;
  /** آیا تب صفحه‌ی پروژه برای کاربر جاری قابل مشاهده است؟ */
  canSeeTab: (tab: string) => boolean;
  matrix: AccessMatrix;
  member?: PMMember;
  /** مالک پروژه */
  isOwner: boolean;
  /** مدیر پروژه (meta.manager) */
  isManager: boolean;
  /** هیچ بخشی با سطح ویرایش ندارد (جایگزین نقش قدیمی «مشاهده‌گر») */
  viewOnly: boolean;
  /** ویرایشگر جاری (برای کنترل اعطای دسترسی) */
  editor: Editor;
  /** امکان ویرایش دسترسی‌های اعضا */
  canManageAccess: boolean;
};

/**
 * دسترسی ریز کاربر جاری در یک پروژه.
 * عضو پروژه ← نقشه‌ی صریح دسترسی‌های او (مالک همیشه کامل).
 * مدیر پروژه‌ی غیرعضو و دارنده‌ی مجوز سراسری projects.members ← کامل؛ دارنده‌ی projects.tasks ← قالب «اجرایی»؛ بقیه ← «فقط مشاهده».
 */
export function useProjectAccess(pid?: string): ProjectAccess {
  const { actingUser, hasPermission } = useTenancy();
  const pm = useProjectsPM();
  const p = pm.getProject(pid);
  const globalAdmin = hasPermission("projects.members");
  const canTasks = hasPermission("projects.tasks");
  return useMemo(() => {
    const member = p?.members.find((m) => m.userId === actingUser.id || m.name === actingUser.name);
    const manager = !!p && (p.meta.manager === actingUser.name || (!!member && member.name === p.meta.manager));
    const owner = !!member && isOwner(member);
    const matrix: AccessMatrix = member
      ? effectiveMatrix(member)
      : manager || globalAdmin
        ? fullMatrix()
        : canTasks
          ? { ...templateById.executive.matrix }
          : { ...templateById.viewer.matrix };
    const editor: Editor = { isOwner: owner, isManager: manager, matrix, globalAdmin, name: member?.name ?? actingUser.name };
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
      isOwner: owner,
      isManager: manager,
      viewOnly: isViewOnly(matrix),
      editor,
      canManageAccess: canManageAccess(editor),
    };
  }, [p, actingUser.id, actingUser.name, globalAdmin, canTasks]);
}
