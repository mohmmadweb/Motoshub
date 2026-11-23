// ---------------------------------------------------------------------------
// پاکت‌های پاسخ API کاریز (DATA_ALIGNMENT §0.2) — همه‌ی انبارهای دمو فهرست‌ها را با همین
// شکل‌ها برمی‌گردانند تا رابط کاربری دقیقاً مثل کلاینت واقعی داده را بخواند.
//  - social / notification: { data, meta }  · پرس‌وجو page + per_page
//  - workspace:             { data, links, meta } · پرس‌وجو page + page_size
//  - identity:              { count, page, page_size, data, meta }
//  - timeline / search:     همان شکل social
// ---------------------------------------------------------------------------

/** نشانی یک endpoint برای دکمه‌ی «API» صفحه‌ها؛ proposed = «پیشنهادی» (در بک‌اند واقعی نیست) */
export type Ep = { method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; path: string; proposed?: boolean };

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** meta صفحه‌بندی سرویس‌های social / notification / timeline / search */
export type SocialMeta = { current_page: number; from: number | null; last_page: number; per_page: number; to: number | null; total: number };
/** فهرست social / notification: `{ data, meta }` */
export type SocialPage<T> = { data: T[]; meta: SocialMeta };
/** پاسخ تغییر (ایجاد/ویرایش/حذف) social / notification؛ در ایجاد `data: null` */
export type SocialEnvelope<T> = { status: "success" | "error"; status_code: number; message: string; data: T | null };

/** links و meta صفحه‌بندی workspace (DRF) */
export type WorkspaceLinks = { first: string | null; last: string | null; prev: string | null; next: string | null };
export type WorkspaceMeta = { current_page: number; from: number | null; last_page: number; path: string; per_page: number; to: number | null; total: number };
/** فهرست workspace: `{ data, links, meta }` */
export type WorkspacePage<T> = { data: T[]; links: WorkspaceLinks; meta: WorkspaceMeta };

/** فهرست identity: `{ count, page, page_size, data, meta }` */
export type IdentityPage<T> = { count: number; page: number; page_size: number; data: T[]; meta: { total: number; last_page: number } };

/** خطای اعتبارسنجی ۴۲۲ (social/workspace/notification) و ۴۰۰ (identity: فقط errors) */
export type ApiValidationError = { message: "The given data was invalid." | string; errors: Record<string, string[]> };
/** سایر خطاها: social `{status:"error",…}` · workspace `{message, errors:{}}` · identity `{detail}` */
export type ApiError = ApiValidationError | SocialEnvelope<null> | { message: string; errors: Record<string, never> } | { detail: string };

export type PageQuery = { page?: number; per_page?: number; page_size?: number };

const clampSize = (n: number | undefined) => Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n ?? DEFAULT_PAGE_SIZE)));

function slice<T>(items: readonly T[], q: PageQuery, size: number) {
  const total = items.length;
  const last_page = Math.max(1, Math.ceil(total / size));
  const current_page = Math.min(last_page, Math.max(1, Math.floor(q.page ?? 1)));
  const start = (current_page - 1) * size;
  const data = items.slice(start, start + size);
  return { data, total, last_page, current_page, from: data.length ? start + 1 : null, to: data.length ? start + data.length : null };
}

/** صفحه‌بندی به شکل social / notification / timeline / search (`page`, `per_page`) */
export function paginate<T>(items: readonly T[], q: PageQuery = {}): SocialPage<T> {
  const per_page = clampSize(q.per_page ?? q.page_size);
  const s = slice(items, q, per_page);
  return { data: s.data, meta: { current_page: s.current_page, from: s.from, last_page: s.last_page, per_page, to: s.to, total: s.total } };
}

/** صفحه‌بندی به شکل workspace (`page`, `page_size`)؛ path = مسیر endpoint برای ساخت links */
export function paginateWorkspace<T>(items: readonly T[], path: string, q: PageQuery = {}): WorkspacePage<T> {
  const per_page = clampSize(q.page_size ?? q.per_page);
  const s = slice(items, q, per_page);
  const link = (p: number) => `${path}?page=${p}&page_size=${per_page}`;
  return {
    data: s.data,
    links: { first: link(1), last: link(s.last_page), prev: s.current_page > 1 ? link(s.current_page - 1) : null, next: s.current_page < s.last_page ? link(s.current_page + 1) : null },
    meta: { current_page: s.current_page, from: s.from, last_page: s.last_page, path, per_page, to: s.to, total: s.total },
  };
}

/** صفحه‌بندی به شکل identity (`page`, `page_size`) */
export function paginateIdentity<T>(items: readonly T[], q: PageQuery = {}): IdentityPage<T> {
  const page_size = clampSize(q.page_size ?? q.per_page);
  const s = slice(items, q, page_size);
  return { count: s.total, page: s.current_page, page_size, data: s.data, meta: { total: s.total, last_page: s.last_page } };
}

/** پاسخ موفق تغییر در social / notification */
export const ok = <T>(data: T | null, message = "OK", status_code = 200): SocialEnvelope<T> => ({ status: "success", status_code, message, data });

/** خطای اعتبارسنجی ۴۲۲ */
export const invalid = (errors: Record<string, string[]>): ApiValidationError => ({ message: "The given data was invalid.", errors });
