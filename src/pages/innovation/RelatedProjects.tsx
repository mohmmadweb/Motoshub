// «پروژه‌های مرتبط» — پیوند برگشتی از صندوق/قرارداد/فرصت پژوهشی به پروژه‌هایی که در
// تنظیمات پروژه به آن وصل شده‌اند (ProjectMeta.fundId / contractId / opportunityId).
import { Link } from "react-router-dom";
import { ChevronLeft, KanbanSquare } from "lucide-react";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useTenancy } from "../../context/TenancyContext";

export default function RelatedProjects({ field, id }: { field: "fundId" | "contractId" | "opportunityId"; id: string }) {
  const pm = useProjectsPM();
  const { filterScoped } = useTenancy();
  const list = filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p })))
    .map((x) => x._p)
    .filter((p) => p.meta[field] === id);
  if (!list.length) return null;
  return (
    <div className="border-t border-ink-100 pt-4 mt-4">
      <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5">
        <KanbanSquare size={13} className="text-brand-600" /> پروژه‌های مرتبط
      </h4>
      <div className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
        {list.map((p) => (
          <Link key={p.meta.id} to={`/dashboard/projects/${p.meta.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-ink-50">
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-medium text-ink-800 truncate">{p.meta.name}</span>
              <span className="block text-[11px] text-ink-400">
                {p.meta.phase} · مدیر: {p.meta.manager}
              </span>
            </span>
            <ChevronLeft size={13} className="text-ink-300 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
