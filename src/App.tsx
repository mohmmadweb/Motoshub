import { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { ConfirmProvider } from "./components/ui/ConfirmProvider";
import { ContentProvider } from "./context/ContentContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppLayout from "./layouts/AppLayout";

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
          <Route path="news" element={<News />} />
          <Route path="news/:id" element={<NewsItemDetail />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:id" element={<GroupDetail />} />
          <Route path="forum" element={<Forum />} />
          <Route path="forum/:id" element={<ForumTopic />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventItemDetail />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:id" element={<BlogPostDetail />} />
          <Route path="media" element={<Media />} />
          <Route path="media/:id" element={<MediaItemDetail />} />
          <Route path="chat" element={<Chat />} />
          <Route path="friends" element={<Friends />} />
          <Route path="polls" element={<Polls />} />
          <Route path="competitions" element={<Competitions />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="profile/:id" element={<Profile />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectBoard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="funds" element={<Funds />} />
          <Route path="research" element={<Research />} />
          <Route path="award" element={<Award />} />
          <Route path="training" element={<Training />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="reports" element={<Reports />} />
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
    </SettingsProvider>
    </ConfirmProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
