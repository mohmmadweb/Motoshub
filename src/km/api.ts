// ---------------------------------------------------------------------------
// شکل API واقعی ماژول مدیریت دانش (workspace `/api/v1/workspace/knowledge/*`، ۶۵ endpoint؛
// DATA_ALIGNMENT §6 و §11، ../.research-kariz/api/knowledge.md).
//
// انبار دمو (KnowledgeContext) رکوردها را به شکل داخلی نگه می‌دارد چون صفحه‌های چند بسته‌ی دیگر
// (میزکار، جستجو، گزارش‌ساز، نمایه، بستن پروژه، …) همان فیلدها را می‌خوانند؛ این فایل «تنها مبدل»
// به شکل دقیق سریالایزرهای بک‌اند است: نام فیلدها، enumها، اشیای تودرتو (scope، category،
// document_type، current_version) و پاکت صفحه‌بندی workspace. فهرست‌های ماژول از همین تابع‌ها
// صفحه‌بندی می‌شوند و دکمه‌ی «API» همین مسیرها را نشان می‌دهد.
//   - `<Entity>Api`       دقیقاً مطابق سریالایزر واقعی
//   - `<Entity>Proposed`  «پیشنهادی» — در API فعلی نیست (گردش کار، ACL، ابلاغ، طبقه‌بندی ۴ سطحی، …)
//
// نگاشت‌های مهم:
//   سطح دسترسی ۴ سطحی دمو → `visibility` (public = «عمومی»؛ restricted = «داخلی/محرمانه/خیلی محرمانه»)
//   و خودِ سطح در `classification` «پیشنهادی».
//   نوع تجربه و وضعیت آن در انبار برچسب فارسی‌اند (صفحه‌های دیگر با همین برچسب می‌نویسند)؛ در API کلید.
// ---------------------------------------------------------------------------
import { paginateWorkspace, type Ep, type PageQuery, type WorkspacePage } from "../api/envelopes";
import { intId, isoDate, uuidOf } from "../pm/api";
import { toEnDigits } from "../pm/jalali";
import { companies as staticCompanies, holdings as staticHoldings, type Company, type Holding, type Scoped } from "../data/tenancy";
import { users } from "../data/mock";
import { principalOf } from "../office/util";
import { logCodeLabel } from "./types";
import type { AccessLevel, DocStatus, Experience, ExperienceKind, Expert, GlossaryTerm, KCategory, KDoc, KDocType, KLog, KVersion, RegistryItem, RegistryType, RndDoc } from "./types";

export const API_ROOT = "https://api.shub.ir/api/v1";
/** مسیرها نسبت به API_ROOT (مثل social/endpoints) */
const W = "/workspace/knowledge";

// ================================================================ انواع (دقیقاً سریالایزرها)

/** KnowledgeScopeSerializer — محدوده‌ی IAM (سراسری/هلدینگ/شرکت) */
export type KnowledgeScopeApi = { id: string; tenant_id: string; type_id: string; is_root: boolean; type_code: string; code: string; name: string; parent_id: string | null };
/** KnowledgeScopeCatalogueSerializer */
export type KnowledgeScopeCatalogueApi = { scopes: KnowledgeScopeApi[]; research_eligible_type_codes: string[] };
/** DocumentCategorySerializer (فقط‌خواندنی) */
export type DocumentCategoryApi = { id: number; name: string; slug: string; sort_order: number; is_active: boolean; created_at: string; updated_at: string };
/** DocumentTypeSerializer (فقط‌خواندنی) */
export type DocumentTypeApi = DocumentCategoryApi;
/** «پیشنهادی»: دسته‌ی والد و رنگ نوع سند در API نیست */
export type DocumentCategoryProposed = { parent_id?: number | null; color?: string };

/** KnowledgeDocumentVersionSerializer */
export type KnowledgeDocumentVersionApi = {
  id: string;
  version_number: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  change_note: string;
  uploaded_by_id: string;
  uploaded_by_display_name: string;
  created_at: string;
  download_url: string;
};

/** KnowledgeDocumentListSerializer */
export type KnowledgeDocumentListApi = {
  id: string;
  scope: KnowledgeScopeApi;
  title: string;
  category: DocumentCategoryApi;
  document_type: DocumentTypeApi;
  owner_label: string;
  visibility: "public" | "restricted";
  created_by_id: string;
  created_by_display_name: string;
  current_version: KnowledgeDocumentVersionApi | null;
  created_at: string;
  updated_at: string;
};
/** KnowledgeDocumentDetailSerializer = فهرست + همه‌ی نسخه‌ها */
export type KnowledgeDocumentApi = KnowledgeDocumentListApi & { versions: KnowledgeDocumentVersionApi[] };

/** «پیشنهادی» — فیلدهای دموی سند که در API فعلی نیستند */
export type KnowledgeDocumentProposed = {
  code: string;
  tags: string[];
  unit: string;
  /** گردش کار انتشار (پیش‌نویس → بررسی → تأیید → انتشار → آرشیو) */
  status: KDocStatusKey;
  /** طبقه‌بندی ۴ سطحی (عمومی/داخلی/محرمانه/خیلی محرمانه) */
  classification: KClassificationKey;
  review_date: string | null;
  approvers: string[];
  importance: "normal" | "important" | "critical";
  format: "file" | "article";
  body: string | null;
  views: number;
  downloads: number;
  followers_count: number;
};
export type KnowledgeDocument = KnowledgeDocumentApi & { proposed: KnowledgeDocumentProposed };

/** KnowledgeDocumentCreateSerializer (multipart) — برای دکمه‌ی API و فرم */
export type KnowledgeDocumentCreateApi = { scope_id: string; title: string; category_id: number; document_type_id: number; owner_label: string; visibility?: "public" | "restricted"; file: File | string; change_note?: string };

/** KnowledgeOverviewSerializer — شمارنده‌های صفحه‌ی مدیریت دانش */
export type KnowledgeOverviewApi = { documents: number; research_opportunities: { total: number; delivered: number }; profiles: { total: number; section_count: number } };

/** ExperienceSerializer */
export type ExperienceKindKey = "success" | "failure" | "lesson" | "best_practice" | "expert_tip" | "solution" | "qa";
export type ExperienceStatusKey = "draft" | "in_review" | "published";
export type ExperienceApi = {
  id: string;
  scope: KnowledgeScopeApi;
  created_by_id: string;
  created_by_display_name: string;
  created_at: string;
  updated_at: string;
  kind: ExperienceKindKey;
  title: string;
  body: string;
  problem: string;
  cause: string;
  action: string;
  result: string;
  future: string;
  unit: string;
  tags: string[];
  status: ExperienceStatusKey;
  project_id: number | null;
  project: { id: number; name: string } | null;
  helpful_count: number;
  has_voted: boolean;
  can_edit: boolean;
  can_publish: boolean;
  published_at: string | null;
  published_by_id: string;
};

/** ExpertSerializer */
export type ExpertApi = {
  id: string;
  scope: KnowledgeScopeApi;
  created_by_id: string;
  created_by_display_name: string;
  created_at: string;
  updated_at: string;
  name: string;
  principal_id: string | null;
  title: string;
  unit: string;
  areas: string[];
  topics: string[];
  experience: string;
  document_count: number;
  experience_count: number;
};

/** GlossaryTermSerializer */
export type GlossaryTermApi = {
  id: string;
  scope: KnowledgeScopeApi;
  created_by_id: string;
  created_by_display_name: string;
  created_at: string;
  updated_at: string;
  term: string;
  abbreviation: string;
  english: string;
  definition: string;
  unit: string;
};

/** ResearchOpportunityStageSerializer (مراحل داده‌اند، نه enum) */
export type ResearchOpportunityStageApi = { id: string; key: string; progress: number; label: string; display_order: number; is_default: boolean; is_delivered: boolean; is_active: boolean; created_at: string; updated_at: string };
export type ResearchStageSnapshotApi = { id: string; progress: number; label: string };
/** ResearchOpportunityStageHistorySerializer */
export type ResearchOpportunityStageHistoryApi = { id: number; from_stage: ResearchStageSnapshotApi | null; to_stage: ResearchStageSnapshotApi; blocker: string; note: string; changed_by_id: string; changed_by_display_name: string; created_at: string };
/** ResearchOpportunitySerializer */
export type ResearchOpportunityApi = {
  id: string;
  scope_id: string;
  scope: KnowledgeScopeApi;
  scope_labels: string[];
  stage: { id: string; key: string; progress: number; label: string; is_delivered: boolean };
  blocker: string;
  created_at: string;
  updated_at: string;
  stage_history: ResearchOpportunityStageHistoryApi[];
};

/** ProfileSectionSerializer (بخش شناسنامه) */
export type ProfileSectionApi = { id: string; scope: KnowledgeScopeApi; name: string; description: string; display_order: number; item_count: number; created_at: string; updated_at: string };
/** ProfileItemSerializer (مورد شناسنامه) */
export type ProfileItemApi = { id: string; title: string; status: string[]; display_order: number; created_at: string; updated_at: string };
/** «پیشنهادی»: فیلدهای نوع‌دار شناسنامه، مالک و پیوست در API نیستند */
export type ProfileItemProposed = { section: string; fields: Record<string, string>; owner: string; unit: string };

/** KnowledgeAuditEventSerializer */
export type KnowledgeAuditEventApi = {
  id: number;
  created_at: string;
  scope_id: string;
  actor_id: string;
  actor_display_name: string;
  code: string;
  code_label: string;
  action: string;
  entity_type: string;
  entity_type_label: string;
  entity_id: string;
  entity_title: string;
  access_level: string;
  detail: string;
};
/** KnowledgeAuditSummarySerializer */
export type KnowledgeAuditSummaryApi = { events: number; actors: number; confidential_access: number };

// ================================================================ endpointها

const e = (method: Ep["method"], path: string): Ep => ({ method, path });
const p = (method: Ep["method"], path: string): Ep => ({ method, path, proposed: true });

/** مسیرهای عمومی Kong (نسبت به API_ROOT؛ همه زیر /workspace) */
export const kmEndpoints = {
  scopes: e("GET", `${W}/scopes/`),
  overview: e("GET", `${W}/overview/`),
  documents: e("GET", `${W}/documents/`),
  documentCreate: e("POST", `${W}/documents/`),
  document: (id: string) => e("GET", `${W}/documents/${id}/`),
  documentUpdate: (id: string) => e("PATCH", `${W}/documents/${id}/`),
  documentDelete: (id: string) => e("DELETE", `${W}/documents/${id}/`),
  documentDownload: (id: string) => e("GET", `${W}/documents/${id}/download/`),
  versions: (id: string) => e("GET", `${W}/documents/${id}/versions/`),
  versionCreate: (id: string) => e("POST", `${W}/documents/${id}/versions/`),
  versionDownload: (id: string, vid: string) => e("GET", `${W}/documents/${id}/versions/${vid}/download/`),
  categories: e("GET", `${W}/categories/`),
  documentTypes: e("GET", `${W}/document-types/`),
  researchStages: e("GET", `${W}/research-stages/`),
  researchOpportunities: e("GET", `${W}/research-opportunities/`),
  researchTransition: (id: string) => e("POST", `${W}/research-opportunities/${id}/transition/`),
  researchHistory: (id: string) => e("GET", `${W}/research-opportunities/${id}/history/`),
  profileSections: e("GET", `${W}/profile-sections/`),
  profileItems: (sid: string) => e("GET", `${W}/profile-sections/${sid}/items/`),
  glossary: e("GET", `${W}/glossary-terms/`),
  experts: e("GET", `${W}/experts/`),
  expertAreas: e("GET", `${W}/experts/areas/`),
  experiences: e("GET", `${W}/experiences/`),
  experiencePublish: (id: string) => e("POST", `${W}/experiences/${id}/publish/`),
  experienceHelpful: (id: string) => e("POST", `${W}/experiences/${id}/helpful/`),
  auditEvents: e("GET", `${W}/audit-events/`),
  auditSummary: e("GET", `${W}/audit-events/summary/`),
  auditExport: e("GET", `${W}/audit-events/export/`),
  publicDocuments: e("GET", "/workspace/public/knowledge/documents/"),
  // ---- «پیشنهادی» (در API فعلی نیست)
  workflow: (id: string) => p("POST", `${W}/documents/${id}/workflow/`),
  acl: (id: string) => p("PUT", `${W}/documents/${id}/acl/`),
  comments: (id: string) => p("GET", `${W}/documents/${id}/comments/`),
  feedback: (id: string) => p("POST", `${W}/documents/${id}/feedback/`),
  follow: (id: string) => p("POST", `${W}/documents/${id}/follow/`),
  acknowledge: (id: string) => p("POST", `${W}/documents/${id}/acknowledge/`),
  legalHold: (id: string) => p("PUT", `${W}/documents/${id}/legal-hold/`),
  processes: p("GET", `${W}/processes/`),
  workflowTemplates: p("GET", `${W}/workflow-templates/`),
  savedSearches: p("GET", `${W}/saved-searches/`),
  retention: p("GET", `${W}/retention/`),
  myApprovals: p("GET", `${W}/documents/?awaiting_my_approval=true`),
};

/** فهرست برچسب‌دار برای دکمه‌ی «API» صفحه‌ی مدیریت دانش */
export const kmApiItems: { label: string; ep: Ep }[] = [
  { label: "شمارنده‌های داشبورد", ep: kmEndpoints.overview },
  { label: "محدوده‌ها (فضاها)", ep: kmEndpoints.scopes },
  { label: "فهرست اسناد", ep: kmEndpoints.documents },
  { label: "بارگذاری سند", ep: kmEndpoints.documentCreate },
  { label: "نسخه‌ی جدید", ep: kmEndpoints.versionCreate("{id}") },
  { label: "دسته‌بندی‌ها", ep: kmEndpoints.categories },
  { label: "انواع سند", ep: kmEndpoints.documentTypes },
  { label: "شناسنامه‌ها", ep: kmEndpoints.profileSections },
  { label: "سندهای فرصت R&D", ep: kmEndpoints.researchOpportunities },
  { label: "واژه‌نامه", ep: kmEndpoints.glossary },
  { label: "خبرگان", ep: kmEndpoints.experts },
  { label: "تجربیات", ep: kmEndpoints.experiences },
  { label: "لاگ ممیزی", ep: kmEndpoints.auditEvents },
  { label: "گردش کار انتشار", ep: kmEndpoints.workflow("{id}") },
  { label: "فهرست دسترسی سند", ep: kmEndpoints.acl("{id}") },
  { label: "نظرات سند", ep: kmEndpoints.comments("{id}") },
  { label: "فرآیندها", ep: kmEndpoints.processes },
  { label: "اسناد منتظر تأیید من", ep: kmEndpoints.myApprovals },
];

// ================================================================ ابزار تبدیل

/** تاریخ شمسی دمو (با ساعت اختیاری «۱۴۰۵/۰۳/۰۸ ۱۰:۲۰») → ISO date-time */
export function isoDateTime(j?: string | null): string {
  const s = toEnDigits(j ?? "").trim();
  const [d, t] = s.split(/\s+/);
  const day = isoDate(d) ?? "2026-01-01";
  const hm = /^(\d{1,2}):(\d{2})/.exec(t ?? "");
  return `${day}T${hm ? `${hm[1].padStart(2, "0")}:${hm[2]}` : "09:00"}:00Z`;
}
/** شناسه‌ی شخص در workspace: کاربر شناخته‌شده → principal_id؛ نام آزاد → UUID قطعی */
export function personId(name: string): string {
  const u = users.find((x) => x.name === name);
  return u ? principalOf(u.id) : uuidOf(`person:${name}`);
}
const slugOf = (id: string) => id.replace(/^(cat|dt)-/, "");
const sha256Of = (key: string) => [0, 1, 2, 3].map((i) => uuidOf(`${key}#${i}`).replace(/-/g, "")).join("").slice(0, 64);
const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  zip: "application/zip",
  txt: "text/plain",
  md: "text/markdown",
};
/** «۲٫۴ مگابایت» / «۳۲۰ کیلوبایت» → بایت */
export function sizeBytes(size: string | undefined): number {
  const s = toEnDigits(size ?? "").replace("٫", ".");
  const n = parseFloat(s.replace(/[^\d.]/g, "")) || 0;
  if (/مگا|MB/i.test(s)) return Math.round(n * 1024 * 1024);
  if (/کیلو|KB/i.test(s)) return Math.round(n * 1024);
  return Math.round(n);
}

// ---------------------------------------------------------------- محدوده (scope)
export type ScopeLookup = { holdings?: Holding[]; companies?: Company[] };
const TENANT = uuidOf("tenant:kariz");
const ROOT_SCOPE: KnowledgeScopeApi = { id: uuidOf("scope:root"), tenant_id: TENANT, type_id: uuidOf("scope-type:root"), is_root: true, type_code: "root", code: "ROOT", name: "کل سازمان", parent_id: null };
const holdingScope = (h: Pick<Holding, "id" | "name">): KnowledgeScopeApi => ({ id: uuidOf(`scope:${h.id}`), tenant_id: TENANT, type_id: uuidOf("scope-type:holding"), is_root: false, type_code: "holding", code: h.id, name: h.name, parent_id: ROOT_SCOPE.id });
const companyScope = (c: Pick<Company, "id" | "name" | "holdingId">): KnowledgeScopeApi => ({ id: uuidOf(`scope:${c.id}`), tenant_id: TENANT, type_id: uuidOf("scope-type:company"), is_root: false, type_code: "company", code: c.id, name: c.name, parent_id: uuidOf(`scope:${c.holdingId}`) });

/** محدوده‌ی IAM یک رکورد دمو (Scoped) به شکل KnowledgeScopeSerializer */
export function scopeOf(x: Scoped, lk: ScopeLookup = {}): KnowledgeScopeApi {
  const hs = lk.holdings ?? staticHoldings;
  const cs = lk.companies ?? staticCompanies;
  if (x.scope === "شرکت") {
    const c = cs.find((y) => y.id === x.companyId);
    if (c) return companyScope(c);
  }
  if (x.scope === "هلدینگ" || x.scope === "شرکت") {
    const h = hs.find((y) => y.id === x.holdingId);
    if (h) return holdingScope(h);
  }
  return ROOT_SCOPE;
}
export const rootScope = () => ROOT_SCOPE;

/** GET knowledge/scopes/ */
export function scopesCatalogue(lk: ScopeLookup = {}): KnowledgeScopeCatalogueApi {
  const hs = lk.holdings ?? staticHoldings;
  const cs = lk.companies ?? staticCompanies;
  return { scopes: [ROOT_SCOPE, ...hs.map(holdingScope), ...cs.map(companyScope)], research_eligible_type_codes: ["company"] };
}

// ---------------------------------------------------------------- دسته و نوع
const STAMP = "2026-03-21T09:00:00Z";
export const categoryApi = (c: KCategory | undefined, order = 0): DocumentCategoryApi & DocumentCategoryProposed =>
  c
    ? { id: intId(c.id), name: c.name, slug: slugOf(c.id), sort_order: order, is_active: true, created_at: STAMP, updated_at: STAMP, parent_id: c.parentId ? intId(c.parentId) : null }
    : { id: 0, name: "—", slug: "none", sort_order: 0, is_active: false, created_at: STAMP, updated_at: STAMP, parent_id: null };
export const documentTypeApi = (t: KDocType | undefined, order = 0, fallbackName = "سایر"): DocumentTypeApi & DocumentCategoryProposed =>
  t
    ? { id: intId(t.id), name: t.name, slug: slugOf(t.id), sort_order: order, is_active: true, created_at: STAMP, updated_at: STAMP, color: t.color }
    : { id: intId(`dt-${fallbackName}`), name: fallbackName, slug: "other", sort_order: 99, is_active: true, created_at: STAMP, updated_at: STAMP };

// ---------------------------------------------------------------- سند
export const visibilityOf = (a: AccessLevel): "public" | "restricted" => (a === "عمومی" ? "public" : "restricted");
export type KClassificationKey = "public" | "internal" | "confidential" | "secret";
export const classificationOf: Record<AccessLevel, KClassificationKey> = { عمومی: "public", داخلی: "internal", محرمانه: "confidential", "خیلی محرمانه": "secret" };
export const visibilityLabel: Record<"public" | "restricted", string> = { public: "عمومی", restricted: "محدود" };
export type KDocStatusKey = "draft" | "in_review" | "returned" | "approved" | "published" | "archived";
export const docStatusKey: Record<DocStatus, KDocStatusKey> = { "پیش‌نویس": "draft", "در بررسی": "in_review", "ارجاع برای اصلاح": "returned", "تأییدشده": "approved", "منتشرشده": "published", "آرشیو": "archived" };

export function versionApi(docId: string, title: string, v: KVersion, format: KDoc["format"]): KnowledgeDocumentVersionApi {
  const f = v.files[0];
  const vid = uuidOf(`kdv:${docId}:${v.version}`);
  const article = format === "article" && !f;
  const ext = (f?.ext || (article ? "md" : "")).toLowerCase();
  return {
    id: vid,
    version_number: v.version,
    original_filename: f?.name ?? `${title}.md`,
    mime_type: MIME[ext] ?? "application/octet-stream",
    size_bytes: f ? v.files.reduce((s, x) => s + sizeBytes(x.size), 0) : new Blob([v.body ?? ""]).size,
    sha256: sha256Of(`${docId}:${v.version}`),
    change_note: v.note ?? "",
    uploaded_by_id: personId(v.by),
    uploaded_by_display_name: v.by,
    created_at: isoDateTime(v.date),
    download_url: `${API_ROOT}/workspace/knowledge/documents/${docId}/versions/${vid}/download/`,
  };
}

export type DocLookup = { categories: KCategory[]; docTypes: KDocType[] } & ScopeLookup;

/** KnowledgeDocumentDetailSerializer (+ «پیشنهادی») از رکورد دمو */
export function toKnowledgeDocument(d: KDoc, lk: DocLookup): KnowledgeDocument {
  const versions = d.versions.map((v) => versionApi(d.id, d.title, v, d.format));
  const ci = lk.categories.findIndex((c) => c.id === d.categoryId);
  const ti = lk.docTypes.findIndex((t) => t.name === d.type);
  return {
    id: d.id,
    scope: scopeOf(d, lk),
    title: d.title,
    category: categoryApi(lk.categories[ci], ci),
    document_type: documentTypeApi(lk.docTypes[ti], ti, d.type),
    owner_label: d.owner,
    visibility: visibilityOf(d.access),
    created_by_id: personId(d.author),
    created_by_display_name: d.author,
    current_version: versions[versions.length - 1] ?? null,
    created_at: isoDateTime(d.createdAt),
    updated_at: isoDateTime(d.updatedAt),
    versions,
    proposed: {
      code: d.code,
      tags: d.tags,
      unit: d.unit,
      status: docStatusKey[d.status],
      classification: classificationOf[d.access],
      review_date: isoDate(d.reviewDate),
      approvers: d.approvers.map(personId),
      importance: d.importance === "حیاتی" ? "critical" : d.importance === "مهم" ? "important" : "normal",
      format: d.format ?? "file",
      body: d.body ?? null,
      views: d.views,
      downloads: d.downloads,
      followers_count: d.followers.length,
    },
  };
}
/** KnowledgeDocumentListSerializer (بدون versions) */
export function toKnowledgeDocumentList(d: KDoc, lk: DocLookup): KnowledgeDocumentListApi {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { versions, proposed, ...rest } = toKnowledgeDocument(d, lk);
  return rest;
}

/** پرس‌وجوی GET knowledge/documents/ */
export type DocumentsQuery = PageQuery & { scope_id?: string; q?: string; category?: string; type?: string; visibility?: "public" | "restricted"; owner?: string; ordering?: "title" | "-title" | "created_at" | "-created_at" | "updated_at" | "-updated_at" | "owner_label" | "-owner_label" };

/** صفحه‌بندی هر فهرست ماژول به شکل workspace */
export const kmPage = <T>(items: readonly T[], ep: Ep, q: PageQuery = {}): WorkspacePage<T> => paginateWorkspace(items, `${API_ROOT}${ep.path.split("?")[0]}`, q);

// ---------------------------------------------------------------- تجربه
export const experienceKindKey: Record<ExperienceKind, ExperienceKindKey> = {
  "تجربه موفق": "success",
  "تجربه ناموفق": "failure",
  "درس‌آموخته": "lesson",
  "Best Practice": "best_practice",
  "نکته تخصصی": "expert_tip",
  "راهکار حل مشکل": "solution",
  "پرسش و پاسخ": "qa",
};
export const experienceKindOfKey = Object.fromEntries(Object.entries(experienceKindKey).map(([k, v]) => [v, k])) as Record<ExperienceKindKey, ExperienceKind>;
export const experienceStatusKey: Record<Experience["status"], ExperienceStatusKey> = { "پیش‌نویس": "draft", "در بررسی": "in_review", "منتشرشده": "published" };

export function toExperienceApi(x: Experience, o: { projectName?: (id: string) => string | undefined; me?: string; canPublish?: boolean } = {}): ExperienceApi {
  const pname = x.projectId ? o.projectName?.(x.projectId) : undefined;
  return {
    id: x.id,
    scope: ROOT_SCOPE,
    created_by_id: personId(x.author),
    created_by_display_name: x.author,
    created_at: isoDateTime(x.date),
    updated_at: isoDateTime(x.date),
    kind: experienceKindKey[x.kind],
    title: x.title,
    body: x.body,
    problem: x.problem ?? "",
    cause: x.cause ?? "",
    action: x.action ?? "",
    result: x.result ?? "",
    future: x.future ?? "",
    unit: x.unit,
    tags: x.tags,
    status: experienceStatusKey[x.status],
    project_id: x.projectId ? intId(x.projectId) : null,
    project: x.projectId ? { id: intId(x.projectId), name: pname ?? "پروژه" } : null,
    helpful_count: x.helpful,
    has_voted: false,
    can_edit: !!o.me && o.me === x.author,
    can_publish: !!o.canPublish && x.status === "در بررسی",
    published_at: x.status === "منتشرشده" ? isoDateTime(x.date) : null,
    published_by_id: x.status === "منتشرشده" ? personId(x.author) : "",
  };
}

// ---------------------------------------------------------------- خبره، واژه
export function toExpertApi(x: Expert, counts: { documents: number; experiences: number } = { documents: 0, experiences: 0 }): ExpertApi {
  return {
    id: x.id,
    scope: ROOT_SCOPE,
    created_by_id: "",
    created_by_display_name: "",
    created_at: STAMP,
    updated_at: STAMP,
    name: x.name,
    principal_id: x.userId ? principalOf(x.userId) : null,
    title: x.title,
    unit: x.unit,
    areas: x.areas,
    topics: x.topics,
    experience: x.experience,
    document_count: counts.documents,
    experience_count: counts.experiences,
  };
}

export function toGlossaryTermApi(g: GlossaryTerm): GlossaryTermApi {
  return { id: g.id, scope: ROOT_SCOPE, created_by_id: "", created_by_display_name: "", created_at: STAMP, updated_at: STAMP, term: g.term, abbreviation: g.abbr ?? "", english: g.english ?? "", definition: g.definition, unit: g.unit };
}

// ---------------------------------------------------------------- فرصت‌های R&D
export function researchStagesApi(states: { threshold: number; label: string }[]): ResearchOpportunityStageApi[] {
  return states.map((s, i) => ({ id: uuidOf(`rstage:${s.threshold}`), key: `stage_${s.threshold}`, progress: s.threshold, label: s.label, display_order: i, is_default: i === 0, is_delivered: s.threshold >= 100, is_active: true, created_at: STAMP, updated_at: STAMP }));
}

export function toResearchOpportunityApi(r: RndDoc, states: { threshold: number; label: string }[], lk: ScopeLookup = {}): ResearchOpportunityApi {
  const stages = researchStagesApi(states);
  const st = stages.find((s) => s.progress >= r.progress) ?? stages[stages.length - 1];
  const cs = lk.companies ?? staticCompanies;
  const hs = lk.holdings ?? staticHoldings;
  const c = cs.find((x) => x.name === r.company);
  const h = hs.find((x) => x.name === r.holding);
  const scope = c ? companyScope(c) : h ? holdingScope(h) : ROOT_SCOPE;
  const snap = { id: st.id, progress: st.progress, label: r.statusLabel || st.label };
  return {
    id: r.id,
    scope_id: scope.id,
    scope,
    scope_labels: [r.holding, r.company].filter(Boolean),
    stage: { id: st.id, key: st.key, progress: r.progress, label: r.statusLabel || st.label, is_delivered: st.is_delivered },
    blocker: r.obstacles ?? "",
    created_at: isoDateTime(r.startDate),
    updated_at: isoDateTime(r.history[0]?.at ?? r.startDate),
    // تاریخچه‌ی دمو فقط یادداشت دارد؛ مرحله‌ی مقصد = مرحله‌ی فعلی
    stage_history: r.history.map((h2, i) => ({ id: intId(`${r.id}h${i}`), from_stage: null, to_stage: snap, blocker: "", note: h2.text, changed_by_id: personId(h2.by), changed_by_display_name: h2.by, created_at: isoDateTime(h2.at) })),
  };
}

// ---------------------------------------------------------------- شناسنامه‌ها
export function toProfileSectionApi(t: RegistryType, items: RegistryItem[], order = 0): ProfileSectionApi {
  return { id: uuidOf(`psec:${t.id}`), scope: ROOT_SCOPE, name: t.name, description: t.description, display_order: order, item_count: items.filter((i) => i.typeId === t.id).length, created_at: STAMP, updated_at: STAMP };
}
export function toProfileItemApi(i: RegistryItem, order = 0): ProfileItemApi & { proposed: ProfileItemProposed } {
  const status = i.values.status ? [i.values.status] : [];
  return { id: i.id, title: i.title, status, display_order: order, created_at: isoDateTime(i.updatedAt), updated_at: isoDateTime(i.updatedAt), proposed: { section: uuidOf(`psec:${i.typeId}`), fields: i.values, owner: i.owner, unit: i.unit } };
}

// ---------------------------------------------------------------- لاگ ممیزی
const ENTITY_TYPE: Record<string, string> = { doc: "document", glossary: "glossary_term", expert: "expert", lesson: "experience" };
const ENTITY_LABEL: Record<string, string> = { document: "سند", glossary_term: "واژه", expert: "خبره", experience: "تجربه" };
export function toAuditEventApi(l: KLog): KnowledgeAuditEventApi {
  const code = l.code ?? "other";
  const et = ENTITY_TYPE[l.entity.type] ?? l.entity.type;
  return {
    id: l.seq,
    created_at: isoDateTime(l.at),
    scope_id: ROOT_SCOPE.id,
    actor_id: personId(l.actor),
    actor_display_name: l.actor,
    code,
    code_label: logCodeLabel[code],
    action: l.action,
    entity_type: et,
    entity_type_label: ENTITY_LABEL[et] ?? et,
    entity_id: l.entity.id,
    entity_title: l.entity.title,
    access_level: l.access ?? "",
    detail: l.detail ?? "",
  };
}
export function auditSummary(logs: KLog[]): KnowledgeAuditSummaryApi {
  const conf = logs.filter((l) => (l.access === "محرمانه" || l.access === "خیلی محرمانه") && ["view", "preview", "download"].includes(l.code ?? "")).length;
  return { events: logs.length, actors: new Set(logs.map((l) => l.actor)).size, confidential_access: conf };
}
