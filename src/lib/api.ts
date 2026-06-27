/**
 * Mock API client — shape mirrors the real /api/v1 contract documented in API_SPEC.md.
 * In production this file is replaced by real fetch() calls to the API Gateway
 * (legacy PHP/Oxwall endpoints + new Node services behind one host).
 */
import {
  posts as mockPosts,
  groups as mockGroups,
  users as mockUsers,
  forumTopics as mockForumTopics,
  knowledgeDocs as mockKnowledgeDocs,
  projects as mockProjects,
  notifications as mockNotifications,
  chatThreads as mockChatThreads,
  tenants as mockTenants,
} from "../data/mock";

const latency = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const api = {
  get auth() {
    return {
      // POST /api/v1/auth/login
      login: async (_username: string, _password: string) => {
        await latency();
        return { token: "mock.jwt.token", user: mockUsers[0] };
      },
    };
  },
  get feed() {
    return {
      // GET /api/v1/posts?scope=feed
      list: async () => {
        await latency();
        return mockPosts;
      },
    };
  },
  get groups() {
    return {
      // GET /api/v1/groups
      list: async () => {
        await latency();
        return mockGroups;
      },
      // GET /api/v1/groups/:id
      get: async (id: string) => {
        await latency();
        return mockGroups.find((g) => g.id === id) ?? null;
      },
    };
  },
  get forum() {
    return {
      // GET /api/v1/forum/topics
      list: async () => {
        await latency();
        return mockForumTopics;
      },
    };
  },
  get knowledge() {
    return {
      // GET /api/v1/knowledge/documents
      list: async () => {
        await latency();
        return mockKnowledgeDocs;
      },
    };
  },
  get projects() {
    return {
      // GET /api/v1/projects
      list: async () => {
        await latency();
        return mockProjects;
      },
      get: async (id: string) => {
        await latency();
        return mockProjects.find((p) => p.id === id) ?? null;
      },
    };
  },
  get notifications() {
    return {
      // GET /api/v1/notifications
      list: async () => {
        await latency();
        return mockNotifications;
      },
    };
  },
  get chat() {
    return {
      // GET /api/v1/chat/threads
      list: async () => {
        await latency();
        return mockChatThreads;
      },
    };
  },
  get tenants() {
    return {
      // GET /api/v1/admin/tenants  (platform-owner scope)
      list: async () => {
        await latency();
        return mockTenants;
      },
    };
  },
};
