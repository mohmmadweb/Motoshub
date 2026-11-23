import { useMemo } from "react";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { users as allUsers } from "../../data/mock";
import { isProjectManager } from "../../pm/rules";

/**
 * دامنه‌ی پایش: دارنده‌ی monitoring.view همه‌ی پروژه‌های قابل‌دیدن را می‌بیند؛ مدیر پروژه فقط پروژه‌هایی که مدیرشان است.
 * افراد = اجتماع زیردرخت عضویت‌های کاربر (visibleUserIds) — قاعده‌ی دید افراد.
 */
export function useMonitorScope() {
  const { hasPermission, actingUser, visibleUserIds } = useTenancy();
  const pm = useProjectsPM();
  const all = hasPermission("monitoring.view");
  return useMemo(() => {
    const projects = pm.projects.filter((p) => all || isProjectManager(p, actingUser.name));
    const ids = new Set(visibleUserIds());
    const people = allUsers.filter((u) => ids.has(u.id));
    return { projects, people, all };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pm.projects, all, actingUser.name]);
}
