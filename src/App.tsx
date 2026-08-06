import { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { ConfirmProvider } from "./components/ui/ConfirmProvider";
import { ContentProvider } from "./context/ContentContext";
import { SettingsProvider } from "./context/SettingsContext";
import { TenancyProvider } from "./context/TenancyContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppLayout from "./layouts/AppLayout";
import RequirePerm from "./components/RequirePerm";

// مسیرها به‌صورت lazy بارگذاری می‌شوند تا باندل اولیه سبک بماند
const Landing = lazy(() => import("./pages/Landing"));
const PublicShowcase = lazy(() => import("./pages/PublicShowcase"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const News = lazy(() => import("./pages/News"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupDetail = lazy(() => import("./pages/GroupDetail"));
const Forum = lazy(() => import("./pages/Forum"));
const ForumTopic = lazy(() => import("./pages/ForumTopic"));
const Events = lazy(() => import("./pages/Events"));
const Blog = lazy(() => import("./pages/Blog"));
const Media = lazy(() => import("./pages/Media"));
const Chat = lazy(() => import("./pages/Chat"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Profile = lazy(() => import("./pages/Profile"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
const Projects = lazy(() => import("./pages/Projects"));
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
const Friends = lazy(() => import("./pages/Friends"));
const Polls = lazy(() => import("./pages/Polls"));
const Competitions = lazy(() => import("./pages/Competitions"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Award = lazy(() => import("./pages/Award"));
const PublicItemDetail = lazy(() => import("./pages/PublicItemDetail"));
const NewsItemDetail = lazy(() => import("./pages/NewsItemDetail"));
const NotFound404 = lazy(() => import("./pages/NotFound404"));
const BlogPostDetail = lazy(() => import("./pages/BlogPostDetail"));
const EventItemDetail = lazy(() => import("./pages/EventItemDetail"));
const MediaItemDetail = lazy(() => import("./pages/MediaItemDetail"));
const MyAccess = lazy(() => import("./pages/MyAccess"));

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
          <Route path="news" element={<RequirePerm perm="news.list" module="اخبار سازمان"><News /></RequirePerm>} />
          <Route path="news/:id" element={<NewsItemDetail />} />
          <Route path="groups" element={<RequirePerm perm="groups.list" module="گروه‌های تعاملی"><Groups /></RequirePerm>} />
          <Route path="groups/:id" element={<GroupDetail />} />
          <Route path="forum" element={<RequirePerm perm="forum.list" module="انجمن"><Forum /></RequirePerm>} />
          <Route path="forum/:id" element={<ForumTopic />} />
          <Route path="events" element={<RequirePerm perm="events.list" module="رویدادها و جلسات"><Events /></RequirePerm>} />
          <Route path="events/:id" element={<EventItemDetail />} />
          <Route path="blog" element={<RequirePerm perm="blog.list" module="بلاگ"><Blog /></RequirePerm>} />
          <Route path="blog/:id" element={<BlogPostDetail />} />
          <Route path="media" element={<RequirePerm perm="media.list" module="تصاویر و ویدیو"><Media /></RequirePerm>} />
          <Route path="media/:id" element={<MediaItemDetail />} />
          <Route path="chat" element={<RequirePerm perm="chat.view" module="گفتگو"><Chat /></RequirePerm>} />
          <Route path="friends" element={<Friends />} />
          <Route path="polls" element={<Polls />} />
          <Route path="competitions" element={<Competitions />} />
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
    </ContentProvider>
    </TenancyProvider>
    </SettingsProvider>
    </ConfirmProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
