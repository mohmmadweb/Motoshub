import { Suspense, lazy, type ReactNode } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { ConfirmProvider } from "./components/ui/ConfirmProvider";
import { ContentProvider } from "./context/ContentContext";
import { SettingsProvider } from "./context/SettingsContext";
import { TenancyProvider } from "./context/TenancyContext";
import { ProjectsProvider } from "./context/ProjectsContext";
import { InboxProvider } from "./context/InboxContext";
import { KnowledgeProvider } from "./context/KnowledgeContext";
import { SocialProvider } from "./context/SocialContext";
import { TicketsProvider } from "./context/TicketsContext";
import { TimesheetProvider } from "./context/TimesheetContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppLayout from "./layouts/AppLayout";
import RequirePerm from "./components/RequirePerm";
import { SETTINGS_ALIASES, fromLegacyPath } from "./components/Sidebar";
import { useTenancy } from "./context/TenancyContext";

/** لینک‌های قدیمی (مثلاً /news/nw1) به شناسه‌ی جدید مدل API (news-nw1) هدایت می‌شوند (پارامترها حفظ می‌شوند) */
function LegacyId({ prefix, legacy, children }: { prefix: string; legacy: RegExp; children: ReactNode }) {
  const { id } = useParams();
  const { pathname, search } = useLocation();
  if (id && legacy.test(id)) return <Navigate to={`${pathname.replace(/\/[^/]+$/, "")}/${prefix}${id}${search}`} replace />;
  return <>{children}</>;
}
/** /magazines/blog-x (لینک‌های قدیمی بلاگ) → /blogs/blog-x */
function MagazineOrBlog() {
  const { id } = useParams();
  const { search } = useLocation();
  if (id?.startsWith("blog-")) return <Navigate to={`/blogs/${id}${search}`} replace />;
  return (
    <RequirePerm perm="magazines.list" module="مجلات">
      <ContentDetail section="magazines" />
    </RequirePerm>
  );
}
/** هر نشانی قدیمی /dashboard/<x>/… به مسیر واقعی با حفظ بقیه‌ی مسیر و پارامترها (نگاشت در Sidebar.tsx) */
function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const to = fromLegacyPath(pathname, search);
  if (!to) return <NotFound404 embedded />;
  return <Navigate to={`${to}${hash}`} replace />;
}
/**
 * مسیرهای «مدیریت سیستم» (/admin/units، /settings/organization، …) همان صفحه‌ی تنظیمات را با بخش
 * پیش‌فرضِ مسیر باز می‌کنند؛ بعد از آن ناوبری داخلی تنظیمات (?section=) مثل قبل کار می‌کند.
 */
function SettingsAlias() {
  const { pathname, search } = useLocation();
  const alias = SETTINGS_ALIASES[pathname];
  const q = new URLSearchParams(search);
  if (alias && !q.has("section")) {
    q.set("section", alias.section);
    if (alias.tab && !q.has("tab")) q.set("tab", alias.tab);
    return <Navigate to={{ pathname, search: `?${q.toString()}` }} replace />;
  }
  return <Settings />;
}
/** /profile ← نمایه‌ی کاربر فعلی */
function MyProfile() {
  const { actingUser } = useTenancy();
  const { search } = useLocation();
  return <Navigate to={`/profile/${actingUser.id}${search}`} replace />;
}
const guard = (perm: string, module: string, el: ReactNode) => (
  <RequirePerm perm={perm} module={module}>
    {el}
  </RequirePerm>
);

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
const Notifications = lazy(() => import("./pages/Notifications"));
const Tickets = lazy(() => import("./pages/Tickets"));
const PublicItemDetail = lazy(() => import("./pages/PublicItemDetail"));
const NotFound404 = lazy(() => import("./pages/NotFound404"));
const MyAccess = lazy(() => import("./pages/MyAccess"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const UnifiedCalendar = lazy(() => import("./pages/calendar/UnifiedCalendar"));
const ActivityReport = lazy(() => import("./pages/activity/ActivityReport"));
const ReportFeeds = lazy(() => import("./reports/feeds"));
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
// منوی ۱۴۰۵/۰۷ و امکانات سکو
const CategoriesPage = lazy(() => import("./pages/categories/CategoriesPage"));
const ProjectSettingsPage = lazy(() => import("./pages/ProjectSettingsPage"));
const OrgProfile = lazy(() => import("./pages/org/OrgProfile"));
const FaqPage = lazy(() => import("./pages/social/FaqPage"));
const MeetingPage = lazy(() => import("./pages/meetings/MeetingPage"));
const MonitoringPage = lazy(() => import("./pages/monitoring/MonitoringPage"));
const SecretariatPage = lazy(() => import("./pages/secretariat/SecretariatPage"));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const CustomerFilePage = lazy(() => import("./pages/customers/CustomerFilePage"));

function PageFallback() {
  return <div className="min-h-screen" aria-busy="true" aria-label="در حال بارگذاری" />;
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
    <TicketsProvider>
    <TimesheetProvider>
    <Suspense fallback={null}>
      <ReportFeeds />
    </Suspense>
    <HashRouter>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/public" element={<PublicShowcase />} />
        <Route path="/public/:section" element={<PublicShowcase />} />
        <Route path="/public/:section/:id" element={<PublicItemDetail />} />
        <Route path="/login" element={<Login />} />

        {/* پوسته‌ی برنامه — مسیرها همان مسیرهای کلاینت واقعی کاریز (MENU.md) */}
        <Route element={<AppLayout />}>
          {/* داشبورد */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={guard("calendar.view", "تقویم کاری من", <UnifiedCalendar />)} />
          <Route path="/files" element={guard("files.use", "مدیریت فایل‌های من", <FilesPage />)} />
          {/* همکاران */}
          <Route path="/members" element={guard("members.view", "اعضای سازمان", <Members />)} />
          <Route path="/members/import-export" element={<SettingsAlias />} />
          <Route path="/friends" element={guard("relations.use", "ارتباطات من", <Connections />)} />
          {/* دانش و محتوا */}
          <Route path="/news" element={guard("news.list", "اخبار سازمان", <ContentModule section="news" />)} />
          <Route path="/news/:id" element={<LegacyId prefix="news-" legacy={/^nw\d+$/}>{guard("news.list", "اخبار سازمان", <ContentDetail section="news" />)}</LegacyId>} />
          <Route path="/blogs" element={guard("blog.list", "وبلاگ‌ها", <ContentModule section="blogs" />)} />
          <Route path="/blogs/:id" element={<LegacyId prefix="blog-" legacy={/^b\d+$/}>{guard("blog.list", "وبلاگ‌ها", <ContentDetail section="blogs" />)}</LegacyId>} />
          <Route path="/magazines" element={guard("magazines.list", "مجلات", <ContentModule section="magazines" />)} />
          <Route path="/magazines/:id" element={<MagazineOrBlog />} />
          <Route path="/media" element={guard("media.list", "رسانه", <MediaPage />)} />
          <Route path="/media/:id" element={<LegacyId prefix="media-" legacy={/^m\d+$/}>{guard("media.list", "رسانه", <MediaDetail />)}</LegacyId>} />
          <Route path="/forums" element={guard("forum.list", "پرسش و پاسخ", <ForumPage />)} />
          <Route path="/forums/:id" element={<LegacyId prefix="tp-" legacy={/^f\d+$/}>{guard("forum.list", "پرسش و پاسخ", <TopicDetail />)}</LegacyId>} />
          <Route path="/hashtags" element={<TopicsHub />} />
          <Route path="/categories" element={<CategoriesPage />} />
          {/* شبکه اجتماعی */}
          <Route path="/conversations" element={guard("chat.view", "گفتگوها", <Messenger mode="chat" />)} />
          <Route path="/conversations/:id" element={guard("chat.view", "گفتگوها", <Messenger mode="chat" />)} />
          <Route path="/groups" element={guard("groups.list", "گروه‌ها", <Messenger mode="groups" />)} />
          <Route path="/groups/:id" element={guard("groups.list", "گروه‌ها", <Messenger mode="groups" />)} />
          <Route path="/channels" element={guard("channels.list", "کانال‌ها", <Messenger mode="channels" />)} />
          <Route path="/channels/:id" element={guard("channels.list", "کانال‌ها", <Messenger mode="channels" />)} />
          <Route path="/events" element={guard("events.list", "رویدادها و جلسات", <EventsCalendar />)} />
          <Route path="/events/:id" element={<LegacyId prefix="ev-" legacy={/^e\d+$/}>{guard("events.list", "رویدادها و جلسات", <EventDetail />)}</LegacyId>} />
          {/* پروژه‌ها و فعالیت‌ها */}
          <Route path="/projects" element={guard("projects.list", "پروژه‌ها", <Projects />)} />
          <Route path="/projects/:id" element={<ProjectBoard />} />
          <Route path="/knowledge/*" element={guard("knowledge.list", "مدیریت دانش", <Knowledge />)} />
          <Route path="/activities" element={guard("projects.list", "فعالیت و وظایف من", <MyWork />)} />
          <Route path="/activity-report" element={guard("timesheet.log", "گزارش فعالیت‌های من", <ActivityReport />)} />
          <Route path="/project-settings" element={<ProjectSettingsPage />} />
          {/* بخش «نوآوری و پژوهش» حذف شد — نشانی‌های قدیمی به داشبورد */}
          {["/research", "/contracts", "/funds", "/award", "/training"].map((p) => (
            <Route key={p} path={p} element={<Navigate to="/dashboard" replace />} />
          ))}
          {/* مدیریت سیستم — راهبری دسترسی و تنظیمات سامانه روی صفحه‌ی تنظیمات */}
          <Route path="/admin" element={<Settings />} />
          <Route path="/admin/units" element={<SettingsAlias />} />
          <Route path="/admin/people" element={<SettingsAlias />} />
          <Route path="/admin/access/new" element={<SettingsAlias />} />
          <Route path="/admin/roles" element={<SettingsAlias />} />
          <Route path="/admin/history" element={<SettingsAlias />} />
          <Route path="/admin/platform" element={<SettingsAlias />} />
          <Route path="/my-access" element={<MyAccess />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/organization" element={<SettingsAlias />} />
          <Route path="/settings/notifications" element={<SettingsAlias />} />
          <Route path="/sms-providers" element={<SettingsAlias />} />
          <Route path="/tickets" element={guard("tickets.create", "تیکت پشتیبانی", <Tickets />)} />
          <Route path="/faqs" element={<FaqPage />} />
          <Route path="/meetings/:id" element={<MeetingPage />} />
          <Route path="/monitoring" element={guard("monitoring.view", "مانیتورینگ", <MonitoringPage />)} />
          {/* دبیرخانه و مشتریان */}
          <Route path="/secretariat" element={<SecretariatPage />} />
          <Route path="/customers" element={guard("crm.view", "پرونده مشتریان", <CustomersPage />)} />
          <Route path="/customers/:id" element={guard("crm.view", "پرونده مشتریان", <CustomerFilePage />)} />
          {/* بیرون از منو */}
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/globalsearch" element={<SearchPage />} />
          <Route path="/org/:id" element={<OrgProfile />} />
          {/* نشانی‌های قدیمی /dashboard/<x> */}
          <Route path="/dashboard/*" element={<LegacyRedirect />} />
          <Route path="*" element={<NotFound404 embedded />} />
        </Route>
      </Routes>
      </Suspense>
    </HashRouter>
    </TimesheetProvider>
    </TicketsProvider>
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
