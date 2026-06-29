import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { MessagesSquare, NotebookPen, CalendarDays, Image, BookOpen } from "lucide-react";
import {
  forumTopics as initialForumTopics,
  blogPosts as initialBlogPosts,
  events as initialEvents,
  mediaItems as initialMediaItems,
  knowledgeDocs as initialKnowledgeDocs,
  type ForumTopic,
  type BlogPost,
  type EventItem,
  type MediaItem,
  type KnowledgeDoc,
} from "../data/mock";

export type PublicFeedItem = {
  id: string;
  module: "انجمن" | "بلاگ" | "رویداد" | "رسانه" | "دانش";
  icon: typeof MessagesSquare;
  title: string;
  meta: string;
  to: string;
};

type SetFn<T> = (updater: (prev: T[]) => T[]) => void;

type ContentValue = {
  forumTopics: ForumTopic[];
  setForumTopics: SetFn<ForumTopic>;
  blogPosts: BlogPost[];
  setBlogPosts: SetFn<BlogPost>;
  events: EventItem[];
  setEvents: SetFn<EventItem>;
  mediaItems: MediaItem[];
  setMediaItems: SetFn<MediaItem>;
  knowledgeDocs: KnowledgeDoc[];
  setKnowledgeDocs: SetFn<KnowledgeDoc>;
};

const ContentContext = createContext<ContentValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [forumTopics, setForumTopics] = useState<ForumTopic[]>(initialForumTopics);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(initialBlogPosts);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMediaItems);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(initialKnowledgeDocs);

  return (
    <ContentContext.Provider
      value={{
        forumTopics,
        setForumTopics,
        blogPosts,
        setBlogPosts,
        events,
        setEvents,
        mediaItems,
        setMediaItems,
        knowledgeDocs,
        setKnowledgeDocs,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
}

export function usePublicFeed(): PublicFeedItem[] {
  const { forumTopics, blogPosts, events, mediaItems, knowledgeDocs } = useContent();

  return useMemo(() => {
    const items: PublicFeedItem[] = [];
    forumTopics
      .filter((t) => t.visibility === "عمومی")
      .forEach((t) => items.push({ id: `forum-${t.id}`, module: "انجمن", icon: MessagesSquare, title: t.title, meta: `توسط ${t.author} · دسته: ${t.category}`, to: `/app/forum/${t.id}` }));
    blogPosts
      .filter((b) => b.visibility === "عمومی")
      .forEach((b) => items.push({ id: `blog-${b.id}`, module: "بلاگ", icon: NotebookPen, title: b.title, meta: `${b.author} · ${b.date}`, to: "/app/blog" }));
    events
      .filter((e) => e.visibility === "عمومی")
      .forEach((e) => items.push({ id: `event-${e.id}`, module: "رویداد", icon: CalendarDays, title: e.title, meta: `${e.jalaliDate} · ${e.location}`, to: "/app/events" }));
    mediaItems
      .filter((m) => m.visibility === "عمومی")
      .forEach((m) => items.push({ id: `media-${m.id}`, module: "رسانه", icon: Image, title: m.title, meta: `${m.album} · ${m.uploadedBy}`, to: "/app/media" }));
    knowledgeDocs
      .filter((d) => d.visibility === "عمومی")
      .forEach((d) => items.push({ id: `doc-${d.id}`, module: "دانش", icon: BookOpen, title: d.title, meta: `${d.owner} · ${d.updatedAt}`, to: "/app/knowledge" }));
    return items;
  }, [forumTopics, blogPosts, events, mediaItems, knowledgeDocs]);
}
