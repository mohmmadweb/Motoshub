import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KanbanSquare, Plus, Wallet, ListChecks, ClipboardList, PlayCircle, AlertTriangle, Milestone, GanttChartSquare, ListFilter, Search, Star, Users, History, Archive, LayoutTemplate, X } from "lucide-react";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import RowActions from "../components/ui/RowActions";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { ScopeBadge, ScopePicker } from "../components/ui/ScopeControl";
import { type Scoped } from "../data/tenancy";
import { users } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import StatCard from "../components/ui/StatCard";
import JalaliDatePicker from "../components/ui/JalaliDatePicker";
import { useToast } from "../components/ui/ToastProvider";
import { activeTasks, budgetUsage, isDone, projectProgress } from "../pm/selectors";
import { addDays, dayNum, fa } from "../pm/jalali";
import type { PMPlaybookTemplate, ProjectMeta, ProjectRole, ProjectState } from "../pm/types";
import { ProjectIcon, projectColors, projectIconNames } from "./project/projectIcons";

const healthTone: Record<string, BadgeTone> = {
  سبز: "success",
  زرد: "warning",
  قرمز: "danger",
};

const healthFilters = ["همه", "سبز", "زرد", "قرمز"] as const;
const listFilters = ["فعال", "ستاره‌دار", "تکمیل‌شده", "بایگانی‌شده", "همه"] as const;
type SortId = "recent" | "deadline" | "progress" | "name";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-600 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function Projects() {
  const pm = useProjectsPM();
  const [healthFilter, setHealthFilter] = useState<(typeof healthFilters)[number]>("همه");
  const [listFilter, setListFilter] = useState<(typeof listFilters)[number]>("فعال");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortId>("recent");
  const [projectOpen, setProjectOpen] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [runPb, setRunPb] = useState<PMPlaybookTemplate | null>(null);
  const [runTarget, setRunTarget] = useState("");
  // فرم پروژه
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(pm.refDate);
  const [deadline, setDeadline] = useState("");
  const [manager, setManager] = useState("");
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState<ProjectMeta["priority"]>("متوسط");
  const [icon, setIcon] = useState("Briefcase");
  const [color, setColor] = useState(projectColors[0]);
  const [visibility, setVisibility] = useState<ProjectMeta["visibility"]>("فقط اعضا");
  const [workspace, setWorkspace] = useState("");
  const [category, setCategory] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [team, setTeam] = useState<{ name: string; title: string; role: ProjectRole }[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teamTitle, setTeamTitle] = useState("");
  // فرم Playbook
  const [pbName, setPbName] = useState("");
  const [pbCategory, setPbCategory] = useState("");
  const [pbSteps, setPbSteps] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingPbId, setEditingPbId] = useState<string | null>(null);
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { filterScoped, defaultScopeForNew, hasPermission, canManageItem, actingUser, activeScopeLabel } = useTenancy();
  const [itemScope, setItemScope] = useState<Scoped>({ scope: "سراسری" });

  const projects = pm.projects;
  const playbooks = pm.store.templates;

  const lastActivity = (p: ProjectState) => [...p.logs].sort((a, b) => b.seq - a.seq)[0];

  const resetForm = () => {
    setEditingProjectId(null);
    setName("");
    setClient("");
    setDescription("");
    setStart(pm.refDate);
    setDeadline("");
    setManager("");
    setBudget("");
    setPriority("متوسط");
    setIcon("Briefcase");
    setColor(projectColors[0]);
    setVisibility("فقط اعضا");
    setWorkspace("");
    setCategory("");
    setTemplateId("");
    setTeam([]);
  };

  const startEditProject = (p: ProjectState) => {
    setEditingProjectId(p.meta.id);
    setItemScope({ scope: p.meta.scope, holdingId: p.meta.holdingId, companyId: p.meta.companyId });
    setName(p.meta.name);
    setClient(p.meta.client);
    setDescription(p.meta.description);
    setStart(p.meta.start);
    setDeadline(p.meta.deadline === "نامشخص" ? "" : p.meta.deadline);
    setManager(p.meta.manager);
    setPriority(p.meta.priority);
    setIcon(p.meta.icon);
    setColor(p.meta.color);
    setVisibility(p.meta.visibility);
    setWorkspace(p.meta.workspace);
    setCategory(p.meta.category);
    setProjectOpen(true);
  };

  const removeProject = (p: ProjectState) =>
    confirm({
      title: `حذف پروژه «${p.meta.name}»؟`,
      message: `${activeTasks(p).length.toLocaleString("fa-IR")} تسک، بورد، تاریخچه و سوابق بودجه‌ی این پروژه حذف می‌شود. (پیشنهاد: به‌جای حذف، بایگانی کنید.)`,
      onConfirm: () => {
        pm.deleteProject(p.meta.id);
        notify(`پروژه «${p.meta.name}» حذف شد.`, "info");
      },
    });

  const closeProjectModal = () => {
    setProjectOpen(false);
    resetForm();
  };

  const startEditPlaybook = (pb: PMPlaybookTemplate) => {
    setEditingPbId(pb.id);
    setPbName(pb.name);
    setPbCategory(pb.category);
    setPbSteps(pb.steps.map((s) => s.title).join("\n"));
    setPlaybookOpen(true);
  };

  const removePlaybook = (pb: PMPlaybookTemplate) =>
    confirm({
      title: `حذف قالب «${pb.name}»؟`,
      message: `این قالب ${pb.usedCount.toLocaleString("fa-IR")} بار استفاده شده؛ پروژه‌های ساخته‌شده از آن دست‌نخورده می‌مانند.`,
      onConfirm: () => {
        pm.removeTemplate(pb.id);
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
      pm.updateMeta(editingProjectId, { name: name.trim(), client: client.trim(), description, start, deadline: deadline.trim() || "نامشخص", ...(manager.trim() ? { manager: manager.trim() } : {}), priority, icon, color, visibility, workspace, category, ...itemScope });
      notify(`پروژه «${name.trim()}» ویرایش شد.`);
      closeProjectModal();
      return;
    }
    const mgr = manager.trim() || actingUser.name;
    const members = [
      { name: actingUser.name, title: actingUser.role, role: "مالک" as ProjectRole, userId: actingUser.id },
      ...(mgr !== actingUser.name ? [{ name: mgr, title: "مدیر پروژه", role: "مدیر پروژه" as ProjectRole, userId: users.find((u) => u.name === mgr)?.id }] : []),
      ...team.filter((t) => t.name !== mgr && t.name !== actingUser.name).map((t) => ({ ...t, userId: users.find((u) => u.name === t.name)?.id })),
    ];
    const newId = pm.createProject({
      name: name.trim(),
      client: client.trim(),
      description,
      sponsor: client.trim(),
      manager: mgr,
      priority,
      start,
      deadline: deadline.trim() || addDays(start, 90),
      category: category || "عمومی",
      tags: [],
      icon,
      color,
      visibility,
      workspace: workspace || activeScopeLabel,
      financeOfficer: mgr,
      budget: Number(budget.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[^\d]/g, "")) || 0,
      members,
      templateId: templateId || undefined,
      ...itemScope,
      authorId: actingUser.id,
    });
    notify(`پروژه «${name.trim()}» ایجاد شد${templateId ? " — تسک‌ها، وابستگی‌ها و مایل‌ستون‌ها از قالب ساخته شدند" : ""}.`);
    closeProjectModal();
    navigate(`/dashboard/projects/${newId}?tab=${templateId ? "graph" : "overview"}`);
  };

  const submitPlaybook = () => {
    if (!pbName.trim() || !pbCategory.trim()) {
      notify("نام و دسته‌بندی قالب الزامی است.", "warning");
      return;
    }
    const lines = pbSteps.split("\n").map((x) => x.trim()).filter(Boolean);
    const count = lines.length === 1 && /^[\d۰-۹]+$/.test(lines[0]) ? Number(lines[0].replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))) : 0;
    const titles = count ? Array.from({ length: count }, (_, i) => `مرحله‌ی ${fa(i + 1)}`) : lines.length ? lines : ["مرحله‌ی ۱", "مرحله‌ی ۲", "مرحله‌ی ۳"];
    const steps = titles.map((t, i) => ({ id: `${editingPbId ?? "new"}-s${i + 1}-${Date.now()}`, title: t, description: "" }));
    pm.saveTemplate({ id: editingPbId ?? undefined, name: pbName.trim(), category: pbCategory.trim(), steps });
    notify(editingPbId ? `قالب «${pbName.trim()}» ویرایش شد.` : `قالب فرآیند «${pbName.trim()}» با ${fa(steps.length)} مرحله ایجاد شد.`);
    closePlaybookModal();
  };

  const scopedProjects = filterScoped(projects.map((p) => ({ ...p.meta, _p: p }))).map((x) => x._p);
  const filteredProjects = useMemo(() => {
    let ps = scopedProjects;
    if (listFilter === "فعال") ps = ps.filter((p) => !p.meta.archived && !["تکمیل", "اختتام"].includes(p.meta.phase));
    if (listFilter === "ستاره‌دار") ps = ps.filter((p) => p.meta.starred);
    if (listFilter === "تکمیل‌شده") ps = ps.filter((p) => !p.meta.archived && ["تکمیل", "اختتام"].includes(p.meta.phase));
    if (listFilter === "بایگانی‌شده") ps = ps.filter((p) => p.meta.archived);
    if (healthFilter !== "همه") ps = ps.filter((p) => p.meta.health === healthFilter);
    if (q) ps = ps.filter((p) => p.meta.name.includes(q) || p.meta.client.includes(q) || p.meta.manager.includes(q) || p.meta.tags.some((t) => t.includes(q)));
    const sorted = [...ps];
    if (sort === "deadline") sorted.sort((a, b) => (dayNum(a.meta.deadline) ?? 9e9) - (dayNum(b.meta.deadline) ?? 9e9));
    if (sort === "progress") sorted.sort((a, b) => projectProgress(b) - projectProgress(a));
    if (sort === "name") sorted.sort((a, b) => a.meta.name.localeCompare(b.meta.name, "fa"));
    if (sort === "recent") sorted.sort((a, b) => (lastActivity(b)?.seq ?? 0) - (lastActivity(a)?.seq ?? 0));
    return sorted.sort((a, b) => Number(b.meta.starred) - Number(a.meta.starred));
  }, [scopedProjects, listFilter, healthFilter, q, sort]);

  const live = projects.filter((p) => !p.meta.archived);
  const atRisk = live.filter((p) => p.meta.health !== "سبز").length;
  const avgProgress = live.length ? Math.round(live.reduce((s, p) => s + projectProgress(p), 0) / live.length) : 0;
  const openTasks = live.reduce((s, p) => s + activeTasks(p).filter((t) => !isDone(p, t)).length, 0);
  const riskCount = live.reduce((s, p) => s + p.risks.filter((r) => r.status !== "بسته").length, 0);

  return (
    <div>
      <PageHeader
        title="مدیریت پروژه"
        description="پروژه‌های پژوهشی، فناورانه و آموزشی با بودجه، تسک، گانت چارت و گراف وابستگی"
        icon={<KanbanSquare size={18} />}
        actions={
          hasPermission("projects.create") ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => { resetForm(); setItemScope(defaultScopeForNew()); setProjectOpen(true); }}>
              پروژه جدید
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="پروژه‌های فعال" value={live.length} tone="brand" icon={<KanbanSquare size={16} />} />
        <StatCard label="میانگین پیشرفت" value={`${avgProgress}٪`} tone="success" icon={<GanttChartSquare size={16} />} />
        <StatCard label="تسک‌های باز" value={openTasks} icon={<ListChecks size={16} />} />
        <StatCard label="ریسک‌ها و پروژه‌های در خطر" value={`${riskCount} ریسک · ${atRisk} پروژه`} tone={atRisk > 0 ? "danger" : "success"} icon={<AlertTriangle size={16} />} />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden">
          {listFilters.map((f) => (
            <button key={f} onClick={() => setListFilter(f)} className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${listFilter === f ? "bg-navy-900 text-white" : "bg-white text-ink-600 hover:bg-ink-50"}`}>
              {f === "ستاره‌دار" && <Star size={11} />}
              {f === "بایگانی‌شده" && <Archive size={11} />}
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی پروژه، کارفرما، مدیر…" className="input-field !py-1.5 !pr-8 !text-xs w-56" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="input-field !py-1.5 !text-xs !w-auto" aria-label="مرتب‌سازی">
          <option value="recent">آخرین فعالیت</option>
          <option value="deadline">نزدیک‌ترین مهلت</option>
          <option value="progress">بیشترین پیشرفت</option>
          <option value="name">نام</option>
        </select>
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
            <span className="mr-1 opacity-60">({f === "همه" ? live.length : live.filter((p) => p.meta.health === f).length})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filteredProjects.map((p) => {
          const last = lastActivity(p);
          const progress = projectProgress(p);
          const next = p.milestones.filter((m) => m.status !== "انجام‌شده").sort((a, b) => (dayNum(a.due) ?? 0) - (dayNum(b.due) ?? 0))[0];
          return (
            <Link key={p.meta.id} to={`/dashboard/projects/${p.meta.id}`} className={`card p-4 hover:border-brand-300 transition-colors flex flex-col gap-3 ${p.meta.archived ? "opacity-70" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Badge tone={healthTone[p.meta.health]}>وضعیت: {p.meta.health}</Badge>
                  {p.meta.archived && <Badge tone="neutral">بایگانی</Badge>}
                </span>
                <span className="flex items-center gap-1">
                  <ScopeBadge item={p.meta} />
                  <span className="text-xs text-ink-400">مهلت {p.meta.deadline}</span>
                  <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="flex items-center">
                    <button onClick={() => pm.toggleStar(p.meta.id)} className={`p-1 ${p.meta.starred ? "text-amber-500" : "text-ink-300 hover:text-amber-500"}`} title={p.meta.starred ? "برداشتن علامت مهم" : "علامت‌گذاری به‌عنوان مهم"} aria-label="علامت مهم">
                      <Star size={14} fill={p.meta.starred ? "currentColor" : "none"} />
                    </button>
                    <RowActions onEdit={canManageItem(p.meta, "projects.edit") ? () => startEditProject(p) : undefined} onDelete={canManageItem(p.meta, "projects.delete") ? () => removeProject(p) : undefined} size={13} />
                  </span>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${p.meta.color} 14%, transparent)`, color: p.meta.color }}>
                  <ProjectIcon name={p.meta.icon} size={17} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-ink-900">{p.meta.name}</h3>
                  <p className="text-xs text-ink-400 mt-1">
                    کارفرما: {p.meta.client} · {p.meta.phase}
                  </p>
                </div>
              </div>
              {p.meta.description && <p className="text-[11.5px] text-ink-500 leading-5 line-clamp-2">{p.meta.description}</p>}
              <div>
                <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                  <span>پیشرفت</span>
                  <span>{fa(progress)}٪</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-100">
                <span className="flex items-center gap-1">
                  <Wallet size={12} /> مصرف بودجه: {fa(Math.round(budgetUsage(p)))}٪
                </span>
                <span className="flex items-center gap-1">
                  <ListChecks size={12} /> {fa(activeTasks(p).length)} تسک
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} /> {fa(p.members.length)}
                </span>
              </div>
              <div className="text-[11px] text-ink-400 flex items-center justify-between gap-2">
                <span className="truncate">مدیر: {p.meta.manager}</span>
                {next && (
                  <span className="flex items-center gap-1 truncate">
                    <Milestone size={11} className="shrink-0" /> {next.title}
                  </span>
                )}
              </div>
              {last && (
                <p className="text-[11px] text-ink-400 flex items-center gap-1 truncate -mt-1">
                  <History size={11} className="shrink-0" /> <span className="truncate">{last.description}</span>
                </p>
              )}
            </Link>
          );
        })}
        {filteredProjects.length === 0 && <p className="text-xs text-ink-400 col-span-full text-center py-8">پروژه‌ای با این فیلترها پیدا نشد.</p>}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <ClipboardList size={15} className="text-brand-600" /> قالب‌های فرآیند عملیاتی (Playbooks)
          </h2>
          <p className="text-xs text-ink-400 mt-0.5">رویه‌های تکرارشونده (مثل تحویل پروژه یا واکنش به حادثه) را به یک گردش‌کار چک‌لیستی تبدیل کنید.</p>
        </div>
        {hasPermission("projects.create") && (
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setPlaybookOpen(true)}>
            قالب جدید
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {playbooks.map((pb) => {
          const running = pm.store.executions.filter((e) => e.templateId === pb.id && e.status === "در حال اجرا").length;
          return (
            <div key={pb.id} className="card p-4">
              <p className="text-sm font-semibold text-ink-900">{pb.name}</p>
              <p className="text-xs text-ink-400 mt-1">
                {pb.category} · {fa(pb.steps.length)} مرحله
              </p>
              <p className="text-[11px] text-ink-500 mt-2 leading-5 line-clamp-2">{pb.steps.map((s) => s.title).join(" ← ")}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100">
                <span className="text-[11px] text-ink-400">
                  {fa(pb.usedCount)} بار اجراشده{running ? ` · ${fa(running)} در جریان` : ""}
                </span>
                <Button variant="ghost" size="sm" icon={<PlayCircle size={13} />} onClick={() => { setRunPb(pb); setRunTarget(live[0]?.meta.id ?? ""); }}>
                  اجرا
                </Button>
                <RowActions onEdit={hasPermission("projects.edit") ? () => startEditPlaybook(pb) : undefined} onDelete={hasPermission("projects.delete") ? () => removePlaybook(pb) : undefined} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <LayoutTemplate size={15} className="text-brand-600" />
        <h2 className="text-sm font-bold text-ink-900">قالب‌های پروژه</h2>
        <span className="text-xs text-ink-400 mr-2">بورد، تسک‌ها با وابستگی، برچسب‌ها، مایل‌ستون‌ها و نقش‌ها — ساخت پروژه‌ی تکراری در چند ثانیه</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pm.store.projectTemplates.map((t) => (
          <div key={t.id} className="card p-4">
            <p className="text-sm font-semibold text-ink-900">{t.name}</p>
            <p className="text-xs text-ink-400 mt-1 leading-5">{t.description}</p>
            <p className="text-[11px] text-ink-500 mt-2">
              {fa(t.tasks.length)} تسک · {fa(t.deps.length)} وابستگی · {fa(t.milestones.length)} مایل‌ستون · نقش‌ها: {t.roles.join("، ")}
            </p>
            {hasPermission("projects.create") && (
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => { resetForm(); setTemplateId(t.id); setItemScope(defaultScopeForNew()); setProjectOpen(true); }}>
                ساخت پروژه از این قالب
              </Button>
            )}
          </div>
        ))}
      </div>

      <Modal open={projectOpen} onClose={closeProjectModal} title={editingProjectId ? "ویرایش پروژه" : "ایجاد پروژه جدید"} description={editingProjectId ? undefined : "پس از ایجاد، یک محیط اختصاصی (بورد، کانال‌ها، مالی، تاریخچه) برای پروژه ساخته می‌شود."} width="max-w-2xl">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="نام پروژه">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: پایلوت ماژول دانش برای واحد منابع انسانی" className="input-field" />
            </Field>
            <Field label="کارفرما">
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="مثلاً: بنیاد علوی" className="input-field" />
            </Field>
          </div>
          <Field label="توضیحات">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[60px]" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="تاریخ شروع">
              <JalaliDatePicker value={start} onChange={setStart} />
            </Field>
            <Field label="مهلت تحویل (پایان)">
              <JalaliDatePicker value={deadline} onChange={setDeadline} placeholder="۱۴۰۵/۰۸/۰۱" />
            </Field>
            <Field label="اولویت">
              <select className="input-field" value={priority} onChange={(e) => setPriority(e.target.value as ProjectMeta["priority"])}>
                {["کم", "متوسط", "زیاد"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="مدیر پروژه">
              <input className="input-field" list="pr-users" value={manager} onChange={(e) => setManager(e.target.value)} placeholder={actingUser.name} />
              <datalist id="pr-users">
                {users.map((u) => (
                  <option key={u.id} value={u.name} />
                ))}
              </datalist>
            </Field>
            {!editingProjectId && (
              <Field label="بودجه‌ی کل (ریال)">
                <input className="input-field" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="۵٬۰۰۰٬۰۰۰٬۰۰۰" />
              </Field>
            )}
            <Field label="سطح دسترسی">
              <select className="input-field" value={visibility} onChange={(e) => setVisibility(e.target.value as ProjectMeta["visibility"])}>
                {["عمومی سازمان", "فقط اعضا", "خصوصی"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="فضای کاری">
              <input className="input-field" value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder={activeScopeLabel} />
            </Field>
            <Field label="دسته‌بندی">
              <input className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً: تحول دیجیتال" />
            </Field>
            {!editingProjectId && (
              <Field label="قالب پروژه">
                <select className="input-field" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  <option value="">پروژه‌ی خالی</option>
                  {pm.store.projectTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="آیکون">
              <div className="flex flex-wrap gap-1.5">
                {projectIconNames.map((n) => (
                  <button key={n} type="button" onClick={() => setIcon(n)} className={`w-8 h-8 rounded-lg border flex items-center justify-center ${icon === n ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500"}`} aria-label={n}>
                    <ProjectIcon name={n} size={15} />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="رنگ">
              <div className="flex flex-wrap gap-1.5">
                {projectColors.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-ink-900" : "border-transparent"}`} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </Field>
          </div>
          {!editingProjectId && (
            <Field label="اعضای اولیه‌ی تیم (شما به‌عنوان مالک اضافه می‌شوید)">
              <div className="flex gap-2 flex-wrap">
                <input className="input-field flex-1 min-w-[140px]" list="pr-users" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="نام عضو یا تیم" />
                <input className="input-field w-40" value={teamTitle} onChange={(e) => setTeamTitle(e.target.value)} placeholder="نقش: طراح، برنامه‌نویس…" />
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Plus size={13} />}
                  onClick={() => {
                    if (!teamName.trim()) return;
                    setTeam([...team, { name: teamName.trim(), title: teamTitle.trim() || "عضو تیم", role: "عضو" }]);
                    setTeamName("");
                    setTeamTitle("");
                  }}
                >
                  افزودن
                </Button>
              </div>
              {team.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {team.map((t, i) => (
                    <span key={i} className="text-[11px] bg-ink-100 rounded-md px-2 py-1 flex items-center gap-1">
                      {t.name} ({t.title})
                      <button type="button" onClick={() => setTeam(team.filter((_, j) => j !== i))} aria-label="حذف">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {templateId && <p className="text-[11px] text-ink-400 mt-1">در قالب انتخابی، تسک‌ها بر اساس عنوان شغلی (مثلاً «طراح»، «برنامه‌نویس») به همین اعضا واگذار می‌شوند.</p>}
            </Field>
          )}
          <ScopePicker value={itemScope} onChange={setItemScope} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitProject}>
              {editingProjectId ? "ذخیره تغییرات" : "ایجاد پروژه"}
            </Button>
            <Button variant="secondary" onClick={closeProjectModal}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={playbookOpen} onClose={closePlaybookModal} title={editingPbId ? "ویرایش قالب فرآیند" : "ایجاد قالب فرآیند جدید"}>
        <div className="space-y-3">
          <Field label="نام قالب">
            <input value={pbName} onChange={(e) => setPbName(e.target.value)} placeholder="مثلاً: فرآیند آنبوردینگ سازمان جدید" className="input-field" />
          </Field>
          <Field label="دسته‌بندی">
            <input value={pbCategory} onChange={(e) => setPbCategory(e.target.value)} placeholder="مدیریت پروژه" className="input-field" />
          </Field>
          <Field label="مراحل (هر خط یک مرحله — یا فقط تعداد مراحل)">
            <textarea value={pbSteps} onChange={(e) => setPbSteps(e.target.value)} placeholder={"ساخت حساب‌ها\nمعرفی به تیم\nآموزش ابزارها"} className="input-field min-h-[110px]" />
          </Field>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitPlaybook}>
              {editingPbId ? "ذخیره تغییرات" : "ایجاد قالب"}
            </Button>
            <Button variant="secondary" onClick={closePlaybookModal}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!runPb} onClose={() => setRunPb(null)} title={`اجرای «${runPb?.name ?? ""}»`} description="اجرا روی یک پروژه ثبت می‌شود و مراحل آن در تب Playbook همان پروژه قابل پیگیری است (رویداد PLAYBOOK_STARTED).">
        {runPb && (
          <div className="space-y-3">
            <Field label="پروژه">
              <select className="input-field" value={runTarget} onChange={(e) => setRunTarget(e.target.value)}>
                {live.map((p) => (
                  <option key={p.meta.id} value={p.meta.id}>
                    {p.meta.name}
                  </option>
                ))}
              </select>
            </Field>
            <ol className="text-xs text-ink-600 list-decimal pr-5 space-y-1">
              {runPb.steps.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ol>
            <Button
              variant="primary"
              className="w-full justify-center"
              icon={<PlayCircle size={14} />}
              onClick={() => {
                if (!runTarget) return;
                pm.startPlaybook(runPb.id, runTarget);
                notify(`اجرای قالب «${runPb.name}» آغاز شد — یک چک‌لیست ${fa(runPb.steps.length)} مرحله‌ای برای تیم ایجاد شد.`, "info");
                setRunPb(null);
                navigate(`/dashboard/projects/${runTarget}?tab=playbooks`);
              }}
            >
              شروع اجرا
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
