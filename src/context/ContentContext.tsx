import { createContext, useContext, useState, type ReactNode } from "react";
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
