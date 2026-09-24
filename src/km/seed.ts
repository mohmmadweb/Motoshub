// ---------------------------------------------------------------------------
// داده‌ی نمونه‌ی مدیریت دانش — از روی داده‌های قبلی (بانک دانش، سندهای فرصت R&D،
// شناسنامه‌ها) ساخته شده و با فرآیندها، تجربیات، خبرگان و واژه‌نامه کامل شده است.
// ---------------------------------------------------------------------------
import { knowledgeDocs, users } from "../data/mock";
import { rndOpportunityDocs, supportedProducts, supportedVentures, partnerTechnologists } from "../data/mockDaneshmand";
import { withDemoScopes } from "../data/tenancy";
import { DEMO_REF_DATE } from "../pm/seed";
import { addDays } from "../pm/jalali";
import type { Experience, Expert, GlossaryTerm, KCategory, KDoc, KDocType, KProcess, KSettings, RegistryItem, RegistryType, RndDoc } from "./types";

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

export function seedDocs(): KDoc[] {
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
  units: ["پایگاه اطلاع‌رسانی", "واحد حقوقی", "دبیرخانه", "بنیاد علوی", "معاونت برنامه‌ریزی", "معاونت فناوری", "صندوق نوآوری", "واحد مالی", "تیم سامانه"],
  tags: ["قرارداد", "حقوقی", "آموزش", "راهنما", "مصوبه", "گزارش", "تدارکات", "ریسک", "TRL", "فراخوان"],
  workflowSteps: { review: true, approve: true, publish: true },
  defaultApprovers: ["پایگاه اطلاع‌رسانی بنیاد"],
  reviewPeriodDays: 365,
  interests: { "وحید خاوئی": ["cat-training", "cat-reports"], "محسن مردعلی": ["cat-contracts"] },
});
