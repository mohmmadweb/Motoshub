// ---------------------------------------------------------------------------
// «مدیریت دانش» — منوی دوم با ترتیب و برچسب‌های منوی واقعی کاریز (MENU.md §3) و مسیرهای واقعی
// (/knowledge/documents، /knowledge/search، …)؛ بخش‌های اضافه‌ی دمو زیر آیتم واقعی مربوط می‌مانند.
// نشانی قدیمی ?tab=<بخش> به مسیر تازه هدایت می‌شود. ?new=1 فرم سند جدید را باز می‌کند (C3) و
// &from=meeting:<route_id> آن را از روی صورتجلسه پیش‌پر می‌کند.
// ---------------------------------------------------------------------------
import ModuleReportsButton from "../reports/ModuleReportsButton";
import { useEffect, useState } from "react";
import { useInbox } from "../context/InboxContext";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, LayoutDashboard, FileText, Search, Inbox, CalendarClock, Archive, IdCard, Workflow, Lightbulb, BookA, FlaskConical, Users, KanbanSquare, GraduationCap, Network, BarChart3, Settings, LifeBuoy, Bell, MessageSquareHeart, Share2, History, ScrollText, ChevronDown, Hourglass, BadgeCheck, Plus } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { useKnowledge } from "../context/KnowledgeContext";
import { useTenancy } from "../context/TenancyContext";
import { useMeetings } from "../context/MeetingsContext";
import { meetingHref } from "../meetings/types";
import type { KDoc, KRelation } from "../km/types";
import { KM_SECTION_PATH, kmHref, sectionOfPath, sectionOfTab, type KSection } from "../km/nav";
import { kmApiItems } from "../km/api";
import { ApiChip } from "./social/kit";
import { KPageContext } from "./knowledge/ctx";
import DashboardSection from "./knowledge/DashboardSection";
import BankSection from "./knowledge/BankSection";
import { WorkflowSection, ReviewSection, ArchiveSection } from "./knowledge/LifecycleSections";
import RegistrySection from "./knowledge/RegistrySection";
import RndSection from "./knowledge/RndSection";
import { ProcessesSection, GlossarySection } from "./knowledge/ProcessGlossary";
import ExperienceSection from "./knowledge/ExperienceSection";
import ExpertsSection from "./knowledge/ExpertsSection";
import ProjectsKnowledgeSection from "./knowledge/ProjectKnowledge";
import { TrainingSection, KnowledgeMapSection, ReportsSection, SettingsSection } from "./knowledge/InsightSections";
import DocFormModal, { type DocPrefill } from "./knowledge/DocFormModal";
import DocDetailModal from "./knowledge/DocDetailModal";
import TaxonomyModal from "./knowledge/TaxonomyManager";
import SearchSection from "./knowledge/SearchSection";
import AuditSection from "./knowledge/AuditSection";
import { NotificationsSection, FeedbackSection, RelationsSection, VersionsSection } from "./knowledge/AggregateSections";
import { HelpSection } from "./knowledge/HelpSection";
import RetentionSection from "./knowledge/RetentionSection";
import { retentionInfo } from "../km/templates";

const NAV_KEY = "motoshub.km.nav.collapsed";
const loadCollapsed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(NAV_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};

/** perm: یکی از مجوزها کافی است · children: بخش‌های دمو زیر آیتم واقعی */
type NavItem = { id: KSection; label: string; icon: typeof FileText; count?: number; perm?: string | string[]; tone?: "amber" | "brand"; children?: NavItem[] };

export default function Knowledge() {
  const km = useKnowledge();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const meetings = useMeetings();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KDoc | null>(null);
  const [defaultCat, setDefaultCat] = useState<string | undefined>();
  const [prefill, setPrefill] = useState<DocPrefill | null>(null);
  const [taxOpen, setTaxOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>(loadCollapsed);
  const inbox = useInbox();
  const allowed = (it: NavItem) => !it.perm || (Array.isArray(it.perm) ? it.perm.some((p) => hasPermission(p)) : hasPermission(it.perm));
  const toggleGroup = (label: string) => {
    const next = collapsed.includes(label) ? collapsed.filter((x) => x !== label) : [...collapsed, label];
    setCollapsed(next);
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify(next));
    } catch {
      /* نادیده */
    }
  };
  const kmUnread = inbox.mine.filter((i) => (i.kind === "knowledge" || i.link.startsWith("/knowledge") || i.link.startsWith("/dashboard/knowledge")) && !inbox.isRead(i)).length;
  const overdue = km.docs.filter((d) => (km.flowInfo(d)?.overdueDays ?? 0) > 0).length;

  const myQueue = km.docs.filter((d) => (d.status === "در بررسی" || d.status === "تأییدشده") && km.isApprover(d)).length;
  const readyToDispose = km.docs.filter((d) => !d.legalHold && retentionInfo(d, km.settings.retention, km.today).eligible).length;
  const pendingAcks = km.myPendingAcks();
  const overview = km.api.overview();

  // ترتیب و برچسب‌های منوی واقعی (MENU.md §3)؛ بخش‌های اضافه‌ی دمو زیر همان آیتم
  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: "",
      items: [{ id: "dashboard", label: "داشبورد", icon: LayoutDashboard, children: [{ id: "notifications", label: "اعلان‌های دانش", icon: Bell, count: kmUnread || undefined, tone: "brand" }] }],
    },
    {
      label: "مخزن دانش",
      items: [
        {
          id: "bank",
          label: "اسناد",
          icon: FileText,
          count: overview.documents,
          children: [
            { id: "workflow", label: "گردش کار", icon: Inbox, count: myQueue || undefined, tone: "amber" },
            { id: "versions", label: "نسخه‌بندی و تاریخچه", icon: History },
            { id: "review", label: "تقویم بازبینی", icon: CalendarClock },
            { id: "archive", label: "آرشیو", icon: Archive, count: km.docs.filter((d) => d.status === "آرشیو").length || undefined },
            { id: "retention", label: "نگهداشت و امحا", icon: Hourglass, count: readyToDispose || undefined, tone: "amber", perm: ["knowledge.archive", "knowledge.settings"] },
          ],
        },
        { id: "search", label: "جستجوی پیشرفته", icon: Search },
      ],
    },
    {
      label: "ساختار دانش",
      items: [
        { id: "registry", label: "شناسنامه‌ها", icon: IdCard, count: overview.profiles.total, children: [{ id: "processes", label: "فرآیندها", icon: Workflow, count: km.processes.length }] },
        { id: "rnd", label: "سندهای فرصت R&D", icon: FlaskConical, count: overview.research_opportunities.total },
      ],
    },
    {
      label: "",
      items: [
        { id: "glossary", label: "واژه‌نامه", icon: BookA, count: km.glossary.length },
        { id: "experts", label: "خبرگان", icon: Users, count: km.experts.length },
        { id: "experience", label: "تجربیات", icon: Lightbulb, count: km.experiences.length, children: [{ id: "projects", label: "پروژه‌ها و درس‌آموخته‌ها", icon: KanbanSquare }] },
        { id: "audit", label: "لاگ ممیزی", icon: ScrollText, perm: ["knowledge.audit", "knowledge.settings", "knowledge.reports"] },
      ],
    },
    {
      label: "تنظیمات و راهنما",
      items: [
        { id: "settings", label: "تنظیمات و دسترسی‌ها", icon: Settings, perm: "knowledge.settings" },
        { id: "help", label: "راهنما و مرکز پشتیبانی", icon: LifeBuoy },
      ],
    },
    {
      label: "تحلیل و گزارش",
      items: [
        { id: "map", label: "نقشه‌ی دانش", icon: Network },
        { id: "relations", label: "ارتباطات دانش", icon: Share2 },
        { id: "feedback", label: "بازخورد و ارزیابی", icon: MessageSquareHeart },
        { id: "reports", label: "گزارش‌ها و تحلیل", icon: BarChart3, perm: "knowledge.reports" },
        { id: "training", label: "آموزش و یادگیری", icon: GraduationCap },
      ],
    },
  ];
  const flat = (items: NavItem[]): NavItem[] => items.flatMap((i) => [i, ...(i.children ?? [])]);
  const section: KSection = sectionOfPath(location.pathname);
  const focus = params.get("focus") ?? undefined;
  const docId = params.get("doc");

  // نشانی قدیمی ?tab=<بخش> → مسیر واقعی (بقیه‌ی پارامترها حفظ می‌شود)
  const legacyTab = params.get("tab");
  useEffect(() => {
    if (!legacyTab) return;
    const next = new URLSearchParams(params);
    next.delete("tab");
    const sec = sectionOfTab(legacyTab);
    const target = sec ? KM_SECTION_PATH[sec] : location.pathname;
    const qs = next.toString();
    navigate(qs ? `${target}?${qs}` : target, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyTab]);

  // C3: ?new=1 [&from=meeting:<route_id>] → فرم سند جدید (روی «اسناد»)
  const wantNew = params.get("new");
  const from = params.get("from");
  useEffect(() => {
    if (wantNew !== "1") return;
    const next = new URLSearchParams(params);
    next.delete("new");
    next.delete("from");
    const qs = next.toString();
    const base = section === "dashboard" ? KM_SECTION_PATH.bank : location.pathname;
    navigate(qs ? `${base}?${qs}` : base, { replace: true });
    if (!hasPermission("knowledge.upload")) {
      notify("برای افزودن سند به مخزن دانش مجوز «بارگذاری سند» لازم است.", "warning");
      return;
    }
    setEditing(null);
    setDefaultCat(undefined);
    setPrefill(from?.startsWith("meeting:") ? meetingPrefill(decodeURIComponent(from.slice("meeting:".length))) : null);
    setFormOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantNew]);

  /** پیش‌پر کردن سند از صورتجلسه (عنوان، متن صورتجلسه، مصوبات و اقدام‌ها، پیوند پروژه) */
  function meetingPrefill(routeId: string): DocPrefill {
    const v = meetings.byRoute(routeId);
    const href = `/meetings/${encodeURIComponent(routeId)}`;
    if (!v)
      return {
        source: (
          <>
            ثبت در دانشنامه از روی <Link to={href} className="text-[var(--color-link)] underline underline-offset-4">صورتجلسه</Link>؛ جلسه در دسترس شما نیست، اطلاعات را دستی کامل کنید.
          </>
        ),
      };
    const minutesType = km.docTypes.find((t) => t.name === "صورت‌جلسه" || t.name === "صورتجلسه")?.name;
    const minutesCat = km.categories.find((c) => c.id === "cat-minutes")?.id;
    const lines = [
      `## صورتجلسه‌ی «${v.title}»`,
      `تاریخ: ${v.date}${v.time ? ` · ساعت ${v.time}` : ""}${v.project_name ? ` · پروژه: ${v.project_name}` : ""}`,
      ...(v.agenda.length ? ["", "## دستور جلسه", ...v.agenda.map((a) => `- ${a}`)] : []),
      ...(v.minutes_text.trim() ? ["", "## شرح مذاکرات", v.minutes_text.trim()] : []),
      ...(v.decisions.length ? ["", "## مصوبات", ...v.decisions.map((d, i) => `${i + 1}. ${d}`)] : []),
      ...(v.resolutions.length ? ["", "## اقدام‌ها", "| اقدام | مسئول | مهلت |", "|---|---|---|", ...v.resolutions.map((r) => `| ${r.description} | ${r.assignee ?? "—"} | ${r.due || "—"} |`)] : []),
    ];
    const rel: KRelation[] = v.pid ? [{ type: "project", id: v.pid }] : [];
    return {
      title: `صورتجلسه: ${v.title}`,
      description: `صورتجلسه‌ی «${v.title}» مورخ ${v.date}${v.project_name ? ` (پروژه‌ی ${v.project_name})` : ""} که از صفحه‌ی جلسه در دانشنامه ثبت شد.`,
      ...(minutesType ? { type: minutesType } : {}),
      ...(minutesCat ? { categoryId: minutesCat } : {}),
      format: "article",
      body: lines.join("\n"),
      relations: rel,
      source: (
        <>
          از روی جلسه‌ی <Link to={meetingHref(v)} className="text-[var(--color-link)] underline underline-offset-4">«{v.title}»</Link> ({v.date}) — عنوان و متن از صورتجلسه پر شد؛ پیش از ثبت بازبینی کنید.
        </>
      ),
    };
  }

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next);
  };
  const go = (s: KSection, f?: string) => {
    navigate(kmHref(s, { focus: f }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openDoc = (id: string) => setParam({ doc: id });
  const openRelation = (r: KRelation) => {
    if (r.type === "doc") return openDoc(r.id);
    if (r.type === "project") return navigate(`/projects/${r.id}`);
    const map: Record<string, KSection> = { process: "processes", registry: "registry", expert: "experts", lesson: "experience", glossary: "glossary" };
    const lesson = r.type === "lesson" ? km.experiences.find((x) => x.id === r.id) : undefined;
    go(lesson?.projectId ? "projects" : map[r.type], lesson?.projectId ?? r.id);
  };
  const newDoc = (c?: string) => {
    setEditing(null);
    setDefaultCat(c);
    setPrefill(null);
    setFormOpen(true);
  };

  const ctx = {
    openDoc,
    newDoc,
    editDoc: (d: KDoc) => {
      setEditing(d);
      setPrefill(null);
      setFormOpen(true);
    },
    openTaxonomy: () => setTaxOpen(true),
    go,
    openRelation,
    focus,
  };

  const navButton = (it: NavItem, child?: boolean) => {
    const Icon = it.icon;
    const active = section === it.id;
    return (
      <Link
        key={it.id}
        to={KM_SECTION_PATH[it.id]}
        onClick={() => window.scrollTo({ top: 0 })}
        aria-current={active ? "page" : undefined}
        className={`w-full flex items-center gap-2 rounded-lg text-right transition-colors ${child ? "pr-7 pl-2 py-1.5 text-[13px]" : "px-2.5 py-2 text-[14px]"} ${active ? "bg-teal-50 text-teal-700 font-bold" : "text-ink-600 hover:bg-ink-100"}`}
      >
        <Icon size={child ? 15 : 17} strokeWidth={active ? 2.25 : 1.5} className="shrink-0" />
        <span className="flex-1 truncate">{it.label}</span>
        {it.id === "workflow" && overdue > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-600" title={`${overdue.toLocaleString("fa-IR")} مرحله‌ی معوق`} />}
        {it.count !== undefined && <span className={`text-[11.5px] font-bold rounded-full px-1.5 ${it.tone === "amber" ? "bg-amber-50 text-amber-700" : it.tone === "brand" ? "bg-teal-500 text-white" : "bg-teal-50 text-teal-700"}`}>{it.count.toLocaleString("fa-IR")}</span>}
      </Link>
    );
  };

  return (
    <KPageContext.Provider value={ctx}>
      <div>
        <PageHeader
          title="مدیریت دانش"
          description="اسناد، شناسنامه‌ها، سندهای فرصت R&D، واژه‌نامه، خبرگان و تجربیات — به هم متصل و قابل استفاده‌ی مجدد"
          icon={<BookOpen size={18} />}
          actions={
            <>
              {hasPermission("knowledge.upload") && (
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => newDoc()}>
                  سند جدید
                </Button>
              )}
              <ApiChip items={kmApiItems} />
              <ModuleReportsButton module="knowledge" />
            </>
          }
        />

        <div className="md:hidden mb-4">
          <select className="input-field" value={section} onChange={(e) => go(e.target.value as KSection)} aria-label="بخش مدیریت دانش">
            {groups.map((g, i) => (
              <optgroup key={i} label={g.label || "—"}>
                {flat(g.items.filter(allowed))
                  .filter(allowed)
                  .map((it) => (
                    <option key={it.id} value={it.id}>
                      {g.items.includes(it) ? it.label : `— ${it.label}`}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
          <nav className="hidden md:block self-start sticky top-20" aria-label="بخش‌های مدیریت دانش">
            <div className="card p-2 space-y-2 max-h-[calc(100vh-6rem)] overflow-y-auto">
              {groups.map((g, gi) => {
                const items = g.items.filter(allowed);
                if (!items.length) return null;
                const hasActive = flat(items).some((it) => it.id === section);
                const closed = !!g.label && collapsed.includes(g.label) && !hasActive;
                return (
                  <div key={gi} className={gi ? "pt-1 border-t border-ink-100" : ""}>
                    {g.label && (
                      <button onClick={() => toggleGroup(g.label)} className="w-full flex items-center gap-1 text-[11.5px] font-bold text-ink-500 hover:text-ink-700 px-2 pt-1 mb-0.5" aria-expanded={!closed}>
                        <span className="flex-1 text-right">{g.label}</span>
                        <ChevronDown size={14} className={`transition-transform ${closed ? "rotate-90" : ""}`} />
                      </button>
                    )}
                    {!closed &&
                      items.map((it) => (
                        <div key={it.id}>
                          {navButton(it)}
                          {(it.children ?? []).filter(allowed).map((c) => navButton(c, true))}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </nav>

          <main className="min-w-0">
            {pendingAcks.length > 0 && section !== "help" && (
              <div className="mb-4 rounded-[10px] border border-amber-600/40 bg-amber-50 px-3.5 py-3 flex items-center gap-2 flex-wrap text-[13px] text-amber-700">
                <BadgeCheck size={18} className="shrink-0" />
                <span className="flex-1 min-w-[180px] leading-6">
                  {pendingAcks.length.toLocaleString("fa-IR")} سند ابلاغی منتظر «خواندم و پذیرفتم» شماست
                  {pendingAcks.some((d) => d.circular?.deadline) && ` — نزدیک‌ترین مهلت ${pendingAcks.map((d) => d.circular?.deadline).filter(Boolean).sort()[0]}`}
                </span>
                {pendingAcks.slice(0, 3).map((d) => (
                  <button key={d.id} onClick={() => openDoc(d.id)} className="text-[12px] rounded-md bg-[var(--color-card)] border border-amber-600/30 px-2 py-1 hover:border-amber-600 truncate max-w-[220px]">
                    {d.title}
                  </button>
                ))}
              </div>
            )}
            {section === "dashboard" && <DashboardSection />}
            {section === "bank" && <BankSection />}
            {section === "search" && <SearchSection />}
            {section === "workflow" && <WorkflowSection />}
            {section === "review" && <ReviewSection />}
            {section === "archive" && <ArchiveSection />}
            {section === "retention" && <RetentionSection />}
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
            {section === "settings" && <SettingsSection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "versions" && <VersionsSection />}
            {section === "relations" && <RelationsSection />}
            {section === "feedback" && <FeedbackSection />}
            {section === "audit" && <AuditSection />}
            {section === "help" && <HelpSection />}
          </main>
        </div>

        <DocFormModal open={formOpen} doc={editing} defaultCategory={defaultCat} prefill={editing ? null : prefill} onClose={() => setFormOpen(false)} />
        <DocDetailModal
          docId={docId}
          onClose={() => setParam({ doc: null })}
          onEdit={(d) => {
            setEditing(d);
            setPrefill(null);
            setFormOpen(true);
          }}
          onNavigate={openRelation}
        />
        <TaxonomyModal open={taxOpen} onClose={() => setTaxOpen(false)} />
      </div>
    </KPageContext.Provider>
  );
}
