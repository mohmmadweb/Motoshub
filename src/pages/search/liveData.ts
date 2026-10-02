// ---------------------------------------------------------------------------
// داده‌ی زنده‌ی «قابل‌دیدن برای کاربر فعلی» — مشترک بین جستجوی سراسری، پروفایل و دستیار.
// هر مجموعه دقیقاً با همان قواعد ماژول خودش فیلتر می‌شود:
//   شبکه اجتماعی ← canView (لایه‌ی سازمانی + privacy) و وضعیت انتشار
//   گفتگو/پیام/فایل ← عضویت در گفتگو
//   دانش ← canSee (سطح دسترسی + ACL)
//   پروژه ← filterScoped + قاعده‌ی «فقط اعضا/خصوصی»
//   افراد ← visibleUserIds
//   نوآوری ← filterScoped + مجوز فهرست هر ماژول
//   تیکت ← تیکت‌های خودم / سازمان (tickets.view-org) / تیم سازنده
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useInnovation } from "../../context/InnovationContext";
import { useTicketsMaybe } from "../../context/TicketsContext";
import { users } from "../../data/mock";
import type { Scoped } from "../../data/tenancy";
import { ROOT_ID, descendantsOrSelf } from "../../iam/model";
import type { Chat } from "../../social/types";
import type { ProjectState } from "../../pm/types";

/** واحد مالکِ یک آیتم دامنه‌دار (همان قاعده‌ی TenancyContext) */
export function ownerScopeOf(item: Scoped & { scopeId?: string }): string {
  if (item.scopeId) return item.scopeId;
  if (!item.scope || item.scope === "سراسری") return ROOT_ID;
  if (item.scope === "هلدینگ") return item.holdingId ?? ROOT_ID;
  return item.companyId ?? item.holdingId ?? ROOT_ID;
}

/** نخستین بخش تاریخ شمسی («۱۴۰۵/۰۶/۳۱ ۱۱:۱۲» → «۱۴۰۵/۰۶/۳۱») */
export const datePart = (s?: string | null) => (s ? s.split(" ")[0] : "");

export function chatLink(c: Pick<Chat, "id" | "chat_type">) {
  return c.chat_type === "group" ? `/dashboard/groups/${c.id}` : c.chat_type === "channel" ? `/dashboard/channels/${c.id}` : `/dashboard/chat/${c.id}`;
}
export function contentLink(kind: string, id: string) {
  return kind === "news" ? `/dashboard/news/${id}` : kind === "blogs" ? `/dashboard/blog/${id}` : `/dashboard/magazines/${id}`;
}

export function useVisibleData() {
  const t = useTenancy();
  const s = useSocial();
  const pm = useProjectsPM();
  const km = useKnowledge();
  const inn = useInnovation();
  const tk = useTicketsMaybe();
  const { hasPermission: can, filterScoped, actingUser, iam, contextId } = t;

  return useMemo(() => {
    const pubOk = (x: { user_id: string; is_draft: boolean; is_public: boolean; deleted_at: string | null }, manage: boolean) => !x.deleted_at && ((x.is_public && !x.is_draft) || x.user_id === s.me || manage);
    const newsM = can("news.manage");
    const magM = can("magazines.manage");
    const blogM = can("blog.manage") || magM;
    const mediaM = can("media.manage");
    const evM = can("events.manage");
    const forumM = can("forum.moderate");

    const content = s.content.filter((c) => {
      const listPerm = c.kind === "news" ? "news.list" : c.kind === "blogs" ? "blog.list" : "magazines.list";
      const m = c.kind === "news" ? newsM : c.kind === "blogs" ? blogM : magM;
      return can(listPerm) && s.canView(c, m) && pubOk(c, m);
    });
    const media = can("media.list") ? s.media.filter((m) => s.canView(m, mediaM) && pubOk(m, mediaM)) : [];
    const events = can("events.list") ? s.events.filter((e) => s.canView(e, evM) && pubOk(e, evM)) : [];
    const topics = can("forum.list") ? s.topics.filter((x) => s.canView(x, forumM) && pubOk(x, forumM)) : [];
    const topicIds = new Set(topics.map((x) => x.id));
    const answers = s.posts.filter((p) => !p.deleted_at && topicIds.has(p.topic_id));

    // گفتگو: گفتگوهایی که عضوشان هستم + گروه/کانال‌های عمومیِ غیرخصوصی (قابل کشف)
    const chatPerm = (c: Chat) => (c.chat_type === "group" ? can("groups.list") : c.chat_type === "channel" ? can("channels.list") : can("chat.view"));
    const chats = s.chats.filter((c) => !c.deleted_at && chatPerm(c) && (s.isMember(c) || ((c.chat_type === "group" || c.chat_type === "channel") && !c.is_private && c.is_public)));
    const memberChatIds = new Set(s.chats.filter((c) => !c.deleted_at && s.isMember(c)).map((c) => c.id));
    const messages = s.messages.filter((m) => memberChatIds.has(m.chat_id));
    const files = can("files.use") ? s.files.filter((f) => (f.owner_type === "user" ? f.owner_id === s.me : memberChatIds.has(f.owner_id))) : [];

    const docs = can("knowledge.list") ? km.docs.filter((d) => km.canSee(d)) : [];

    const isProjMember = (p: ProjectState) => p.meta.manager === actingUser.name || p.meta.sponsor === actingUser.name || p.members.some((m) => m.userId === actingUser.id || m.name === actingUser.name);
    const projects = can("projects.list")
      ? filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p })))
          .map((x) => x._p)
          .filter((p) => p.meta.visibility === "عمومی سازمان" || isProjMember(p) || t.canManageItem(p.meta, "projects.edit"))
      : [];

    const visibleIds = new Set(t.visibleUserIds());
    const people = users.filter((u) => visibleIds.has(u.id) || u.id === actingUser.id);

    const calls = can("research.list") ? filterScoped(inn.calls) : [];
    const contracts = can("contracts.list") ? filterScoped(inn.contracts) : [];
    const funds = can("funds.list") ? filterScoped(inn.employment) : [];
    const nf = can("funds.list") ? filterScoped(inn.nfProjects) : [];
    const courses = can("training.list") ? filterScoped(inn.courses) : [];
    const awards = can("award.list") ? inn.awardEntries : [];
    const entities = can("research.list") ? inn.entities : [];

    const subtree = new Set(descendantsOrSelf(iam, contextId).map((n) => n.id));
    const tickets = tk
      ? tk.tickets.filter((x) => x.reporterId === actingUser.id || tk.isVendor || (can("tickets.view-org") && subtree.has(x.reporterScopeId)))
      : [];

    return { content, media, events, topics, answers, chats, messages, files, docs, projects, people, calls, contracts, funds, nf, courses, awards, entities, tickets, memberChatIds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, pm.projects, km, inn, tk, t]);
}

export type VisibleData = ReturnType<typeof useVisibleData>;
