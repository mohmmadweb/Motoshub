// ---------------------------------------------------------------------------
// خواندن خروجی JSON بورد ترلو (Menu › Print, export and share › Export as JSON)
//   lists ← ستون‌های بورد (= وضعیت کار در کاریز)؛ cards ← کارها؛ members ← افراد؛
//   labels ← برچسب‌ها؛ checklists ← چک‌لیست؛ actions(commentCard) ← نظرها.
// ---------------------------------------------------------------------------
import type { RawTask, StatusOption } from "./model";

type TList = { id: string; name: string; closed?: boolean; pos?: number };
type TCard = {
  id: string;
  idShort?: number;
  name: string;
  desc?: string;
  due?: string | null;
  start?: string | null;
  dueComplete?: boolean;
  idList: string;
  idMembers?: string[];
  idLabels?: string[];
  labels?: { id: string; name?: string; color?: string }[];
  closed?: boolean;
  pos?: number;
};
type TMember = { id: string; fullName?: string; username?: string };
type TLabel = { id: string; name?: string; color?: string | null };
type TChecklist = { id: string; idCard: string; name?: string; pos?: number; checkItems?: { name: string; state?: string; pos?: number }[] };
type TAction = { type: string; date?: string; data?: { text?: string; card?: { id: string } }; memberCreator?: { fullName?: string; username?: string }; idMemberCreator?: string };
export type TrelloBoard = { name?: string; lists?: TList[]; cards?: TCard[]; members?: TMember[]; labels?: TLabel[]; checklists?: TChecklist[]; actions?: TAction[] };

/** نام فارسی رنگ برچسب‌های بی‌نام ترلو */
const colorFa: Record<string, string> = {
  green: "سبز", yellow: "زرد", orange: "نارنجی", red: "قرمز", purple: "بنفش", blue: "آبی", sky: "آبی روشن", lime: "سبز روشن", pink: "صورتی", black: "مشکی",
};
const labelName = (l: { name?: string; color?: string | null }) => (l.name?.trim() ? l.name.trim() : l.color ? `ترلو: ${colorFa[l.color.replace(/_.*$/, "")] ?? l.color}` : "");

export const looksLikeTrello = (text: string) => /^\s*\{/.test(text) && /"cards"\s*:/.test(text) && /"lists"\s*:/.test(text);

export type TrelloParsed = { board: string; raw: RawTask[]; lists: StatusOption[]; listNames: Map<string, { label: string; archived?: boolean }>; commentCount: number };

export function parseTrello(text: string): TrelloParsed {
  const b = JSON.parse(text) as TrelloBoard;
  if (!Array.isArray(b.cards) || !Array.isArray(b.lists)) throw new Error("not a trello board");
  const lists = [...b.lists].sort((x, y) => (x.pos ?? 0) - (y.pos ?? 0));
  const listById = new Map(lists.map((l) => [l.id, l]));
  const memberName = new Map((b.members ?? []).map((m) => [m.id, m.fullName?.trim() || m.username || m.id]));
  const labelById = new Map((b.labels ?? []).map((l) => [l.id, labelName(l)]));
  const checklistsByCard = new Map<string, TChecklist[]>();
  (b.checklists ?? []).forEach((c) => checklistsByCard.set(c.idCard, [...(checklistsByCard.get(c.idCard) ?? []), c]));
  const commentsByCard = new Map<string, RawTask["comments"]>();
  (b.actions ?? [])
    .filter((a) => a.type === "commentCard" && a.data?.card?.id && a.data.text)
    .forEach((a) => {
      const id = a.data!.card!.id;
      const author = a.memberCreator?.fullName || a.memberCreator?.username || (a.idMemberCreator && memberName.get(a.idMemberCreator)) || "عضو ترلو";
      commentsByCard.set(id, [...(commentsByCard.get(id) ?? []), { author, at: a.date ?? "", text: a.data!.text! }]);
    });

  const cards = [...b.cards].sort((x, y) => {
    const lx = lists.findIndex((l) => l.id === x.idList);
    const ly = lists.findIndex((l) => l.id === y.idList);
    return lx - ly || (x.pos ?? 0) - (y.pos ?? 0);
  });
  const raw: RawTask[] = cards.map((c, i) => {
    const list = listById.get(c.idList);
    const labels = [...new Set([...(c.idLabels ?? []).map((id) => labelById.get(id) ?? ""), ...(c.labels ?? []).map(labelName)].filter(Boolean))];
    const checklist = (checklistsByCard.get(c.id) ?? [])
      .sort((x, y) => (x.pos ?? 0) - (y.pos ?? 0))
      .flatMap((cl) => [...(cl.checkItems ?? [])].sort((x, y) => (x.pos ?? 0) - (y.pos ?? 0)).map((it) => it.name.trim()))
      .filter(Boolean);
    const checklistDone = (checklistsByCard.get(c.id) ?? []).flatMap((cl) => (cl.checkItems ?? []).filter((it) => it.state === "complete").map((it) => it.name.trim()));
    // نظرها در خروجی ترلو از جدید به قدیم‌اند
    const comments = [...(commentsByCard.get(c.id) ?? [])].reverse();
    return {
      line: i + 1,
      refs: [c.id, ...(c.idShort ? [String(c.idShort)] : [])],
      title: c.name?.trim() ?? "",
      description: c.desc ?? "",
      status: c.idList,
      statusLabel: list?.name,
      // «تکمیل‌شده» در ترلو (تیک سررسید) ← انجام‌شده، هر ستونی که باشد
      done: !!c.dueComplete,
      people: (c.idMembers ?? []).map((id) => memberName.get(id) ?? "").filter(Boolean),
      watchers: [],
      priority: "",
      type: "",
      start: c.start ?? "",
      due: c.due ?? "",
      reminder: "",
      labels,
      checklist,
      checklistDone,
      estHours: 0,
      comments,
      archived: !!c.closed || !!list?.closed,
    };
  });
  const listNames = new Map(lists.map((l) => [l.id, { label: l.name, archived: !!l.closed }]));
  const count = new Map<string, number>();
  raw.forEach((r) => count.set(r.status, (count.get(r.status) ?? 0) + 1));
  return {
    board: b.name ?? "",
    raw,
    lists: lists.map((l) => ({ key: l.id, label: l.name, archived: !!l.closed, count: count.get(l.id) ?? 0 })),
    listNames,
    commentCount: raw.reduce((a, r) => a + r.comments.length, 0),
  };
}

/** دستیار: کلیدهای چک‌لیست تیک‌خورده در ترلو (برای اطلاع در پیش‌نمایش) */
export function trelloDoneChecks(text: string): number {
  try {
    const b = JSON.parse(text) as TrelloBoard;
    return (b.checklists ?? []).reduce((a, c) => a + (c.checkItems ?? []).filter((x) => x.state === "complete").length, 0);
  } catch {
    return 0;
  }
}
