// ---------------------------------------------------------------------------
// رجیستری endpointهای «دبیرخانه و مشتریان» — همه «پیشنهادی» (در بک‌اند فعلی نیستند).
// پایه: https://api.shub.ir/api/v1 · مسیرهای workspace (DATA_ALIGNMENT §0.1، §10) ·
// فهرست‌ها با پاکت workspace ‏`{data, links, meta}` و پرس‌وجوی page/page_size.
// ---------------------------------------------------------------------------
import type { Ep } from "../api/envelopes";

export const OFFICE_API_BASE = "https://api.shub.ir/api/v1";
const p = (method: Ep["method"], path: string): Ep => ({ method, path: `/workspace/${path}`, proposed: true });

export const secretariatEp = {
  letters: p("GET", "secretariat/letters/"),
  letterCreate: p("POST", "secretariat/letters/"),
  letter: p("GET", "secretariat/letters/{id}/"),
  letterUpdate: p("PATCH", "secretariat/letters/{id}/"),
  /** فقط نامه‌ی شماره‌نخورده و خوانده‌نشده */
  letterDelete: p("DELETE", "secretariat/letters/{id}/"),
  seen: p("POST", "secretariat/letters/{id}/seen/"),
  archive: p("POST", "secretariat/letters/{id}/archive/"),
  paraphs: p("GET", "secretariat/letters/{id}/paraphs/"),
  paraphCreate: p("POST", "secretariat/letters/{id}/paraphs/"),
  referrals: p("GET", "secretariat/letters/{id}/referrals/"),
  referralCreate: p("POST", "secretariat/letters/{id}/referrals/"),
  register: p("POST", "secretariat/letters/{id}/register/"),
  caseLinks: p("PUT", "secretariat/letters/{id}/case-links/"),
  series: p("GET", "secretariat/number-series/"),
  seriesCreate: p("POST", "secretariat/number-series/"),
  seriesUpdate: p("PATCH", "secretariat/number-series/{id}/"),
  registry: p("GET", "secretariat/registry/"),
} as const;

export const crmEp = {
  customers: p("GET", "crm/customers/"),
  customerCreate: p("POST", "crm/customers/"),
  customer: p("GET", "crm/customers/{id}/"),
  customerUpdate: p("PATCH", "crm/customers/{id}/"),
  contacts: p("GET", "crm/customers/{id}/contacts/"),
  contactCreate: p("POST", "crm/customers/{id}/contacts/"),
  activities: p("GET", "crm/customers/{id}/activities/"),
  activityCreate: p("POST", "crm/customers/{id}/activities/"),
  import: p("POST", "crm/customers/import/"),
  opportunities: p("GET", "crm/opportunities/"),
  opportunityCreate: p("POST", "crm/opportunities/"),
  opportunityUpdate: p("PATCH", "crm/opportunities/{id}/"),
  financeDocs: p("GET", "crm/finance-documents/"),
  financeDocCreate: p("POST", "crm/finance-documents/"),
  financeDocUpdate: p("PATCH", "crm/finance-documents/{id}/"),
  financeDocCancel: p("POST", "crm/finance-documents/{id}/cancel/"),
  labels: p("GET", "crm/labels/"),
  monitoringFinance: p("GET", "monitoring/finance/"),
  monitoringSales: p("GET", "monitoring/sales/"),
} as const;

export const fmtEp = (e: Ep) => `${e.method} ${e.path}`;

/** فهرست برچسب‌دار برای دکمه‌ی «API» صفحه‌ها */
export const secretariatApiList: { label: string; ep: Ep }[] = [
  { label: "فهرست نامه‌ها (کارتابل)", ep: secretariatEp.letters },
  { label: "ارسال نامه", ep: secretariatEp.letterCreate },
  { label: "رسید مشاهده", ep: secretariatEp.seen },
  { label: "پاراف", ep: secretariatEp.paraphCreate },
  { label: "ارجاع", ep: secretariatEp.referralCreate },
  { label: "ثبت شماره‌ی وارده/صادره", ep: secretariatEp.register },
  { label: "اتصال به پرونده‌ی مشتری", ep: secretariatEp.caseLinks },
  { label: "بایگانی", ep: secretariatEp.archive },
  { label: "دفتر ثبت دبیرخانه", ep: secretariatEp.registry },
  { label: "سری‌های شماره", ep: secretariatEp.series },
];

export const crmApiList: { label: string; ep: Ep }[] = [
  { label: "پرونده‌های مشتری", ep: crmEp.customers },
  { label: "ایجاد پرونده", ep: crmEp.customerCreate },
  { label: "نمایندگان", ep: crmEp.contacts },
  { label: "فعالیت‌های پرونده", ep: crmEp.activities },
  { label: "ورود از اکسل", ep: crmEp.import },
  { label: "فرصت‌های فروش", ep: crmEp.opportunities },
  { label: "اسناد مالی", ep: crmEp.financeDocs },
  { label: "ابطال سند مالی", ep: crmEp.financeDocCancel },
  { label: "مانیتورینگ مالی", ep: crmEp.monitoringFinance },
  { label: "مانیتورینگ فروش", ep: crmEp.monitoringSales },
];
