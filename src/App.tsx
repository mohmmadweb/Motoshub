import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { ContentProvider } from "./context/ContentContext";
import AppLayout from "./layouts/AppLayout";
import Landing from "./pages/Landing";
import PublicShowcase from "./pages/PublicShowcase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import News from "./pages/News";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Forum from "./pages/Forum";
import ForumTopic from "./pages/ForumTopic";
import Events from "./pages/Events";
import Blog from "./pages/Blog";
import Media from "./pages/Media";
import Chat from "./pages/Chat";
import SearchPage from "./pages/SearchPage";
import Profile from "./pages/Profile";
import Knowledge from "./pages/Knowledge";
import Projects from "./pages/Projects";
import ProjectBoard from "./pages/ProjectBoard";
import Contracts from "./pages/Contracts";
import Funds from "./pages/Funds";
import Research from "./pages/Research";
import Assistant from "./pages/Assistant";
import Training from "./pages/Training";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import Help from "./pages/Help";
import PublicItemDetail from "./pages/PublicItemDetail";
import NewsItemDetail from "./pages/NewsItemDetail";
import BlogPostDetail from "./pages/BlogPostDetail";
import EventItemDetail from "./pages/EventItemDetail";
import MediaItemDetail from "./pages/MediaItemDetail";

export default function App() {
  return (
    <ToastProvider>
    <ContentProvider>
    <HashRouter>
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
          <Route path="search" element={<SearchPage />} />
          <Route path="profile/:id" element={<Profile />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectBoard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="funds" element={<Funds />} />
          <Route path="research" element={<Research />} />
          <Route path="training" element={<Training />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="admin" element={<Admin />} />
          <Route path="help" element={<Help />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
    </ContentProvider>
    </ToastProvider>
  );
}
