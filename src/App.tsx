import { Suspense, lazy, type ReactNode } from "react";
import { HashRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { ConfirmProvider } from "./components/ui/ConfirmProvider";
import { ContentProvider } from "./context/ContentContext";
import { SettingsProvider } from "./context/SettingsContext";
import { TenancyProvider } from "./context/TenancyContext";
import { ProjectsProvider } from "./context/ProjectsContext";
import { InboxProvider } from "./context/InboxContext";
import { KnowledgeProvider } from "./context/KnowledgeContext";
import { SocialProvider } from "./context/SocialContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppLayout from "./layouts/AppLayout";
import RequirePerm from "./components/RequirePerm";

/** لینک‌های قدیمی (مثلاً /news/nw1) به شناسه‌ی جدید مدل API (news-nw1) هدایت می‌شوند */
function LegacyId({ prefix, legacy, children }: { prefix: string; legacy: RegExp; children: ReactNode }) {
  const { id } = useParams();
  const base = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "").split("?")[0].replace(/\/[^/]+$/, "") : "";
  if (id && legacy.test(id)) return <Navigate to={`${base}/${prefix}${id}`} replace />;
  return <>{children}</>;
}
function LegacyRedirect({ to }: { to: (id?: string) => string }) {
  const { id } = useParams();
  return <Navigate to={to(id)} replace />;
}

// مسیرها به‌صورت lazy بارگذاری می‌شوند تا باندل اولیه سبک بماند
const Landing = lazy(() => import("./pages/Landing"));
const PublicShowcase = lazy(() => import("./pages/PublicShowcase"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Profile = lazy(() => import("./pages/Profile"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
const Projects = lazy(() => import("./pages/Projects"));
const MyWork = lazy(() => import("./pages/MyWork"));
const ProjectBoard = lazy(() => import("./pages/ProjectBoard"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Funds = lazy(() => import("./pages/Funds"));
const Research = lazy(() => import("./pages/Research"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Training = lazy(() => import("./pages/Training"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Admin = lazy(() => import("./pages/Admin"));
const Help = lazy(() => import("./pages/Help"));
const Appearance = lazy(() => import("./pages/Appearance"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Award = lazy(() => import("./pages/Award"));
const PublicItemDetail = lazy(() => import("./pages/PublicItemDetail"));
const NotFound404 = lazy(() => import("./pages/NotFound404"));
const MyAccess = lazy(() => import("./pages/MyAccess"));
// بخش شبکه اجتماعی — منطبق بر Motoshub Social API
const Members = lazy(() => import("./pages/social/Members"));
const Connections = lazy(() => import("./pages/social/Connections"));
const ContentModule = lazy(() => import("./pages/social/ContentModule"));
const ContentDetail = lazy(() => import("./pages/social/ContentDetail"));
const MediaPage = lazy(() => import("./pages/social/MediaPage"));
const MediaDetail = lazy(() => import("./pages/social/MediaDetail"));
const ForumPage = lazy(() => import("./pages/social/ForumPage"));
const TopicDetail = lazy(() => import("./pages/social/TopicDetail"));
const TopicsHub = lazy(() => import("./pages/social/TopicsHub"));
const Messenger = lazy(() => import("./pages/social/Messenger"));
const EventsCalendar = lazy(() => import("./pages/social/EventsCalendar"));
const EventDetail = lazy(() => import("./pages/social/EventDetail"));
const FilesPage = lazy(() => import("./pages/social/FilesPage"));
const ProjectTeams = lazy(() => import("./pages/social/ProjectTeams"));
const SocialAdmin = lazy(() => import("./pages/social/SocialAdmin"));

function PageFallback() {
  return (
    <div className="p-8 space-y-4" aria-busy="true" aria-label="در حال بارگذاری صفحه">
      <div className="h-8 w-56 rounded-lg bg-ink-100 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-ink-100 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-ink-100 animate-pulse" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <ConfirmProvider>
    <SettingsProvider>
    <TenancyProvider>
    <ContentProvider>
    <ProjectsProvider>
    <InboxProvider>
    <KnowledgeProvider>
    <SocialProvider>
    <HashRouter>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/public" element={<PublicShowcase />} />
        <Route path="/public/:section" element={<PublicShowcase />} />
        <Route path="/public/:section/:id" element={<PublicItemDetail />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="my-work" element={<RequirePerm perm="projects.list" module="کارهای من"><MyWork /></RequirePerm>} />
          {/* همکاران */}
          <Route path="members" element={<RequirePerm perm="members.view" module="اعضای سازمان"><Members /></RequirePerm>} />
          <Route path="connections" element={<RequirePerm perm="relations.use" module="ارتباطات من"><Connections /></RequirePerm>} />
          {/* دانش و محتوا */}
          <Route path="magazines" element={<RequirePerm perm="magazines.list" module="مجلات"><ContentModule section="magazines" /></RequirePerm>} />
          <Route path="magazines/:id" element={<RequirePerm perm="magazines.list" module="مجلات"><ContentDetail section="magazines" /></RequirePerm>} />
          <Route path="news" element={<RequirePerm perm="news.list" module="اخبار سازمان"><ContentModule section="news" /></RequirePerm>} />
          <Route path="news/:id" element={<LegacyId prefix="news-" legacy={/^nw\d+$/}><RequirePerm perm="news.list" module="اخبار سازمان"><ContentDetail section="news" /></RequirePerm></LegacyId>} />
          <Route path="media" element={<RequirePerm perm="media.list" module="رسانه"><MediaPage /></RequirePerm>} />
          <Route path="media/:id" element={<LegacyId prefix="media-" legacy={/^m\d+$/}><RequirePerm perm="media.list" module="رسانه"><MediaDetail /></RequirePerm></LegacyId>} />
          <Route path="forum" element={<RequirePerm perm="forum.list" module="پرسش و پاسخ"><ForumPage /></RequirePerm>} />
          <Route path="forum/:id" element={<LegacyId prefix="tp-" legacy={/^f\d+$/}><RequirePerm perm="forum.list" module="پرسش و پاسخ"><TopicDetail /></RequirePerm></LegacyId>} />
          <Route path="topics" element={<TopicsHub />} />
          {/* تعامل و همکاری */}
          <Route path="chat" element={<RequirePerm perm="chat.view" module="گفتگوها"><Messenger mode="chat" /></RequirePerm>} />
          <Route path="chat/:id" element={<RequirePerm perm="chat.view" module="گفتگوها"><Messenger mode="chat" /></RequirePerm>} />
          <Route path="groups" element={<RequirePerm perm="groups.list" module="گروه‌ها"><Messenger mode="groups" /></RequirePerm>} />
          <Route path="groups/:id" element={<RequirePerm perm="groups.list" module="گروه‌ها"><Messenger mode="groups" /></RequirePerm>} />
          <Route path="channels" element={<RequirePerm perm="channels.list" module="کانال‌ها"><Messenger mode="channels" /></RequirePerm>} />
          <Route path="channels/:id" element={<RequirePerm perm="channels.list" module="کانال‌ها"><Messenger mode="channels" /></RequirePerm>} />
          {/* رویدادها */}
          <Route path="events" element={<RequirePerm perm="events.list" module="تقویم رویدادها"><EventsCalendar /></RequirePerm>} />
          <Route path="events/:id" element={<LegacyId prefix="ev-" legacy={/^e\d+$/}><RequirePerm perm="events.list" module="تقویم رویدادها"><EventDetail /></RequirePerm></LegacyId>} />
          {/* پروژه‌ها و اسناد */}
          <Route path="project-teams" element={<RequirePerm perm="projects.list" module="تیم‌ها و مستندات پروژه"><ProjectTeams /></RequirePerm>} />
          <Route path="files" element={<RequirePerm perm="files.use" module="اسناد و فایل‌ها"><FilesPage /></RequirePerm>} />
          <Route path="social-admin" element={<RequirePerm perm="social.dashboards" module="داشبورد مدیریتی شبکه"><SocialAdmin /></RequirePerm>} />
          {/* نشانی‌های قدیمی */}
          <Route path="blog" element={<Navigate to="/dashboard/magazines?tab=blog" replace />} />
          <Route path="blog/:id" element={<LegacyRedirect to={(id) => `/dashboard/magazines/${id?.startsWith("blog-") ? id : `blog-${id}`}`} />} />
          <Route path="friends" element={<Navigate to="/dashboard/connections" replace />} />
          <Route path="polls" element={<Navigate to="/dashboard" replace />} />
          <Route path="competitions" element={<Navigate to="/dashboard" replace />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="access" element={<MyAccess />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="profile/:id" element={<Profile />} />
          <Route path="knowledge" element={<RequirePerm perm="knowledge.list" module="مدیریت دانش"><Knowledge /></RequirePerm>} />
          <Route path="projects" element={<RequirePerm perm="projects.list" module="مدیریت پروژه"><Projects /></RequirePerm>} />
          <Route path="projects/:id" element={<ProjectBoard />} />
          <Route path="contracts" element={<RequirePerm perm="contracts.list" module="قراردادهای فناورانه"><Contracts /></RequirePerm>} />
          <Route path="funds" element={<RequirePerm perm="funds.list" module="صندوق نوآوری و شتاب‌دهی"><Funds /></RequirePerm>} />
          <Route path="research" element={<RequirePerm perm="research.list" module="فرصت‌های پژوهشی"><Research /></RequirePerm>} />
          <Route path="award" element={<Award />} />
          <Route path="training" element={<RequirePerm perm="training.list" module="آموزش و توانمندسازی"><Training /></RequirePerm>} />
          <Route path="assistant" element={<RequirePerm perm="assistant.chat" module="دستیار هوشمند"><Assistant /></RequirePerm>} />
          <Route path="reports" element={<RequirePerm perm="reports.view" module="گزارش‌گیری پیشرفته"><Reports /></RequirePerm>} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="appearance" element={<Appearance />} />
          <Route path="admin" element={<Admin />} />
          <Route path="help" element={<Help />} />
          <Route path="*" element={<NotFound404 />} />
        </Route>

        <Route path="*" element={<NotFound404 />} />
      </Routes>
      </Suspense>
    </HashRouter>
    </SocialProvider>
    </KnowledgeProvider>
    </InboxProvider>
    </ProjectsProvider>
    </ContentProvider>
    </TenancyProvider>
    </SettingsProvider>
    </ConfirmProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
