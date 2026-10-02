// ---------------------------------------------------------------------------
// زمینه‌ی «تیکت پشتیبانی» — تیکت‌های همه‌ی کاربران به تیم سازنده‌ی موتوشاب.
// ذخیره در localStorage (motoshub.tickets.v1). هر اکشن یک رویداد تغییرناپذیر به تاریخچه‌ی
// تیکت اضافه می‌کند؛ هیچ رویدادی ویرایش یا حذف نمی‌شود.
// باید داخل TenancyProvider قرار بگیرد (هویت کاربر و مجوز tickets.vendor از آن خوانده می‌شود).
// ---------------------------------------------------------------------------
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTenancy } from "./TenancyContext";
import { useInbox } from "./InboxContext";
import { users } from "../data/mock";
import {
  clockNow,
  nextTicketId,
  vendorById,
  vendorTeam,
  type ActorKind,
  type NewTicketInput,
  type Ticket,
  type TicketEvent,
  type TicketLink,
  type TicketPriority,
  type TicketSeverity,
  type TicketStatus,
} from "../pages/tickets/model";
import { seedTicketPeople, seedTickets } from "../pages/tickets/seed";

const KEY = "motoshub.tickets.v1";
const VERSION = 1;

type Store = { version: number; tickets: Ticket[]; agentId: string };
type Draft = Omit<TicketEvent, "id" | "at" | "actor" | "actorKind">;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      // دنبال‌کنندگان/«من هم»های نمونه به ذخیره‌ی قدیمی هم افزوده می‌شوند (فیلدهای اختیاری)
      if (s.version === VERSION && Array.isArray(s.tickets)) return { ...s, tickets: s.tickets.map((t) => (t.followers || t.affected || !seedTicketPeople[t.id] ? t : { ...t, ...seedTicketPeople[t.id] })) };
    }
  } catch {
    /* بدون حافظه‌ی مرورگر */
  }
  return { version: VERSION, tickets: seedTickets(), agentId: "v1" };
}

export type TicketsValue = {
  tickets: Ticket[];
  /** «اکنون» در تقویم دمو (دقیقه) */
  now: number;
  /** کاربر فعلی می‌تواند به‌عنوان تیم سازنده پاسخ دهد */
  isVendor: boolean;
  /** هویتی که پاسخ‌های تیم سازنده با آن ثبت می‌شود */
  agent: (typeof vendorTeam)[number];
  setAgentId: (id: string) => void;
  actorFor: (t: Ticket) => { name: string; kind: ActorKind };
  get: (id: string) => Ticket | undefined;
  create: (input: NewTicketInput) => Ticket;
  comment: (id: string, text: string, opts?: { internal?: boolean; files?: { name: string; size: number }[] }) => void;
  setStatus: (id: string, to: TicketStatus, text?: string, fixedIn?: string) => void;
  assign: (id: string, assigneeId?: string) => void;
  bulkAssign: (ids: string[], assigneeId?: string) => void;
  bulkStatus: (ids: string[], to: TicketStatus, text?: string) => void;
  setPriority: (id: string, p: TicketPriority, reason?: string) => void;
  setSeverity: (id: string, s: TicketSeverity) => void;
  addAttachments: (id: string, files: { name: string; size: number }[]) => void;
  setLabels: (id: string, labels: string[]) => void;
  addLink: (id: string, link: TicketLink) => void;
  removeLink: (id: string, otherId: string) => void;
  setRelease: (id: string, version?: string) => void;
  /** کاربر رفع را تأیید می‌کند → بسته‌شده + امتیاز رضایت */
  confirmResolution: (id: string, score: number, comment?: string) => void;
  reopen: (id: string, reason: string) => void;
  rate: (id: string, score: number, comment?: string) => void;
  reset: () => void;
  // ------------------------------------------------ دنبال‌کنندگان و «من هم»
  isFollowing: (t: Ticket, userId?: string) => boolean;
  toggleFollow: (id: string) => void;
  addFollower: (id: string, userId: string) => void;
  removeFollower: (id: string, userId: string) => void;
  /** «من هم این مشکل را دارم» — کاربر به درگیرها و دنبال‌کنندگان اضافه می‌شود */
  meToo: (id: string) => boolean;
  /** آیا کاربر جاری درگیر تیکت است (گزارش‌دهنده، دنبال‌کننده یا «من هم») */
  involved: (t: Ticket) => boolean;
};

const maxUpdated = (list: Ticket[]) => list.reduce((m, t) => Math.max(m, t.updatedAt), 0);
const TicketsContext = createContext<TicketsValue | null>(null);
let evCounter = 0;
const newEvId = () => `e${Date.now().toString(36)}${(++evCounter).toString(36)}`;

export function TicketsProvider({ children }: { children: ReactNode }) {
  const { actingUser, hasPermission } = useTenancy();
  const inbox = useInbox();
  const [store, setStore] = useState<Store>(load);
  const [tick, setTick] = useState(() => clockNow());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* نادیده */
    }
  }, [store]);
  useEffect(() => {
    const h = window.setInterval(() => setTick(clockNow()), 60_000);
    return () => window.clearInterval(h);
  }, []);

  const latest = useMemo(() => maxUpdated(store.tickets), [store.tickets]);
  // ساعت دمو هیچ‌وقت عقب‌تر از آخرین رویداد ثبت‌شده نمی‌رود
  const now = Math.max(tick, latest);

  const isVendor = hasPermission("tickets.vendor");
  const agent = vendorById(store.agentId) ?? vendorTeam[0];

  const actorFor = useCallback(
    (t: Ticket): { name: string; kind: ActorKind } => {
      if (t.reporterId === actingUser.id) return { name: actingUser.name, kind: "reporter" };
      if (isVendor) return { name: agent.name, kind: "vendor" };
      return { name: actingUser.name, kind: "user" };
    },
    [actingUser, isVendor, agent.name],
  );

  /** اعمال تغییر روی یک تیکت + افزودن رویدادها با زمان و بازیگر */
  const apply = (id: string, build: (t: Ticket, actor: { name: string; kind: ActorKind }, at: number) => { patch?: Partial<Ticket>; events: Draft[] } | null) => {
    setStore((s) => {
      const at = Math.max(clockNow(), maxUpdated(s.tickets));
      let changed = false;
      const tickets = s.tickets.map((t) => {
        if (t.id !== id) return t;
        const actor = actorFor(t);
        const r = build(t, actor, at);
        if (!r || (!r.events.length && !r.patch)) return t;
        changed = true;
        const evs: TicketEvent[] = r.events.map((e) => ({ id: newEvId(), at, actor: actor.name, actorKind: actor.kind, ...e }));
        const next: Ticket = { ...t, ...r.patch, events: [...t.events, ...evs], updatedAt: at };
        // نخستین پاسخ عمومیِ تیم سازنده، ساعت SLA «اولین پاسخ» را متوقف می‌کند
        if (next.firstResponseAt === undefined && actor.kind === "vendor" && evs.some((e) => !e.internal && ["comment", "status"].includes(e.kind))) next.firstResponseAt = at;
        return next;
      });
      return changed ? { ...s, tickets } : s;
    });
  };

  const statusPatch = (t: Ticket, to: TicketStatus, at: number): Partial<Ticket> => {
    const p: Partial<Ticket> = { status: to };
    if (to === "resolved" || to === "closed" || to === "rejected") p.resolvedAt = t.resolvedAt ?? at;
    else p.resolvedAt = undefined;
    return p;
  };

  const nameOf = (uid: string) => users.find((u) => u.id === uid)?.name ?? uid;
  /** اعلان به دنبال‌کنندگان و «من هم»ها (به‌جز خودِ اقدام‌کننده؛ گزارش‌دهنده جداگانه مطلع می‌شود) */
  const notifyFollowers = (id: string, text: string) => {
    const t = store.tickets.find((x) => x.id === id);
    if (!t) return;
    const to = [...new Set([...(t.followers ?? []), ...(t.affected ?? [])])].filter((u) => u !== actingUser.id && u !== t.reporterId);
    if (to.length) inbox.send(to.map(nameOf), "reply", `تیکت ${t.id} («${t.title}»): ${text}`, `/dashboard/tickets?id=${t.id}`);
  };
  const setPeople = (id: string, fn: (t: Ticket) => Partial<Ticket> | null) =>
    setStore((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...(fn(t) ?? {}) } : t)) }));

  const value: TicketsValue = {
    tickets: store.tickets,
    now,
    isVendor,
    agent,
    setAgentId: (agentId) => setStore((s) => ({ ...s, agentId })),
    actorFor,
    get: (id) => store.tickets.find((t) => t.id === id),
    create: (input) => {
      const at = Math.max(clockNow(), latest);
      const id = nextTicketId(store.tickets);
      const ticket: Ticket = {
        id,
        title: input.title.trim(),
        description: input.description.trim(),
        type: input.type,
        module: input.module,
        priority: input.priority,
        severity: input.severity,
        status: "new",
        reporterId: actingUser.id,
        reporterName: actingUser.name,
        reporterScopeId: input.scopeId,
        createdAt: at,
        updatedAt: at,
        steps: input.steps?.trim() || undefined,
        expected: input.expected?.trim() || undefined,
        actual: input.actual?.trim() || undefined,
        labels: input.labels,
        links: [],
        attachments: input.attachments.map((f) => ({ ...f, at, by: actingUser.name })),
        context: input.context,
        events: [
          { id: newEvId(), at, kind: "created", actor: actingUser.name, actorKind: "reporter" },
          ...(input.attachments.length ? [{ id: newEvId(), at, kind: "attachment" as const, actor: actingUser.name, actorKind: "reporter" as const, files: input.attachments.map((f) => f.name) }] : []),
        ],
      };
      setStore((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
      return ticket;
    },
    comment: (id, text, opts = {}) => {
      if (!(opts.internal && isVendor)) notifyFollowers(id, "پیام جدید ثبت شد.");
      apply(id, (t, actor, at) => {
        const files = opts.files ?? [];
        const internal = !!opts.internal && actor.kind === "vendor";
        const events: Draft[] = [{ kind: internal ? "note" : "comment", text: text.trim(), internal: internal || undefined, files: files.length ? files.map((f) => f.name) : undefined }];
        const patch: Partial<Ticket> = {};
        if (files.length) patch.attachments = [...t.attachments, ...files.map((f) => ({ ...f, at, by: actor.name }))];
        // پاسخ گزارش‌دهنده به «نیاز به اطلاعات بیشتر» تیکت را به صف بررسی برمی‌گرداند
        if (actor.kind === "reporter" && t.status === "need-info") {
          events.push({ kind: "status", from: "need-info", to: "triage", text: "پاسخ گزارش‌دهنده دریافت شد؛ تیکت به صف بررسی برگشت." });
          patch.status = "triage";
        }
        return { patch, events };
      });
    },
    setStatus: (id, to, text, fixedIn) => {
      const cur = store.tickets.find((x) => x.id === id);
      if (cur && cur.status !== to) notifyFollowers(id, `وضعیت به «${to === "resolved" ? "رفع‌شده" : to === "closed" ? "بسته‌شده" : to === "in-progress" ? "در حال رفع" : to === "need-info" ? "نیاز به اطلاعات بیشتر" : to === "rejected" ? "ردشده" : "در حال بررسی"}» تغییر کرد.`);
      apply(id, (t, _a, at) => {
        if (t.status === to) return null;
        const events: Draft[] = [];
        const patch = statusPatch(t, to, at);
        if (fixedIn && fixedIn !== t.fixedIn) {
          events.push({ kind: "release", from: t.fixedIn, to: fixedIn });
          patch.fixedIn = fixedIn;
        }
        events.push({ kind: "status", from: t.status, to, text: text?.trim() || undefined });
        return { patch, events };
      });
    },
    assign: (id, assigneeId) =>
      apply(id, (t) => (t.assigneeId === assigneeId ? null : { patch: { assigneeId }, events: [{ kind: "assign", from: vendorById(t.assigneeId)?.name, to: vendorById(assigneeId)?.name ?? "بدون مسئول" }] })),
    bulkAssign: (ids, assigneeId) => ids.forEach((id) => value.assign(id, assigneeId)),
    bulkStatus: (ids, to, text) => ids.forEach((id) => value.setStatus(id, to, text)),
    setPriority: (id, p, reason) => apply(id, (t) => (t.priority === p ? null : { patch: { priority: p }, events: [{ kind: "priority", from: t.priority, to: p, text: reason?.trim() || undefined }] })),
    setSeverity: (id, sv) => apply(id, (t) => (t.severity === sv ? null : { patch: { severity: sv }, events: [{ kind: "severity", from: t.severity, to: sv }] })),
    addAttachments: (id, files) =>
      apply(id, (t, actor, at) =>
        files.length ? { patch: { attachments: [...t.attachments, ...files.map((f) => ({ ...f, at, by: actor.name }))] }, events: [{ kind: "attachment", files: files.map((f) => f.name) }] } : null,
      ),
    setLabels: (id, labels) => apply(id, (t) => (labels.join("،") === t.labels.join("،") ? null : { patch: { labels }, events: [{ kind: "labels", from: t.labels.join("، ") || undefined, to: labels.join("، ") || "بدون برچسب" }] })),
    addLink: (id, link) => {
      // تیکت تکراری: گزارش‌دهنده و «من هم»های آن به درگیرها و دنبال‌کنندگان تیکت اصلی اضافه می‌شوند
      const dup = store.tickets.find((x) => x.id === id);
      if (dup && link.kind === "duplicate-of" && link.id !== id) {
        const people = [dup.reporterId, ...(dup.affected ?? [])];
        setPeople(link.id, (main) => {
          const fresh = people.filter((u) => u !== main.reporterId && !(main.affected ?? []).includes(u));
          return fresh.length ? { affected: [...(main.affected ?? []), ...fresh], followers: [...new Set([...(main.followers ?? []), ...fresh])] } : null;
        });
        notifyFollowers(id, `به‌عنوان تکراریِ ${link.id} بسته شد؛ پیگیری در همان تیکت انجام می‌شود.`);
        if (dup.reporterId !== actingUser.id) inbox.send([dup.reporterName], "reply", `تیکت ${dup.id} تکراریِ ${link.id} است؛ شما به دنبال‌کنندگان تیکت اصلی اضافه شدید.`, `/dashboard/tickets?id=${link.id}`);
      }
      apply(id, (t, _a, at) => {
        if (link.id === t.id || t.links.some((l) => l.id === link.id)) return null;
        const events: Draft[] = [{ kind: "link", to: link.id, text: link.kind === "duplicate-of" ? "تکراریِ" : "مرتبط با" }];
        const patch: Partial<Ticket> = { links: [...t.links, link] };
        if (link.kind === "duplicate-of" && !["closed", "rejected"].includes(t.status)) {
          Object.assign(patch, statusPatch(t, "closed", at));
          events.push({ kind: "status", from: t.status, to: "closed", text: `به‌عنوان تکراریِ ${link.id} بسته شد؛ پیگیری در همان تیکت انجام می‌شود.` });
        }
        return { patch, events };
      });
    },
    removeLink: (id, otherId) => apply(id, (t) => (t.links.some((l) => l.id === otherId) ? { patch: { links: t.links.filter((l) => l.id !== otherId) }, events: [{ kind: "link", from: otherId, text: "حذف پیوند" }] } : null)),
    setRelease: (id, version) => apply(id, (t) => (t.fixedIn === version ? null : { patch: { fixedIn: version }, events: [{ kind: "release", from: t.fixedIn, to: version ?? "نامشخص" }] })),
    confirmResolution: (id, score, comment) =>
      apply(id, (t, _a, at) => ({
        patch: { ...statusPatch(t, "closed", at), rating: { score, comment: comment?.trim() || undefined, at } },
        events: [
          { kind: "status", from: t.status, to: "closed", text: "گزارش‌دهنده رفع مشکل را تأیید کرد." },
          { kind: "rating", to: String(score), text: comment?.trim() || undefined },
        ],
      })),
    reopen: (id, reason) => {
      notifyFollowers(id, `بازگشایی شد: ${reason.trim()}`);
      apply(id, (t, _a, at) => ({
        patch: { ...statusPatch(t, "triage", at), rating: undefined },
        events: [{ kind: "status", from: t.status, to: "triage", text: `بازگشایی: ${reason.trim()}` }],
      }));
    },
    rate: (id, score, comment) => apply(id, (_t, _a, at) => ({ patch: { rating: { score, comment: comment?.trim() || undefined, at } }, events: [{ kind: "rating", to: String(score), text: comment?.trim() || undefined }] })),
    isFollowing: (t, userId = actingUser.id) => (t.followers ?? []).includes(userId),
    toggleFollow: (id) =>
      setPeople(id, (t) => {
        const f = t.followers ?? [];
        return { followers: f.includes(actingUser.id) ? f.filter((u) => u !== actingUser.id) : [...f, actingUser.id] };
      }),
    addFollower: (id, userId) => {
      const t = store.tickets.find((x) => x.id === id);
      if (!t || (t.followers ?? []).includes(userId)) return;
      setPeople(id, (x) => ({ followers: [...(x.followers ?? []), userId] }));
      if (userId !== actingUser.id) inbox.send([nameOf(userId)], "reply", `«${actingUser.name}» شما را دنبال‌کننده‌ی تیکت ${t.id} («${t.title}») کرد؛ به‌روزرسانی‌ها به شما اعلان می‌شود.`, `/dashboard/tickets?id=${t.id}`);
    },
    removeFollower: (id, userId) => setPeople(id, (t) => ({ followers: (t.followers ?? []).filter((u) => u !== userId) })),
    meToo: (id) => {
      const t = store.tickets.find((x) => x.id === id);
      if (!t || t.reporterId === actingUser.id || (t.affected ?? []).includes(actingUser.id)) return false;
      setPeople(id, (x) => ({ affected: [...(x.affected ?? []), actingUser.id], followers: [...new Set([...(x.followers ?? []), actingUser.id])] }));
      apply(id, () => ({ events: [{ kind: "affected", text: `«${actingUser.name}» هم این مشکل را دارد (${(2 + (t.affected?.length ?? 0)).toLocaleString("fa-IR")} کاربر درگیر).` }] }));
      if (t.reporterId !== actingUser.id) inbox.send([t.reporterName], "reply", `«${actingUser.name}» هم مشکل تیکت ${t.id} را دارد.`, `/dashboard/tickets?id=${t.id}`);
      return true;
    },
    involved: (t) => t.reporterId === actingUser.id || (t.followers ?? []).includes(actingUser.id) || (t.affected ?? []).includes(actingUser.id),
    reset: () => {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* نادیده */
      }
      setStore({ version: VERSION, tickets: seedTickets(), agentId: "v1" });
    },
  };

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}

export function useTickets() {
  const ctx = useContext(TicketsContext);
  if (!ctx) throw new Error("useTickets must be used within TicketsProvider");
  return ctx;
}

/** نسخه‌ی اختیاری — برای بخش‌هایی (مثل راهنما) که بدون Provider هم باید کار کنند */
export function useTicketsMaybe() {
  return useContext(TicketsContext);
}
