import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, LayoutDashboard, FileText, Search, Inbox, CalendarClock, Archive, IdCard, Workflow, Lightbulb, BookA, Sparkles, Users, KanbanSquare, GraduationCap, Network, BarChart3, Bot, Settings } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { useKnowledge } from "../context/KnowledgeContext";
import { useTenancy } from "../context/TenancyContext";
import type { KDoc, KRelation } from "../km/types";
import { KPageContext } from "./knowledge/ctx";
import type { KSection } from "./knowledge/shared";
import DashboardSection from "./knowledge/DashboardSection";
import BankSection from "./knowledge/BankSection";
import { WorkflowSection, ReviewSection, ArchiveSection } from "./knowledge/LifecycleSections";
import RegistrySection from "./knowledge/RegistrySection";
import RndSection from "./knowledge/RndSection";
import { ProcessesSection, GlossarySection } from "./knowledge/ProcessGlossary";
import ExperienceSection from "./knowledge/ExperienceSection";
import ExpertsSection from "./knowledge/ExpertsSection";
import ProjectsKnowledgeSection from "./knowledge/ProjectKnowledge";
import { TrainingSection, KnowledgeMapSection, ReportsSection, AssistantSection, SettingsSection } from "./knowledge/InsightSections";
import DocFormModal from "./knowledge/DocFormModal";
import DocDetailModal from "./knowledge/DocDetailModal";
import TaxonomyModal from "./knowledge/TaxonomyManager";

type NavItem = { id: KSection; label: string; icon: typeof FileText; count?: number; perm?: string };

export default function Knowledge() {
  const km = useKnowledge();
  const { hasPermission } = useTenancy();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KDoc | null>(null);
  const [defaultCat, setDefaultCat] = useState<string | undefined>();
  const [taxOpen, setTaxOpen] = useState(false);

  const myQueue = km.docs.filter((d) => (d.status === "در بررسی" || d.status === "تأییدشده") && km.isApprover(d)).length;
  const groups: { label: string; items: NavItem[] }[] = [
    { label: "", items: [{ id: "dashboard", label: "داشبورد", icon: LayoutDashboard }] },
    {
      label: "مخزن و چرخه‌ی عمر",
      items: [
        { id: "bank", label: "مخزن دانش", icon: FileText, count: km.docs.filter((d) => d.status !== "آرشیو").length },
        { id: "search", label: "جستجوی پیشرفته", icon: Search },
        { id: "workflow", label: "گردش کار", icon: Inbox, count: myQueue || undefined },
        { id: "review", label: "تقویم بازبینی", icon: CalendarClock },
        { id: "archive", label: "آرشیو", icon: Archive, count: km.docs.filter((d) => d.status === "آرشیو").length || undefined },
      ],
    },
    {
      label: "ساختار دانش",
      items: [
        { id: "registry", label: "شناسنامه‌ها", icon: IdCard, count: km.registry.length },
        { id: "processes", label: "فرآیندها", icon: Workflow, count: km.processes.length },
        { id: "rnd", label: "سندهای فرصت R&D", icon: Sparkles, count: km.rnd.length },
        { id: "glossary", label: "واژه‌نامه", icon: BookA, count: km.glossary.length },
      ],
    },
    {
      label: "دانش افراد و پروژه‌ها",
      items: [
        { id: "experience", label: "دانش و تجربیات", icon: Lightbulb, count: km.experiences.length },
        { id: "experts", label: "خبرگان", icon: Users, count: km.experts.length },
        { id: "projects", label: "پروژه‌ها و درس‌آموخته‌ها", icon: KanbanSquare },
        { id: "training", label: "آموزش و یادگیری", icon: GraduationCap },
      ],
    },
    {
      label: "تحلیل و هوشمندی",
      items: [
        { id: "map", label: "نقشه‌ی دانش", icon: Network },
        { id: "reports", label: "گزارش‌ها و تحلیل", icon: BarChart3, perm: "knowledge.reports" },
        { id: "assistant", label: "دستیار هوشمند", icon: Bot },
      ],
    },
    { label: "", items: [{ id: "settings", label: "تنظیمات و دسترسی‌ها", icon: Settings, perm: "knowledge.settings" }] },
  ];
  const all = groups.flatMap((g) => g.items);
  const raw = params.get("tab") as KSection | null;
  const section: KSection = raw && all.some((i) => i.id === raw) ? raw : "dashboard";
  const focus = params.get("focus") ?? undefined;
  const docId = params.get("doc");

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next);
  };
  const go = (s: KSection, f?: string) => {
    setParam({ tab: s === "dashboard" ? null : s, focus: f ?? null, doc: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openDoc = (id: string) => setParam({ doc: id });
  const openRelation = (r: KRelation) => {
    if (r.type === "doc") return openDoc(r.id);
    if (r.type === "project") return navigate(`/dashboard/projects/${r.id}`);
    const map: Record<string, KSection> = { process: "processes", registry: "registry", expert: "experts", lesson: "experience", glossary: "glossary" };
    const lesson = r.type === "lesson" ? km.experiences.find((x) => x.id === r.id) : undefined;
    go(lesson?.projectId ? "projects" : map[r.type], lesson?.projectId ?? r.id);
  };

  const ctx = {
    openDoc,
    newDoc: (c?: string) => {
      setEditing(null);
      setDefaultCat(c);
      setFormOpen(true);
    },
    editDoc: (d: KDoc) => {
      setEditing(d);
      setFormOpen(true);
    },
    openTaxonomy: () => setTaxOpen(true),
    go,
    openRelation,
    focus,
  };

  return (
    <KPageContext.Provider value={ctx}>
      <div>
        <PageHeader title="مدیریت دانش" description="مخزن اسناد، شناسنامه‌ها، فرآیندها، تجربیات، خبرگان و درس‌آموخته‌های پروژه‌ها — به هم متصل و قابل استفاده‌ی مجدد" icon={<BookOpen size={18} />} />

        <div className="lg:hidden mb-4">
          <select className="input-field" value={section} onChange={(e) => go(e.target.value as KSection)} aria-label="بخش مدیریت دانش">
            {groups.map((g, i) => (
              <optgroup key={i} label={g.label || "—"}>
                {g.items.filter((it) => !it.perm || hasPermission(it.perm)).map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-5">
          <nav className="hidden lg:block self-start sticky top-20" aria-label="بخش‌های مدیریت دانش">
            <div className="card p-2 space-y-3">
              {groups.map((g, gi) => (
                <div key={gi}>
                  {g.label && <p className="text-[10.5px] font-bold text-ink-400 px-2 mb-1">{g.label}</p>}
                  {g.items.filter((it) => !it.perm || hasPermission(it.perm)).map((it) => {
                    const Icon = it.icon;
                    const active = section === it.id;
                    return (
                      <button key={it.id} onClick={() => go(it.id)} aria-current={active ? "page" : undefined} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] text-right transition-colors ${active ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-600 hover:bg-ink-50"}`}>
                        <Icon size={15} className="shrink-0" />
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.count !== undefined && <span className={`text-[10px] rounded-full px-1.5 ${it.id === "workflow" ? "bg-amber-100 text-amber-800" : "bg-ink-100 text-ink-500"}`}>{it.count.toLocaleString("fa-IR")}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>

          <main className="min-w-0">
            {section === "dashboard" && <DashboardSection />}
            {section === "bank" && <BankSection />}
            {section === "search" && <BankSection advanced />}
            {section === "workflow" && <WorkflowSection />}
            {section === "review" && <ReviewSection />}
            {section === "archive" && <ArchiveSection />}
            {section === "registry" && <RegistrySection />}
            {section === "processes" && <ProcessesSection />}
            {section === "rnd" && <RndSection />}
            {section === "glossary" && <GlossarySection />}
            {section === "experience" && <ExperienceSection focus={focus} onOpenRelation={openRelation} />}
            {section === "experts" && <ExpertsSection />}
            {section === "projects" && <ProjectsKnowledgeSection focus={focus} />}
            {section === "training" && <TrainingSection />}
            {section === "map" && <KnowledgeMapSection />}
            {section === "reports" && <ReportsSection />}
            {section === "assistant" && <AssistantSection />}
            {section === "settings" && <SettingsSection />}
          </main>
        </div>

        <DocFormModal open={formOpen} doc={editing} defaultCategory={defaultCat} onClose={() => setFormOpen(false)} />
        <DocDetailModal
          docId={docId}
          onClose={() => setParam({ doc: null })}
          onEdit={(d) => {
            setEditing(d);
            setFormOpen(true);
          }}
          onNavigate={openRelation}
        />
        <TaxonomyModal open={taxOpen} onClose={() => setTaxOpen(false)} />
      </div>
    </KPageContext.Provider>
  );
}
