// ---------------------------------------------------------------------------
// انبار ماژول مدیریت دانش. همه‌ی تغییرات از اکشن‌ها عبور می‌کنند، در تاریخچه‌ی دانش
// ثبت می‌شوند و در صورت لزوم برای افراد مرتبط اعلان (صندوق شخصی) صادر می‌کنند.
// اسناد مخزن با ContentContext همگام می‌شوند تا جستجوی سراسری و صفحات عمومی کار کنند.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTenancy } from "./TenancyContext";
import { useContent } from "./ContentContext";
import { useInbox } from "./InboxContext";
import { addDays, dayNum, nowClock } from "../pm/jalali";
import type { KnowledgeDoc } from "../data/mock";
import {
  KM_TODAY,
  seedCategories,
  seedDocTypes,
  seedDocs,
  seedExperiences,
  seedExperts,
  seedGlossary,
  seedProcesses,
  seedRegistry,
  seedRegistryTypes,
  seedRnd,
  seedSettings,
} from "../km/seed";
import type {
  AccessLevel,
  DocStatus,
  Experience,
  Expert,
  GlossaryTerm,
  KCategory,
  KComment,
  KDoc,
  KDocType,
  KFile,
  KLog,
  KProcess,
  KRelation,
  KSettings,
  RegistryItem,
  RegistryType,
  RndDoc,
} from "../km/types";

const KEY = "motoshub.km.v1";
const VERSION = 1;

type Store = {
  version: number;
  seq: number;
  docs: KDoc[];
  categories: KCategory[];
  docTypes: KDocType[];
  registryTypes: RegistryType[];
  registry: RegistryItem[];
  rnd: RndDoc[];
  processes: KProcess[];
  experiences: Experience[];
  experts: Expert[];
  glossary: GlossaryTerm[];
  settings: KSettings;
  logs: KLog[];
  searches: { term: string; at: string; results: number }[];
  reminded: string[];
};

function initial(): Store {
  return {
    version: VERSION,
    seq: 500,
    docs: seedDocs(),
    categories: seedCategories(),
    docTypes: seedDocTypes(),
    registryTypes: seedRegistryTypes(),
    registry: seedRegistry(),
    rnd: seedRnd(),
    processes: seedProcesses(),
    experiences: seedExperiences(),
    experts: seedExperts(),
    glossary: seedGlossary(),
    settings: seedSettings(),
    logs: [
      { id: "kl1", at: "۱۴۰۵/۰۳/۰۲ ۱۰:۱۲", seq: 1, actor: "پایگاه اطلاع‌رسانی بنیاد", action: "سند را برای اصلاح ارجاع داد", entity: { type: "doc", id: "d10", title: "تفاهم‌نامه" } },
      { id: "kl2", at: "۱۴۰۵/۰۳/۰۵ ۰۹:۳۰", seq: 2, actor: "مهندس بردیا کوشا", action: "درس‌آموخته ثبت کرد", entity: { type: "lesson", id: "xp2", title: "کدگذاری فایل‌های قدیمی" } },
      { id: "kl3", at: "۱۴۰۵/۰۳/۰۷ ۱۴:۰۵", seq: 3, actor: "وحید خاوئی", action: "سند را مشاهده کرد", entity: { type: "doc", id: "d4", title: "گزارش پیشرفت قلعه‌گنج" } },
    ],
    searches: [
      { term: "قرارداد", at: "۱۴۰۵/۰۳/۰۱", results: 3 },
      { term: "آیین‌نامه معاملات", at: "۱۴۰۵/۰۳/۰۲", results: 0 },
      { term: "TRL", at: "۱۴۰۵/۰۳/۰۳", results: 2 },
      { term: "آیین‌نامه معاملات", at: "۱۴۰۵/۰۳/۰۴", results: 0 },
      { term: "اشتغال", at: "۱۴۰۵/۰۳/۰۵", results: 4 },
      { term: "ارزش‌گذاری", at: "۱۴۰۵/۰۳/۰۶", results: 1 },
      { term: "قرارداد", at: "۱۴۰۵/۰۳/۰۶", results: 3 },
      { term: "امنیت اطلاعات", at: "۱۴۰۵/۰۳/۰۷", results: 0 },
    ],
    reminded: [],
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s.version === VERSION) return s;
    }
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return initial();
}

export type NewDocInput = Omit<KDoc, "id" | "code" | "createdAt" | "updatedAt" | "version" | "status" | "versions" | "workflow" | "views" | "downloads" | "ratings" | "feedback" | "comments" | "followers" | "author"> & { submit: boolean };
export type WorkflowAction = "submit" | "approve" | "return" | "publish" | "archive" | "restore";
export type EntityKind = "doc" | "registry" | "process" | "lesson" | "expert" | "glossary";

type Ctx = Store & {
  today: string;
  me: string;
  categoryName: (id?: string) => string;
  categoryPath: (id?: string) => string;
  canSee: (d: KDoc) => boolean;
  isApprover: (d: KDoc) => boolean;
  // اسناد
  createDoc: (input: NewDocInput) => string;
  updateDoc: (id: string, patch: Partial<KDoc>) => void;
  deleteDoc: (id: string) => void;
  newVersion: (id: string, files: KFile[], note: string) => void;
  workflow: (id: string, action: WorkflowAction, note?: string) => void;
  addComment: (id: string, text: string, kind: KComment["kind"]) => void;
  rate: (id: string, score: number) => void;
  feedback: (id: string, helpful: boolean, reason?: string) => void;
  reportOutdated: (id: string, reason: string) => void;
  toggleFollow: (id: string) => void;
  viewDoc: (id: string) => void;
  downloadDoc: (id: string) => void;
  reviewResult: (id: string, result: "تمدید" | "نیاز به اصلاح" | "آرشیو", note: string) => void;
  // روابط
  addRelation: (kind: EntityKind, id: string, rel: KRelation) => void;
  removeRelation: (kind: EntityKind, id: string, rel: KRelation) => void;
  // طبقه‌بندی و تنظیمات
  saveCategory: (c: Omit<KCategory, "id"> & { id?: string }) => void;
  deleteCategory: (id: string) => void;
  saveDocType: (t: Omit<KDocType, "id"> & { id?: string }) => void;
  deleteDocType: (id: string) => void;
  updateSettings: (patch: Partial<KSettings>) => void;
  toggleInterest: (categoryId: string) => void;
  // شناسنامه‌ها
  saveRegistryType: (t: Omit<RegistryType, "id"> & { id?: string }) => void;
  deleteRegistryType: (id: string) => void;
  saveRegistryItem: (r: Omit<RegistryItem, "id" | "updatedAt"> & { id?: string }) => void;
  deleteRegistryItem: (id: string) => void;
  // سندهای فرصت R&D
  saveRnd: (r: Omit<RndDoc, "id" | "history"> & { id?: string }) => void;
  deleteRnd: (id: string) => void;
  // فرآیند، تجربه، خبره، واژه
  saveProcess: (p: Omit<KProcess, "id"> & { id?: string }) => void;
  deleteProcess: (id: string) => void;
  saveExperience: (e: Omit<Experience, "id" | "date" | "helpful" | "comments"> & { id?: string }) => void;
  deleteExperience: (id: string) => void;
  markHelpful: (id: string) => void;
  saveExpert: (e: Omit<Expert, "id"> & { id?: string }) => void;
  deleteExpert: (id: string) => void;
  saveTerm: (g: Omit<GlossaryTerm, "id"> & { id?: string }) => void;
  deleteTerm: (id: string) => void;
  /** انتقال دانش پروژه به مخزن سازمانی (بند ۲۰) */
  transferProjectKnowledge: (projectId: string, projectName: string, docs: { name: string; type: string; size: string }[]) => number;
  logSearch: (term: string, results: number) => void;
  resetKm: () => void;
};

const KnowledgeContext = createContext<Ctx | null>(null);

const statusAfter: Record<WorkflowAction, DocStatus> = {
  submit: "در بررسی",
  approve: "تأییدشده",
  return: "ارجاع برای اصلاح",
  publish: "منتشرشده",
  archive: "آرشیو",
  restore: "منتشرشده",
};
const actionLabel: Record<WorkflowAction, string> = {
  submit: "ارسال برای بررسی",
  approve: "تأیید",
  return: "ارجاع برای اصلاح",
  publish: "انتشار",
  archive: "آرشیو",
  restore: "بازیابی از آرشیو",
};

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load);
  const { actingUser, hasPermission } = useTenancy();
  const { setKnowledgeDocs } = useContent();
  const inbox = useInbox();
  const me = actingUser.name;
  const stamp = () => `${KM_TODAY} ${nowClock()}`;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* نادیده */
    }
  }, [store]);

  // همگام‌سازی با فهرست اسناد قدیمی (جستجوی سراسری، صفحات عمومی)
  useEffect(() => {
    const cat = (id: string) => store.categories.find((c) => c.id === id)?.name ?? "—";
    setKnowledgeDocs(() =>
      store.docs
        .filter((d) => d.status !== "آرشیو")
        .map(
          (d): KnowledgeDoc => ({
            id: d.id,
            title: d.title,
            category: cat(d.categoryId),
            type: d.type as KnowledgeDoc["type"],
            updatedAt: d.updatedAt,
            owner: d.owner,
            size: d.files[0]?.size ?? "—",
            visibility: d.access === "عمومی" ? "عمومی" : "خصوصی",
            scope: d.scope,
            holdingId: d.holdingId,
            companyId: d.companyId,
            authorId: d.authorId,
          })
        )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.docs, store.categories]);

  // بند ۱۵: یادآوری موعد بازبینی به مالک سند (یک بار برای هر موعد)
  useEffect(() => {
    const today = dayNum(KM_TODAY)!;
    const due = store.docs.filter((d) => d.status !== "آرشیو" && (dayNum(d.reviewDate) ?? 9e9) - today <= 7 && !store.reminded.includes(`${d.id}:${d.reviewDate}`));
    if (!due.length) return;
    due.forEach((d) => {
      const left = (dayNum(d.reviewDate) ?? today) - today;
      inbox.send([d.owner, ...d.approvers], "knowledge", left < 0 ? `موعد بازبینی سند «${d.title}» ${Math.abs(left).toLocaleString("fa-IR")} روز گذشته است.` : `موعد بازبینی سند «${d.title}» ${left ? `${left.toLocaleString("fa-IR")} روز دیگر` : "امروز"} است.`, `/dashboard/knowledge?tab=review&doc=${d.id}`);
    });
    setStore((prev) => ({ ...prev, reminded: [...prev.reminded, ...due.map((d) => `${d.id}:${d.reviewDate}`)] }));
    // فقط در شروع
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const log = (s: Store, action: string, entity: KLog["entity"]): Store => {
    const seq = s.seq + 1;
    return { ...s, seq, logs: [{ id: `kl${seq}`, at: stamp(), seq, actor: me, action, entity }, ...s.logs].slice(0, 400) };
  };
  const nid = (s: Store, p: string) => `${p}${s.seq + 1}-${Date.now().toString(36)}`;

  const patchDoc = (id: string, fn: (d: KDoc) => KDoc, action?: string) =>
    setStore((prev) => {
      const d = prev.docs.find((x) => x.id === id);
      if (!d) return prev;
      const next = fn(structuredClone(d));
      const s = { ...prev, docs: prev.docs.map((x) => (x.id === id ? next : x)) };
      return action ? log(s, action, { type: "doc", id, title: next.title }) : s;
    });

  const canSee = (d: KDoc) => {
    if (d.access === "عمومی" || d.access === "داخلی") return true;
    if (d.owner === me || d.author === me || d.approvers.includes(me)) return true;
    if (d.access === "محرمانه") return hasPermission("knowledge.confidential");
    return hasPermission("knowledge.confidential") && hasPermission("knowledge.approve");
  };

  const interestedIn = (catId: string) =>
    Object.entries(store.settings.interests)
      .filter(([, cats]) => cats.includes(catId) || cats.includes(store.categories.find((c) => c.id === catId)?.parentId ?? "—"))
      .map(([n]) => n);

  const crud = <K extends "registry" | "processes" | "experiences" | "experts" | "glossary" | "rnd" | "categories" | "docTypes" | "registryTypes">(key: K, prefix: string, label: string, titleOf: (x: Store[K][number]) => string, type: string) => ({
    save: (item: Partial<Store[K][number]> & { id?: string }) =>
      setStore((prev) => {
        const list = prev[key] as unknown as { id: string }[];
        if (item.id && list.some((x) => x.id === item.id)) {
          const updated = list.map((x) => (x.id === item.id ? { ...x, ...item } : x));
          const it = updated.find((x) => x.id === item.id) as Store[K][number];
          return log({ ...prev, [key]: updated } as Store, `${label} را ویرایش کرد`, { type, id: item.id, title: titleOf(it) });
        }
        const id = nid(prev, prefix);
        const created = { ...item, id } as Store[K][number];
        return log({ ...prev, [key]: [created, ...list] } as Store, `${label} جدید ثبت کرد`, { type, id, title: titleOf(created) });
      }),
    remove: (id: string) =>
      setStore((prev) => {
        const list = prev[key] as unknown as { id: string }[];
        const it = list.find((x) => x.id === id) as Store[K][number] | undefined;
        if (!it) return prev;
        return log({ ...prev, [key]: list.filter((x) => x.id !== id) } as Store, `${label} را حذف کرد`, { type, id, title: titleOf(it) });
      }),
  });

  const reg = crud("registry", "rg", "شناسنامه", (x) => x.title, "registry");
  const rtype = crud("registryTypes", "rt", "نوع شناسنامه", (x) => x.name, "registry-type");
  const proc = crud("processes", "kp", "فرآیند", (x) => x.name, "process");
  const exp = crud("experiences", "xp", "دانش/تجربه", (x) => x.title, "lesson");
  const expert = crud("experts", "ex", "پروفایل خبره", (x) => x.name, "expert");
  const term = crud("glossary", "g", "واژه", (x) => x.term, "glossary");
  const cat = crud("categories", "cat", "دسته‌بندی", (x) => x.name, "category");
  const dtype = crud("docTypes", "dt", "نوع سند", (x) => x.name, "doc-type");

  const relKey: Record<EntityKind, keyof Store> = { doc: "docs", registry: "registry", process: "processes", lesson: "experiences", expert: "experts", glossary: "glossary" };

  const value: Ctx = {
    ...store,
    today: KM_TODAY,
    me,
    categoryName: (id) => store.categories.find((c) => c.id === id)?.name ?? "—",
    categoryPath: (id) => {
      const c = store.categories.find((x) => x.id === id);
      if (!c) return "—";
      const parent = c.parentId ? store.categories.find((x) => x.id === c.parentId) : undefined;
      return parent ? `${parent.name} › ${c.name}` : c.name;
    },
    canSee,
    isApprover: (d) => d.approvers.includes(me) || hasPermission("knowledge.approve"),

    createDoc: (input) => {
      const { submit, ...rest } = input;
      let newId = "";
      setStore((prev) => {
        const seq = prev.seq + 1;
        newId = `kd-${seq}-${Date.now().toString(36)}`;
        const doc: KDoc = {
          ...rest,
          id: newId,
          code: `KM-1405-${String(seq).padStart(4, "0")}`,
          author: me,
          createdAt: KM_TODAY,
          updatedAt: KM_TODAY,
          version: 1,
          status: submit ? "در بررسی" : "پیش‌نویس",
          versions: [{ version: 1, date: KM_TODAY, by: me, note: "ایجاد سند", files: rest.files }],
          workflow: submit ? [{ id: `wf${seq}`, action: "ارسال برای بررسی", from: "پیش‌نویس", to: "در بررسی", by: me, at: stamp() }] : [],
          views: 0,
          downloads: 0,
          ratings: [],
          feedback: [],
          comments: [],
          followers: [me],
        };
        return log({ ...prev, docs: [doc, ...prev.docs] }, submit ? "سند جدید ثبت و برای بررسی ارسال کرد" : "پیش‌نویس سند جدید ثبت کرد", { type: "doc", id: newId, title: doc.title });
      });
      if (submit) inbox.send(input.approvers, "knowledge", `«${me}» سند «${input.title}» را برای بررسی و تأیید به شما ارجاع داد.`, `/dashboard/knowledge?tab=workflow`);
      return newId;
    },
    updateDoc: (id, patch) => patchDoc(id, (d) => ({ ...d, ...patch, updatedAt: KM_TODAY }), "اطلاعات سند را ویرایش کرد"),
    deleteDoc: (id) =>
      setStore((prev) => {
        const d = prev.docs.find((x) => x.id === id);
        if (!d) return prev;
        return log({ ...prev, docs: prev.docs.filter((x) => x.id !== id) }, "سند را حذف کرد", { type: "doc", id, title: d.title });
      }),
    newVersion: (id, files, note) => {
      const d = store.docs.find((x) => x.id === id);
      patchDoc(
        id,
        (x) => ({
          ...x,
          version: x.version + 1,
          files,
          updatedAt: KM_TODAY,
          versions: [...x.versions, { version: x.version + 1, date: KM_TODAY, by: me, note, files }],
          status: store.settings.workflowSteps.review ? "در بررسی" : x.status,
          workflow: store.settings.workflowSteps.review ? [...x.workflow, { id: `wf${Date.now()}`, action: `نسخه‌ی ${x.version + 1} برای بررسی`, from: x.status, to: "در بررسی", by: me, at: stamp(), note }] : x.workflow,
        }),
        `نسخه‌ی جدید سند را بارگذاری کرد`
      );
      if (d) {
        inbox.send(d.followers, "knowledge", `نسخه‌ی ${(d.version + 1).toLocaleString("fa-IR")} سند «${d.title}» که دنبال می‌کنید بارگذاری شد.`, `/dashboard/knowledge?tab=bank&doc=${id}`);
        if (store.settings.workflowSteps.review) inbox.send(d.approvers, "knowledge", `نسخه‌ی جدید «${d.title}» منتظر بررسی شماست.`, `/dashboard/knowledge?tab=workflow`);
      }
    },
    workflow: (id, action, note) => {
      const d = store.docs.find((x) => x.id === id);
      if (!d) return;
      const to = statusAfter[action];
      patchDoc(
        id,
        (x) => ({
          ...x,
          status: to,
          archiveReason: action === "archive" ? note : action === "restore" ? undefined : x.archiveReason,
          workflow: [...x.workflow, { id: `wf${Date.now()}`, action: actionLabel[action], from: x.status, to, by: me, at: stamp(), note }],
        }),
        `گردش کار: ${actionLabel[action]}`
      );
      const link = `/dashboard/knowledge?tab=bank&doc=${id}`;
      if (action === "submit") inbox.send(d.approvers, "knowledge", `سند «${d.title}» برای بررسی به شما ارجاع شد.`, `/dashboard/knowledge?tab=workflow`);
      if (action === "approve") inbox.send([d.owner, d.author], "knowledge", `سند «${d.title}» توسط «${me}» تأیید شد.`, link);
      if (action === "return") inbox.send([d.owner, d.author], "knowledge", `سند «${d.title}» برای اصلاح به شما ارجاع شد${note ? `: «${note}»` : "."}`, link);
      if (action === "publish") {
        inbox.send([d.owner, d.author, ...d.followers], "knowledge", `سند «${d.title}» منتشر شد.`, link);
        const interested = interestedIn(d.categoryId);
        if (interested.length) inbox.send(interested, "knowledge", `دانش جدید در حوزه‌ی مورد علاقه‌ی شما: «${d.title}»`, link);
      }
      if (action === "archive") inbox.send([d.owner, ...d.followers], "knowledge", `سند «${d.title}» آرشیو شد${note ? ` (دلیل: ${note})` : ""}.`, link);
    },
    addComment: (id, text, kind) => {
      const d = store.docs.find((x) => x.id === id);
      patchDoc(id, (x) => ({ ...x, comments: [...x.comments, { id: `kc${Date.now()}`, author: me, text, at: stamp(), kind }] }), kind === "پیشنهاد اصلاح" ? "پیشنهاد اصلاح ثبت کرد" : "نظر ثبت کرد");
      if (d) {
        inbox.send([d.owner, d.author], "knowledge", `«${me}» روی سند «${d.title}» ${kind === "پیشنهاد اصلاح" ? "پیشنهاد اصلاح" : kind === "پرسش" ? "پرسش" : "نظر"} ثبت کرد.`, `/dashboard/knowledge?tab=bank&doc=${id}`);
        const mentioned = (text.match(/@[^\s،.,!؟?]+/g) ?? []).map((t) => t.slice(1).replace(/_/g, " "));
        if (mentioned.length) inbox.send(mentioned, "mention", `«${me}» شما را در سند «${d.title}» منشن کرد.`, `/dashboard/knowledge?tab=bank&doc=${id}`);
      }
    },
    rate: (id, score) => patchDoc(id, (x) => ({ ...x, ratings: [...x.ratings.filter((r) => r.by !== me), { by: me, score }] }), "به سند امتیاز داد"),
    feedback: (id, helpful, reason) => patchDoc(id, (x) => ({ ...x, feedback: [...x.feedback.filter((f) => f.by !== me), { by: me, helpful, reason }] }), helpful ? "سند را مفید دانست" : "سند را نامفید دانست"),
    reportOutdated: (id, reason) => {
      const d = store.docs.find((x) => x.id === id);
      patchDoc(id, (x) => ({ ...x, reported: [...(x.reported ?? []), { by: me, reason, at: KM_TODAY }] }), "سند را قدیمی/نادرست گزارش کرد");
      if (d) inbox.send([d.owner], "knowledge", `«${me}» سند «${d.title}» را قدیمی یا نادرست گزارش کرد: «${reason}»`, `/dashboard/knowledge?tab=bank&doc=${id}`);
    },
    toggleFollow: (id) => patchDoc(id, (x) => ({ ...x, followers: x.followers.includes(me) ? x.followers.filter((f) => f !== me) : [...x.followers, me] })),
    viewDoc: (id) => patchDoc(id, (x) => ({ ...x, views: x.views + 1 })),
    downloadDoc: (id) => patchDoc(id, (x) => ({ ...x, downloads: x.downloads + 1 }), "سند را دانلود کرد"),
    reviewResult: (id, result, note) => {
      patchDoc(
        id,
        (x) => ({
          ...x,
          reviewDate: result === "تمدید" ? addDays(KM_TODAY, store.settings.reviewPeriodDays) : x.reviewDate,
          status: result === "آرشیو" ? "آرشیو" : result === "نیاز به اصلاح" ? "ارجاع برای اصلاح" : x.status,
          archiveReason: result === "آرشیو" ? note || "پایان اعتبار در بازبینی دوره‌ای" : x.archiveReason,
          workflow: [...x.workflow, { id: `wf${Date.now()}`, action: `بازبینی دوره‌ای: ${result}`, from: x.status, to: result === "آرشیو" ? "آرشیو" : result === "نیاز به اصلاح" ? "ارجاع برای اصلاح" : x.status, by: me, at: stamp(), note }],
        }),
        `نتیجه‌ی بازبینی دوره‌ای را ثبت کرد (${result})`
      );
    },

    addRelation: (kind, id, rel) =>
      setStore((prev) => {
        const k = relKey[kind];
        const list = prev[k] as unknown as { id: string; relations: KRelation[] }[];
        return { ...prev, [k]: list.map((x) => (x.id === id && !x.relations.some((r) => r.type === rel.type && r.id === rel.id) ? { ...x, relations: [...x.relations, rel] } : x)) };
      }),
    removeRelation: (kind, id, rel) =>
      setStore((prev) => {
        const k = relKey[kind];
        const list = prev[k] as unknown as { id: string; relations: KRelation[] }[];
        return { ...prev, [k]: list.map((x) => (x.id === id ? { ...x, relations: x.relations.filter((r) => !(r.type === rel.type && r.id === rel.id)) } : x)) };
      }),

    saveCategory: cat.save,
    deleteCategory: (id) =>
      setStore((prev) => {
        const fallback = prev.categories.find((c) => c.id !== id && !c.parentId)?.id ?? "";
        const s = { ...prev, categories: prev.categories.filter((c) => c.id !== id).map((c) => (c.parentId === id ? { ...c, parentId: undefined } : c)), docs: prev.docs.map((d) => (d.categoryId === id ? { ...d, categoryId: fallback } : d)) };
        return log(s, "دسته‌بندی را حذف کرد", { type: "category", id, title: prev.categories.find((c) => c.id === id)?.name ?? "" });
      }),
    saveDocType: dtype.save,
    deleteDocType: dtype.remove,
    updateSettings: (patch) => setStore((prev) => log({ ...prev, settings: { ...prev.settings, ...patch } }, "تنظیمات مدیریت دانش را تغییر داد", { type: "settings", id: "km", title: "تنظیمات" })),
    toggleInterest: (categoryId) =>
      setStore((prev) => {
        const cur = prev.settings.interests[me] ?? [];
        return { ...prev, settings: { ...prev.settings, interests: { ...prev.settings.interests, [me]: cur.includes(categoryId) ? cur.filter((x) => x !== categoryId) : [...cur, categoryId] } } };
      }),

    saveRegistryType: rtype.save as Ctx["saveRegistryType"],
    deleteRegistryType: (id) =>
      setStore((prev) => log({ ...prev, registryTypes: prev.registryTypes.filter((t) => t.id !== id), registry: prev.registry.filter((r) => r.typeId !== id) }, "نوع شناسنامه را حذف کرد", { type: "registry-type", id, title: prev.registryTypes.find((t) => t.id === id)?.name ?? "" })),
    saveRegistryItem: (r) => reg.save({ ...r, updatedAt: KM_TODAY }),
    deleteRegistryItem: reg.remove,

    saveRnd: (r) =>
      setStore((prev) => {
        const old = r.id ? prev.rnd.find((x) => x.id === r.id) : undefined;
        if (old) {
          const history = old.progress !== r.progress ? [{ at: KM_TODAY, by: me, text: `وضعیت از «${old.statusLabel}» به «${r.statusLabel}» تغییر کرد.` }, ...old.history] : old.history;
          const updated = { ...old, ...r, id: old.id, history };
          return log({ ...prev, rnd: prev.rnd.map((x) => (x.id === old.id ? updated : x)) }, "سند فرصت R&D را ویرایش کرد", { type: "rnd", id: old.id, title: updated.company });
        }
        const id = nid(prev, "rd");
        const created: RndDoc = { ...r, id, history: [{ at: KM_TODAY, by: me, text: "سند ایجاد شد." }] };
        return log({ ...prev, rnd: [created, ...prev.rnd] }, "سند فرصت R&D جدید ثبت کرد", { type: "rnd", id, title: created.company });
      }),
    deleteRnd: (id) =>
      setStore((prev) => {
        const r = prev.rnd.find((x) => x.id === id);
        return r ? log({ ...prev, rnd: prev.rnd.filter((x) => x.id !== id) }, "سند فرصت R&D را حذف کرد", { type: "rnd", id, title: r.company }) : prev;
      }),

    saveProcess: proc.save as Ctx["saveProcess"],
    deleteProcess: proc.remove,
    saveExperience: (e) => {
      const isNew = !e.id;
      exp.save(isNew ? { ...e, date: KM_TODAY, helpful: 0, comments: [] } : e);
      if (isNew && e.status === "منتشرشده") {
        const interested = Object.keys(store.settings.interests);
        inbox.send(interested, "knowledge", `${e.kind} جدید ثبت شد: «${e.title}»`, `/dashboard/knowledge?tab=${e.kind === "درس‌آموخته" && e.projectId ? "projects" : "experience"}`);
      }
    },
    deleteExperience: exp.remove,
    markHelpful: (id) => setStore((prev) => ({ ...prev, experiences: prev.experiences.map((x) => (x.id === id ? { ...x, helpful: x.helpful + 1 } : x)) })),
    saveExpert: expert.save as Ctx["saveExpert"],
    deleteExpert: expert.remove,
    saveTerm: term.save as Ctx["saveTerm"],
    deleteTerm: term.remove,

    transferProjectKnowledge: (projectId, projectName, docs) => {
      const existing = new Set(store.docs.filter((d) => d.relations.some((r) => r.type === "project" && r.id === projectId)).map((d) => d.title));
      const fresh = docs.filter((d) => !existing.has(`${projectName} — ${d.name}`));
      setStore((prev) => {
        let seq = prev.seq;
        const newDocs: KDoc[] = fresh.map((f) => {
          seq += 1;
          const ext = f.name.split(".").pop() ?? "pdf";
          const file = { id: `f${seq}`, name: f.name, size: f.size, ext };
          return {
            id: `kd-${seq}-${Date.now().toString(36)}`,
            title: `${projectName} — ${f.name}`,
            code: `KM-PRJ-${String(seq).padStart(4, "0")}`,
            type: f.type === "صورت‌جلسه" ? "صورت‌جلسه" : f.type === "قرارداد" ? "قرارداد" : f.type === "گزارش" ? "گزارش" : f.type === "مستندات فنی" ? "مستندات فنی" : "سایر",
            categoryId: "cat-reports",
            tags: ["دانش پروژه"],
            unit: "مدیریت پروژه",
            owner: me,
            author: me,
            createdAt: KM_TODAY,
            updatedAt: KM_TODAY,
            version: 1,
            status: "منتشرشده",
            access: "داخلی",
            description: `منتقل‌شده از پرونده‌ی دانش پروژه‌ی «${projectName}» پس از پایان پروژه.`,
            files: [file],
            reviewDate: addDays(KM_TODAY, 365),
            versions: [{ version: 1, date: KM_TODAY, by: me, note: "انتقال از پروژه", files: [file] }],
            workflow: [{ id: `wf${seq}`, action: "انتقال از پروژه و انتشار", from: "پیش‌نویس", to: "منتشرشده", by: me, at: stamp() }],
            approvers: prev.settings.defaultApprovers,
            relations: [{ type: "project", id: projectId }],
            views: 0,
            downloads: 0,
            ratings: [],
            feedback: [],
            comments: [],
            followers: [],
            importance: "عادی",
            scope: "سراسری",
          } as KDoc;
        });
        const s: Store = {
          ...prev,
          seq,
          docs: [...newDocs, ...prev.docs],
          experiences: prev.experiences.map((x) => (x.projectId === projectId && x.status !== "منتشرشده" ? { ...x, status: "منتشرشده" } : x)),
        };
        return log(s, `دانش پروژه‌ی «${projectName}» را به مخزن سازمانی منتقل کرد (${newDocs.length.toLocaleString("fa-IR")} سند)`, { type: "project", id: projectId, title: projectName });
      });
      return fresh.length;
    },
    logSearch: (t, results) => setStore((prev) => ({ ...prev, searches: [...prev.searches, { term: t, at: KM_TODAY, results }].slice(-300) })),
    resetKm: () => {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* نادیده */
      }
      setStore(initial());
    },
  };

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledge() {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) throw new Error("useKnowledge must be used within KnowledgeProvider");
  return ctx;
}

export const accessTone: Record<AccessLevel, "success" | "brand" | "warning" | "danger"> = { عمومی: "success", داخلی: "brand", محرمانه: "warning", "خیلی محرمانه": "danger" };
export const statusTone: Record<DocStatus, "neutral" | "warning" | "danger" | "brand" | "success" | "navy"> = {
  "پیش‌نویس": "neutral",
  "در بررسی": "warning",
  "ارجاع برای اصلاح": "danger",
  "تأییدشده": "brand",
  "منتشرشده": "success",
  "آرشیو": "navy",
};
