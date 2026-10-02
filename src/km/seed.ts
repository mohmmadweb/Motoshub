// ---------------------------------------------------------------------------
// داده‌ی نمونه‌ی مدیریت دانش — از روی داده‌های قبلی (بانک دانش، سندهای فرصت R&D،
// شناسنامه‌ها) ساخته شده و با فرآیندها، تجربیات، خبرگان و واژه‌نامه کامل شده است.
// ---------------------------------------------------------------------------
import { knowledgeDocs, users } from "../data/mock";
import { rndOpportunityDocs, supportedProducts, supportedVentures, partnerTechnologists } from "../data/mockDaneshmand";
import { withDemoScopes } from "../data/tenancy";
import { DEMO_REF_DATE } from "../pm/seed";
import { addDays } from "../pm/jalali";
import type { Experience, Expert, GlossaryTerm, KCategory, KDoc, KDocType, KLog, KProcess, KSavedSearch, KSettings, KWfTemplate, RegistryItem, RegistryType, RndDoc } from "./types";
import { DEFAULT_ACCESS_POLICY } from "./access";

export const KM_TODAY = DEMO_REF_DATE;

export const seedCategories = (): KCategory[] => [
  { id: "cat-legal", name: "حقوقی و قراردادها" },
  { id: "cat-contracts", name: "آرشیو قراردادها", parentId: "cat-legal" },
  { id: "cat-regs", name: "آیین‌نامه‌ها و بخشنامه‌ها", parentId: "cat-legal" },
  { id: "cat-gov", name: "حاکمیت و جلسات" },
  { id: "cat-minutes", name: "آرشیو مصوبات و جلسات", parentId: "cat-gov" },
  { id: "cat-km", name: "مدیریت دانش" },
  { id: "cat-training", name: "مستندات آموزشی", parentId: "cat-km" },
  { id: "cat-reports", name: "گزارش‌های عملکرد", parentId: "cat-km" },
  { id: "cat-ops", name: "عملیات و فرآیندها" },
  { id: "cat-procedures", name: "دستورالعمل‌ها و روش‌های اجرایی", parentId: "cat-ops" },
  { id: "cat-forms", name: "فرم‌ها و فایل‌های سازمانی", parentId: "cat-ops" },
  { id: "cat-tech", name: "مستندات فنی" },
];

export const seedDocTypes = (): KDocType[] => [
  { id: "dt-instruction", name: "دستورالعمل", color: "#1f4f99" },
  { id: "dt-regulation", name: "آیین‌نامه", color: "#7c3aed" },
  { id: "dt-circular", name: "بخشنامه", color: "#0d9488" },
  { id: "dt-procedure", name: "روش اجرایی", color: "#0f172a" },
  { id: "dt-tech", name: "مستندات فنی", color: "#475569" },
  { id: "dt-report", name: "گزارش", color: "#2a66bd" },
  { id: "dt-form", name: "فرم", color: "#b45309" },
  { id: "dt-contract", name: "قرارداد", color: "#d97706" },
  { id: "dt-training", name: "آموزشی", color: "#059669" },
  { id: "dt-minutes", name: "صورت‌جلسه", color: "#64748b" },
  { id: "dt-other", name: "سایر", color: "#94a3b8" },
];

const catByLegacy: Record<string, string> = {
  "آرشیو قراردادها": "cat-contracts",
  "مستندات آموزشی": "cat-training",
  "آرشیو مصوبات و جلسات": "cat-minutes",
  "مدیریت دانش": "cat-reports",
};

const unitOf = (owner: string) => (owner.includes("حقوقی") ? "واحد حقوقی" : owner.includes("دبیرخانه") ? "دبیرخانه" : owner.includes("علوی") ? "بنیاد علوی" : owner.includes("پایگاه") ? "پایگاه اطلاع‌رسانی" : "معاونت برنامه‌ریزی");
const extOf = (title: string, type: string) => (type === "قرارداد" || type === "صورت‌جلسه" ? "pdf" : type === "آموزشی" ? "docx" : title.includes("گزارش") ? "pdf" : "docx");

function baseDocs(): KDoc[] {
  const scoped = withDemoScopes(knowledgeDocs, 4);
  return scoped.map((d, i) => {
    const ext = extOf(d.title, d.type);
    const file = { id: `f-${d.id}`, name: `${d.title}.${ext}`, size: d.size, ext };
    const version = (i % 3) + 1;
    const statuses: KDoc["status"][] = ["منتشرشده", "منتشرشده", "منتشرشده", "در بررسی", "منتشرشده", "تأییدشده", "منتشرشده", "پیش‌نویس", "منتشرشده", "ارجاع برای اصلاح"];
    const status = statuses[i % statuses.length];
    const reviewOffsets = [120, 5, -3, 60, 25, 200, 14, 90, 2, 45];
    return {
      id: d.id,
      title: d.title,
      code: `KM-${1404 + (i % 2)}-${String(101 + i).padStart(4, "0")}`,
      type: d.type,
      categoryId: catByLegacy[d.category] ?? "cat-reports",
      tags: d.type === "قرارداد" ? ["قرارداد", "حقوقی"] : d.type === "آموزشی" ? ["آموزش", "راهنما"] : d.type === "صورت‌جلسه" ? ["مصوبه"] : ["گزارش"],
      unit: unitOf(d.owner),
      owner: d.owner,
      author: d.owner,
      createdAt: "۱۴۰۴/۱۱/۱۵",
      updatedAt: d.updatedAt,
      version,
      status,
      access: d.visibility === "عمومی" ? "عمومی" : i % 2 ? "محرمانه" : "داخلی",
      description: `${d.title} — سند مرجع ${unitOf(d.owner)} در موضوع خود. تغییرات این سند از طریق نسخه‌بندی و گردش کار همین صفحه منتشر می‌شود.`,
      files: [file],
      reviewDate: addDays(KM_TODAY, reviewOffsets[i % reviewOffsets.length]),
      versions: Array.from({ length: version }, (_, v) => ({ version: v + 1, date: v + 1 === version ? d.updatedAt : "۱۴۰۴/۱۲/۰۱", by: v + 1 === version ? d.owner : "دبیرخانه", note: v === 0 ? "ایجاد سند" : `بازنگری ${v}`, files: [file] })),
      workflow:
        status === "پیش‌نویس"
          ? []
          : [
              { id: `wf-${d.id}-1`, action: "ارسال برای بررسی", from: "پیش‌نویس", to: "در بررسی", by: d.owner, at: "۱۴۰۵/۰۱/۱۰" },
              ...(status === "در بررسی" ? [] : status === "ارجاع برای اصلاح" ? [{ id: `wf-${d.id}-2`, action: "ارجاع برای اصلاح", from: "در بررسی" as const, to: "ارجاع برای اصلاح" as const, by: "پایگاه اطلاع‌رسانی بنیاد", at: "۱۴۰۵/۰۳/۰۲", note: "پیوست جدول هزینه‌ها ناقص است." }] : [{ id: `wf-${d.id}-2`, action: "تأیید", from: "در بررسی" as const, to: "تأییدشده" as const, by: "پایگاه اطلاع‌رسانی بنیاد", at: "۱۴۰۵/۰۱/۱۵" }]),
              ...(status === "منتشرشده" ? [{ id: `wf-${d.id}-3`, action: "انتشار", from: "تأییدشده" as const, to: "منتشرشده" as const, by: "پایگاه اطلاع‌رسانی بنیاد", at: "۱۴۰۵/۰۱/۱۶" }] : []),
            ],
      approvers: ["پایگاه اطلاع‌رسانی بنیاد", ...(i % 2 ? ["محسن مردعلی"] : [])],
      relations: [],
      views: [320, 145, 88, 410, 260, 190, 72, 35, 155, 60][i % 10],
      downloads: [120, 40, 20, 150, 90, 70, 12, 4, 45, 10][i % 10],
      ratings: [
        { by: "وحید خاوئی", score: 4 + (i % 2) },
        { by: "محسن مردعلی", score: 4 },
      ],
      feedback: [
        { by: "وحید خاوئی", helpful: true },
        ...(i % 4 === 0 ? [{ by: "حسین دهقان", helpful: false, reason: "بخش جدول‌ها قدیمی است" }] : []),
      ],
      comments: i === 0 ? [{ id: "kc1", author: "محسن مردعلی", text: "بند ۴ با آیین‌نامه‌ی جدید معاملات هماهنگ شود.", at: "۱۴۰۵/۰۲/۰۵ ۱۰:۱۵", kind: "پیشنهاد اصلاح" }] : [],
      followers: i % 3 === 0 ? ["وحید خاوئی"] : [],
      importance: i % 5 === 0 ? "حیاتی" : i % 2 ? "مهم" : "عادی",
      scope: d.scope,
      holdingId: d.holdingId,
      companyId: d.companyId,
      authorId: d.authorId,
    };
  });
}

// -------------------------------- شناسنامه‌ها --------------------------------
export const seedRegistryTypes = (): RegistryType[] => [
  { id: "rt-product", name: "محصول و فناوری حمایت‌شده", description: "محصولات و فناوری‌هایی که بنیاد از آن‌ها حمایت کرده است", builtin: true, fields: [
    { key: "company", label: "شرکت / تیم", kind: "text" },
    { key: "trl", label: "سطح آمادگی فناوری (TRL)", kind: "number" },
    { key: "status", label: "وضعیت", kind: "text" },
  ] },
  { id: "rt-venture", name: "واحد دانش‌بنیان حمایت‌شده", description: "شرکت‌ها و تیم‌های دانش‌بنیان تحت حمایت", builtin: true, fields: [
    { key: "supportType", label: "نوع حمایت", kind: "select", options: ["قرارداد فناورانه", "بذرمایه", "سرمایه خطرپذیر"] },
    { key: "field", label: "حوزه", kind: "text" },
    { key: "year", label: "سال حمایت", kind: "text" },
  ] },
  { id: "rt-tech", name: "فناور همکار", description: "فناوران و شرکت‌های همکار بنیاد", builtin: true, fields: [
    { key: "expertise", label: "تخصص", kind: "text" },
    { key: "projects", label: "پروژه‌های مشترک", kind: "number" },
    { key: "rating", label: "امتیاز همکاری", kind: "number" },
  ] },
  { id: "rt-process", name: "شناسنامه فرآیند", description: "مشخصات رسمی هر فرآیند سازمانی", builtin: true, fields: [
    { key: "code", label: "کد فرآیند", kind: "text" },
    { key: "kind", label: "نوع", kind: "select", options: ["اصلی", "پشتیبان", "مدیریتی"] },
    { key: "kpi", label: "شاخص عملکرد", kind: "text" },
  ] },
  { id: "rt-service", name: "شناسنامه خدمت", description: "خدمات قابل ارائه به ذی‌نفعان", builtin: true, fields: [
    { key: "audience", label: "گیرنده‌ی خدمت", kind: "text" },
    { key: "sla", label: "زمان ارائه (روز)", kind: "number" },
    { key: "channel", label: "کانال ارائه", kind: "select", options: ["حضوری", "الکترونیکی", "ترکیبی"] },
  ] },
  { id: "rt-job", name: "شناسنامه شغل", description: "شرح وظایف، شایستگی‌ها و آموزش‌های لازم هر شغل", builtin: true, fields: [
    { key: "level", label: "رده‌ی شغلی", kind: "text" },
    { key: "competencies", label: "شایستگی‌های کلیدی", kind: "textarea" },
    { key: "courses", label: "آموزش‌های الزامی", kind: "textarea" },
  ] },
  { id: "rt-unit", name: "شناسنامه واحد سازمانی", description: "مأموریت، ساختار و مسئولیت‌های واحدها", builtin: true, fields: [
    { key: "mission", label: "مأموریت", kind: "textarea" },
    { key: "head", label: "مدیر واحد", kind: "text" },
    { key: "staff", label: "تعداد نیرو", kind: "number" },
  ] },
  { id: "rt-system", name: "شناسنامه سیستم", description: "سامانه‌های نرم‌افزاری و زیرساختی", builtin: true, fields: [
    { key: "vendor", label: "توسعه‌دهنده / پیمانکار", kind: "text" },
    { key: "version", label: "نسخه", kind: "text" },
    { key: "golive", label: "تاریخ بهره‌برداری", kind: "date" },
  ] },
  { id: "rt-docs", name: "شناسنامه مستندات", description: "مجموعه‌ی مستندات یک موضوع یا پروژه", builtin: true, fields: [
    { key: "count", label: "تعداد اسناد", kind: "number" },
    { key: "custodian", label: "متولی", kind: "text" },
  ] },
];

export function seedRegistry(): RegistryItem[] {
  const base = (id: string, typeId: string, title: string, values: Record<string, string>, owner = "پایگاه اطلاع‌رسانی بنیاد", unit = "معاونت فناوری"): RegistryItem => ({ id, typeId, title, owner, unit, updatedAt: "۱۴۰۵/۰۲/۲۰", values, description: "", files: [], relations: [] });
  return [
    ...supportedProducts.map((p) => base(p.id, "rt-product", p.name, { company: p.company, trl: String(p.trl), status: p.status })),
    ...supportedVentures.map((v) => base(v.id, "rt-venture", v.name, { supportType: v.supportType, field: v.field, year: v.year })),
    ...partnerTechnologists.map((t) => base(t.id, "rt-tech", t.name, { expertise: t.expertise, projects: String(t.projects), rating: String(t.rating) })),
    base("rg-p1", "rt-process", "فرآیند ثبت و پیگیری طرح‌های اشتغال خرد", { code: "PR-OPS-07", kind: "اصلی", kpi: "زمان تصویب طرح ≤ ۲۰ روز" }, "بنیاد علوی", "بنیاد علوی"),
    base("rg-s1", "rt-service", "خدمت ثبت‌نام در فراخوان‌های پژوهشی", { audience: "پژوهشگران و شرکت‌های دانش‌بنیان", sla: "۵", channel: "الکترونیکی" }),
    base("rg-j1", "rt-job", "کارشناس مدیریت دانش", { level: "کارشناس", competencies: "مستندسازی، تحلیل فرآیند، مصاحبه‌ی خبرگی", courses: "مبانی مدیریت دانش، نگارش سند سازمانی" }),
    base("rg-u1", "rt-unit", "پایگاه اطلاع‌رسانی بنیاد", { mission: "راهبری سامانه‌های ارتباطی و دانشی بنیاد", head: "پایگاه اطلاع‌رسانی بنیاد", staff: "۱۴" }),
    base("rg-y1", "rt-system", "سامانه جامع مدیریت دانش (موتوشاب)", { vendor: "تیم سامانه", version: "۲.۱", golive: "۱۴۰۵/۰۴/۱۵" }),
  ];
}

export function seedRnd(): RndDoc[] {
  const topicsFor: Record<string, string[]> = {
    "دشت ناز ساری": ["پهپاد سمپاش هوشمند", "پایش سلامت دام با IoT", "بهینه‌سازی آبیاری"],
    "بهنوش ایران": ["فرمولاسیون نوشیدنی بدون قند", "بسته‌بندی زیست‌تخریب‌پذیر"],
    "بانک سینا": ["احراز هویت دیجیتال", "تشخیص تقلب با یادگیری ماشین"],
  };
  return rndOpportunityDocs.map((d, i) => ({
    ...d,
    lead: ["دکتر یاسمن روشن", "مهندس کیان راستین", "دکتر آرین صدرا"][i % 3],
    startDate: addDays(KM_TODAY, -120 + i * 7),
    topics: topicsFor[d.company] ?? ["بهینه‌سازی مصرف انرژی", "هوشمندسازی خط تولید"],
    files: d.progress >= 45 ? [{ id: `rf-${d.id}`, name: `سند فرصت‌های R&D — ${d.company}.pdf`, size: "۱.۸ مگابایت", ext: "pdf" }] : [],
    notes: "",
    history: [{ at: addDays(KM_TODAY, -30), by: "دکتر یاسمن روشن", text: `وضعیت به «${d.statusLabel}» رسید.` }],
  }));
}

export const seedProcesses = (): KProcess[] => [
  { id: "kp1", name: "ثبت و پیگیری طرح‌های اشتغال خرد", code: "PR-OPS-07", kind: "اصلی", owner: "بنیاد علوی", unit: "بنیاد علوی", description: "از دریافت درخواست متقاضی تا تأمین مالی و پایش طرح.", inputs: ["درخواست متقاضی", "استعلام دهیاری"], outputs: ["قرارداد تسهیلات", "گزارش پایش"], steps: ["دریافت درخواست", "ارزیابی اولیه", "بازدید میدانی", "تصویب در کمیته", "انعقاد قرارداد", "پایش دوره‌ای"], relations: [{ type: "doc", id: "d5" }, { type: "registry", id: "rg-p1" }, { type: "expert", id: "ex-u5" }] },
  { id: "kp2", name: "تدوین و انتشار سند سازمانی", code: "PR-KM-01", kind: "پشتیبان", owner: "پایگاه اطلاع‌رسانی بنیاد", unit: "پایگاه اطلاع‌رسانی", description: "چرخه‌ی ایجاد، بررسی، تأیید، انتشار و بازبینی دوره‌ای اسناد.", inputs: ["پیش‌نویس سند"], outputs: ["سند منتشرشده در مخزن"], steps: ["ایجاد سند", "بررسی اولیه", "تأیید مسئول", "انتشار", "بازبینی دوره‌ای"], relations: [{ type: "doc", id: "d6" }] },
  { id: "kp3", name: "برنامه‌ریزی راهبردی سالانه", code: "PR-MG-02", kind: "مدیریتی", owner: "معاونت برنامه‌ریزی", unit: "معاونت برنامه‌ریزی", description: "تدوین اهداف و بودجه‌ی سالانه‌ی هلدینگ‌ها.", inputs: ["گزارش عملکرد سال قبل", "سیاست‌های هیئت امنا"], outputs: ["برنامه‌ی عملیاتی سالانه"], steps: ["تحلیل وضع موجود", "تعیین اهداف", "تخصیص بودجه", "تصویب در هیئت عامل"], relations: [{ type: "doc", id: "d7" }] },
];

export function seedExperiences(): Experience[] {
  const e = (x: Partial<Experience> & Pick<Experience, "id" | "kind" | "title" | "body" | "author">): Experience => ({ unit: "بنیاد علوی", tags: [], status: "منتشرشده", date: "۱۴۰۵/۰۲/۱۰", relations: [], helpful: 0, comments: [], ...x });
  return [
    e({ id: "xp1", kind: "درس‌آموخته", title: "تأخیر در تأمین لوله با قرارداد دوم جبران شد", body: "وابستگی به یک تأمین‌کننده، زیرساخت آب‌رسانی را دو هفته عقب انداخت.", author: "محسن مردعلی", projectId: "pr1", problem: "تأمین‌کننده‌ی اصلی لوله در موعد تحویل نداد و اجرای شبکه متوقف شد.", cause: "نبود تأمین‌کننده‌ی جایگزین و پیش‌خرید اقلام بحرانی.", action: "قرارداد با تأمین‌کننده‌ی دوم و پیش‌خرید ۳۰٪ اقلام.", result: "۱۰ روز از تأخیر جبران شد؛ هزینه ۸٪ افزایش یافت.", future: "برای اقلام بحرانی از ابتدا دو تأمین‌کننده و پیش‌خرید در نظر گرفته شود.", tags: ["تدارکات", "ریسک"], helpful: 12 }),
    e({ id: "xp2", kind: "درس‌آموخته", title: "کدگذاری فایل‌های قدیمی پیش از مهاجرت بررسی شود", body: "۱۸٪ فایل‌های بایگانی قدیمی با Windows-1256 ذخیره شده بودند.", author: "مهندس بردیا کوشا", unit: "تیم سامانه", projectId: "pr2", problem: "مهاجرت داده متوقف شد؛ متن فارسی خراب می‌شد.", cause: "کدگذاری ناهمگون در سامانه‌ی قدیمی.", action: "اسکریپت تبدیل کدگذاری و نمونه‌گیری پیش از مهاجرت.", result: "مهاجرت با ۰٫۲٪ خطا انجام شد.", future: "در هر پروژه‌ی مهاجرت، پروفایل داده (کدگذاری، فرمت) در هفته‌ی اول تهیه شود.", tags: ["توسعه", "داده"], helpful: 7 }),
    e({ id: "xp3", kind: "Best Practice", title: "جلسه‌ی هفتگی ۱۵ دقیقه‌ای با دهیاری‌ها", body: "هماهنگی کوتاه و منظم با دهیاری‌ها، رفت‌وبرگشت مکاتبات را نصف کرد.", author: "وحید خاوئی", projectId: "pr1", tags: ["ذی‌نفعان"], helpful: 9 }),
    e({ id: "xp4", kind: "راهکار حل مشکل", title: "انشعاب برق موقت برای کارگاه‌ها", body: "تا نصب انشعاب دائم، از ژنراتور اجاره‌ای با قرارداد ماهانه استفاده شد.", author: "تیم عمرانی", projectId: "pr1", tags: ["عمرانی"], helpful: 4 }),
    e({ id: "xp5", kind: "تجربه ناموفق", title: "فراخوان بدون معیار داوری شفاف", body: "در فراخوان اول، نبود معیار داوری از پیش اعلام‌شده به اعتراض ۱۲ تیم انجامید.", author: "دکتر یاسمن روشن", unit: "صندوق نوآوری", tags: ["فراخوان", "داوری"], helpful: 15 }),
    e({ id: "xp6", kind: "نکته تخصصی", title: "سنجش TRL پیش از قرارداد فناورانه", body: "پیش از هر قرارداد فناورانه، TRL با چک‌لیست نه‌سطحی و بازدید میدانی سنجیده شود.", author: "دکتر آرین صدرا", unit: "معاونت فناوری", tags: ["TRL", "قرارداد"], helpful: 6 }),
    e({ id: "xp7", kind: "پرسش و پاسخ", title: "ارزش‌گذاری دارایی مازاد با کدام روش؟", body: "پاسخ: برای املاک، روش مقایسه‌ای با سه کارشناس رسمی؛ برای هتل‌ها روش درآمدی.", author: "واحد حقوقی", unit: "واحد حقوقی", projectId: "pr3", tags: ["ارزش‌گذاری"], helpful: 3 }),
    e({ id: "xp8", kind: "تجربه موفق", title: "مستندسازی هم‌زمان با اجرا", body: "ثبت صورت‌جلسه و تصمیم‌ها در همان روز، تهیه‌ی گزارش پایان پروژه را از ۳ هفته به ۴ روز رساند.", author: "پایگاه اطلاع‌رسانی بنیاد", unit: "پایگاه اطلاع‌رسانی", status: "در بررسی", tags: ["مستندسازی"], helpful: 0 }),
  ];
}

export function seedExperts(): Expert[] {
  const fromUsers = users
    .filter((u) => u.skills && u.skills.length)
    .map((u) => ({ id: `ex-${u.id}`, name: u.name, unit: u.org ?? "—", title: u.role, areas: u.skills ?? [], experience: `${u.role} در ${u.org}`, topics: u.skills ?? [], relations: [], userId: u.id }));
  const extra: Expert[] = [
    { id: "ex-u5", name: "محسن مردعلی", unit: "بنیاد علوی", title: "قائم‌مقام بنیاد علوی", areas: ["محرومیت‌زدایی", "مدیریت پروژه‌های عمرانی"], experience: "۱۸ سال مدیریت طرح‌های آبادانی در مناطق کم‌برخوردار", topics: ["اشتغال خرد", "آب‌رسانی روستایی"], relations: [{ type: "project", id: "pr1" }, { type: "process", id: "kp1" }], userId: "u5" },
    { id: "ex-u4", name: "وحید خاوئی", unit: "بنیاد علوی", title: "مدیرعامل بنیاد علوی", areas: ["توانمندسازی", "تحول دیجیتال"], experience: "راهبری برنامه‌های توانمندسازی و استقرار سامانه‌ی دانش", topics: ["کارگاه‌های اشتغال", "مدیریت دانش"], relations: [{ type: "project", id: "pr2" }], userId: "u4" },
  ];
  return [...extra, ...fromUsers.filter((x) => !extra.some((e) => e.userId === x.userId))];
}

export const seedGlossary = (): GlossaryTerm[] => [
  { id: "g1", term: "سطح آمادگی فناوری", abbr: "TRL", english: "Technology Readiness Level", definition: "مقیاس ۱ تا ۹ برای سنجش بلوغ یک فناوری، از ایده‌ی پایه تا بهره‌برداری تجاری.", unit: "معاونت فناوری", relations: [{ type: "registry", id: "sp1" }] },
  { id: "g2", term: "درخواست پیشنهاد", abbr: "RFP", english: "Request for Proposal", definition: "سند فراخوانی که نیاز فناورانه‌ی سازمان و معیارهای انتخاب مجری را اعلام می‌کند.", unit: "معاونت فناوری", relations: [] },
  { id: "g3", term: "بذرمایه", english: "Seed Funding", definition: "حمایت مالی مراحل اولیه‌ی یک تیم یا شرکت نوپا برای رسیدن به نمونه‌ی اولیه.", unit: "صندوق نوآوری", relations: [] },
  { id: "g4", term: "صورت‌وضعیت", definition: "گزارش دوره‌ای کارهای انجام‌شده‌ی پیمانکار که مبنای پرداخت قرار می‌گیرد.", unit: "واحد مالی", relations: [] },
  { id: "g5", term: "درس‌آموخته", english: "Lesson Learned", definition: "دانشی که از تجربه‌ی واقعی یک پروژه یا فرآیند به دست آمده و باید در آینده به کار گرفته شود.", unit: "پایگاه اطلاع‌رسانی", relations: [{ type: "lesson", id: "xp1" }] },
  { id: "g6", term: "شاخص کلیدی عملکرد", abbr: "KPI", english: "Key Performance Indicator", definition: "معیار کمی برای سنجش میزان تحقق یک هدف سازمانی.", unit: "معاونت برنامه‌ریزی", relations: [] },
];

export const seedSettings = (): KSettings => ({
  workflows: seedWorkflows(),
  delegations: [{ id: "dl1", from: "حسین دهقان", to: "پایگاه اطلاع‌رسانی بنیاد", until: addDays(KM_TODAY, 12), note: "مأموریت خارج از کشور" }],
  accessPolicy: structuredClone(DEFAULT_ACCESS_POLICY),
  units: ["پایگاه اطلاع‌رسانی", "واحد حقوقی", "دبیرخانه", "بنیاد علوی", "معاونت برنامه‌ریزی", "معاونت فناوری", "صندوق نوآوری", "واحد مالی", "تیم سامانه"],
  tags: ["قرارداد", "حقوقی", "آموزش", "راهنما", "مصوبه", "گزارش", "تدارکات", "ریسک", "TRL", "فراخوان"],
  workflowSteps: { review: true, approve: true, publish: true },
  defaultApprovers: ["پایگاه اطلاع‌رسانی بنیاد"],
  reviewPeriodDays: 365,
  interests: { "وحید خاوئی": ["cat-training", "cat-reports"], "محسن مردعلی": ["cat-contracts"] },
});

// ---------------------------------------------------------------------------
// بند ۹: قالب‌های گردش کار چندمرحله‌ای
// ---------------------------------------------------------------------------
export const seedWorkflows = (): KWfTemplate[] => [
  {
    id: "wf-default",
    name: "گردش کار پیش‌فرض اسناد",
    docTypes: [],
    steps: [
      { id: "s-review", name: "بررسی اولیه", kind: "review", approver: { kind: "role", id: "r2" }, slaDays: 3, substitute: "پایگاه اطلاع‌رسانی بنیاد" },
      { id: "s-approve", name: "تأیید مسئول واحد", kind: "approve", approver: { kind: "scopeManager" }, slaDays: 5 },
      { id: "s-publish", name: "انتشار در مخزن", kind: "publish", approver: { kind: "user", id: "پایگاه اطلاع‌رسانی بنیاد" }, slaDays: 2 },
    ],
  },
  {
    id: "wf-legal",
    name: "اسناد حقوقی و مقرراتی",
    docTypes: ["آیین‌نامه", "بخشنامه", "قرارداد", "دستورالعمل"],
    steps: [
      { id: "l-legal", name: "بررسی حقوقی", kind: "review", approver: { kind: "user", id: "محسن مردعلی" }, slaDays: 4, substitute: "وحید خاوئی" },
      { id: "l-unit", name: "تأیید مدیر واحد", kind: "approve", approver: { kind: "scopeManager" }, slaDays: 5 },
      { id: "l-deputy", name: "تأیید نهایی معاونت", kind: "approve", approver: { kind: "role", id: "r1" }, slaDays: 3 },
      { id: "l-publish", name: "انتشار و ابلاغ", kind: "publish", approver: { kind: "user", id: "پایگاه اطلاع‌رسانی بنیاد" }, slaDays: 1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// متن استخراج‌شده‌ی فایل‌ها (نمایه‌ی تمام‌متن نمونه). صفحه‌ها با \f جدا می‌شوند.
// چند نویسه‌ی عربی (ي/ك) و رقم لاتین عمداً آمده تا نرمال‌سازی جستجو دیده شود.
// ---------------------------------------------------------------------------
function docText(type: string, title: string, owner: string, v: number): string {
  const head = `${title}\nتهیه‌کننده: ${owner}\nنسخه‌ی ${v.toLocaleString("fa-IR")}`;
  if (type === "قرارداد")
    return [
      `${head}\n\nماده ۱ — موضوع\nموضوع این سند، تعیین چارچوب همکاری طرفین و سازوکار واگذاری دارایی‌های مازاد بنیاد است.\nماده ۲ — مدت\nمدت اعتبار از تاریخ امضا به مدت ${v > 1 ? "سه" : "دو"} سال شمسی است.`,
      `ماده 3 — تعهدات طرفین\nطرف دوم متعهد است کليه‌ی معاملات را مطابق آیین‌نامه معاملات بنیاد انجام دهد.\nارزش‌گذاری اموال با روش مقایسه‌ای و نظر سه کارشناس رسمی دادگستری انجام می‌شود.${v > 1 ? "\nگزارش ارزش‌گذاری هر شش ماه یک‌بار به‌روزرسانی می‌شود." : ""}`,
      `ماده ۴ — حل اختلاف\nاختلافات ابتدا از طریق مذاکره و در صورت عدم توافق از طریق داوری مرضی‌الطرفین حل می‌شود.\nماده ۵ — محرمانگی\nاطلاعات مالی طرفین محرمانه است و افشای آن ممنوع است.`,
    ].join("\f");
  if (type === "آموزشی")
    return [
      `${head}\n\nفصل اول — آشنایی\nاین راهنما گام‌به‌گام شیوه‌ی استفاده از سامانه را برای کارکنان توضیح می‌دهد.\nمخاطب: همه‌ی كاركنان ستاد و هلدینگ‌ها.`,
      `فصل دوم — ورود و پروفایل\n۱. با نام کاربری سازمانی وارد شوید.\n۲. تصویر و اطلاعات تماس خود را کامل کنید.${v > 1 ? "\n۳. ورود دومرحله‌ای را از بخش امنیت فعال کنید." : ""}`,
      `فصل سوم — ثبت و جستجوی دانش\nبرای ثبت سند از دکمه‌ی «افزودن سند» استفاده کنید. جستجو در عنوان، متن مقاله و متن فایل‌ها انجام می‌شود.\nنکته: نیم‌فاصله و ي/ی عربی در جستجو یکسان در نظر گرفته می‌شوند.`,
    ].join("\f");
  if (type === "صورت‌جلسه")
    return [
      `${head}\n\nحاضران: اعضای هیات عامل و دبیر جلسه\nدستور جلسه: بررسی برنامه‌ی توسعه‌ی خدمات محرومیت‌زدایی و اشتغال خرد`,
      `مصوبات:\n۱. مقرر شد تمامي واحدها گزارش پیشرفت را تا پایان ماه ارسال کنند.\n۲. سقف تسهیلات طرح‌های خرد به ${v > 1 ? "۵۰۰" : "۴۰۰"} میلیون ریال افزایش یافت.\n۳. مسئول پیگیری: دبیرخانه.`,
    ].join("\f");
  if (title.includes("امنیت"))
    return [
      `${head}\n\nخلاصه‌ی مدیریتی\nارزیابی امنیت اطلاعات سامانه‌های بنیاد در ۱۲ حوزه انجام شد و ۷ آسیب‌پذیری با شدت بالا شناسایی شد.`,
      `یافته‌ها\n- رمز عبور پیش‌فرض در دو سامانه‌ی قدیمی\n- نبود ثبت لاگ دسترسی به اسناد محرمانه\n- پشتیبان‌گیری بدون رمزنگاری`,
      `توصیه‌ها\nفعال‌سازی ورود دومرحله‌ای، ثبت لاگ مشاهده و دانلود، واترمارک روی پیش‌نمایش اسناد محرمانه و بازبینی فصلی دسترسی‌ها.`,
    ].join("\f");
  return [
    `${head}\n\nخلاصه\nاین گزارش وضعیت پیشرفت طرح‌ها، شاخص‌های کلیدی و مسائل اجرایی دوره را جمع‌بندی می‌کند.`,
    `شاخص‌ها\n- پیشرفت فیزیکی: ${v > 1 ? "۶۸" : "۶۱"} درصد\n- اشتغال ایجادشده: 420 نفر\n- طرح‌های تکمیل‌شده: ۳۴ طرح`,
    `مسائل و راهکارها\nتأخیر در تأمین لوله و تجهیزات با قرارداد دوم جبران شد. هماهنگی هفتگی با دهیاری‌ها ادامه می‌یابد.${v > 1 ? "\nپیشنهاد: پیش‌خرید اقلام بحرانی برای فصل بعد." : ""}`,
  ].join("\f");
}

const pagesOf = (t: string) => t.split("\f").length;

/** بند ۸ و ۹: دسترسی، متن فایل، نسخه‌ها و گردش کار نمونه روی اسناد پایه */
function enrich(d: KDoc): KDoc {
  const withText = (v: number) => d.files.map((f) => {
    const text = docText(d.type, d.title, d.owner, v);
    return { ...f, text, pages: pagesOf(text) };
  });
  const out: KDoc = { ...d, files: withText(d.version), versions: d.versions.map((v) => ({ ...v, files: withText(v.version) })) };
  if (d.id === "d7") out.access = "محرمانه";
  if (d.id === "d9") {
    out.access = "محرمانه";
    out.acl = { viewOnly: true, entries: [{ kind: "scope", id: "h-saba", download: false }, { kind: "role", id: "r3", download: true }, { kind: "user", id: "u9", download: false }] };
  }
  if (d.id === "d10") {
    out.access = "خیلی محرمانه";
    out.acl = { viewOnly: false, entries: [{ kind: "title", id: "مدیر شرکت", download: false }] };
  }
  if (d.id === "d4")
    out.flow = { templateId: "wf-default", stepIdx: 0, stepStartedAt: addDays(KM_TODAY, -6), history: [{ stepId: "s-review", stepName: "ارسال برای بررسی", by: d.owner, decision: "submit", at: `${addDays(KM_TODAY, -6)} ۰۹:۱۰` }] };
  if (d.id === "d6")
    out.flow = {
      templateId: "wf-default",
      stepIdx: 2,
      stepStartedAt: addDays(KM_TODAY, -1),
      history: [
        { stepId: "s-review", stepName: "ارسال برای بررسی", by: d.owner, decision: "submit", at: `${addDays(KM_TODAY, -7)} ۱۰:۰۰` },
        { stepId: "s-review", stepName: "بررسی اولیه", by: "حسین دهقان", decision: "approve", at: `${addDays(KM_TODAY, -5)} ۱۱:۲۰` },
        { stepId: "s-approve", stepName: "تأیید مسئول واحد", by: "پایگاه اطلاع‌رسانی بنیاد", decision: "approve", at: `${addDays(KM_TODAY, -1)} ۱۴:۰۵` },
      ],
    };
  if (d.id === "d10")
    out.flow = {
      templateId: "wf-default",
      stepIdx: 0,
      stepStartedAt: "۱۴۰۵/۰۳/۰۲",
      history: [
        { stepId: "s-review", stepName: "ارسال برای بررسی", by: d.owner, decision: "submit", at: "۱۴۰۵/۰۱/۱۰ ۰۹:۰۰" },
        { stepId: "s-review", stepName: "بررسی اولیه", by: "پایگاه اطلاع‌رسانی بنیاد", decision: "return", at: "۱۴۰۵/۰۳/۰۲ ۱۰:۱۲", note: "پیوست جدول هزینه‌ها ناقص است." },
      ],
    };
  return out;
}

// ---------------------------------------------------------------------------
// اسناد «مقاله» (نوشته‌شده در خود سامانه)
// ---------------------------------------------------------------------------
const A1_V1 = `## هدف
این راهنما شیوه‌ی نوشتن **مقاله‌ی دانشی** در مخزن را توضیح می‌دهد.

## ساختار پیشنهادی
1. مسئله یا موضوع
2. راه‌حل گام‌به‌گام
3. نکته‌ها و هشدارها

## نکته‌ها
- عنوان کوتاه و جستجوپذیر بنویسید.
- برای هر مقاله دست‌کم یک برچسب بگذارید.`;

const A1_V2 = `## هدف
این راهنما شیوه‌ی نوشتن **مقاله‌ی دانشی** در مخزن موتوشاب را توضیح می‌دهد تا دانش به‌جای فایل‌های پراکنده، به‌صورت متن قابل جستجو ثبت شود.

## ساختار پیشنهادی
1. مسئله یا موضوع
2. راه‌حل گام‌به‌گام
3. نکته‌ها و هشدارها
4. اسناد و فرآیندهای مرتبط

## نکته‌ها
- عنوان کوتاه و جستجوپذیر بنویسید.
- برای هر مقاله دست‌کم دو برچسب بگذارید.
- از نیم‌فاصله استفاده کنید؛ جستجو «می‌شود» و «می شود» را یکسان پیدا می‌کند.

## جدول سطوح دسترسی
| سطح | دانلود | واترمارک |
|---|---|---|
| عمومی | مجاز | ندارد |
| داخلی | مجاز | ندارد |
| محرمانه | فقط مشاهده | دارد |

## نمونه‌ی کد شناسه‌ی سند
\`\`\`
KM-1405-0123
\`\`\`

برای اطلاعات بیشتر [استاندارد نگارش اسناد](#/dashboard/knowledge?doc=d6) را ببینید.`;

const A2_BODY = `## دامنه‌ی کاربرد
این دستورالعمل برای همه‌ی اسنادی است که سطح دسترسی آن‌ها **محرمانه** یا **خیلی محرمانه** است.

## الزامات
1. اسناد محرمانه فقط در حالت «فقط مشاهده» نمایش داده می‌شوند.
2. روی هر پیش‌نمایش، واترمارک نام بیننده، تاریخ و کد سند درج می‌شود.
3. هر مشاهده و دانلود در لاگ ممیزی ثبت می‌شود.
4. فهرست دسترسی هر سند فصلی بازبینی می‌شود.

## مسئولیت‌ها
| نقش | مسئولیت |
|---|---|
| مالک سند | تعیین فهرست دسترسی |
| مدیر واحد | تأیید فهرست دسترسی |
| کمیته امنیت اطلاعات | ممیزی فصلی لاگ‌ها |

> نقض این دستورالعمل تخلف اداری محسوب می‌شود.`;

const A3_BODY = `## ساعات کاری
ساعات کاری ستاد و هلدینگ‌ها از شنبه تا چهارشنبه **۷:۳۰ تا ۱۵:۰۰** است.

## دورکاری
- حداکثر دو روز در هفته با تأیید مدیر مستقیم
- ثبت کارکرد روزانه در سامانه‌ی کارکرد الزامی است
- جلسات حضوری هفتگی تیم لغو نمی‌شود

## تاریخ اجرا
از ابتدای تیر ۱۴۰۵.`;

function articleDocs(): KDoc[] {
  const base = {
    tags: [] as string[],
    files: [],
    views: 0,
    downloads: 0,
    ratings: [],
    feedback: [],
    comments: [],
    followers: [],
    relations: [],
    format: "article" as const,
    scope: "سراسری" as const,
    createdAt: "۱۴۰۵/۰۲/۱۰",
  };
  return [
    {
      ...base,
      id: "a1",
      title: "راهنمای نگارش مقاله‌ی دانشی در مخزن",
      code: "KM-1405-0201",
      type: "آموزشی",
      categoryId: "cat-training",
      tags: ["راهنما", "آموزش", "مستندسازی"],
      unit: "پایگاه اطلاع‌رسانی",
      owner: "پایگاه اطلاع‌رسانی بنیاد",
      author: "پایگاه اطلاع‌رسانی بنیاد",
      updatedAt: "۱۴۰۵/۰۳/۰۴",
      version: 2,
      status: "منتشرشده",
      access: "عمومی",
      description: "چگونه دانش را به‌جای فایل، به‌صورت مقاله‌ی قابل جستجو در سامانه بنویسیم.",
      body: A1_V2,
      reviewDate: addDays(KM_TODAY, 180),
      versions: [
        { version: 1, date: "۱۴۰۵/۰۲/۱۰", by: "پایگاه اطلاع‌رسانی بنیاد", note: "ایجاد مقاله", files: [], body: A1_V1 },
        { version: 2, date: "۱۴۰۵/۰۳/۰۴", by: "پایگاه اطلاع‌رسانی بنیاد", note: "افزودن جدول سطوح دسترسی و نکته‌ی نیم‌فاصله", files: [], body: A1_V2 },
      ],
      workflow: [{ id: "wf-a1-1", action: "انتشار", from: "تأییدشده", to: "منتشرشده", by: "پایگاه اطلاع‌رسانی بنیاد", at: "۱۴۰۵/۰۳/۰۴ ۱۲:۰۰" }],
      approvers: ["پایگاه اطلاع‌رسانی بنیاد"],
      views: 96,
      downloads: 0,
      ratings: [{ by: "وحید خاوئی", score: 5 }],
      feedback: [{ by: "محسن مردعلی", helpful: true }],
      importance: "مهم",
    },
    {
      ...base,
      id: "a2",
      title: "دستورالعمل حفاظت از اسناد محرمانه و خیلی محرمانه",
      code: "KM-1405-0202",
      type: "دستورالعمل",
      categoryId: "cat-procedures",
      tags: ["امنیت اطلاعات", "دسترسی"],
      unit: "پایگاه اطلاع‌رسانی",
      owner: "پایگاه اطلاع‌رسانی بنیاد",
      author: "پایگاه اطلاع‌رسانی بنیاد",
      updatedAt: addDays(KM_TODAY, -12),
      version: 1,
      status: "در بررسی",
      access: "محرمانه",
      description: "قواعد نمایش، دانلود، واترمارک و ممیزی اسناد طبقه‌بندی‌شده.",
      body: A2_BODY,
      files: [{ id: "f-a2", name: "پیوست — فرم تعهد عدم افشا.pdf", size: "۲۴۰ کیلوبایت", ext: "pdf", pages: 1, text: "فرم تعهد عدم افشای اطلاعات\nاینجانب متعهد می‌شوم اطلاعات محرمانه‌ی بنیاد را در اختیار اشخاص ثالث قرار ندهم.\nامضا و تاریخ" }],
      reviewDate: addDays(KM_TODAY, 365),
      versions: [{ version: 1, date: addDays(KM_TODAY, -12), by: "پایگاه اطلاع‌رسانی بنیاد", note: "ایجاد سند", files: [], body: A2_BODY }],
      workflow: [{ id: "wf-a2-1", action: "ارسال برای بررسی", from: "پیش‌نویس", to: "در بررسی", by: "پایگاه اطلاع‌رسانی بنیاد", at: `${addDays(KM_TODAY, -12)} ۰۸:۴۰` }],
      approvers: ["محسن مردعلی", "وحید خاوئی"],
      acl: { viewOnly: true, entries: [{ kind: "role", id: "r3", download: true }, { kind: "scope", id: "h-ferdows", download: false }, { kind: "title", id: "مدیر شرکت", download: false }] },
      flow: {
        templateId: "wf-legal",
        stepIdx: 1,
        stepStartedAt: addDays(KM_TODAY, -9),
        history: [
          { stepId: "l-legal", stepName: "ارسال برای بررسی", by: "پایگاه اطلاع‌رسانی بنیاد", decision: "submit", at: `${addDays(KM_TODAY, -12)} ۰۸:۴۰` },
          { stepId: "l-legal", stepName: "بررسی حقوقی", by: "محسن مردعلی", decision: "approve", at: `${addDays(KM_TODAY, -9)} ۱۳:۳۰`, note: "از نظر حقوقی مانعی ندارد." },
        ],
      },
      importance: "حیاتی",
    },
    {
      ...base,
      id: "a3",
      title: "بخشنامه‌ی ساعات کاری و دورکاری ۱۴۰۵",
      code: "KM-1405-0203",
      type: "بخشنامه",
      categoryId: "cat-regs",
      tags: ["بخشنامه", "منابع انسانی"],
      unit: "دبیرخانه",
      owner: "دبیرخانه",
      author: "پایگاه اطلاع‌رسانی بنیاد",
      updatedAt: addDays(KM_TODAY, -3),
      version: 1,
      status: "تأییدشده",
      access: "داخلی",
      description: "ساعات کاری ستاد و هلدینگ‌ها و قواعد دورکاری سال ۱۴۰۵.",
      body: A3_BODY,
      reviewDate: addDays(KM_TODAY, 300),
      versions: [{ version: 1, date: addDays(KM_TODAY, -3), by: "پایگاه اطلاع‌رسانی بنیاد", note: "ایجاد سند", files: [], body: A3_BODY }],
      workflow: [],
      approvers: ["محسن مردعلی", "پایگاه اطلاع‌رسانی بنیاد"],
      flow: {
        templateId: "wf-legal",
        stepIdx: 3,
        stepStartedAt: KM_TODAY,
        history: [
          { stepId: "l-legal", stepName: "ارسال برای بررسی", by: "پایگاه اطلاع‌رسانی بنیاد", decision: "submit", at: `${addDays(KM_TODAY, -3)} ۰۹:۰۰` },
          { stepId: "l-legal", stepName: "بررسی حقوقی", by: "محسن مردعلی", decision: "approve", at: `${addDays(KM_TODAY, -2)} ۱۰:۰۰` },
          { stepId: "l-unit", stepName: "تأیید مدیر واحد", by: "پایگاه اطلاع‌رسانی بنیاد", decision: "approve", at: `${addDays(KM_TODAY, -1)} ۱۱:۴۵` },
          { stepId: "l-deputy", stepName: "تأیید نهایی معاونت", by: "پایگاه اطلاع‌رسانی بنیاد", decision: "approve", at: `${KM_TODAY} ۰۸:۲۰` },
        ],
      },
      importance: "مهم",
    },
  ];
}

export function seedDocs(): KDoc[] {
  return [...articleDocs(), ...baseDocs().map(enrich)];
}

// ---------------------------------------------------------------------------
// بند ۸ و ۱۱: لاگ ممیزی نمونه
// ---------------------------------------------------------------------------
export function seedLogs(): KLog[] {
  const rows: [string, string, KLog["code"], string, string, string, KLog["access"]?, string?][] = [
    ["۱۴۰۵/۰۲/۲۰ ۰۹:۱۲", "واحد حقوقی", "create", "سند جدید ثبت و برای بررسی ارسال کرد", "d9", "تفاهم‌نامه همکاری هلدینگ برق و انرژی صبا در طرح‌های مناطق محروم", "محرمانه"],
    ["۱۴۰۵/۰۲/۲۲ ۱۱:۰۵", "محسن مردعلی", "view", "سند را مشاهده کرد", "d9", "تفاهم‌نامه همکاری هلدینگ برق و انرژی صبا در طرح‌های مناطق محروم", "محرمانه"],
    ["۱۴۰۵/۰۲/۲۲ ۱۱:۰۸", "محسن مردعلی", "download", "سند را دانلود کرد", "d9", "تفاهم‌نامه همکاری هلدینگ برق و انرژی صبا در طرح‌های مناطق محروم", "محرمانه", "تفاهم‌نامه همکاری هلدینگ برق و انرژی صبا در طرح‌های مناطق محروم.pdf"],
    ["۱۴۰۵/۰۲/۲۵ ۱۰:۴۰", "وحید خاوئی", "view", "سند را مشاهده کرد", "d4", "گزارش پیشرفت طرح‌های آبادانی قلعه‌گنج — نیم‌سال نخست", "عمومی"],
    ["۱۴۰۵/۰۲/۲۷ ۱۴:۲۰", "دکتر نگین فرهمند", "preview", "پیش‌نمایش فایل را دید (فقط مشاهده)", "d9", "تفاهم‌نامه همکاری هلدینگ برق و انرژی صبا در طرح‌های مناطق محروم", "محرمانه", "صفحه‌ی ۲"],
    ["۱۴۰۵/۰۲/۲۸ ۰۸:۵۵", "پایگاه اطلاع‌رسانی بنیاد", "version", "نسخه‌ی جدید سند را بارگذاری کرد", "a1", "راهنمای نگارش مقاله‌ی دانشی در مخزن", "عمومی"],
    ["۱۴۰۵/۰۲/۳۰ ۱۰:۰۰", "حسین دهقان", "access", "فهرست دسترسی سند را تغییر داد", "d10", "گزارش ارزیابی امنیتی سامانه‌های اطلاعاتی بنیاد", "خیلی محرمانه", "افزودن سمت «مدیر شرکت»"],
    ["۱۴۰۵/۰۳/۰۱ ۰۹:۳۰", "وحید خاوئی", "feedback", "سند را مفید دانست", "d5", "شیوه‌نامه ثبت و پیگیری طرح‌های خرد و متوسط اشتغال‌زایی", "عمومی"],
    ["۱۴۰۵/۰۳/۰۱ ۱۲:۱۵", "حسین دهقان", "feedback", "سند را نامفید دانست", "d1", "چارچوب حقوقی واگذاری هتل‌ها و اموال مازاد بنیاد", "داخلی", "بخش جدول‌ها قدیمی است"],
    ["۱۴۰۵/۰۳/۰۲ ۱۰:۱۲", "پایگاه اطلاع‌رسانی بنیاد", "workflow", "سند را برای اصلاح ارجاع داد", "d10", "گزارش ارزیابی امنیتی سامانه‌های اطلاعاتی بنیاد", "خیلی محرمانه", "پیوست جدول هزینه‌ها ناقص است."],
    ["۱۴۰۵/۰۳/۰۲ ۱۵:۴۰", "دکتر آرین صدرا", "view", "سند را مشاهده کرد", "d2", "راهنمای کاربری سامانه ارتباطات سازمانی بنیاد — نسخه ۲", "عمومی"],
    ["۱۴۰۵/۰۳/۰۳ ۰۹:۰۵", "دکتر آرین صدرا", "download", "سند را دانلود کرد", "d2", "راهنمای کاربری سامانه ارتباطات سازمانی بنیاد — نسخه ۲", "عمومی"],
    ["۱۴۰۵/۰۳/۰۳ ۱۱:۲۰", "محسن مردعلی", "workflow", "گردش کار: بررسی حقوقی — تأیید", "a2", "دستورالعمل حفاظت از اسناد محرمانه و خیلی محرمانه", "محرمانه"],
    ["۱۴۰۵/۰۳/۰۴ ۰۸:۳۰", "پایگاه اطلاع‌رسانی بنیاد", "archive", "سند را آرشیو کرد", "d8", "صورت‌جلسه کارگاه آموزشی راهبران سامانه — دور اول", "عمومی", "تاریخی"],
    ["۱۴۰۵/۰۳/۰۴ ۰۹:۴۵", "پایگاه اطلاع‌رسانی بنیاد", "restore", "سند را از آرشیو بازیابی کرد", "d8", "صورت‌جلسه کارگاه آموزشی راهبران سامانه — دور اول", "عمومی", "دلیل: نیاز به استناد در کارگاه دور دوم"],
    ["۱۴۰۵/۰۳/۰۵ ۰۹:۳۰", "مهندس بردیا کوشا", "create", "درس‌آموخته ثبت کرد", "xp2", "کدگذاری فایل‌های قدیمی", undefined],
    ["۱۴۰۵/۰۳/۰۵ ۱۳:۱۰", "دکتر مهسا نیک‌اندیش", "preview", "پیش‌نمایش فایل را دید (فقط مشاهده)", "d7", "گزارش سالانه تفاهم‌نامه‌های مردمی‌سازی اقتصاد و هلدینگ‌های طرف قرارداد", "محرمانه", "صفحه‌ی ۱"],
    ["۱۴۰۵/۰۳/۰۶ ۱۰:۰۰", "وحید خاوئی", "comment", "نظر ثبت کرد", "d1", "چارچوب حقوقی واگذاری هتل‌ها و اموال مازاد بنیاد", "داخلی"],
    ["۱۴۰۵/۰۳/۰۶ ۱۶:۲۰", "پایگاه اطلاع‌رسانی بنیاد", "settings", "قالب گردش کار «اسناد حقوقی و مقرراتی» را ویرایش کرد", "wf-legal", "گردش کار", undefined],
    ["۱۴۰۵/۰۳/۰۷ ۱۴:۰۵", "وحید خاوئی", "view", "سند را مشاهده کرد", "d4", "گزارش پیشرفت طرح‌های آبادانی قلعه‌گنج — نیم‌سال نخست", "عمومی"],
    ["۱۴۰۵/۰۳/۰۷ ۱۴:۰۹", "وحید خاوئی", "download", "سند را دانلود کرد", "d4", "گزارش پیشرفت طرح‌های آبادانی قلعه‌گنج — نیم‌سال نخست", "عمومی"],
    ["۱۴۰۵/۰۳/۰۸ ۰۸:۲۰", "پایگاه اطلاع‌رسانی بنیاد", "workflow", "گردش کار: تأیید نهایی معاونت — تأیید", "a3", "بخشنامه‌ی ساعات کاری و دورکاری ۱۴۰۵", "داخلی"],
  ];
  return rows
    .map(([at, actor, code, action, id, title, access, detail], i) => ({ id: `kl${i + 1}`, seq: i + 1, at, actor, code, action, detail, access, entity: { type: id.startsWith("xp") ? "lesson" : id.startsWith("wf") ? "settings" : "doc", id, title } }))
    .reverse();
}

export const seedSavedSearches = (): KSavedSearch[] => [
  { id: "ss1", owner: "پایگاه اطلاع‌رسانی بنیاد", name: "قراردادهای محرمانه", query: "قرارداد", filters: { kinds: ["doc"], types: [], units: [], statuses: [], access: ["محرمانه"], tags: [], inContent: true }, notify: true, createdAt: "۱۴۰۵/۰۲/۱۵" },
  { id: "ss2", owner: "پایگاه اطلاع‌رسانی بنیاد", name: "آیین‌نامه معاملات (متن فایل‌ها)", query: "آیین‌نامه معاملات", filters: { kinds: [], types: [], units: [], statuses: [], access: [], tags: [], inContent: true }, notify: false, createdAt: "۱۴۰۵/۰۳/۰۲" },
];
