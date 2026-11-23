import { useNavigate } from "react-router-dom";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useProjectAccess } from "../../pm/useProjectAccess";
import { ProjectPageContext, type TabId } from "./shared";
import TaskDrawer from "./TaskDrawer";
import { useProjectRules } from "./useRules";

/**
 * برگه‌ی کناری کار بیرون از صفحه‌ی پروژه («فعالیت و وظایف من»، مانیتورینگ): همان جزئیات کار با
 * همان دسترسی‌های ریز پروژه. `readOnly` برای کارتابل همکار (مدیر فقط می‌بیند).
 */
export default function TaskSheetHost({ pid, taskId, onClose, readOnly = false, onOpenTask }: { pid: string | null; taskId: string | null; onClose: () => void; readOnly?: boolean; onOpenTask?: (taskId: string) => void }) {
  const pm = useProjectsPM();
  const p = pm.getProject(pid ?? undefined);
  const access = useProjectAccess(pid ?? undefined);
  const rules = useProjectRules(p);
  const { hasPermission } = useTenancy();
  const navigate = useNavigate();
  if (!p || !pid || !taskId || !access.can("tasks")) return null;
  const viewOnlyMember = !!access.member && access.viewOnly;
  const editable = !readOnly && hasPermission("projects.tasks") && !viewOnlyMember && !p.meta.archived;
  const canEdit = editable && access.can("tasks", "write") && rules.canEditTasks;
  const ctx = {
    p,
    pid,
    canEdit,
    canManage: editable && access.can("settings", "manage"),
    can: (perm: string) => canEdit && hasPermission(perm),
    hasPerm: hasPermission,
    refDate: pm.refDate,
    openTask: (id: string) => onOpenTask?.(id),
    goTab: (tab: TabId, entityId?: string) => navigate(`/projects/${pid}?tab=${tab}${entityId ? `&focus=${entityId}` : ""}`),
    access,
    editable,
  };
  return (
    <ProjectPageContext.Provider value={ctx}>
      <TaskDrawer taskId={taskId} onClose={onClose} />
    </ProjectPageContext.Provider>
  );
}
