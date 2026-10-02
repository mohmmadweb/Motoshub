// ---------------------------------------------------------------------------
// افزوده‌های موج ۴ ماژول‌های نوآوری (بدون شکستن داده‌ی ذخیره‌شده):
//   • قالب‌های قرارداد با متغیر ({{طرف_دوم}}، {{مبلغ}} …) و تشخیص «انحراف از متن استاندارد»
//   • ضمانت‌نامه‌ها با هشدار انقضا (۶۰ / ۳۰ / ۷ روز)
//   • ماتریس داوری چندداوره (میانگین، انحراف معیار، داور دیرکرد)
//   • «پروژه‌ی خوابیده» بر اساس آخرین رویداد ثبت‌شده‌ی هر طرح تأمین‌مالی‌شده
//   • داده‌ی نمونه برای همه‌ی این‌ها (یک بار، با extrasVersion)
// ---------------------------------------------------------------------------
import { dayNum, diffDays, toEnDigits } from "../pm/jalali";
import { normDate } from "../reports/engine";
import type { NfProject } from "../data/mockInnovationFund";
import type { Contract, ContractGuarantee, ContractTemplate, EmploymentFund, FundSettings, ILog, InnStore, JudgeCriterion, JudgePanel } from "./types";
import { KB_ONLY, type FormDef } from "./forms";
import { rialShort } from "./util";

export const EXTRAS_VERSION = 2;

// ----------------------------------------------------------------- قالب قرارداد

const VAR_RE = /\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g;

/** نام متغیرهای یک متن قالب، به ترتیب اولین ظهور */
export function templateVars(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(VAR_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

export function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(VAR_RE, (_, k: string) => (vars[k]?.trim() ? vars[k].trim() : `{{${k}}}`));
}

const normText = (s: string) => s.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();

/** آیا متن نهایی با متن استانداردِ پرشده‌ی قالب فرق دارد؟ */
export function deviatesFromTemplate(c: Contract, templates: ContractTemplate[] | undefined): boolean {
  const t = templates?.find((x) => x.id === c.templateId);
  if (!t || c.body === undefined) return false;
  return normText(c.body) !== normText(fillTemplate(t.body, c.templateVars ?? {}));
}

/** مقایسه‌ی سطری ساده: سطرهای متن نهایی که در متن استاندارد نیستند و برعکس */
export function lineDiff(standard: string, actual: string): { added: string[]; removed: string[] } {
  const a = normText(standard).split("\n").map((x) => x.trim()).filter(Boolean);
  const b = normText(actual).split("\n").map((x) => x.trim()).filter(Boolean);
  return { added: b.filter((x) => !a.includes(x)), removed: a.filter((x) => !b.includes(x)) };
}

/** مقادیر پیش‌فرض متغیرهای رایج از روی پرونده‌ی قرارداد */
export function autoVars(c: Pick<Contract, "vendor" | "value" | "startDate" | "endDate" | "title" | "owner">): Record<string, string> {
  return {
    طرف_دوم: c.vendor,
    مبلغ: c.value ? rialShort(c.value) : "",
    موضوع: c.title,
    تاریخ_شروع: c.startDate,
    تاریخ_پایان: c.endDate,
    نماینده_بنیاد: c.owner,
  };
}

function seedTemplates(): ContractTemplate[] {
  const at = "۱۴۰۵/۰۱/۱۵";
  const by = "دفتر حقوقی بنیاد";
  return [
    {
      id: "tpl-tech",
      title: "قرارداد پژوهشی-فناورانه (تیپ ۱)",
      type: "فناورانه",
      updatedAt: at,
      updatedBy: by,
      body: [
        "ماده ۱ — طرفین: این قرارداد میان بنیاد (طرف اول) به نمایندگی {{نماینده_بنیاد}} و {{طرف_دوم}} (طرف دوم) منعقد می‌شود.",
        "ماده ۲ — موضوع: {{موضوع}}.",
        "ماده ۳ — مبلغ: مبلغ کل قرارداد {{مبلغ}} است که طبق جدول پرداخت مرحله‌ای و پس از تأیید ناظر پرداخت می‌شود.",
        "ماده ۴ — مدت: از {{تاریخ_شروع}} تا {{تاریخ_پایان}}.",
        "ماده ۵ — حسن انجام کار: از هر پرداخت ده درصد به‌عنوان حسن انجام کار کسر و پس از تحویل نهایی مسترد می‌شود.",
        "ماده ۶ — مالکیت فکری: مطابق بند مالکیت فکری پیوست این قرارداد.",
        "ماده ۷ — حل اختلاف: اختلافات ابتدا از طریق مذاکره و در صورت عدم توافق از طریق داوری مرضی‌الطرفین حل می‌شود.",
      ].join("\n"),
    },
    {
      id: "tpl-service",
      title: "قرارداد خدماتی/پیمانکاری",
      type: "خدماتی",
      updatedAt: at,
      updatedBy: by,
      body: [
        "ماده ۱ — کارفرما: بنیاد؛ پیمانکار: {{طرف_دوم}}.",
        "ماده ۲ — موضوع پیمان: {{موضوع}}.",
        "ماده ۳ — مبلغ پیمان: {{مبلغ}}؛ پیش‌پرداخت حداکثر بیست و پنج درصد در قبال ضمانت‌نامه‌ی بانکی معتبر.",
        "ماده ۴ — مدت پیمان: {{تاریخ_شروع}} تا {{تاریخ_پایان}}.",
        "ماده ۵ — تضمین انجام تعهدات: ضمانت‌نامه‌ی بانکی به میزان پنج درصد مبلغ پیمان.",
      ].join("\n"),
    },
  ];
}

// ----------------------------------------------------------------- ضمانت‌نامه

export type GuaranteeAlert = { c: Contract; g: ContractGuarantee; days: number; level: 60 | 30 | 7 | 0 };

/** سطح هشدار: ۰ = منقضی، ۷ / ۳۰ / ۶۰ روز مانده؛ null = فعلاً هشداری نیست */
export function guaranteeLevel(today: string, g: ContractGuarantee): { days: number; level: 60 | 30 | 7 | 0 } | null {
  if (g.status !== "معتبر" || dayNum(g.expiry) === null) return null;
  const d = diffDays(today, g.expiry);
  if (d < 0) return { days: d, level: 0 };
  if (d <= 7) return { days: d, level: 7 };
  if (d <= 30) return { days: d, level: 30 };
  if (d <= 60) return { days: d, level: 60 };
  return null;
}

export function guaranteeAlerts(contracts: Contract[], today: string): GuaranteeAlert[] {
  return contracts
    .filter((c) => c.stage !== "مختومه")
    .flatMap((c) => (c.guarantees ?? []).map((g) => ({ c, g, lv: guaranteeLevel(today, g) })))
    .filter((x): x is { c: Contract; g: ContractGuarantee; lv: { days: number; level: 60 | 30 | 7 | 0 } } => !!x.lv)
    .map(({ c, g, lv }) => ({ c, g, days: lv.days, level: lv.level }))
    .sort((a, b) => a.days - b.days);
}

/** تعهدات معوق قرارداد (سررسید گذشته و تحویل‌نشده) */
export function overdueObligations(contracts: Contract[], today: string) {
  return contracts
    .filter((c) => c.stage !== "مختومه" && c.stage !== "پیش‌نویس")
    .flatMap((c) => c.milestones.filter((m) => !m.done && dayNum(m.due) !== null && diffDays(today, m.due) < 0).map((m) => ({ c, m, days: -diffDays(today, m.due) })))
    .sort((a, b) => b.days - a.days);
}

// ----------------------------------------------------------------- ماتریس داوری

export const defaultCriteria = (): JudgeCriterion[] => [
  { id: "jc1", title: "نوآوری و فناوری", max: 20 },
  { id: "jc2", title: "بازار و مدل کسب‌وکار", max: 20 },
  { id: "jc3", title: "توان تیم مجری", max: 20 },
  { id: "jc4", title: "امکان‌پذیری فنی و مالی", max: 20 },
  { id: "jc5", title: "اثر اجتماعی و اشتغال", max: 20 },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

export type CriterionStat = { id: string; mean?: number; sd: number; n: number; disagree: boolean };
export type PanelStats = {
  perCriterion: CriterionStat[];
  judgeTotals: Record<string, number | undefined>;
  totalMean?: number;
  totalSd: number;
  maxTotal: number;
  complete: string[];
  late: string[];
  pending: string[];
};

export function panelStats(p: JudgePanel, today: string, disagreementPct: number): PanelStats {
  const isDone = (j: string) => p.criteria.every((c) => typeof p.scores[j]?.[c.id] === "number");
  const complete = p.judges.filter(isDone);
  const pending = p.judges.filter((j) => !isDone(j));
  const overdue = dayNum(p.due) !== null && diffDays(today, p.due) < 0;
  const perCriterion = p.criteria.map((c) => {
    const xs = p.judges.map((j) => p.scores[j]?.[c.id]).filter((x): x is number => typeof x === "number");
    const m = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
    const sd = xs.length > 1 && m !== undefined ? Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) : 0;
    return { id: c.id, mean: m === undefined ? undefined : round1(m), sd: round1(sd), n: xs.length, disagree: xs.length > 1 && sd >= (c.max * disagreementPct) / 100 };
  });
  const judgeTotals: Record<string, number | undefined> = {};
  p.judges.forEach((j) => {
    const xs = p.criteria.map((c) => p.scores[j]?.[c.id]);
    judgeTotals[j] = xs.some((x) => typeof x === "number") ? xs.reduce<number>((a, b) => a + (b ?? 0), 0) : undefined;
  });
  const totals = complete.map((j) => judgeTotals[j]!).filter((x) => x !== undefined);
  const tm = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : undefined;
  const tsd = totals.length > 1 && tm !== undefined ? Math.sqrt(totals.reduce((s, x) => s + (x - tm) ** 2, 0) / totals.length) : 0;
  return { perCriterion, judgeTotals, totalMean: tm === undefined ? undefined : round1(tm), totalSd: round1(tsd), maxTotal: p.criteria.reduce((s, c) => s + c.max, 0), complete, pending, late: overdue ? pending : [] };
}

export const DEFAULT_FUND_SETTINGS: FundSettings = { disagreementPct: 20 };

// ----------------------------------------------------------------- پروژه‌ی خوابیده

export type DormantItem = { id: string; kind: "nf" | "employment"; title: string; lastAt?: string; lastText: string; days: number; link: string };

const FUNDED_NF = ["تنظیم قرارداد", "نظارت و راهبری"];
const FUNDED_EMP = ["تخصیص‌یافته", "در حال پایش"];

function latest(cands: { at?: string; text: string }[], today: string): { at?: string; text: string } | undefined {
  let best: { at?: string; text: string; n: number } | undefined;
  for (const c of cands) {
    const raw = c.at && /امروز|هم‌اکنون/.test(c.at) ? today : c.at;
    const d = normDate(raw ?? "");
    const n = d ? dayNum(d) : null;
    if (n === null || n === undefined) continue;
    if (!best || n > best.n) best = { at: d!, text: c.text, n };
  }
  return best;
}

export function lastEventOfNf(p: NfProject, logs: ILog[], today: string) {
  return latest(
    [
      ...p.timeline.map((t) => ({ at: t.date, text: t.text })),
      ...p.reports.filter((r) => r.uploadedAt).map((r) => ({ at: r.uploadedAt, text: `بارگذاری «${r.title}»` })),
      ...p.payments.filter((x) => x.paidAt).map((x) => ({ at: x.paidAt, text: `پرداخت «${x.title}»` })),
      ...p.requests.map((r) => ({ at: r.date, text: `درخواست «${r.type}»` })),
      ...logs.filter((l) => l.subject?.id === p.id).map((l) => ({ at: l.at, text: `${l.actor} ${l.action}` })),
    ],
    today
  );
}

export function lastEventOfEmployment(f: EmploymentFund, logs: ILog[], today: string, importedAt: string) {
  return latest([{ at: importedAt, text: "ورود پرونده به سامانه" }, ...logs.filter((l) => l.subject?.id === f.id).map((l) => ({ at: l.at, text: `${l.actor} ${l.action}` }))], today);
}

/** طرح‌های تأمین‌مالی‌شده‌ای که از آخرین رویدادشان بیش از آستانه گذشته است */
export function dormantFunded(s: Pick<InnStore, "nfProjects" | "employment" | "logs">, today: string, threshold: number, scoped?: { nf: NfProject[]; employment: EmploymentFund[] }): DormantItem[] {
  const t = dayNum(today) ?? 0;
  const out: DormantItem[] = [];
  (scoped?.nf ?? s.nfProjects)
    .filter((p) => FUNDED_NF.includes(p.stage))
    .forEach((p) => {
      const ev = lastEventOfNf(p, s.logs, today);
      const days = ev?.at ? t - (dayNum(ev.at) ?? t) : 9999;
      if (days >= threshold) out.push({ id: p.id, kind: "nf", title: p.titleFa, lastAt: ev?.at, lastText: ev?.text ?? "رویدادی ثبت نشده", days, link: `/dashboard/funds?focus=${p.id}` });
    });
  (scoped?.employment ?? s.employment)
    .filter((f) => FUNDED_EMP.includes(f.stage))
    .forEach((f) => {
      const ev = lastEventOfEmployment(f, s.logs, today, "۱۴۰۵/۰۱/۱۵");
      const days = ev?.at ? t - (dayNum(ev.at) ?? t) : 9999;
      if (days >= threshold) out.push({ id: f.id, kind: "employment", title: f.title, lastAt: ev?.at, lastText: ev?.text ?? "رویدادی ثبت نشده", days, link: `/dashboard/funds?tab=employment&focus=${f.id}` });
    });
  return out.sort((a, b) => b.days - a.days);
}

// ----------------------------------------------------------------- داده‌ی نمونه

function seedForms(s: InnStore): FormDef[] {
  const at = "۱۴۰۵/۰۲/۰۱";
  const forms: FormDef[] = [];
  const call = s.calls.find((c) => c.stage === "فراخوان باز") ?? s.calls[0];
  if (call)
    forms.push({
      id: "fm-call-1",
      ownerKind: "call",
      ownerId: call.id,
      title: `فرم درخواست «${call.title}»`,
      intro: "فقط شرکت‌های دانش‌بنیان با TRL حداقل ۴ می‌توانند درخواست ثبت کنند.",
      fields: [
        { id: "f-app", label: "شرکت متقاضی", type: "entity", required: true, entityKind: "company" },
        { id: "f-summary", label: "خلاصه‌ی پیشنهاده", type: "longText", required: true },
        { id: "f-budget", label: "بودجه‌ی پیشنهادی (ریال)", type: "number", required: true },
        { id: "f-area", label: "محور پیشنهاد", type: "select", options: ["کاهش ضایعات", "بهره‌وری انرژی", "کیفیت محصول", "سایر"] },
        { id: "f-out", label: "خروجی‌های تعهدشده", type: "multi", options: ["گزارش فنی", "نمونه‌ی آزمایشگاهی", "مقاله", "ثبت اختراع"] },
        { id: "f-start", label: "تاریخ شروع پیشنهادی", type: "date" },
        { id: "f-file", label: "فایل پروپوزال", type: "file", required: true },
      ],
      rules: [
        { id: "r-trl", fieldId: "f-app", attr: "trl", op: "gte", value: "4" },
        { id: "r-kb", fieldId: "f-app", attr: "kbType", op: "in", value: KB_ONLY.join("|"), message: "شرکت متقاضی باید دانش‌بنیان باشد (شرکت‌های فناور غیر دانش‌بنیان مشمول این فراخوان نیستند)." },
      ],
      updatedAt: at,
      updatedBy: "پایگاه اطلاع‌رسانی بنیاد",
    });
  const cycle = s.awardCycles.find((c) => c.phase === "ثبت‌نام") ?? s.awardCycles[0];
  if (cycle)
    forms.push({
      id: "fm-award-1",
      ownerKind: "award",
      ownerId: cycle.id,
      title: `فرم تکمیلی «${cycle.title}»`,
      fields: [
        { id: "a-tech", label: "شرکت فناور همکار", type: "entity", entityKind: "company", required: true },
        { id: "a-ceo", label: "تأییدیه‌ی مدیرعامل", type: "file", required: true },
        { id: "a-saving", label: "صرفه‌جویی سالانه (ریال)", type: "number" },
        { id: "a-impl", label: "مرحله‌ی پیاده‌سازی", type: "select", options: ["پایلوت", "استقرار کامل", "تعمیم به سایر شرکت‌ها"], required: true },
      ],
      rules: [
        { id: "r-a-kb", fieldId: "a-tech", attr: "kbType", op: "in", value: KB_ONLY.join("|") },
        { id: "r-a-trl", fieldId: "a-tech", attr: "trl", op: "gte", value: "6", message: "فناوری معرفی‌شده باید حداقل به TRL ۶ (نمونه‌ی عملیاتی) رسیده باشد." },
      ],
      updatedAt: at,
      updatedBy: "دبیرخانه جایزه",
    });
  return forms;
}

function seedPanels(s: InnStore): JudgePanel[] {
  const out: JudgePanel[] = [];
  const emp = s.employment.find((f) => f.stage === "داوری");
  if (emp)
    out.push({
      id: "jp-emp-1",
      subjectKind: "employment",
      subjectId: emp.id,
      subjectTitle: emp.title,
      judges: ["دکتر یاسمن روشن", "دکتر نگین فرهمند", "محسن مردعلی", "دکتر آرین صدرا"],
      criteria: defaultCriteria(),
      scores: {
        "دکتر یاسمن روشن": { jc1: 14, jc2: 16, jc3: 15, jc4: 12, jc5: 18 },
        "دکتر نگین فرهمند": { jc1: 15, jc2: 7, jc3: 16, jc4: 13, jc5: 17 },
        "محسن مردعلی": { jc1: 13, jc2: 17, jc3: 14, jc4: 15, jc5: 19 },
      },
      due: "۱۴۰۵/۰۳/۰۴",
      reminders: [],
      createdAt: "۱۴۰۵/۰۲/۲۰",
    });
  const nf = s.nfProjects.find((p) => p.stage === "تنظیم قرارداد");
  if (nf)
    out.push({
      id: "jp-nf-1",
      subjectKind: "nf",
      subjectId: nf.id,
      subjectTitle: nf.titleFa,
      judges: ["دکتر آرین صدرا", "دکتر یاسمن روشن", "دکتر نگین فرهمند"],
      criteria: defaultCriteria(),
      scores: {
        "دکتر آرین صدرا": { jc1: 18, jc2: 15, jc3: 16, jc4: 15, jc5: 12 },
        "دکتر یاسمن روشن": { jc1: 17, jc2: 14, jc3: 17, jc4: 14, jc5: 11 },
        "دکتر نگین فرهمند": { jc1: 16, jc2: 15, jc3: 15, jc4: 16, jc5: 13 },
      },
      due: "۱۴۰۴/۱۰/۱۵",
      reminders: [],
      createdAt: "۱۴۰۴/۱۰/۰۱",
    });
  return out;
}

const SEED_GUARANTEES: Record<string, ContractGuarantee[]> = {
  ct1: [
    { id: "g-ct1-1", kind: "حسن انجام کار", bank: "بانک ملت", amount: 420_000_000, number: "ض-۸۸۴۱۲", issuedAt: "۱۴۰۵/۰۱/۲۹", expiry: "۱۴۰۵/۰۳/۱۲", status: "معتبر" },
    { id: "g-ct1-2", kind: "پیش‌پرداخت", bank: "بانک ملت", amount: 840_000_000, number: "ض-۸۸۴۱۳", issuedAt: "۱۴۰۵/۰۱/۲۹", expiry: "۱۴۰۵/۰۶/۲۰", status: "معتبر" },
  ],
  ct2: [{ id: "g-ct2-1", kind: "حسن انجام کار", bank: "بانک سپه", amount: 90_000_000, number: "ض-۵۵۰۱۷", issuedAt: "۱۴۰۵/۰۳/۰۱", expiry: "۱۴۰۵/۰۴/۰۲", status: "معتبر" }],
  ct5: [{ id: "g-ct5-1", kind: "پیش‌پرداخت", bank: "بانک کشاورزی", amount: 300_000_000, number: "ض-۷۰۲۲۵", issuedAt: "۱۴۰۵/۰۲/۰۱", expiry: "۱۴۰۵/۰۴/۲۸", status: "معتبر" }],
};

function seedContractExtras(c: Contract): Contract {
  if (c.templateId || c.guarantees || c.ip) return c;
  const g = SEED_GUARANTEES[c.id];
  const base: Contract = { ...c, guarantees: g ?? [] };
  if (c.id === "ct1" || c.id === "ct5") {
    const tplId = c.type === "خدماتی" ? "tpl-service" : "tpl-tech";
    const vars = autoVars(c);
    const t = seedTemplates().find((x) => x.id === tplId)!;
    let body = fillTemplate(t.body, vars);
    // نمونه‌ی «انحراف از متن استاندارد»: تغییر ماده‌ی حسن انجام کار در ct5
    if (c.id === "ct5") body = body.replace("ده درصد", "پنج درصد").concat("\nماده ۸ — تبصره‌ی الحاقی: پرداخت قسط آخر منوط به تأیید سازمان جهاد کشاورزی استان است.");
    return { ...base, templateId: tplId, templateVars: vars, body, ip: c.id === "ct5" ? { owner: "مشترک", ownerShare: 60, usageRight: "انحصاری برای هلدینگ‌های بنیاد تا ۵ سال", revenueShare: 15, notes: "سهم بنیاد از مالکیت ۶۰٪" } : { owner: "بنیاد", usageRight: "انحصاری و دائمی", revenueShare: 0 } };
  }
  return base;
}

/** رویدادهای پایش اخیر برای طرح‌های تأمین‌شده تا فقط یکی-دو طرح واقعاً «خوابیده» دیده شوند */
function seedMonitoringLogs(s: InnStore): ILog[] {
  const recent = ["۱۴۰۵/۰۲/۲۸", "۱۴۰۵/۰۳/۰۲", "۱۴۰۵/۰۳/۰۵", "۱۴۰۵/۰۲/۲۰", "۱۴۰۵/۰۳/۰۶"];
  const actions = ["گزارش پیشرفت دوره‌ای را ثبت کرد", "بازدید میدانی را ثبت کرد", "صورت‌جلسه‌ی کمیته‌ی پایش را بارگذاری کرد"];
  const nf = s.nfProjects.filter((p) => FUNDED_NF.includes(p.stage));
  const emp = s.employment.filter((f) => FUNDED_EMP.includes(f.stage));
  // آخرین طرحِ هر فهرست عمداً بی‌رویداد می‌ماند (نمونه‌ی هشدار)
  const subjects = [...nf.slice(0, -1).map((p) => ({ id: p.id, title: p.titleFa, module: "funds" as const })), ...emp.slice(0, -1).map((f) => ({ id: f.id, title: f.title, module: "funds" as const }))];
  const base = Math.max(0, ...s.logs.map((l) => l.seq));
  return subjects.map((x, i) => ({ id: `ilog-mon-${x.id}`, seq: base + i + 1, at: recent[i % recent.length], actor: "کارشناس پایش صندوق", module: x.module, action: actions[i % actions.length], subject: { id: x.id, title: x.title } }));
}

/** تکمیل داده‌ی ذخیره‌شده با فیلدهای تازه (یک بار) — داده‌ی کاربر دست نمی‌خورد */
export function ensureExtras(s: InnStore): InnStore {
  if ((s.extrasVersion ?? 0) >= EXTRAS_VERSION) return { ...s, forms: s.forms ?? [], judging: s.judging ?? [], fundSettings: s.fundSettings ?? DEFAULT_FUND_SETTINGS, contractTemplates: s.contractTemplates ?? seedTemplates() };
  return {
    ...s,
    forms: s.forms?.length ? s.forms : seedForms(s),
    judging: s.judging?.length ? s.judging : seedPanels(s),
    fundSettings: s.fundSettings ?? DEFAULT_FUND_SETTINGS,
    contractTemplates: s.contractTemplates?.length ? s.contractTemplates : seedTemplates(),
    contracts: (s.extrasVersion ?? 0) >= 1 ? s.contracts : s.contracts.map(seedContractExtras),
    logs: [...s.logs, ...seedMonitoringLogs(s)],
    extrasVersion: EXTRAS_VERSION,
  };
}

/** عدد از ورودی فارسی/انگلیسی */
export const parseNum = (s: string) => Number(toEnDigits(s).replace(/[^\d.]/g, "")) || 0;
