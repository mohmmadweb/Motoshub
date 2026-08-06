import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { KanbanSquare, Plus, Wallet, ListChecks, ClipboardList, PlayCircle, AlertTriangle, Milestone, GanttChartSquare, ListFilter } from "lucide-react";
import { projects as initialProjects, playbookTemplates as initialPlaybooks, type Project, type PlaybookTemplate } from "../data/mock";
import { projectDetails } from "../data/mockDetails";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import RowActions from "../components/ui/RowActions";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useTenancy } from "../context/TenancyContext";
import { ScopeBadge, ScopePicker } from "../components/ui/ScopeControl";
import { withDemoScopes, type Scoped } from "../data/tenancy";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import StatCard from "../components/ui/StatCard";
import { useToast } from "../components/ui/ToastProvider";

const healthTone: Record<string, BadgeTone> = {
  سبز: "success",
  زرد: "warning",
  قرمز: "danger",
};

const healthFilters = ["همه", "سبز", "زرد", "قرمز"] as const;

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(() => withDemoScopes(initialProjects, 18));
  const [playbooks, setPlaybooks] = useState<PlaybookTemplate[]>(initialPlaybooks);
  const [healthFilter, setHealthFilter] = useState<(typeof healthFilters)[number]>("همه");
  const [projectOpen, setProjectOpen] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [deadline, setDeadline] = useState("");
  const [pbName, setPbName] = useState("");
  const [pbCategory, setPbCategory] = useState("");
  const [pbSteps, setPbSteps] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingPbId, setEditingPbId] = useState<string | null>(null);
  const { notify } = useToast();
  const confirm = useConfirm();
  const { filterScoped, defaultScopeForNew, hasPermission, canManageItem, actingUser } = useTenancy();
  const [itemScope, setItemScope] = useState<Scoped>({ scope: "سراسری" });

  const startEditProject = (p: Project) => {
    setEditingProjectId(p.id);
    setItemScope({ scope: p.scope, holdingId: p.holdingId, companyId: p.companyId });
    setName(p.name);
    setClient(p.client);
    setDeadline(p.deadline === "نامشخص" ? "" : p.deadline);
    setProjectOpen(true);
  };

  const removeProject = (p: Project) =>
    confirm({
      title: `حذف پروژه «${p.name}»؟`,
      message: `${p.tasks.length.toLocaleString("fa-IR")} تسک، بورد و سوابق بودجه‌ی این پروژه حذف می‌شود.`,
      onConfirm: () => {
        setProjects((prev) => prev.filter((x) => x.id !== p.id));
        notify(`پروژه «${p.name}» حذف شد.`, "info");
      },
    });

  const closeProjectModal = () => {
    setProjectOpen(false);
    setEditingProjectId(null);
    setName("");
    setClient("");
    setDeadline("");
  };

  const startEditPlaybook = (pb: PlaybookTemplate) => {
    setEditingPbId(pb.id);
    setPbName(pb.name);
    setPbCategory(pb.category);
    setPbSteps(String(pb.steps));
    setPlaybookOpen(true);
  };

  const removePlaybook = (pb: PlaybookTemplate) =>
    confirm({
      title: `حذف قالب «${pb.name}»؟`,
      message: `این قالب ${pb.usedCount.toLocaleString("fa-IR")} بار استفاده شده؛ پروژه‌های ساخته‌شده از آن دست‌نخورده می‌مانند.`,
      onConfirm: () => {
        setPlaybooks((prev) => prev.filter((x) => x.id !== pb.id));
        notify(`قالب «${pb.name}» حذف شد.`, "info");
      },
    });

  const closePlaybookModal = () => {
    setPlaybookOpen(false);
    setEditingPbId(null);
    setPbName("");
    setPbCategory("");
    setPbSteps("");
  };

  const submitProject = () => {
    if (!name.trim() || !client.trim()) {
      notify("نام پروژه و کارفرما الزامی است.", "warning");
      return;
    }
    if (editingProjectId) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProjectId ? { ...p, name: name.trim(), client: client.trim(), deadline: deadline.trim() || "نامشخص", ...itemScope } : p
        )
      );
      notify(`پروژه «${name.trim()}» ویرایش شد.`);
      closeProjectModal();
      return;
    }
    const newProject: Project = {
      id: `pr-${Date.now()}`,
      name: name.trim(),
      client: client.trim(),
      health: "سبز",
      progress: 0,
      budgetUsed: 0,
      deadline: deadline.trim() || "نامشخص",
      tasks: [],
      ...itemScope,
      authorId: actingUser.id,
    };
    setProjects((prev) => [newProject, ...prev]);
    notify(`پروژه «${newProject.name}» ایجاد شد.`);
    closeProjectModal();
  };

  const submitPlaybook = () => {
    if (!pbName.trim() || !pbCategory.trim()) {
      notify("نام و دسته‌بندی قالب الزامی است.", "warning");
      return;
    }
    if (editingPbId) {
      setPlaybooks((prev) =>
        prev.map((p) =>
          p.id === editingPbId ? { ...p, name: pbName.trim(), category: pbCategory.trim(), steps: Number(pbSteps) || p.steps } : p
        )
      );
      notify(`قالب «${pbName.trim()}» ویرایش شد.`);
      closePlaybookModal();
      return;
    }
    const newPb: PlaybookTemplate = {
      id: `pb-${Date.now()}`,
      name: pbName.trim(),
      category: pbCategory.trim(),
      steps: Number(pbSteps) || 3,
      usedCount: 0,
    };
    setPlaybooks((prev) => [newPb, ...prev]);
    notify(`قالب فرآیند «${newPb.name}» ایجاد شد.`);
    closePlaybookModal();
  };

  const runPlaybook = (pb: PlaybookTemplate) => {
    setPlaybooks((prev) => prev.map((p) => (p.id === pb.id ? { ...p, usedCount: p.usedCount + 1 } : p)));
    notify(`اجرای قالب «${pb.name}» آغاز شد — یک چک‌لیست ${pb.steps} مرحله‌ای برای تیم ایجاد شد.`, "info");
  };

  const scopedProjects = filterScoped(projects);
  const filteredProjects = useMemo(
    () => (healthFilter === "همه" ? scopedProjects : scopedProjects.filter((p) => p.health === healthFilter)),
    [scopedProjects, healthFilter]
  );

  const atRisk = projects.filter((p) => p.health !== "سبز").length;
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const openTasks = projects.reduce((s, p) => s + p.tasks.filter((t) => t.status !== "انجام‌شده").length, 0);
  const riskCount = projects.reduce((s, p) => s + (projectDetails[p.id]?.risks.filter((r) => r.status !== "بسته").length ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="مدیریت پروژه"
        description="پروژه‌های پژوهشی، فناورانه و آموزشی با بودجه، تسک و گانت چارت"
        icon={<KanbanSquare size={18} />}
        actions={
          hasPermission("projects.create") ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setItemScope(defaultScopeForNew()); setProjectOpen(true); }}>
              پروژه جدید
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="پروژه‌های فعال" value={projects.length} tone="brand" icon={<KanbanSquare size={16} />} />
        <StatCard label="میانگین پیشرفت" value={`${avgProgress}٪`} tone="success" icon={<GanttChartSquare size={16} />} />
        <StatCard label="تسک‌های باز" value={openTasks} icon={<ListChecks size={16} />} />
        <StatCard label="ریسک‌ها و پروژه‌های در خطر" value={`${riskCount} ریسک · ${atRisk} پروژه`} tone={atRisk > 0 ? "danger" : "success"} icon={<AlertTriangle size={16} />} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <ListFilter size={14} className="text-ink-400" />
        {healthFilters.map((f) => (
          <button
            key={f}
            onClick={() => setHealthFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              healthFilter === f ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {f === "همه" ? "همه" : `وضعیت ${f}`}
            <span className="mr-1 opacity-60">({f === "همه" ? projects.length : projects.filter((p) => p.health === f).length})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filteredProjects.map((p) => (
          <Link key={p.id} to={`/dashboard/projects/${p.id}`} className="card p-4 hover:border-brand-300 transition-colors flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge tone={healthTone[p.health]}>وضعیت: {p.health}</Badge>
              <span className="flex items-center gap-1">
                <ScopeBadge item={p} />
                <span className="text-xs text-ink-400">مهلت {p.deadline}</span>
                <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <RowActions onEdit={canManageItem(p, "projects.edit") ? () => startEditProject(p) : undefined} onDelete={canManageItem(p, "projects.delete") ? () => removeProject(p) : undefined} size={13} />
                </span>
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-ink-900">{p.name}</h3>
              <p className="text-xs text-ink-400 mt-1">کارفرما: {p.client}</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                <span>پیشرفت</span>
                <span>{p.progress}٪</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-100">
              <span className="flex items-center gap-1">
                <Wallet size={12} /> مصرف بودجه: {p.budgetUsed}٪
              </span>
              <span className="flex items-center gap-1">
                <ListChecks size={12} /> {p.tasks.length} تسک
              </span>
            </div>
            {projectDetails[p.id] && (
              <div className="text-[11px] text-ink-400 flex items-center justify-between gap-2">
                <span className="truncate">مدیر: {projectDetails[p.id].manager}</span>
                {(() => {
                  const next = projectDetails[p.id].milestones.find((m) => m.status !== "انجام‌شده");
                  return next ? (
                    <span className="flex items-center gap-1 truncate">
                      <Milestone size={11} className="shrink-0" /> {next.title}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <ClipboardList size={15} className="text-brand-600" /> قالب‌های فرآیند عملیاتی (Playbooks)
          </h2>
          <p className="text-xs text-ink-400 mt-0.5">رویه‌های تکرارشونده (مثل تحویل پروژه یا واکنش به حادثه) را به یک گردش‌کار چک‌لیستی تبدیل کنید.</p>
        </div>
        {hasPermission("projects.create") && <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setPlaybookOpen(true)}>قالب جدید</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {playbooks.map((pb) => (
          <div key={pb.id} className="card p-4">
            <p className="text-sm font-semibold text-ink-900">{pb.name}</p>
            <p className="text-xs text-ink-400 mt-1">{pb.category} · {pb.steps} مرحله</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100">
              <span className="text-[11px] text-ink-400">{pb.usedCount} بار اجراشده</span>
              <Button variant="ghost" size="sm" icon={<PlayCircle size={13} />} onClick={() => runPlaybook(pb)}>اجرا</Button>
              <RowActions onEdit={hasPermission("projects.edit") ? () => startEditPlaybook(pb) : undefined} onDelete={hasPermission("projects.delete") ? () => removePlaybook(pb) : undefined} />
            </div>
          </div>
        ))}
      </div>

      <Modal open={projectOpen} onClose={closeProjectModal} title={editingProjectId ? "ویرایش پروژه" : "ایجاد پروژه جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام پروژه</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: پایلوت ماژول دانش برای واحد منابع انسانی" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">کارفرما</label>
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="مثلاً: بنیاد علوی" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">مهلت تحویل</label>
            <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="۱۴۰۵/۰۸/۰۱" className="input-field" />
          </div>
          <ScopePicker value={itemScope} onChange={setItemScope} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitProject}>{editingProjectId ? "ذخیره تغییرات" : "ایجاد پروژه"}</Button>
            <Button variant="secondary" onClick={closeProjectModal}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Modal open={playbookOpen} onClose={closePlaybookModal} title={editingPbId ? "ویرایش قالب فرآیند" : "ایجاد قالب فرآیند جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام قالب</label>
            <input value={pbName} onChange={(e) => setPbName(e.target.value)} placeholder="مثلاً: فرآیند آنبوردینگ سازمان جدید" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
              <input value={pbCategory} onChange={(e) => setPbCategory(e.target.value)} placeholder="مدیریت پروژه" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">تعداد مرحله</label>
              <input value={pbSteps} onChange={(e) => setPbSteps(e.target.value)} placeholder="۵" className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitPlaybook}>{editingPbId ? "ذخیره تغییرات" : "ایجاد قالب"}</Button>
            <Button variant="secondary" onClick={closePlaybookModal}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
