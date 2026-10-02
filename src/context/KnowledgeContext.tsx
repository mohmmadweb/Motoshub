// ---------------------------------------------------------------------------
// انبار ماژول مدیریت دانش. همه‌ی تغییرات از اکشن‌ها عبور می‌کنند، در لاگ ممیزی دانش
// ثبت می‌شوند و در صورت لزوم برای افراد مرتبط اعلان (صندوق شخصی) صادر می‌کنند.
// اسناد مخزن با ContentContext همگام می‌شوند تا جستجوی سراسری و صفحات عمومی کار کنند.
// قواعد دسترسی (ACL، مشاهده/دانلود) و گردش کار چندمرحله‌ای در src/km/access.ts است.
// مدل داده و رویدادها برای بک‌اند: docs/KM_DATA_MODEL.md
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTenancy } from "./TenancyContext";
import { useContent } from "./ContentContext";
import { useInbox } from "./InboxContext";
import { addDays, dayNum, nowClock } from "../pm/jalali";
import { users, type KnowledgeDoc } from "../data/mock";
import {
  KM_TODAY,
  seedCategories,
  seedDocTypes,
  seedDocs,
  seedExperiences,
  seedExperts,
  seedGlossary,
  seedLogs,
  seedProcesses,
  seedRegistry,
  seedRegistryTypes,
  seedRnd,
  seedSavedSearches,
  seedSettings,
  seedWorkflows,
  seedRetentionDocs,
  A3_CIRCULAR,
} from "../km/seed";
import { defaultRetention, retentionInfo, seedProcessFlows } from "../km/templates";
import { DEFAULT_ACCESS_POLICY, aclEntryMatches, evaluateAccess, stepActors, subjectFor, templateFor, type AccessSubject, type AccessVerdict } from "../km/access";
import { matchesAll, mdToPlain, queryTerms } from "../km/text";
import type {
  AccessLevel,
  AccessPolicy,
  DocStatus,
  Experience,
  Expert,
  GlossaryTerm,
  KAcl,
  KCategory,
  KComment,
  KDelegation,
  KDisposal,
  KDoc,
  KDocFlow,
  KDocType,
  KFile,
  KFlowEvent,
  KLog,
  KLogCode,
  KProcess,
  KRelation,
  KSavedSearch,
  KSettings,
  KWfStep,
  KWfTemplate,
  RegistryItem,
  RegistryType,
  RndDoc,
} from "../km/types";

const KEY = "motoshub.km.v1";
const VERSION = 2;

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
  /** بند ۷: جستجوهای ذخیره‌شده */
  savedSearches: KSavedSearch[];
  /** گواهی‌های امحا (اسناد حذف‌شده طبق جدول نگهداشت) */
  disposals?: KDisposal[];
  /** وصله‌ی داده‌ی نمونه‌ی نگهداشت/فرآیند تصمیم‌دار روی ذخیره‌ی موجود اعمال شده است */
  patched?: number;
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
    processes: seedProcesses().map((p) => (seedProcessFlows[p.id] ? { ...p, ...seedProcessFlows[p.id] } : p)),
    experiences: seedExperiences(),
    experts: seedExperts(),
    glossary: seedGlossary(),
    settings: seedSettings(),
    logs: seedLogs(),
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
    savedSearches: seedSavedSearches(),
    disposals: [],
    patched: 1,
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s.version === VERSION) {
        // وصله‌ی یک‌باره بدون از دست رفتن داده‌ی کاربر: اسناد نمونه‌ی نگهداشت و نمودار تصمیم‌دار فرآیند
        if (!s.patched) {
          const have = new Set(s.docs.map((d) => d.id));
          s.docs = [...s.docs, ...seedRetentionDocs().filter((d) => !have.has(d.id))];
          s.processes = s.processes.map((p) => (p.flow || !seedProcessFlows[p.id] ? p : { ...p, ...seedProcessFlows[p.id] }));
          s.docs = s.docs.map((d) => (d.id === "a3" && d.circular === undefined ? { ...d, circular: A3_CIRCULAR } : d));
          s.patched = 1;
        }
        return s;
      }
    }
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return initial();
}

export type NewDocInput = Omit<KDoc, "id" | "code" | "createdAt" | "updatedAt" | "version" | "status" | "versions" | "workflow" | "views" | "downloads" | "ratings" | "feedback" | "comments" | "followers" | "author"> & { submit: boolean };
export type WorkflowAction = "submit" | "approve" | "return" | "publish" | "archive" | "restore";
export type EntityKind = "doc" | "registry" | "process" | "lesson" | "expert" | "glossary";

/** وضعیت مرحله‌ی جاری گردش کار یک سند */
export type FlowInfo = {
  template: KWfTemplate;
  step: KWfStep;
  stepIdx: number;
  /** موعد مرحله‌ی جاری */
  due: string;
  /** مثبت = روزهای گذشته از موعد */
  overdueDays: number;
  actors: string[];
  deputies: { name: string; for: string }[];
};

export type WhoCanSee = AccessVerdict & { userId: string; name: string };

type Ctx = Store & {
  today: string;
  me: string;
  categoryName: (id?: string) => string;
  categoryPath: (id?: string) => string;
  canSee: (d: KDoc) => boolean;
  isApprover: (d: KDoc) => boolean;
  // دسترسی (بند ۸)
  /** کاربر جاری اجازه‌ی دانلود دارد؟ (در غیر این صورت فقط مشاهده) */
  canDownload: (d: KDoc) => boolean;
  /** سیاست سطح دسترسی (دانلود/واترمارک) */
  policy: Record<AccessLevel, AccessPolicy>;
  /** فهرست افرادی که سند را می‌بینند/دانلود می‌کنند — برای «چه کسانی می‌بینند» */
  whoCanSee: (d: KDoc) => WhoCanSee[];
  updateAcl: (id: string, acl: KAcl | undefined) => void;
  setAccessPolicy: (level: AccessLevel, patch: Partial<AccessPolicy>) => void;
  // اسناد
  createDoc: (input: NewDocInput) => string;
  updateDoc: (id: string, patch: Partial<KDoc>) => void;
  deleteDoc: (id: string) => void;
  /** نسخه‌ی جدید؛ برای مقاله `body` و برای سند فایل‌محور `files` */
  newVersion: (id: string, files: KFile[], note: string, body?: string) => void;
  workflow: (id: string, action: WorkflowAction, note?: string) => void;
  /** بازیابی کنترل‌شده از آرشیو: دلیل الزامی و مجوز knowledge.archive */
  restoreDoc: (id: string, reason: string) => boolean;
  addComment: (id: string, text: string, kind: KComment["kind"]) => void;
  rate: (id: string, score: number) => void;
  feedback: (id: string, helpful: boolean, reason?: string) => void;
  reportOutdated: (id: string, reason: string) => void;
  toggleFollow: (id: string) => void;
  viewDoc: (id: string) => void;
  downloadDoc: (id: string, fileName?: string) => void;
  /** پیش‌نمایش فایل در مرورگر (لاگ می‌شود) */
  previewDoc: (id: string, fileName: string, viewOnly: boolean) => void;
  reviewResult: (id: string, result: "تمدید" | "نیاز به اصلاح" | "آرشیو", note: string) => void;
  // گردش کار چندمرحله‌ای (بند ۹)
  templates: KWfTemplate[];
  flowInfo: (d: KDoc) => FlowInfo | null;
  saveWorkflow: (t: KWfTemplate) => void;
  deleteWorkflow: (id: string) => void;
  saveDelegation: (x: Omit<KDelegation, "id">) => void;
  removeDelegation: (id: string) => void;
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
  // جستجوی ذخیره‌شده (بند ۷)
  saveSearch: (s: Omit<KSavedSearch, "id" | "owner" | "createdAt">) => void;
  deleteSearch: (id: string) => void;
  toggleSearchNotify: (id: string) => void;
  resetKm: () => void;
  // ابلاغ (بخشنامه/دستورالعمل/آیین‌نامه) — «خواندم و پذیرفتم»
  /** نام مخاطبان ابلاغ سند (به‌جز مالک/ثبت‌کننده) */
  circularAudience: (d: KDoc) => string[];
  acknowledgeDoc: (id: string) => void;
  remindCircular: (id: string) => number;
  /** اسناد منتشرشده‌ای که کاربر جاری باید «خواندم و پذیرفتم» بزند */
  myPendingAcks: () => KDoc[];
  // نگهداشت، امحا و نگهداشت قانونی
  retention: Record<string, number>;
  setLegalHold: (id: string, reason: string | null) => void;
  /** امحای سند پس از پایان دوره‌ی نگهداشت (ممیزی می‌شود)؛ نگهداشت قانونی مانع است */
  disposeDoc: (id: string, note: string) => boolean;
  disposals: KDisposal[];
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

/** متن قابل جستجوی سند: عنوان، توضیح، برچسب، متن مقاله و متن فایل‌ها */
export function docSearchText(d: KDoc, inContent = true) {
  return [d.title, d.code, d.description, d.tags.join(" "), d.owner, d.unit, ...(inContent ? [mdToPlain(d.body ?? ""), ...d.files.map((f) => `${f.name} ${f.text ?? ""}`)] : [])].join(" \n ");
}

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load);
  const { actingUser, hasPermission, iam } = useTenancy();
  const { setKnowledgeDocs } = useContent();
  const inbox = useInbox();
  const me = actingUser.name;
  const stamp = () => `${KM_TODAY} ${nowClock()}`;
  const templates = store.settings.workflows?.length ? store.settings.workflows : seedWorkflows();
  const delegations = store.settings.delegations ?? [];
  const policy = { ...DEFAULT_ACCESS_POLICY, ...(store.settings.accessPolicy ?? {}) };

  // کاربر جاری برای قواعد دسترسی؛ مجوزها از کانتکست فعلی (با «مشاهده به‌عنوان» تغییر می‌کند)
  const meSubject: AccessSubject = { ...subjectFor(iam, actingUser.id, KM_TODAY), name: me, perm: hasPermission };

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

  const flowInfoOf = (d: KDoc): FlowInfo | null => {
    if (!d.flow || (d.status !== "در بررسی" && d.status !== "تأییدشده")) return null;
    const template = templates.find((t) => t.id === d.flow!.templateId) ?? templateFor(templates, d.type);
    const step = template?.steps[d.flow.stepIdx];
    if (!template || !step) return null;
    const due = addDays(d.flow.stepStartedAt, step.slaDays);
    const overdueDays = (dayNum(KM_TODAY) ?? 0) - (dayNum(due) ?? 0);
    const { primary, deputies } = stepActors(step, d, iam, KM_TODAY, delegations);
    return { template, step, stepIdx: d.flow.stepIdx, due, overdueDays, actors: primary, deputies };
  };

  // بند ۱۵: یادآوری موعد بازبینی به مالک سند + بند ۹: یادآوری و تشدید مراحل معوق گردش کار (یک بار برای هر موعد)
  useEffect(() => {
    const today = dayNum(KM_TODAY)!;
    const due = store.docs.filter((d) => d.status !== "آرشیو" && (dayNum(d.reviewDate) ?? 9e9) - today <= 7 && !store.reminded.includes(`${d.id}:${d.reviewDate}`));
    due.forEach((d) => {
      const left = (dayNum(d.reviewDate) ?? today) - today;
      inbox.send([d.owner, ...d.approvers], "knowledge", left < 0 ? `موعد بازبینی سند «${d.title}» ${Math.abs(left).toLocaleString("fa-IR")} روز گذشته است.` : `موعد بازبینی سند «${d.title}» ${left ? `${left.toLocaleString("fa-IR")} روز دیگر` : "امروز"} است.`, `/dashboard/knowledge?tab=review&doc=${d.id}`);
    });
    const late = store.docs
      .map((d) => ({ d, f: flowInfoOf(d) }))
      .filter((x): x is { d: KDoc; f: FlowInfo } => !!x.f && x.f.overdueDays > 0 && !store.reminded.includes(`wf:${x.d.id}:${x.f.stepIdx}:${x.d.flow!.stepStartedAt}`));
    late.forEach(({ d, f }) => {
      const link = `/dashboard/knowledge?tab=workflow&doc=${d.id}`;
      inbox.send([...f.actors, ...f.deputies.map((x) => x.name)], "knowledge", `یادآوری: مرحله‌ی «${f.step.name}» سند «${d.title}» ${f.overdueDays.toLocaleString("fa-IR")} روز از مهلت گذشته است.`, link);
      inbox.send([d.owner], "knowledge", `تشدید: سند «${d.title}» در مرحله‌ی «${f.step.name}» معوق مانده است (${f.overdueDays.toLocaleString("fa-IR")} روز).`, link);
    });
    if (!due.length && !late.length) return;
    const remindEv = (d: KDoc, f: FlowInfo): KFlowEvent => ({ stepId: f.step.id, stepName: f.step.name, by: "سامانه", decision: "remind", at: `${KM_TODAY} ۰۸:۰۰`, note: `یادآوری به ${f.actors.join("، ") || "تأییدکننده"} و تشدید به مالک (${d.owner})` });
    setStore((prev) => ({
      ...prev,
      docs: prev.docs.map((d) => {
        const x = late.find((l) => l.d.id === d.id);
        return x && d.flow ? { ...d, flow: { ...d.flow, history: [...d.flow.history, remindEv(d, x.f)] } } : d;
      }),
      reminded: [...prev.reminded, ...due.map((d) => `${d.id}:${d.reviewDate}`), ...late.map(({ d, f }) => `wf:${d.id}:${f.stepIdx}:${d.flow!.stepStartedAt}`)],
    }));
    // فقط در شروع
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const log = (s: Store, action: string, entity: KLog["entity"], code?: KLogCode, detail?: string, access?: AccessLevel): Store => {
    const seq = s.seq + 1;
    return { ...s, seq, logs: [{ id: `kl${seq}`, at: stamp(), seq, actor: me, action, entity, code, detail, access }, ...s.logs].slice(0, 2000) };
  };
  const nid = (s: Store, p: string) => `${p}${s.seq + 1}-${Date.now().toString(36)}`;

  const patchDoc = (id: string, fn: (d: KDoc) => KDoc, action?: string, code?: KLogCode, detail?: string) =>
    setStore((prev) => {
      const d = prev.docs.find((x) => x.id === id);
      if (!d) return prev;
      const next = fn(structuredClone(d));
      const s = { ...prev, docs: prev.docs.map((x) => (x.id === id ? next : x)) };
      return action ? log(s, action, { type: "doc", id, title: next.title }, code, detail, next.access) : s;
    });

  const canSee = (d: KDoc) => evaluateAccess(d, meSubject, iam, policy).view;

  const interestedIn = (catId: string) =>
    Object.entries(store.settings.interests)
      .filter(([, cats]) => cats.includes(catId) || cats.includes(store.categories.find((c) => c.id === catId)?.parentId ?? "—"))
      .map(([n]) => n);

  const notifyApprovers = (names: string[], d: { id: string; title: string }, submitted: boolean) => {
    if (!names.length) return;
    inbox.send(names, "knowledge", submitted ? `شما به‌عنوان تأییدکننده‌ی سند «${d.title}» انتخاب شدید و سند برای بررسی به شما ارجاع شد.` : `شما به‌عنوان تأییدکننده‌ی سند «${d.title}» انتخاب شدید.`, `/dashboard/knowledge?tab=workflow&doc=${d.id}`);
  };

  /** شروع گردش کار قالب‌دار از مرحله‌ی اول */
  const startFlow = (d: KDoc, note?: string): KDocFlow => {
    const t = templateFor(templates, d.type);
    return {
      templateId: t?.id ?? "",
      stepIdx: 0,
      stepStartedAt: KM_TODAY,
      history: [...(d.flow?.history ?? []), { stepId: t?.steps[0]?.id ?? "", stepName: "ارسال برای بررسی", by: me, decision: "submit", at: stamp(), note }],
    };
  };
  const notifyStep = (d: KDoc, flow: KDocFlow) => {
    const t = templates.find((x) => x.id === flow.templateId);
    const step = t?.steps[flow.stepIdx];
    if (!step) return;
    const { primary, deputies } = stepActors(step, d, iam, KM_TODAY, delegations);
    inbox.send([...primary, ...deputies.map((x) => x.name)], "knowledge", `نوبت شما در گردش کار: «${step.name}» برای سند «${d.title}» (مهلت ${step.slaDays.toLocaleString("fa-IR")} روز).`, `/dashboard/knowledge?tab=workflow&doc=${d.id}`);
  };

  /** اعلان «نتیجه‌ی جدید» برای جستجوهای ذخیره‌شده */
  const notifySavedSearches = (d: KDoc) => {
    const hay = docSearchText(d, true);
    store.savedSearches
      .filter((s) => s.notify && queryTerms(s.query).length && matchesAll(hay, queryTerms(s.query)) && (!s.filters.access.length || s.filters.access.includes(d.access)) && (!s.filters.types.length || s.filters.types.includes(d.type)))
      .forEach((s) => inbox.send([s.owner], "knowledge", `نتیجه‌ی جدید برای جستجوی ذخیره‌شده‌ی «${s.name}»: «${d.title}»`, `/dashboard/knowledge?tab=search&doc=${d.id}`));
  };

  const crud = <K extends "registry" | "processes" | "experiences" | "experts" | "glossary" | "rnd" | "categories" | "docTypes" | "registryTypes">(key: K, prefix: string, label: string, titleOf: (x: Store[K][number]) => string, type: string) => ({
    save: (item: Partial<Store[K][number]> & { id?: string }) =>
      setStore((prev) => {
        const list = prev[key] as unknown as { id: string }[];
        if (item.id && list.some((x) => x.id === item.id)) {
          const updated = list.map((x) => (x.id === item.id ? { ...x, ...item } : x));
          const it = updated.find((x) => x.id === item.id) as Store[K][number];
          return log({ ...prev, [key]: updated } as Store, `${label} را ویرایش کرد`, { type, id: item.id, title: titleOf(it) }, "edit");
        }
        const id = nid(prev, prefix);
        const created = { ...item, id } as Store[K][number];
        return log({ ...prev, [key]: [created, ...list] } as Store, `${label} جدید ثبت کرد`, { type, id, title: titleOf(created) }, "create");
      }),
    remove: (id: string) =>
      setStore((prev) => {
        const list = prev[key] as unknown as { id: string }[];
        const it = list.find((x) => x.id === id) as Store[K][number] | undefined;
        if (!it) return prev;
        return log({ ...prev, [key]: list.filter((x) => x.id !== id) } as Store, `${label} را حذف کرد`, { type, id, title: titleOf(it) }, "delete");
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
  const aclSummary = (acl?: KAcl) => (acl?.entries.length ? `${acl.entries.length.toLocaleString("fa-IR")} ردیف دسترسی${acl.viewOnly ? " · فقط مشاهده" : ""}` : acl?.viewOnly ? "فقط مشاهده" : "فقط سطح دسترسی");

  /** مخاطبان ابلاغ: کسانی که سند را می‌بینند و (اگر مخاطب تعیین شده) با یکی از واحدها/نقش‌ها منطبق‌اند */
  const circularAudience = (d: KDoc) => {
    if (!d.circular) return [];
    const entries = d.circular.audience;
    return users
      .filter((u) => u.name !== d.owner && u.name !== d.author)
      .filter((u) => {
        const subj = u.id === actingUser.id ? meSubject : { ...subjectFor(iam, u.id, KM_TODAY), name: u.name };
        if (!evaluateAccess(d, subj, iam, policy).view) return false;
        return !entries.length || entries.some((e) => aclEntryMatches({ kind: e.kind, id: e.id, download: false }, subj, iam));
      })
      .map((u) => u.name);
  };
  const notifyCircular = (d: KDoc) => {
    if (!d.circular) return;
    const to = circularAudience(d);
    if (to.length) inbox.send(to, "announcement", `ابلاغ ${d.type} «${d.title}»${d.circular.deadline ? ` — مهلت تأیید خواندن تا ${d.circular.deadline}` : ""}. پس از مطالعه «خواندم و پذیرفتم» را بزنید.`, `/dashboard/knowledge?tab=bank&doc=${d.id}`, { urgent: true });
  };
  const retention = { ...defaultRetention, ...(store.settings.retention ?? {}) };

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
    isApprover: (d) => {
      if (d.approvers.includes(me) || hasPermission("knowledge.approve")) return true;
      const f = flowInfoOf(d);
      return !!f && (f.actors.includes(me) || f.deputies.some((x) => x.name === me));
    },
    canDownload: (d) => { const a = evaluateAccess(d, meSubject, iam, policy); return a.download || (a.view && hasPermission("knowledge.download")); },
    policy,
    whoCanSee: (d) =>
      users
        .map((u) => {
          const subj = u.id === actingUser.id ? meSubject : subjectFor(iam, u.id, KM_TODAY);
          return { userId: u.id, name: u.name, ...evaluateAccess(d, subj, iam, policy) };
        })
        .filter((x) => x.view),
    updateAcl: (id, acl) => patchDoc(id, (x) => ({ ...x, acl }), "فهرست دسترسی سند را تغییر داد", "access", aclSummary(acl)),
    setAccessPolicy: (level, patch) =>
      setStore((prev) => {
        const cur = { ...DEFAULT_ACCESS_POLICY, ...(prev.settings.accessPolicy ?? {}) };
        const next = { ...cur, [level]: { ...cur[level], ...patch } };
        return log({ ...prev, settings: { ...prev.settings, accessPolicy: next } }, `سیاست مشاهده/دانلود سطح «${level}» را تغییر داد`, { type: "settings", id: "access", title: "سطوح دسترسی" }, "access", `دانلود: ${next[level].download ? "مجاز" : "فقط مشاهده"} · واترمارک: ${next[level].watermark ? "دارد" : "ندارد"}`);
      }),

    createDoc: (input) => {
      const { submit, ...rest } = input;
      const seq = store.seq + 1;
      const newId = `kd-${seq}-${Date.now().toString(36)}`;
      const doc: KDoc = {
        ...rest,
        id: newId,
        code: `KM-1405-${String(seq).padStart(4, "0")}`,
        author: me,
        createdAt: KM_TODAY,
        updatedAt: KM_TODAY,
        version: 1,
        status: submit ? "در بررسی" : "پیش‌نویس",
        versions: [{ version: 1, date: KM_TODAY, by: me, note: "ایجاد سند", files: rest.files, body: rest.body }],
        workflow: submit ? [{ id: `wf${seq}`, action: "ارسال برای بررسی", from: "پیش‌نویس", to: "در بررسی", by: me, at: stamp() }] : [],
        views: 0,
        downloads: 0,
        ratings: [],
        feedback: [],
        comments: [],
        followers: [me],
      };
      if (submit) doc.flow = startFlow(doc);
      setStore((prev) => log({ ...prev, docs: [doc, ...prev.docs] }, submit ? "سند جدید ثبت و برای بررسی ارسال کرد" : "پیش‌نویس سند جدید ثبت کرد", { type: "doc", id: newId, title: doc.title }, "create", rest.acl?.entries.length ? aclSummary(rest.acl) : undefined, doc.access));
      notifyApprovers(input.approvers, { id: newId, title: input.title }, submit);
      if (doc.flow) notifyStep(doc, doc.flow);
      return newId;
    },
    updateDoc: (id, patch) => {
      const d = store.docs.find((x) => x.id === id);
      const aclChanged = d && "acl" in patch && JSON.stringify(patch.acl ?? null) !== JSON.stringify(d.acl ?? null);
      patchDoc(id, (x) => ({ ...x, ...patch, updatedAt: KM_TODAY }), aclChanged ? "اطلاعات و فهرست دسترسی سند را ویرایش کرد" : "اطلاعات سند را ویرایش کرد", aclChanged ? "access" : "edit", aclChanged ? aclSummary(patch.acl) : undefined);
      if (d && patch.approvers) notifyApprovers(patch.approvers.filter((a) => !d.approvers.includes(a)), d, false);
    },
    deleteDoc: (id) =>
      setStore((prev) => {
        const d = prev.docs.find((x) => x.id === id);
        // نگهداشت قانونی: حذف ممنوع
        if (!d || d.legalHold) return prev;
        return log({ ...prev, docs: prev.docs.filter((x) => x.id !== id) }, "سند را حذف کرد", { type: "doc", id, title: d.title }, "delete", undefined, d.access);
      }),
    newVersion: (id, files, note, body) => {
      const d = store.docs.find((x) => x.id === id);
      const review = store.settings.workflowSteps.review;
      patchDoc(
        id,
        (x) => {
          const nextFiles = files.length ? files : x.files;
          const nextBody = body ?? x.body;
          const y: KDoc = {
            ...x,
            version: x.version + 1,
            files: nextFiles,
            body: nextBody,
            updatedAt: KM_TODAY,
            versions: [...x.versions, { version: x.version + 1, date: KM_TODAY, by: me, note, files: nextFiles, body: nextBody }],
            status: review ? "در بررسی" : x.status,
            workflow: review ? [...x.workflow, { id: `wf${Date.now()}`, action: `نسخه‌ی ${x.version + 1} برای بررسی`, from: x.status, to: "در بررسی", by: me, at: stamp(), note }] : x.workflow,
          };
          if (review) y.flow = startFlow(x, `نسخه‌ی ${x.version + 1}: ${note}`);
          return y;
        },
        `نسخه‌ی جدید سند را بارگذاری کرد`,
        "version",
        note
      );
      if (d) {
        inbox.send(d.followers, "knowledge", `نسخه‌ی ${(d.version + 1).toLocaleString("fa-IR")} سند «${d.title}» که دنبال می‌کنید بارگذاری شد.`, `/dashboard/knowledge?tab=bank&doc=${id}`);
        if (review) {
          inbox.send(d.approvers, "knowledge", `نسخه‌ی جدید «${d.title}» منتظر بررسی شماست.`, `/dashboard/knowledge?tab=workflow`);
          notifyStep(d, startFlow(d));
        }
      }
    },
    workflow: (id, action, note) => {
      const d = store.docs.find((x) => x.id === id);
      if (!d) return;
      const link = `/dashboard/knowledge?tab=bank&doc=${id}`;
      const f = flowInfoOf(d);
      // گردش کار قالب‌دار: تأیید مرحله‌به‌مرحله
      if (f && (action === "approve" || action === "publish" || action === "return")) {
        const onBehalf = f.actors.includes(me) ? undefined : f.deputies.find((x) => x.name === me)?.for;
        const isLast = f.stepIdx >= f.template.steps.length - 1;
        const finishing = action === "publish" || (action === "approve" && (f.step.kind === "publish" || isLast));
        const nextIdx = action === "return" ? 0 : finishing ? f.template.steps.length : f.stepIdx + 1;
        const nextStep = f.template.steps[nextIdx];
        const to: DocStatus = action === "return" ? "ارجاع برای اصلاح" : finishing ? "منتشرشده" : nextStep?.kind === "publish" ? "تأییدشده" : "در بررسی";
        const decision: KFlowEvent["decision"] = action === "return" ? "return" : finishing && f.step.kind === "publish" ? "publish" : "approve";
        const label = action === "return" ? "ارجاع برای اصلاح" : decision === "publish" ? "انتشار" : "تأیید";
        const nextFlow: KDocFlow = { ...d.flow!, stepIdx: nextIdx, stepStartedAt: KM_TODAY, history: [...d.flow!.history, { stepId: f.step.id, stepName: f.step.name, by: me, decision, at: stamp(), note, onBehalfOf: onBehalf }] };
        patchDoc(
          id,
          (x) => {
            return { ...x, status: to, flow: nextFlow, workflow: [...x.workflow, { id: `wf${Date.now()}`, action: `${label}: ${f.step.name}`, from: x.status, to, by: me, at: stamp(), note: onBehalf ? `${note ? `${note} — ` : ""}به جانشینی از ${onBehalf}` : note }] };
          },
          `گردش کار: ${f.step.name} — ${label}`,
          "workflow",
          note
        );
        if (action === "return") inbox.send([d.owner, d.author], "knowledge", `سند «${d.title}» در مرحله‌ی «${f.step.name}» برای اصلاح به شما ارجاع شد${note ? `: «${note}»` : "."}`, link);
        else if (finishing) {
          inbox.send([d.owner, d.author, ...d.followers], "knowledge", `سند «${d.title}» منتشر شد.`, link);
          notifyCircular(d);
          const interested = interestedIn(d.categoryId);
          if (interested.length) inbox.send(interested, "knowledge", `دانش جدید در حوزه‌ی مورد علاقه‌ی شما: «${d.title}»`, link);
          notifySavedSearches(d);
        } else {
          inbox.send([d.owner, d.author], "knowledge", `مرحله‌ی «${f.step.name}» سند «${d.title}» توسط «${me}» تأیید شد؛ مرحله‌ی بعد: «${nextStep?.name}».`, link);
          notifyStep(d, nextFlow);
        }
        return;
      }
      const to = statusAfter[action];
      const startNew = action === "submit" && templates.length > 0;
      patchDoc(
        id,
        (x) => ({
          ...x,
          status: to,
          flow: startNew ? startFlow(x, note) : x.flow,
          archiveReason: action === "archive" ? note : action === "restore" ? undefined : x.archiveReason,
          workflow: [...x.workflow, { id: `wf${Date.now()}`, action: actionLabel[action], from: x.status, to, by: me, at: stamp(), note }],
        }),
        action === "archive" ? "سند را آرشیو کرد" : action === "restore" ? "سند را از آرشیو بازیابی کرد" : `گردش کار: ${actionLabel[action]}`,
        action === "archive" ? "archive" : action === "restore" ? "restore" : "workflow",
        note
      );
      if (action === "submit") {
        inbox.send(d.approvers, "knowledge", `سند «${d.title}» برای بررسی به شما ارجاع شد.`, `/dashboard/knowledge?tab=workflow`);
        if (startNew) notifyStep(d, startFlow(d));
      }
      if (action === "approve") inbox.send([d.owner, d.author], "knowledge", `سند «${d.title}» توسط «${me}» تأیید شد.`, link);
      if (action === "return") inbox.send([d.owner, d.author], "knowledge", `سند «${d.title}» برای اصلاح به شما ارجاع شد${note ? `: «${note}»` : "."}`, link);
      if (action === "publish") {
        inbox.send([d.owner, d.author, ...d.followers], "knowledge", `سند «${d.title}» منتشر شد.`, link);
        notifyCircular(d);
        const interested = interestedIn(d.categoryId);
        if (interested.length) inbox.send(interested, "knowledge", `دانش جدید در حوزه‌ی مورد علاقه‌ی شما: «${d.title}»`, link);
        notifySavedSearches(d);
      }
      if (action === "archive") inbox.send([d.owner, ...d.followers], "knowledge", `سند «${d.title}» آرشیو شد${note ? ` (دلیل: ${note})` : ""}.`, link);
      if (action === "restore") inbox.send([d.owner, ...d.followers], "knowledge", `سند «${d.title}» از آرشیو بازیابی شد${note ? ` (دلیل: ${note})` : ""}.`, link);
    },
    restoreDoc: (id, reason) => {
      if (!hasPermission("knowledge.archive") || !reason.trim()) return false;
      value.workflow(id, "restore", reason.trim());
      return true;
    },
    addComment: (id, text, kind) => {
      const d = store.docs.find((x) => x.id === id);
      patchDoc(id, (x) => ({ ...x, comments: [...x.comments, { id: `kc${Date.now()}`, author: me, text, at: stamp(), kind }] }), kind === "پیشنهاد اصلاح" ? "پیشنهاد اصلاح ثبت کرد" : "نظر ثبت کرد", "comment");
      if (d) {
        inbox.send([d.owner, d.author], "knowledge", `«${me}» روی سند «${d.title}» ${kind === "پیشنهاد اصلاح" ? "پیشنهاد اصلاح" : kind === "پرسش" ? "پرسش" : "نظر"} ثبت کرد.`, `/dashboard/knowledge?tab=bank&doc=${id}`);
        const mentioned = (text.match(/@[^\s،.,!؟?]+/g) ?? []).map((t) => t.slice(1).replace(/_/g, " "));
        if (mentioned.length) inbox.send(mentioned, "mention", `«${me}» شما را در سند «${d.title}» منشن کرد.`, `/dashboard/knowledge?tab=bank&doc=${id}`);
      }
    },
    rate: (id, score) => patchDoc(id, (x) => ({ ...x, ratings: [...x.ratings.filter((r) => r.by !== me), { by: me, score }] }), "به سند امتیاز داد", "feedback", `${score.toLocaleString("fa-IR")} ستاره`),
    feedback: (id, helpful, reason) => patchDoc(id, (x) => ({ ...x, feedback: [...x.feedback.filter((f) => f.by !== me), { by: me, helpful, reason }] }), helpful ? "سند را مفید دانست" : "سند را نامفید دانست", "feedback", reason),
    reportOutdated: (id, reason) => {
      const d = store.docs.find((x) => x.id === id);
      patchDoc(id, (x) => ({ ...x, reported: [...(x.reported ?? []), { by: me, reason, at: KM_TODAY }] }), "سند را قدیمی/نادرست گزارش کرد", "feedback", reason);
      if (d) inbox.send([d.owner], "knowledge", `«${me}» سند «${d.title}» را قدیمی یا نادرست گزارش کرد: «${reason}»`, `/dashboard/knowledge?tab=bank&doc=${id}`);
    },
    toggleFollow: (id) => patchDoc(id, (x) => ({ ...x, followers: x.followers.includes(me) ? x.followers.filter((f) => f !== me) : [...x.followers, me] })),
    viewDoc: (id) => patchDoc(id, (x) => ({ ...x, views: x.views + 1 }), "سند را مشاهده کرد", "view"),
    downloadDoc: (id, fileName) => patchDoc(id, (x) => ({ ...x, downloads: x.downloads + 1 }), "سند را دانلود کرد", "download", fileName),
    previewDoc: (id, fileName, viewOnly) => patchDoc(id, (x) => x, viewOnly ? "پیش‌نمایش فایل را دید (فقط مشاهده)" : "پیش‌نمایش فایل را دید", "preview", fileName),
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
        `نتیجه‌ی بازبینی دوره‌ای را ثبت کرد (${result})`,
        result === "آرشیو" ? "archive" : "workflow",
        note
      );
    },

    templates,
    flowInfo: flowInfoOf,
    saveWorkflow: (t) => {
      const old = templates.find((x) => x.id === t.id);
      const exists = !!old;
      setStore((prev) => {
        const cur = prev.settings.workflows?.length ? prev.settings.workflows : seedWorkflows();
        const list = exists ? cur.map((x) => (x.id === t.id ? t : x)) : [...cur, t];
        return log({ ...prev, settings: { ...prev.settings, workflows: list } }, exists ? `قالب گردش کار «${t.name}» را ویرایش کرد` : `قالب گردش کار «${t.name}» را ساخت`, { type: "settings", id: t.id, title: "گردش کار" }, "settings", `${t.steps.length.toLocaleString("fa-IR")} مرحله`);
      });
      // بند ۱۶: «شما به‌عنوان تأییدکننده انتخاب شدید»
      const oldUsers = new Set((old?.steps ?? []).flatMap((s) => [s.approver.kind === "user" ? s.approver.id : undefined, s.substitute]).filter(Boolean) as string[]);
      t.steps.forEach((s) => {
        const named = [s.approver.kind === "user" ? s.approver.id : undefined, s.substitute].filter((x): x is string => !!x && !oldUsers.has(x));
        if (named.length) inbox.send(named, "knowledge", `شما به‌عنوان تأییدکننده‌ی مرحله‌ی «${s.name}» در گردش کار «${t.name}» انتخاب شدید.`, "/dashboard/knowledge?tab=workflow");
      });
    },
    deleteWorkflow: (id) =>
      setStore((prev) => {
        const cur = prev.settings.workflows?.length ? prev.settings.workflows : seedWorkflows();
        if (cur.length <= 1) return prev;
        const t = cur.find((x) => x.id === id);
        return log({ ...prev, settings: { ...prev.settings, workflows: cur.filter((x) => x.id !== id) } }, `قالب گردش کار «${t?.name ?? id}» را حذف کرد`, { type: "settings", id, title: "گردش کار" }, "settings");
      }),
    saveDelegation: (x) => {
      setStore((prev) => log({ ...prev, settings: { ...prev.settings, delegations: [...(prev.settings.delegations ?? []), { ...x, id: nid(prev, "dl") }] } }, `«${x.to}» را جانشین «${x.from}» تا ${x.until} کرد`, { type: "settings", id: "delegation", title: "جانشینی" }, "settings", x.note));
      inbox.send([x.to], "knowledge", `شما تا ${x.until} جانشین «${x.from}» در تأیید اسناد دانش هستید.`, "/dashboard/knowledge?tab=workflow");
    },
    removeDelegation: (id) => setStore((prev) => log({ ...prev, settings: { ...prev.settings, delegations: (prev.settings.delegations ?? []).filter((x) => x.id !== id) } }, "جانشینی را لغو کرد", { type: "settings", id, title: "جانشینی" }, "settings")),

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
        return log(s, "دسته‌بندی را حذف کرد", { type: "category", id, title: prev.categories.find((c) => c.id === id)?.name ?? "" }, "delete");
      }),
    saveDocType: dtype.save,
    deleteDocType: dtype.remove,
    updateSettings: (patch) => setStore((prev) => log({ ...prev, settings: { ...prev.settings, ...patch } }, "تنظیمات مدیریت دانش را تغییر داد", { type: "settings", id: "km", title: "تنظیمات" }, "settings")),
    toggleInterest: (categoryId) =>
      setStore((prev) => {
        const cur = prev.settings.interests[me] ?? [];
        return { ...prev, settings: { ...prev.settings, interests: { ...prev.settings.interests, [me]: cur.includes(categoryId) ? cur.filter((x) => x !== categoryId) : [...cur, categoryId] } } };
      }),

    saveRegistryType: rtype.save as Ctx["saveRegistryType"],
    deleteRegistryType: (id) =>
      setStore((prev) => log({ ...prev, registryTypes: prev.registryTypes.filter((t) => t.id !== id), registry: prev.registry.filter((r) => r.typeId !== id) }, "نوع شناسنامه را حذف کرد", { type: "registry-type", id, title: prev.registryTypes.find((t) => t.id === id)?.name ?? "" }, "delete")),
    saveRegistryItem: (r) => reg.save({ ...r, updatedAt: KM_TODAY }),
    deleteRegistryItem: reg.remove,

    saveRnd: (r) =>
      setStore((prev) => {
        const old = r.id ? prev.rnd.find((x) => x.id === r.id) : undefined;
        if (old) {
          const history = old.progress !== r.progress ? [{ at: KM_TODAY, by: me, text: `وضعیت از «${old.statusLabel}» به «${r.statusLabel}» تغییر کرد.` }, ...old.history] : old.history;
          const updated = { ...old, ...r, id: old.id, history };
          return log({ ...prev, rnd: prev.rnd.map((x) => (x.id === old.id ? updated : x)) }, "سند فرصت R&D را ویرایش کرد", { type: "rnd", id: old.id, title: updated.company }, "edit");
        }
        const id = nid(prev, "rd");
        const created: RndDoc = { ...r, id, history: [{ at: KM_TODAY, by: me, text: "سند ایجاد شد." }] };
        return log({ ...prev, rnd: [created, ...prev.rnd] }, "سند فرصت R&D جدید ثبت کرد", { type: "rnd", id, title: created.company }, "create");
      }),
    deleteRnd: (id) =>
      setStore((prev) => {
        const r = prev.rnd.find((x) => x.id === id);
        return r ? log({ ...prev, rnd: prev.rnd.filter((x) => x.id !== id) }, "سند فرصت R&D را حذف کرد", { type: "rnd", id, title: r.company }, "delete") : prev;
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
        return log(s, `دانش پروژه‌ی «${projectName}» را به مخزن سازمانی منتقل کرد (${newDocs.length.toLocaleString("fa-IR")} سند)`, { type: "project", id: projectId, title: projectName }, "create");
      });
      return fresh.length;
    },
    logSearch: (t, results) => setStore((prev) => ({ ...prev, searches: [...prev.searches, { term: t, at: KM_TODAY, results }].slice(-300) })),
    saveSearch: (x) => setStore((prev) => ({ ...prev, savedSearches: [{ ...x, id: nid(prev, "ss"), owner: me, createdAt: KM_TODAY }, ...prev.savedSearches] })),
    deleteSearch: (id) => setStore((prev) => ({ ...prev, savedSearches: prev.savedSearches.filter((x) => x.id !== id) })),
    toggleSearchNotify: (id) => setStore((prev) => ({ ...prev, savedSearches: prev.savedSearches.map((x) => (x.id === id ? { ...x, notify: !x.notify } : x)) })),
    circularAudience,
    acknowledgeDoc: (id) => patchDoc(id, (x) => (x.circular && !x.circular.acks[me] ? { ...x, circular: { ...x.circular, acks: { ...x.circular.acks, [me]: stamp() } } } : x), "«خواندم و پذیرفتم» را برای سند ثبت کرد", "feedback"),
    remindCircular: (id) => {
      const d = store.docs.find((x) => x.id === id);
      if (!d?.circular) return 0;
      const pending = circularAudience(d).filter((n) => !d.circular!.acks[n]);
      if (!pending.length) return 0;
      patchDoc(id, (x) => (x.circular ? { ...x, circular: { ...x.circular, lastReminderAt: stamp() } } : x), "یادآوری ابلاغ به نخوانده‌ها فرستاد", "workflow", `${pending.length.toLocaleString("fa-IR")} نفر`);
      inbox.send(pending, "announcement", `یادآوری: ${d.type} «${d.title}» را بخوانید و «خواندم و پذیرفتم» را بزنید${d.circular.deadline ? ` (مهلت ${d.circular.deadline})` : ""}.`, `/dashboard/knowledge?tab=bank&doc=${id}`, { urgent: true });
      return pending.length;
    },
    myPendingAcks: () => store.docs.filter((d) => d.circular && d.status === "منتشرشده" && !d.circular.acks[me] && d.owner !== me && d.author !== me && circularAudience(d).includes(me)),
    retention,
    setLegalHold: (id, reason) =>
      patchDoc(id, (x) => ({ ...x, legalHold: reason ? { by: me, at: KM_TODAY, reason } : null }), reason ? "نگهداشت قانونی روی سند گذاشت" : "نگهداشت قانونی سند را برداشت", "retention", reason ?? undefined),
    disposeDoc: (id, note) => {
      const d = store.docs.find((x) => x.id === id);
      if (!d || d.legalHold || !hasPermission("knowledge.archive")) return false;
      const info = retentionInfo(d, store.settings.retention, KM_TODAY);
      if (!info.eligible) return false;
      setStore((prev) => {
        const rec: KDisposal = { id: `dp${prev.seq + 1}-${Date.now().toString(36)}`, docId: d.id, code: d.code, title: d.title, type: d.type, at: stamp(), by: me, note: note.trim(), retentionYears: info.years, basis: info.basis };
        return log({ ...prev, docs: prev.docs.filter((x) => x.id !== id), disposals: [rec, ...(prev.disposals ?? [])] }, "سند را طبق جدول نگهداشت امحا کرد", { type: "doc", id, title: d.title }, "retention", `${d.code} · نگهداشت ${info.years.toLocaleString("fa-IR")} سال از ${info.basis}${note.trim() ? ` · ${note.trim()}` : ""}`, d.access);
      });
      inbox.send([d.owner], "knowledge", `سند آرشیوی «${d.title}» پس از پایان دوره‌ی نگهداشت امحا شد.`, "/dashboard/knowledge?tab=retention");
      return true;
    },
    disposals: store.disposals ?? [],
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
