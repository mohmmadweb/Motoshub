// ---------------------------------------------------------------------------
// داده‌ی اولیه‌ی ماژول‌های نوآوری — از داده‌های نمایشی قبلی (mock / mockDetails /
// mockDaneshmand / mockInnovationFund) ساخته می‌شود تا هیچ داده‌ای از دست نرود،
// و با بانک موجودیت‌ها، داوری، تصمیم و نتیجه‌ی واقعی غنی شده است.
// ---------------------------------------------------------------------------
import { contracts as mockContracts, funds as mockFunds, researchOpportunities } from "../data/mock";
import { contractDetails, fundDetails, researchDetails } from "../data/mockDetails";
import { awardTracks as mockTracks, awardEntries as mockEntries, eSignDocuments, rfpCalls, sabbaticals as mockSabb, tenders as mockTenders, trainingCourses } from "../data/mockDaneshmand";
import { nfProjects as mockNf } from "../data/mockInnovationFund";
import { withDemoScopes, type Scoped } from "../data/tenancy";
import type {
  Application,
  AwardCycle,
  AwardEntryX,
  AwardTrackX,
  Contract,
  ContractStage,
  Course,
  Decision,
  EcoEntity,
  EcoFieldDef,
  EmploymentFund,
  Enrollment,
  ESignDoc,
  InnStore,
  JobAssignment,
  JudgeAssignment,
  LearningPath,
  Outcome,
  ProjectLink,
  Question,
  Quiz,
  ResearchCall,
  Review,
  Rfp,
  RubricItem,
  SabbaticalX,
  Tender,
} from "./types";
import { toRial } from "./util";

export const INN_VERSION = 1;
const SYS = "پایگاه اطلاع‌رسانی بنیاد";
const T0 = "۱۴۰۵/۰۱/۱۵ ۰۹:۳۰";

// ------------------------------------------------------------ موجودیت‌ها
type EntSeed = Partial<EcoEntity> & Pick<EcoEntity, "id" | "kind" | "name" | "field" | "city">;
function ent(e: EntSeed, source: "سامانه" | "اکسل/CSV" | "فرم" = "سامانه"): EcoEntity {
  const base: EcoEntity = { collaborators: [], custom: {}, provenance: {}, history: [], createdAt: T0, createdBy: SYS, ...e };
  const prov: EcoEntity["provenance"] = {};
  Object.keys(e).forEach((k) => {
    if (!["id", "kind", "collaborators", "custom"].includes(k)) prov[k] = { source, at: T0, by: source === "اکسل/CSV" ? "واحد داده‌های زیست‌بوم" : SYS };
  });
  return { ...base, provenance: { ...prov, ...(e.provenance ?? {}) } };
}

function seedEntities(): EcoEntity[] {
  const list: EcoEntity[] = [
    ent({ id: "e-ekal", kind: "company", name: "اکال زیست پایدار", field: "زیست‌فناوری", city: "تهران", kbType: "دانش‌بنیان نوپا", trl: 4, capacity: "تولید آزمایشی ۲ تن خمیرکاغذ در ماه", employees: 9, certificates: ["گواهی دانش‌بنیان نوپا", "ثبت اختراع ۱۴۰۳"], holdingId: "h-ferdows", collaborators: ["r-nikandish"], custom: { founded: "1399" } }),
    ent({ id: "e-rezorah", kind: "company", name: "رزوراه", field: "شیمی و فرآوری", city: "شیراز", kbType: "دانش‌بنیان نوپا", trl: 5, capacity: "پایلوت ۵۰ کیلوگرم در ماه", employees: 6, certificates: ["گواهی دانش‌بنیان نوپا"] }, "اکسل/CSV"),
    ent({ id: "e-chakavak", kind: "company", name: "چکاوکی", field: "ناوبری و الکترونیک", city: "اصفهان", kbType: "دانش‌بنیان تولیدی نوع ۱", trl: 6, capacity: "۱۲۰ دستگاه در سال", employees: 14, certificates: ["گواهی دانش‌بنیان تولیدی", "ISO 9001"], holdingId: "h-paya" }),
    ent({ id: "e-signal", kind: "company", name: "سیگنال امید", field: "هوش مصنوعی", city: "تهران", kbType: "دانش‌بنیان تولیدی نوع ۲", trl: 7, capacity: "۸ پروژه‌ی هم‌زمان استقرار", employees: 22, certificates: ["گواهی دانش‌بنیان تولیدی", "ISO 27001"], holdingId: "h-sina-food", companyId: "c-zamzam", collaborators: ["r-sadra"], custom: { founded: "1397", website: "https://signal-omid.example" } }),
    ent({ id: "e-carbonix", kind: "company", name: "کربنیکس", field: "مواد پیشرفته", city: "تبریز", kbType: "دانش‌بنیان نوپا", trl: 4, capacity: "۳۰۰ قطعه CFRP در ماه (پایلوت)", employees: 8, certificates: ["گواهی دانش‌بنیان نوپا"], collaborators: ["r-mehrvarz"] }),
    ent({ id: "e-kimia", kind: "company", name: "زیست‌فناور کیمیا", field: "زیست‌فناوری", city: "تهران", kbType: "دانش‌بنیان تولیدی نوع ۱", trl: 7, capacity: "۲۰ هزار کیت در ماه", employees: 31, certificates: ["گواهی دانش‌بنیان تولیدی", "مجوز سازمان غذا و دارو"], holdingId: "h-sina-food", companyId: "c-pak", collaborators: ["r-nikandish"] }),
    ent({ id: "e-photonic", kind: "company", name: "فوتونیک آریا", field: "لیدار و سنجش نوری", city: "اصفهان", kbType: "دانش‌بنیان تولیدی نوع ۱", trl: 6, capacity: "۴۰ سامانه در سال", employees: 17, certificates: ["گواهی دانش‌بنیان تولیدی"], holdingId: "h-paya", companyId: "c-sina-rail" }),
    ent({ id: "e-parvaz", kind: "company", name: "پرواز سبز", field: "پهپاد کشاورزی", city: "ساری", kbType: "دانش‌بنیان تولیدی نوع ۲", trl: 8, capacity: "۶۰ پهپاد در سال", employees: 26, certificates: ["گواهی دانش‌بنیان تولیدی", "مجوز سازمان هواپیمایی"], holdingId: "h-ferdows", companyId: "c-dashtnaz", collaborators: ["r-yegane"] }),
    ent({ id: "e-bina", kind: "company", name: "بینا رایان", field: "بینایی ماشین", city: "تهران", kbType: "دانش‌بنیان صنعتی", trl: 9, capacity: "۱۵ آزادراه تحت پوشش", employees: 48, certificates: ["گواهی دانش‌بنیان صنعتی", "ISO 9001"], holdingId: "h-paya", companyId: "c-azadrah", collaborators: ["r-sadra"] }),
    ent({ id: "e-hararat", kind: "company", name: "مهندسی حرارت گستر", field: "انرژی", city: "کرج", kbType: "شرکت فناور (غیر دانش‌بنیان)", trl: 6, capacity: "۴ کوره در سال", employees: 35, certificates: ["پروانه بهره‌برداری"], holdingId: "h-saba", companyId: "c-saba-niru", collaborators: ["r-farahmand"] }),
    ent({ id: "e-azma", kind: "company", name: "پایش‌گستر آزما", field: "اینترنت اشیا", city: "مشهد", kbType: "دانش‌بنیان نوپا", trl: 5, employees: 11, certificates: [] }, "اکسل/CSV"),
    ent({ id: "e-zistpala", kind: "company", name: "زیست‌پالا", field: "محیط زیست", city: "اراک", kbType: "دانش‌بنیان نوپا", trl: 6, capacity: "تصفیه ۱۲۰ مترمکعب پساب در روز", employees: 12, certificates: ["گواهی دانش‌بنیان نوپا"] }),
    ent({ id: "e-rahyab", kind: "company", name: "رهیاب‌انرژی", field: "انرژی", city: "تهران", kbType: "دانش‌بنیان تولیدی نوع ۱", trl: 8, employees: 19, certificates: ["گواهی دانش‌بنیان تولیدی"], holdingId: "h-saba", collaborators: ["r-farahmand"] }),
    // پژوهشگران و تیم‌های پژوهشی
    ent({ id: "r-tavakoli", kind: "researcher", name: "دکتر فرزانه توکلی", field: "داده‌کاوی صنعتی", city: "اصفهان", affiliation: "دانشگاه صنعتی اصفهان", degree: "دانشیار", hIndex: 14, publications: 46, pastProjects: ["کاهش ضایعات خط تولید نوشیدنی", "پیش‌بینی خرابی تجهیزات"] }),
    ent({ id: "r-shabani", kind: "researcher", name: "دکتر امیرحسین شعبانی", field: "انرژی و متالورژی", city: "تبریز", affiliation: "دانشگاه تبریز", degree: "استادیار", hIndex: 11, publications: 33, pastProjects: ["بهینه‌سازی کوره قوس الکتریکی"], collaborators: ["e-carbonix"] }),
    ent({ id: "r-ghanbari", kind: "researcher", name: "دکتر لیلا قنبری", field: "سنجش از دور و کشاورزی", city: "مشهد", affiliation: "دانشگاه فردوسی مشهد", degree: "دانشیار", hIndex: 17, publications: 58, pastProjects: ["الگوی آبیاری دقیق دشت ناز"], collaborators: ["e-parvaz"] }),
    ent({ id: "r-sadra", kind: "researcher", name: "دکتر آرین صدرا", field: "هوش مصنوعی", city: "تهران", affiliation: "پژوهشگاه هوش مصنوعی", degree: "پژوهشگر پسادکتری", hIndex: 21, publications: 64, userId: "u6", scholarUrl: "https://scholar.example/sadra", pastProjects: ["بینایی ماشین برای کنترل کیفیت", "تشخیص حوادث آزادراه"] }),
    ent({ id: "r-nikandish", kind: "researcher", name: "دکتر مهسا نیک‌اندیش", field: "زیست‌فناوری", city: "تهران", affiliation: "دانشگاه تهران", degree: "دانشیار", hIndex: 15, publications: 41, userId: "u7", pastProjects: ["کیت تشخیص آنتی‌بیوتیک شیر"] }),
    ent({ id: "r-farahmand", kind: "researcher", name: "دکتر نگین فرهمند", field: "انرژی", city: "تهران", affiliation: "دانشگاه صنعتی شریف", degree: "استاد", hIndex: 19, publications: 72, userId: "u9", pastProjects: ["بازیافت حرارت نیروگاه", "مدیریت مصرف انرژی صنعتی"] }),
    ent({ id: "r-mehrvarz", kind: "researcher", name: "دکتر شایان مهرورز", field: "مواد پیشرفته", city: "تبریز", affiliation: "دانشگاه صنعتی سهند", degree: "استادیار", hIndex: 12, publications: 29, userId: "u11", pastProjects: ["کامپوزیت‌های سبک خودرو"] }),
    ent({ id: "r-roshan", kind: "researcher", name: "دکتر یاسمن روشن", field: "اقتصاد نوآوری", city: "تهران", affiliation: "دانشگاه علامه طباطبائی", degree: "استادیار", hIndex: 9, publications: 22, userId: "u12", pastProjects: ["ارزش‌گذاری فناوری‌های نوپا"] }),
    ent({ id: "r-yegane", kind: "researcher", name: "مهندس پارسا یگانه", field: "کشاورزی دقیق", city: "ساری", affiliation: "مستقل", degree: "کارشناس ارشد", hIndex: 3, publications: 5, userId: "u10" }),
    ent({ id: "r-ut-social", kind: "researcher", name: "گروه پژوهشی دانشگاه تهران", field: "مطالعات اجتماعی", city: "تهران", affiliation: "دانشکده علوم اجتماعی", degree: "تیم پژوهشی", hIndex: 13, publications: 38 }),
    ent({ id: "r-jahad", kind: "researcher", name: "پژوهشکده مطالعات توسعه", field: "مطالعات اجتماعی", city: "تهران", affiliation: "جهاد دانشگاهی", degree: "تیم پژوهشی", hIndex: 10, publications: 30 }, "اکسل/CSV"),
    ent({ id: "r-rural", kind: "researcher", name: "پژوهشکده اقتصاد روستا", field: "اقتصاد", city: "تهران", affiliation: "دانشگاه تربیت مدرس", degree: "تیم پژوهشی", hIndex: 12, publications: 35, collaborators: ["r-roshan"] }),
    ent({ id: "r-bahonar", kind: "researcher", name: "گروه زراعت دانشگاه شهید باهنر", field: "کشاورزی", city: "کرمان", affiliation: "دانشکده کشاورزی", degree: "تیم پژوهشی", hIndex: 8 }),
  ];
  // نمونه‌ی تاریخچه‌ی تغییر برای نمایش منشأ داده
  const sig = list.find((e) => e.id === "e-signal")!;
  sig.history = [
    { at: "۱۴۰۵/۰۲/۱۰ ۱۱:۲۰", by: "واحد داده‌های زیست‌بوم", field: "trl", label: "TRL", from: "۶", to: "۷", source: "فرم" },
    { at: "۱۴۰۵/۰۲/۱۰ ۱۱:۲۰", by: "واحد داده‌های زیست‌بوم", field: "employees", label: "تعداد نیرو", from: "۱۸", to: "۲۲", source: "فرم" },
  ];
  sig.provenance.trl = { source: "فرم", at: "۱۴۰۵/۰۲/۱۰ ۱۱:۲۰", by: "واحد داده‌های زیست‌بوم" };
  sig.provenance.employees = { source: "فرم", at: "۱۴۰۵/۰۲/۱۰ ۱۱:۲۰", by: "واحد داده‌های زیست‌بوم" };
  return list;
}

const seedFieldDefs = (): EcoFieldDef[] => [
  { id: "fd1", kind: "company", key: "founded", label: "سال تأسیس", type: "number" },
  { id: "fd2", kind: "company", key: "website", label: "وب‌سایت", type: "url" },
  { id: "fd3", kind: "company", key: "exportMarket", label: "بازار صادراتی", type: "select", options: ["ندارد", "منطقه‌ای", "بین‌المللی"] },
  { id: "fd4", kind: "researcher", key: "orcid", label: "شناسه ORCID", type: "text" },
  { id: "fd5", kind: "researcher", key: "cooperation", label: "نوع همکاری مورد علاقه", type: "select", options: ["فرصت مطالعاتی", "پروژه‌ی قراردادی", "مشاوره", "داوری"] },
];

// ------------------------------------------------------------ فرصت پژوهشی
export const defaultRubric = (): RubricItem[] => [
  { id: "rb1", criterion: "نوآوری و اصالت", weight: 30 },
  { id: "rb2", criterion: "روش‌شناسی و کیفیت علمی", weight: 30 },
  { id: "rb3", criterion: "توان اجرایی تیم", weight: 25 },
  { id: "rb4", criterion: "بودجه و زمان‌بندی", weight: 15 },
];

function reviewsFor(target: number, n: number, seed: number): Review[] {
  const reviewers = ["دکتر یاسمن روشن", "دکتر نگین فرهمند", "دکتر آرین صدرا"];
  return Array.from({ length: n }, (_, k) => {
    const base = target / 10 + (k === 0 ? 0.4 : k === 1 ? -0.4 : 0);
    return {
      id: `rv-${seed}-${k}`,
      reviewer: reviewers[(seed + k) % reviewers.length],
      scores: [0, 1, 2, 3].map((i) => Math.max(0, Math.min(10, Math.round((base + (i % 2 ? -0.3 : 0.3)) * 2) / 2))),
      comment: k === 0 ? "روش‌شناسی روشن و تیم با سابقه." : "بودجه‌ی پیشنهادی نیاز به بازنگری جزئی دارد.",
      noConflict: true,
      at: "۱۴۰۵/۰۲/۲۵ ۱۰:۰۰",
    };
  });
}

function seedCalls(): ResearchCall[] {
  const scopes: Record<string, Scoped> = {
    rs1: { scope: "سراسری" },
    rs2: { scope: "هلدینگ", holdingId: "h-ferdows" },
    rs3: { scope: "سراسری" },
  };
  const stageMap: Record<string, ResearchCall["stage"]> = { "فراخوان باز": "فراخوان باز", "بررسی درخواست‌ها": "بررسی درخواست‌ها", داوری: "داوری", "در حال اجرا": "در حال اجرا", "پایان‌یافته": "پایان‌یافته" };
  const paidMap: Record<string, number> = { rs3: 357_500_000 };
  const list: ResearchCall[] = researchOpportunities.map((o, oi) => {
    const d = researchDetails[o.id];
    const applications: Application[] = (d?.applicantsList ?? []).map((a, i) => ({
      id: `${o.id}-${a.id}`,
      name: a.name,
      affiliation: a.affiliation,
      proposal: "پیشنهاده‌ی فنی، برنامه‌ی زمان‌بندی و بودجه‌ی تفصیلی پیوست شد.",
      status: a.status === "پذیرفته" ? "پذیرفته" : a.status === "رد شده" ? "رد شده" : a.score ? "در داوری" : "ارسال‌شده",
      submittedAt: "۱۴۰۵/۰۲/۱۵",
      reviews: a.score ? reviewsFor(a.score, 2, oi * 10 + i) : [],
      note: a.status === "رد شده" ? "عدم تطابق سوابق با حوزه‌ی فراخوان" : undefined,
    }));
    return {
      id: o.id,
      title: o.title,
      field: o.field,
      stage: stageMap[o.stage],
      deadline: o.deadline,
      budget: toRial(d?.budget),
      paid: paidMap[o.id] ?? 0,
      duration: d?.duration ?? "—",
      supervisor: d?.supervisor ?? "—",
      description: d?.description ?? "",
      outputs: d?.outputs ?? [],
      rubric: defaultRubric(),
      applications,
      progress: d?.progress,
      createdAt: "۱۴۰۵/۰۱/۲۰",
      ...scopes[o.id],
    };
  });
  list.push({
    id: "rs4",
    title: "شناسایی نیازهای فناورانه‌ی زنجیره‌ی سرد لبنیات",
    field: "صنایع غذایی",
    stage: "پیش‌نویس",
    deadline: "۱۴۰۵/۰۵/۳۰",
    budget: 700_000_000,
    paid: 0,
    duration: "۶ ماه",
    supervisor: "هلدینگ صنایع غذایی سینا",
    description: "احصای نیازهای فناورانه‌ی زنجیره‌ی سرد و تبدیل آن‌ها به عناوین RFP.",
    outputs: ["فهرست نیازهای اولویت‌دار", "پیش‌نویس ۳ عنوان RFP"],
    rubric: defaultRubric(),
    applications: [],
    createdAt: "۱۴۰۵/۰۳/۰۲",
    scope: "شرکت",
    holdingId: "h-sina-food",
    companyId: "c-pak",
  });
  return list;
}

function seedRfps(): Rfp[] {
  const meta: Record<string, Partial<Rfp>> = {
    rfp1: { scope: "شرکت", holdingId: "h-sina-food", companyId: "c-pak", trlTarget: 7, budget: 10_000_000_000, need: "پایش برخط دما، آنتی‌بیوتیک و بار میکروبی شیر خام از دامداری تا کارخانه.", winnerBidId: "v1", contractId: "ct6", minutes: "صورت‌جلسه‌ی کمیسیون ۱۴۰۵/۰۳/۰۲: پاکات قیمت سه فناور بازگشایی شد؛ زیست‌فناور کیمیا با بالاترین امتیاز ترکیبی برگزیده شد." },
    rfp2: { scope: "شرکت", holdingId: "h-paya", companyId: "c-sina-rail", trlTarget: 6, budget: 8_000_000_000, need: "توزین دینامیک و پایش بار واگن‌ها هنگام بارگیری." },
    rfp3: { scope: "شرکت", holdingId: "h-saba", companyId: "c-saba-niru", trlTarget: 6, budget: 12_000_000_000, need: "بازیافت حرارت اتلافی کوره‌های عملیات حرارتی." },
  };
  const entityOf: Record<string, string> = { "زیست‌فناور کیمیا": "e-kimia", "پایش‌گستر آزما": "e-azma", "فوتونیک آریا": "e-photonic", حرارت‌گستر: "e-hararat", "حرارت گستر": "e-hararat" };
  return rfpCalls.map((r) => ({
    id: r.id,
    title: r.title,
    companyName: r.company,
    need: "",
    trlTarget: 6,
    deadline: r.deadline,
    budget: 0,
    channels: r.channels,
    stage: r.stage,
    bids: r.vendors.map((v) => ({ id: v.id, name: v.name, entityId: entityOf[v.name], bizScore: v.bizScore, techScore: v.techScore, price: v.price ? toRial(v.price) : undefined, submittedAt: "۱۴۰۵/۰۲/۰۵" })),
    priceOpened: r.vendors.some((v) => v.priceOpened),
    createdAt: "۱۴۰۵/۰۱/۱۰",
    ...meta[r.id],
  }));
}

function seedSabbaticals(): SabbaticalX[] {
  const ent: Record<string, string> = { sb1: "r-tavakoli", sb2: "r-shabani", sb3: "r-ghanbari" };
  const scopes: Record<string, Scoped> = { sb1: { scope: "شرکت", holdingId: "h-sina-food", companyId: "c-behnoush" }, sb2: { scope: "سراسری" }, sb3: { scope: "شرکت", holdingId: "h-ferdows", companyId: "c-dashtnaz" } };
  const amounts = [250_000_000, 280_000_000, 300_000_000];
  const list: SabbaticalX[] = mockSabb.map((s) => ({
    id: s.id,
    topic: s.topic,
    industry: s.industry,
    professor: s.professor,
    university: s.university,
    entityId: ent[s.id],
    trlBefore: s.trlBefore,
    trlAfter: s.trlAfter,
    contract: s.contract,
    budget: amounts.reduce((a, b) => a + b, 0),
    stage: s.stage,
    applicants: [],
    reports: s.reports.map((r, i) => ({ no: r.no, title: r.title, status: r.status, amount: r.paidAmount ? toRial(r.paidAmount) : amounts[i], paid: r.status === "تایید و پرداخت شد" })),
    createdAt: "۱۴۰۴/۰۷/۰۱",
    ...scopes[s.id],
  }));
  list.push({
    id: "sb4",
    topic: "بهینه‌سازی مصرف انرژی ایستگاه‌های پمپاژ آزادراه",
    industry: "پایا ترابر سینا — آزادراه تهران - شمال",
    trlBefore: 2,
    budget: 830_000_000,
    stage: "انتخاب استاد",
    applicants: [
      { id: "sb4-a1", name: "دکتر نگین فرهمند", affiliation: "دانشگاه صنعتی شریف", entityId: "r-farahmand", proposal: "مدل‌سازی مصرف و برنامه‌ی کاهش ۱۵٪ انرژی.", status: "در داوری", submittedAt: "۱۴۰۵/۰۲/۲۰", reviews: reviewsFor(84, 2, 71) },
      { id: "sb4-a2", name: "دکتر امیرحسین شعبانی", affiliation: "دانشگاه تبریز", entityId: "r-shabani", proposal: "پایش ارتعاش و بازطراحی رژیم بهره‌برداری پمپ‌ها.", status: "در داوری", submittedAt: "۱۴۰۵/۰۲/۲۲", reviews: reviewsFor(78, 2, 72) },
    ],
    reports: [
      { no: 1, title: "گزارش شناخت شرکت", status: "در انتظار", amount: 250_000_000, paid: false },
      { no: 2, title: "گزارش ارائه راهکار", status: "در انتظار", amount: 280_000_000, paid: false },
      { no: 3, title: "گزارش RFPهای پیشنهادی (حداقل ۶ عنوان)", status: "در انتظار", amount: 300_000_000, paid: false },
    ],
    createdAt: "۱۴۰۵/۰۲/۰۱",
    scope: "شرکت",
    holdingId: "h-paya",
    companyId: "c-azadrah",
  });
  return list;
}

const seedProjectLinks = (): ProjectLink[] => [
  { id: "pl1", opportunityId: "rs3", targetKind: "pm", targetId: "pr1", at: "۱۴۰۵/۰۲/۰۱" },
  { id: "pl2", opportunityId: "rfp1", targetKind: "nf", targetId: "NF-1404-1051", at: "۱۴۰۵/۰۲/۱۰" },
  { id: "pl3", opportunityId: "rfp2", targetKind: "nf", targetId: "NF-1404-1047", at: "۱۴۰۵/۰۲/۱۲" },
];

// ------------------------------------------------------------ قرارداد
function seedContracts(): Contract[] {
  const stageMap: Record<string, ContractStage> = { مذاکره: "مذاکره", فراخوان: "پیش‌نویس", داوری: "مذاکره", "در حال اجرا": "در حال اجرا", "تسویه‌شده": "مختومه" };
  const extra: Record<string, Partial<Contract>> = {
    ct1: { startDate: "۱۴۰۵/۰۱/۲۹", scope: "هلدینگ", holdingId: "h-saba" },
    ct2: { startDate: "۱۴۰۵/۰۳/۱۵", scope: "هلدینگ", holdingId: "h-paya" },
    ct3: { startDate: "۱۴۰۵/۰۵/۲۰", scope: "سراسری" },
    ct4: { startDate: "۱۴۰۴/۱۱/۰۱", scope: "هلدینگ", holdingId: "h-ferdows" },
  };
  const list: Contract[] = mockContracts.map((c) => {
    const d = contractDetails[c.id];
    const stage = stageMap[c.stage];
    return {
      id: c.id,
      title: c.title,
      vendor: c.vendor,
      type: d?.type ?? "فناورانه",
      method: d?.method ?? "فراخوان عمومی",
      stage,
      value: toRial(c.value),
      startDate: "۱۴۰۵/۰۱/۰۱",
      endDate: c.deadline,
      owner: c.owner,
      guarantee: d?.guarantee ?? "—",
      milestones: (d?.obligations ?? []).map((o) => ({ id: o.id, title: o.title, due: o.due, done: o.done, doneAt: o.done ? o.due : undefined })),
      payments: (d?.payments ?? []).map((p) => ({ id: p.id, title: p.title, amount: toRial(p.amount), due: p.due, status: p.status })),
      history: (d?.history ?? []).map((h) => ({ id: h.id, at: h.date, by: c.owner, text: h.text })),
      renewals: [],
      createdAt: d?.history[0]?.date ?? "۱۴۰۵/۰۱/۰۱",
      ...extra[c.id],
    };
  });
  list.push(
    {
      id: "ct5",
      title: "پهپاد سمپاش کشاورزی — مزارع دشت ناز",
      vendor: "پرواز سبز",
      vendorEntityId: "e-parvaz",
      type: "فناورانه",
      method: "RFP",
      stage: "در حال اجرا",
      value: 18_000_000_000,
      startDate: "۱۴۰۴/۰۹/۰۱",
      endDate: "۱۴۰۵/۰۴/۰۵",
      owner: "حسین دهقان",
      guarantee: "ضمانت‌نامه بانکی حسن انجام تعهد — ۱۰٪",
      milestones: [
        { id: "m1", title: "تحویل ۲ فروند پهپاد پایلوت", due: "۱۴۰۴/۱۱/۱۵", done: true, doneAt: "۱۴۰۴/۱۱/۱۴" },
        { id: "m2", title: "سمپاشی آزمایشی ۲۰۰ هکتار و گزارش کارایی", due: "۱۴۰۵/۰۲/۲۰", done: true, doneAt: "۱۴۰۵/۰۲/۲۸" },
        { id: "m3", title: "آموزش اپراتورهای کشت و صنعت", due: "۱۴۰۵/۰۳/۲۵", done: false },
      ],
      payments: [
        { id: "p1", title: "پیش‌پرداخت (۲۵٪)", amount: 4_500_000_000, due: "۱۴۰۴/۰۹/۱۰", status: "پرداخت‌شده" },
        { id: "p2", title: "پس از تحویل پایلوت", amount: 5_400_000_000, due: "۱۴۰۴/۱۱/۲۰", status: "پرداخت‌شده", milestoneId: "m1" },
        { id: "p3", title: "پس از گزارش کارایی", amount: 4_500_000_000, due: "۱۴۰۵/۰۳/۰۵", status: "در انتظار تأیید", milestoneId: "m2" },
        { id: "p4", title: "تسویه پس از آموزش", amount: 3_600_000_000, due: "۱۴۰۵/۰۴/۰۵", status: "آینده", milestoneId: "m3" },
      ],
      history: [
        { id: "h1", at: "۱۴۰۴/۰۸/۱۵", by: "حسین دهقان", text: "پیش‌نویس از قالب قرارداد تبادل فناوری ساخته شد", to: "پیش‌نویس" },
        { id: "h2", at: "۱۴۰۴/۰۸/۲۵", by: "حسین دهقان", text: "مذاکره روی بند مالکیت فکری", from: "پیش‌نویس", to: "مذاکره" },
        { id: "h3", at: "۱۴۰۴/۰۸/۳۰", by: "حسین دهقان", text: "امضای سه‌جانبه تکمیل شد", from: "مذاکره", to: "امضاشده" },
        { id: "h4", at: "۱۴۰۴/۰۹/۰۱", by: "حسین دهقان", text: "ابلاغ و شروع اجرا", from: "امضاشده", to: "در حال اجرا" },
      ],
      renewals: [],
      createdAt: "۱۴۰۴/۰۸/۱۵",
      scope: "شرکت",
      holdingId: "h-ferdows",
      companyId: "c-dashtnaz",
    },
    {
      id: "ct6",
      title: "استقرار سامانه پایش کیفیت شیر خام (برنده RFP)",
      vendor: "زیست‌فناور کیمیا",
      vendorEntityId: "e-kimia",
      type: "فناورانه",
      method: "RFP",
      stage: "امضاشده",
      value: 9_800_000_000,
      startDate: "۱۴۰۵/۰۳/۱۰",
      endDate: "۱۴۰۶/۰۳/۱۰",
      owner: "وحید خاوئی",
      guarantee: "چک ضمانت",
      opportunityId: "rfp1",
      milestones: [
        { id: "m1", title: "نصب حسگرها در ۱۰ مرکز جمع‌آوری", due: "۱۴۰۵/۰۶/۱۰", done: false },
        { id: "m2", title: "راه‌اندازی داشبورد پایش و آموزش", due: "۱۴۰۵/۰۹/۱۰", done: false },
      ],
      payments: [
        { id: "p1", title: "پیش‌پرداخت (۲۰٪)", amount: 1_960_000_000, due: "۱۴۰۵/۰۳/۱۵", status: "آینده" },
        { id: "p2", title: "پس از نصب حسگرها", amount: 4_900_000_000, due: "۱۴۰۵/۰۶/۲۰", status: "آینده", milestoneId: "m1" },
      ],
      history: [
        { id: "h1", at: "۱۴۰۵/۰۳/۰۳", by: "وحید خاوئی", text: "پیش‌نویس از برنده‌ی RFP ساخته شد", to: "پیش‌نویس" },
        { id: "h2", at: "۱۴۰۵/۰۳/۰۶", by: "وحید خاوئی", text: "امضا شد", from: "پیش‌نویس", to: "امضاشده" },
      ],
      renewals: [],
      createdAt: "۱۴۰۵/۰۳/۰۳",
      scope: "شرکت",
      holdingId: "h-sina-food",
      companyId: "c-pak",
    }
  );
  // پیوند طرف قرارداد به بانک موجودیت‌ها (در صورت وجود)
  return list;
}

function seedTenders(): Tender[] {
  const bids: Record<string, Tender["bids"]> = {
    tn1: [
      { id: "b1", name: "تجهیزگستر آزما", techScore: 78, price: 6_200_000_000, guaranteeOk: true },
      { id: "b2", name: "پایش‌گستر آزما", entityId: "e-azma", techScore: 84, price: 6_900_000_000, guaranteeOk: true },
      { id: "b3", name: "آزمایشگاه‌سازان پارس", techScore: 61, price: 5_400_000_000, guaranteeOk: false },
    ],
    tn2: [
      { id: "b1", name: "خانه نوآوری دانا", guaranteeOk: true },
      { id: "b2", name: "شتابدهنده رویش", guaranteeOk: true },
    ],
    tn3: [{ id: "b1", name: "ابر آروان (نمونه)", techScore: 90, price: 3_100_000_000, guaranteeOk: true }],
    tn4: [
      { id: "b1", name: "چاپخانه اندیشه", techScore: 80, price: 420_000_000, guaranteeOk: true },
      { id: "b2", name: "نشر نگاره", techScore: 74, price: 390_000_000, guaranteeOk: true },
    ],
  };
  return mockTenders.map((t) => ({
    id: t.id,
    title: t.title,
    method: t.method,
    stage: t.stage,
    estimate: t.id === "tn1" ? 6_500_000_000 : t.id === "tn3" ? 3_200_000_000 : t.id === "tn4" ? 450_000_000 : 0,
    bids: bids[t.id] ?? [],
    sessionDate: t.sessionDate,
    minutes: t.note,
    winnerBidId: t.winner ? (bids[t.id] ?? []).find((b) => b.name === t.winner)?.id : undefined,
    boardApproval: t.method === "ترک تشریفات" ? "مصوبه هیئت مدیره ۱۴۰۵/۰۲/۱۸" : undefined,
    createdAt: "۱۴۰۵/۰۲/۰۱",
  }));
}

// ------------------------------------------------------------ صندوق
function seedEmployment(): EmploymentFund[] {
  const ents: Record<string, string | undefined> = {};
  return withDemoScopes(mockFunds, 20).map((f) => {
    const d = fundDetails[f.id];
    return {
      ...f,
      entityId: ents[f.id],
      requested: toRial(d?.requested),
      approved: d && d.approved !== "—" ? toRial(d.approved) : 0,
      score: d?.score,
      committee: d?.committee ?? "کارگروه اشتغال",
      region: d?.region ?? "—",
      field: d?.field ?? "—",
      tranches: (d?.tranches ?? []).map((t) => ({ id: t.id, title: t.title, amount: toRial(t.amount), condition: t.condition, status: t.status })),
      kpis: d?.kpis ?? [],
      notes: d?.notes ?? "",
    };
  });
}

// ------------------------------------------------------------ جایزه
const awardRubric = (): RubricItem[] => [
  { id: "ar1", criterion: "میزان نوآوری", weight: 30 },
  { id: "ar2", criterion: "اثر اقتصادی و کمّی", weight: 30 },
  { id: "ar3", criterion: "قابلیت تعمیم و توسعه", weight: 20 },
  { id: "ar4", criterion: "مستندات و شواهد", weight: 20 },
];

function seedAward(): { cycles: AwardCycle[]; tracks: AwardTrackX[]; entries: AwardEntryX[]; assignments: JudgeAssignment[] } {
  const judges = [SYS, "دکتر یاسمن روشن", "دکتر نگین فرهمند", "دکتر آرین صدرا"];
  const cycles: AwardCycle[] = [
    {
      id: "ac-1405",
      title: "جایزه نوآوری و فناوری ۱۴۰۵",
      phase: "داوری اولیه",
      schedule: [
        { phase: "ثبت‌نام", start: "۱۴۰۵/۰۱/۲۰", end: "۱۴۰۵/۰۲/۱۰" },
        { phase: "ارسال اثر", start: "۱۴۰۵/۰۲/۱۱", end: "۱۴۰۵/۰۲/۳۱" },
        { phase: "داوری اولیه", start: "۱۴۰۵/۰۳/۰۱", end: "۱۴۰۵/۰۳/۲۰" },
        { phase: "داوری نهایی", start: "۱۴۰۵/۰۳/۲۱", end: "۱۴۰۵/۰۴/۱۵" },
        { phase: "اعلام نتایج", start: "۱۴۰۵/۰۴/۲۰", end: "۱۴۰۵/۰۴/۲۰" },
      ],
      blind: true,
      editLimit: 1,
      finalistsPerTrack: 2,
      rubric: awardRubric(),
      judges,
      closed: false,
      createdAt: "۱۴۰۵/۰۱/۱۰",
    },
    {
      id: "ac-1405b",
      title: "جایزه ۱۴۰۵ — نوبت دوم (ویژه شرکت‌های تازه‌وارد)",
      phase: "ثبت‌نام",
      schedule: [
        { phase: "ثبت‌نام", start: "۱۴۰۵/۰۳/۰۱", end: "۱۴۰۵/۰۳/۳۰" },
        { phase: "ارسال اثر", start: "۱۴۰۵/۰۴/۰۱", end: "۱۴۰۵/۰۴/۳۱" },
        { phase: "داوری اولیه", start: "۱۴۰۵/۰۵/۰۱", end: "۱۴۰۵/۰۵/۲۰" },
        { phase: "داوری نهایی", start: "۱۴۰۵/۰۵/۲۱", end: "۱۴۰۵/۰۶/۱۰" },
        { phase: "اعلام نتایج", start: "۱۴۰۵/۰۶/۲۰", end: "۱۴۰۵/۰۶/۲۰" },
      ],
      blind: false,
      editLimit: 2,
      finalistsPerTrack: 2,
      rubric: awardRubric(),
      judges: judges.slice(1),
      closed: false,
      createdAt: "۱۴۰۵/۰۲/۲۵",
    },
    {
      id: "ac-1404",
      title: "جایزه نوآوری و فناوری ۱۴۰۴",
      phase: "اعلام نتایج",
      schedule: [
        { phase: "ثبت‌نام", start: "۱۴۰۴/۰۶/۰۱", end: "۱۴۰۴/۰۶/۲۰" },
        { phase: "ارسال اثر", start: "۱۴۰۴/۰۶/۲۱", end: "۱۴۰۴/۰۷/۱۵" },
        { phase: "داوری اولیه", start: "۱۴۰۴/۰۷/۱۶", end: "۱۴۰۴/۰۸/۱۰" },
        { phase: "داوری نهایی", start: "۱۴۰۴/۰۸/۱۱", end: "۱۴۰۴/۰۸/۳۰" },
        { phase: "اعلام نتایج", start: "۱۴۰۴/۰۹/۱۰", end: "۱۴۰۴/۰۹/۱۰" },
      ],
      blind: true,
      editLimit: 1,
      finalistsPerTrack: 2,
      rubric: awardRubric(),
      judges: judges.slice(1),
      closed: true,
      createdAt: "۱۴۰۴/۰۵/۲۰",
    },
  ];
  const tracks: AwardTrackX[] = [
    ...mockTracks.map((t) => ({ id: t.id, cycleId: "ac-1405", title: t.title, categories: t.categories })),
    ...mockTracks.map((t) => ({ id: `${t.id}-b`, cycleId: "ac-1405b", title: t.title, categories: t.categories })),
    ...mockTracks.slice(0, 2).map((t) => ({ id: `${t.id}-04`, cycleId: "ac-1404", title: t.title, categories: t.categories })),
  ];
  const trackIdOf = (title: string) => tracks.find((t) => t.cycleId === "ac-1405" && t.title === title)?.id ?? "aw1";
  const entityOf: Record<string, string | undefined> = {};
  const holdingOf: Record<string, string> = { "لبنیات پاک": "h-sina-food", "نیروگاه‌های صبا": "h-saba", "سینا ریل پارس": "h-paya", "زمزم ایران": "h-sina-food", "بانک سینا": "h-mali" };
  const entries: AwardEntryX[] = mockEntries.map((e, i) => ({
    id: e.id,
    cycleId: "ac-1405",
    trackId: trackIdOf(e.track),
    category: tracks.find((t) => t.title === e.track)?.categories[i % 2] ?? "",
    title: e.title,
    companyName: e.company,
    entityId: entityOf[e.company],
    holdingId: holdingOf[e.company],
    submitter: i % 2 ? "وحید خاوئی" : "محسن مردعلی",
    summary: "شرح مسئله، راه‌حل پیاده‌سازی‌شده و نتایج کمّی در فرم اثر ثبت شده است.",
    benefits: i === 0 ? "صرفه‌جویی سالانه ۱۸ میلیارد ریال انرژی" : i === 1 ? "کاهش ۱۲٪ مصرف سوخت" : "در حال برآورد",
    attachments: ["مستند فنی.pdf", "تأییدیه مدیرعامل.pdf"],
    status: e.status === "ثبت‌شده" ? "ثبت‌نام‌شده" : "ارسال‌شده",
    editsUsed: e.editUsed ? 1 : 0,
    createdAt: "۱۴۰۵/۰۲/۰۵",
  }));
  entries.push(
    { id: "ae6", cycleId: "ac-1405", trackId: "aw1", category: "تحول دیجیتال", title: "سامانه تشخیص نقص خط تولید با بینایی ماشین", companyName: "زمزم ایران", entityId: "e-signal", holdingId: "h-sina-food", submitter: "وحید خاوئی", summary: "پیاده‌سازی مدل تشخیص نقص روی خط بطری با همکاری سیگنال امید.", benefits: "کاهش ۴۰٪ ضایعات بطری", attachments: ["گزارش پایلوت.pdf"], status: "ارسال‌شده", editsUsed: 0, createdAt: "۱۴۰۵/۰۲/۱۸" },
    { id: "b1", cycleId: "ac-1405b", trackId: "aw2-b", category: "دیجیتال", title: "سامانه نوبت‌دهی هوشمند انبار", companyName: "بهنوش ایران", holdingId: "h-sina-food", submitter: SYS, summary: "ایده‌ی کاهش صف کامیون‌ها در انبار مرکزی.", benefits: "", attachments: [], status: "ثبت‌نام‌شده", editsUsed: 0, createdAt: "۱۴۰۵/۰۳/۰۵" },
    // دوره‌ی ۱۴۰۴ — نتایج اعلام‌شده
    { id: "o1", cycleId: "ac-1404", trackId: "aw1-04", category: "نوآوری سبز", title: "بازیافت پساب صنعتی کارخانه نوشابه", companyName: "زمزم ایران", entityId: "e-zistpala", holdingId: "h-sina-food", submitter: "محسن مردعلی", summary: "تصفیه و بازچرخانی ۸۰٪ پساب با فناوری زیست‌پالا.", benefits: "صرفه‌جویی ۲۲ میلیارد ریال در سال", attachments: ["گزارش.pdf"], status: "برگزیده", editsUsed: 1, rank: 1, certificateNo: "AW-1404-0001", createdAt: "۱۴۰۴/۰۶/۲۲" },
    { id: "o2", cycleId: "ac-1404", trackId: "aw1-04", category: "تحول دیجیتال", title: "تشخیص خودکار حوادث آزادراه", companyName: "آزادراه تهران - شمال", entityId: "e-bina", holdingId: "h-paya", submitter: "وحید خاوئی", summary: "استقرار سامانه بینایی ماشین در ۴۰ کیلومتر آزادراه.", benefits: "کاهش ۳۵٪ زمان امدادرسانی", attachments: ["گزارش.pdf"], status: "تقدیرشده", editsUsed: 0, rank: 2, certificateNo: "AW-1404-0002", createdAt: "۱۴۰۴/۰۶/۲۵" },
    { id: "o3", cycleId: "ac-1404", trackId: "aw1-04", category: "ساخت داخل", title: "بومی‌سازی قطعات کوره نیروگاه", companyName: "نیروگاه‌های صبا", entityId: "e-hararat", holdingId: "h-saba", submitter: "محسن مردعلی", summary: "ساخت داخل ۱۲ قطعه‌ی وارداتی.", benefits: "صرفه‌جویی ارزی ۴۰۰ هزار یورو", attachments: [], status: "شرکت‌کننده", editsUsed: 0, createdAt: "۱۴۰۴/۰۶/۲۸" },
    { id: "o4", cycleId: "ac-1404", trackId: "aw2-04", category: "محصول و خدمت", title: "کیت تشخیص سریع آنتی‌بیوتیک", companyName: "لبنیات پاک", entityId: "e-kimia", holdingId: "h-sina-food", submitter: "وحید خاوئی", summary: "ایده‌ی کیت ۵ دقیقه‌ای تشخیص آنتی‌بیوتیک در شیر خام.", benefits: "", attachments: ["ایده.pdf"], status: "برگزیده", editsUsed: 0, rank: 1, certificateNo: "AW-1404-0003", createdAt: "۱۴۰۴/۰۷/۰۲" },
  );
  const a = (id: string, entryId: string, judge: string, round: "اولیه" | "نهایی", scores?: number[], coi: JudgeAssignment["coi"] = scores ? "ندارد" : "اعلام‌نشده", comment?: string): JudgeAssignment => ({
    id, entryId, judge, round, coi, scores, comment: comment ?? (scores ? "مستندات کافی و نتایج کمّی قابل اتکاست." : undefined), at: scores ? "۱۴۰۵/۰۳/۰۵ ۱۰:۰۰" : undefined,
  });
  const assignments: JudgeAssignment[] = [
    a("ja1", "ae1", "دکتر نگین فرهمند", "اولیه", [9, 9, 8, 9]),
    a("ja2", "ae1", "دکتر یاسمن روشن", "اولیه", [8, 9, 8, 8]),
    a("ja3", "ae1", SYS, "اولیه"),
    a("ja4", "ae2", "دکتر نگین فرهمند", "اولیه", undefined, "دارد"),
    a("ja5", "ae2", "دکتر یاسمن روشن", "اولیه", [7, 8, 7, 8]),
    a("ja6", "ae2", SYS, "اولیه"),
    a("ja7", "ae6", "دکتر آرین صدرا", "اولیه", [9, 8, 9, 7]),
    a("ja8", "ae6", "دکتر یاسمن روشن", "اولیه", [6, 7, 6, 6], "ندارد", "اثر کمّی هنوز اندازه‌گیری مستقل نشده است."),
    a("ja9", "ae3", "دکتر آرین صدرا", "اولیه", [7, 6, 7, 6]),
    a("ja10", "ae4", SYS, "اولیه"),
  ];
  assignments[3].coiReason = "عضو هیئت مدیره‌ی شرکت معرفی‌کننده";
  return { cycles, tracks, entries, assignments };
}

// ------------------------------------------------------------ آموزش
function seedTraining(): { courses: Course[]; enrollments: Enrollment[]; paths: LearningPath[]; questions: Question[]; quizzes: Quiz[]; jobs: JobAssignment[] } {
  const extra: Record<string, Partial<Course>> = {
    tc1: { mode: "حضوری", field: "مدیریت پروژه", jobTitles: ["مدیر پروژه"], sessions: [
      { id: "s1", date: "۱۴۰۵/۰۲/۱۰", start: "۰۹:۰۰", end: "۱۷:۰۰", place: "سالن آموزش ستاد" },
      { id: "s2", date: "۱۴۰۵/۰۲/۱۱", start: "۰۹:۰۰", end: "۱۷:۰۰", place: "سالن آموزش ستاد" },
    ], items: [
      { id: "i1", title: "جزوه‌ی مدیریت پروژه‌های R&D", kind: "doc", minutes: 40 },
      { id: "i2", title: "آزمون پایانی", kind: "quiz", minutes: 15, quizId: "qz1" },
    ] },
    tc2: { mode: "ترکیبی", field: "ارزیابی فناوری", jobTitles: ["راهبر صندوق", "داور جایزه"], sessions: [
      { id: "s1", date: "۱۴۰۵/۰۳/۰۵", start: "۱۴:۰۰", end: "۱۸:۰۰", place: "کانون ارزیابی" },
      { id: "s2", date: "۱۴۰۵/۰۳/۰۶", start: "۱۴:۰۰", end: "۱۸:۰۰", place: "کانون ارزیابی" },
    ], items: [
      { id: "i1", title: "ویدئوی سطوح آمادگی فناوری (TRL)", kind: "video", minutes: 18 },
      { id: "i2", title: "آزمون ارزش‌گذاری", kind: "quiz", minutes: 10, quizId: "qz2" },
    ] },
    tc3: { mode: "ترکیبی", field: "صندوق نوآور", jobTitles: ["راهبر صندوق", "ناظر فنی"], sessions: [
      { id: "s1", date: "۱۴۰۵/۰۳/۰۵", start: "۱۰:۰۰", end: "۱۲:۰۰", place: "اتاق جلسات صندوق" },
      { id: "s2", date: "۱۴۰۵/۰۳/۰۷", start: "۱۰:۰۰", end: "۱۲:۰۰", place: "اتاق جلسات صندوق" },
      { id: "s3", date: "۱۴۰۵/۰۳/۱۲", start: "۱۰:۰۰", end: "۱۲:۰۰", place: "برخط — اتاق مجازی" },
    ], items: [
      { id: "i1", title: "ویدئوی معرفی روند هفت‌گامه‌ی صندوق", kind: "video", minutes: 12 },
      { id: "i2", title: "آیین‌نامه‌ی صندوق نوآور", kind: "doc", minutes: 25 },
      { id: "i3", title: "ویدئوی زنجیره‌ی تأیید گزارش و پرداخت", kind: "video", minutes: 9 },
      { id: "i4", title: "آزمون پایان دوره", kind: "quiz", minutes: 10, quizId: "qz3" },
    ] },
    tc4: { mode: "آنلاین", field: "هوش مصنوعی", jobTitles: [], sessions: [], items: [
      { id: "i1", title: "ویدئو ۱ — مفاهیم پایه‌ی یادگیری ماشین", kind: "video", minutes: 35 },
      { id: "i2", title: "ویدئو ۲ — نمونه‌های صنعتی", kind: "video", minutes: 28 },
      { id: "i3", title: "کتابچه‌ی تمرین", kind: "doc", minutes: 30 },
    ] },
    tc5: { mode: "حضوری", field: "مدیریت دانش", jobTitles: ["مدیر پروژه"], sessions: [{ id: "s1", date: "۱۴۰۵/۰۵/۲۰", start: "۰۹:۰۰", end: "۱۷:۰۰", place: "سالن آموزش ستاد" }], items: [{ id: "i1", title: "راهنمای مستندسازی درس‌آموخته", kind: "doc", minutes: 20 }] },
    tc6: { mode: "حضوری", field: "جایزه نوآوری", jobTitles: ["داور جایزه"], sessions: [
      { id: "s1", date: "۱۴۰۵/۰۶/۰۱", start: "۰۹:۰۰", end: "۱۷:۰۰", place: "معاونت ترویج نوآوری" },
      { id: "s2", date: "۱۴۰۵/۰۶/۰۲", start: "۰۹:۰۰", end: "۱۷:۰۰", place: "معاونت ترویج نوآوری" },
    ], items: [{ id: "i1", title: "آیین‌نامه‌ی داوری و تعارض منافع", kind: "doc", minutes: 15 }] },
  };
  const courses: Course[] = withDemoScopes(trainingCourses, 15).map((c) => ({
    id: c.id,
    title: c.title,
    instructor: c.instructor,
    date: c.date,
    hours: c.hours,
    capacity: c.capacity,
    status: c.status,
    mode: "حضوری",
    field: "عمومی",
    items: [],
    sessions: [],
    jobTitles: [],
    createdAt: "۱۴۰۵/۰۱/۱۰",
    scope: c.scope,
    holdingId: c.holdingId,
    companyId: c.companyId,
    ...extra[c.id],
  }));
  const questions: Question[] = [
    { id: "q1", topic: "صندوق نوآور", text: "صندوق نوآور برای طرح‌هایی با کدام بازه‌ی TRL طراحی شده است؟", options: ["۱ تا ۳", "۳ تا ۶", "۶ تا ۹", "فقط ۹"], correct: 1 },
    { id: "q2", topic: "صندوق نوآور", text: "زنجیره‌ی تأیید گزارش مرحله‌ای کدام است؟", options: ["ناظر ← راهبر ← مدیر صندوق", "مدیر صندوق ← راهبر ← ناظر", "مجری ← واحد مالی", "فقط مدیر صندوق"], correct: 1 },
    { id: "q3", topic: "صندوق نوآور", text: "حدنصاب پیش‌فرض غربالگری ۲۲ معیاره چند امتیاز از ۲۰۰ است؟", options: ["۵۰", "۸۰", "۱۰۰", "۱۵۰"], correct: 1 },
    { id: "q4", topic: "صندوق نوآور", text: "«مسیر سبز» برای چه پروژه‌هایی است؟", options: ["پروژه‌های با بودجه‌ی کم", "پروژه‌های دارای دستور هیئت‌مدیره یا مدیرعامل", "پروژه‌های دانشگاهی", "پروژه‌های تمدیدشده"], correct: 1 },
    { id: "q5", topic: "صندوق نوآور", text: "اگر گزارش تعاملات در مهلت مقرر ثبت نشود، پروژه چه وضعیتی می‌گیرد؟", options: ["خاتمه", "در معرض توقف", "مسیر سبز", "تعلیق مالی خودکار"], correct: 1 },
    { id: "q6", topic: "مدیریت پروژه", text: "کدام سند خط مبنای زمان‌بندی پروژه را نگه می‌دارد؟", options: ["صورت‌جلسه", "گانت مصوب (Baseline)", "فاکتور", "نامه‌ی ابلاغ"], correct: 1 },
    { id: "q7", topic: "مدیریت پروژه", text: "مسیر بحرانی یعنی:", options: ["طولانی‌ترین زنجیره‌ی وابسته‌ی فعالیت‌ها", "پرهزینه‌ترین فعالیت", "فعالیت‌های مدیر پروژه", "فعالیت‌های انجام‌شده"], correct: 0 },
    { id: "q8", topic: "مدیریت پروژه", text: "درس‌آموخته در چه زمانی ثبت می‌شود؟", options: ["فقط پایان پروژه", "در طول و پایان پروژه", "هرگز", "فقط شروع پروژه"], correct: 1 },
    { id: "q9", topic: "مدیریت پروژه", text: "شاخص SPI کمتر از ۱ نشان‌دهنده‌ی چیست؟", options: ["جلوتر از برنامه", "عقب‌تر از برنامه", "زیر بودجه", "فراتر از بودجه"], correct: 1 },
    { id: "q10", topic: "ارزیابی فناوری", text: "TRL 7 یعنی:", options: ["ایده‌ی اولیه", "نمونه‌ی آزمایشگاهی", "نمایش نمونه‌ی اولیه در محیط عملیاتی", "تولید انبوه"], correct: 2 },
    { id: "q11", topic: "ارزیابی فناوری", text: "در روش درآمدی ارزش‌گذاری، مبنا چیست؟", options: ["هزینه‌ی ساخت", "جریان نقدی آتی", "قیمت رقبا", "تعداد نیرو"], correct: 1 },
    { id: "q12", topic: "ارزیابی فناوری", text: "پاکت قیمت در RFP چه زمانی بازگشایی می‌شود؟", options: ["پیش از ارزیابی فنی", "پس از تکمیل ارزیابی فنی", "هرگز", "در زمان انتشار"], correct: 1 },
  ];
  const quizzes: Quiz[] = [
    { id: "qz1", title: "آزمون مدیریت پروژه‌های R&D", questionIds: ["q6", "q7", "q8", "q9"], passScore: 60 },
    { id: "qz2", title: "آزمون ارزیابی و ارزش‌گذاری", questionIds: ["q10", "q11", "q12"], passScore: 60 },
    { id: "qz3", title: "آزمون فرآیندهای صندوق نوآور", questionIds: ["q1", "q2", "q3", "q4", "q5"], passScore: 60 },
  ];
  const att = (...xs: ("حاضر" | "غایب" | "تأخیر" | "موجه")[]) => Object.fromEntries(xs.map((x, i) => [`s${i + 1}`, x]));
  const enrollments: Enrollment[] = [
    { id: "en1", courseId: "tc1", user: SYS, enrolledAt: "۱۴۰۵/۰۱/۲۵", progress: { i1: 100, i2: 100 }, quiz: { qz1: { best: 75, attempts: 1 } }, attendance: att("حاضر", "حاضر"), evaluation: { answers: [5, 4, 5, 4, 5], comment: "کاربردی و منسجم", at: "۱۴۰۵/۰۲/۱۲" }, certificateNo: "TR-1405-0101", certifiedAt: "۱۴۰۵/۰۲/۱۵" },
    { id: "en2", courseId: "tc1", user: "وحید خاوئی", enrolledAt: "۱۴۰۵/۰۱/۲۶", progress: { i1: 100, i2: 100 }, quiz: { qz1: { best: 100, attempts: 1 } }, attendance: att("حاضر", "حاضر"), evaluation: { answers: [4, 5, 4, 4, 4], comment: "", at: "۱۴۰۵/۰۲/۱۲" }, certificateNo: "TR-1405-0102", certifiedAt: "۱۴۰۵/۰۲/۱۵" },
    { id: "en3", courseId: "tc1", user: "محسن مردعلی", enrolledAt: "۱۴۰۵/۰۱/۲۸", progress: { i1: 100, i2: 100 }, quiz: { qz1: { best: 50, attempts: 2 } }, attendance: att("حاضر", "غایب"), evaluation: { answers: [4, 4, 3, 4, 4], comment: "زمان کارگاه کم بود", at: "۱۴۰۵/۰۲/۱۳" } },
    { id: "en4", courseId: "tc2", user: "دکتر یاسمن روشن", enrolledAt: "۱۴۰۵/۰۲/۲۰", progress: { i1: 100, i2: 100 }, quiz: { qz2: { best: 67, attempts: 1 } }, attendance: att("حاضر", "تأخیر") },
    { id: "en5", courseId: "tc2", user: "مهندس بردیا کوشا", enrolledAt: "۱۴۰۵/۰۲/۲۱", progress: { i1: 50 }, quiz: {}, attendance: att("حاضر", "حاضر") },
    { id: "en6", courseId: "tc3", user: SYS, enrolledAt: "۱۴۰۵/۰۳/۰۱", progress: { i1: 100, i2: 40 }, quiz: {}, attendance: att("حاضر", "حاضر") },
    { id: "en7", courseId: "tc3", user: "محسن مردعلی", enrolledAt: "۱۴۰۵/۰۳/۰۱", progress: { i1: 100 }, quiz: {}, attendance: att("حاضر", "موجه") },
    { id: "en8", courseId: "tc3", user: "مهندس کیان راستین", enrolledAt: "۱۴۰۵/۰۳/۰۲", progress: {}, quiz: {}, attendance: att("غایب", "حاضر") },
    { id: "en9", courseId: "tc4", user: "دکتر آرین صدرا", enrolledAt: "۱۴۰۵/۰۳/۰۳", progress: { i1: 100, i2: 60 }, quiz: {}, attendance: {} },
  ];
  const paths: LearningPath[] = [
    { id: "lp1", title: "مسیر راهبر و ناظر صندوق نوآور", audience: "راهبران، ناظران و کارشناسان صندوق", courseIds: ["tc3", "tc2", "tc1"] },
    { id: "lp2", title: "مسیر داوری جایزه نوآوری", audience: "داوران و ارزیابان جایزه", courseIds: ["tc6", "tc2"] },
  ];
  const jobs: JobAssignment[] = [
    { id: "j1", user: SYS, jobTitle: "مدیر پروژه" },
    { id: "j2", user: "وحید خاوئی", jobTitle: "مدیر پروژه" },
    { id: "j3", user: "محسن مردعلی", jobTitle: "راهبر صندوق" },
    { id: "j4", user: "مهندس کیان راستین", jobTitle: "ناظر فنی" },
    { id: "j5", user: "مهندس بردیا کوشا", jobTitle: "ناظر فنی" },
    { id: "j6", user: "دکتر یاسمن روشن", jobTitle: "داور جایزه" },
    { id: "j7", user: "دکتر نگین فرهمند", jobTitle: "داور جایزه" },
    { id: "j8", user: SYS, jobTitle: "داور جایزه" },
  ];
  return { courses, enrollments, paths, questions, quizzes, jobs };
}

// ------------------------------------------------------------ تصمیم و نتیجه
const seedDecisions = (): Decision[] => [
  {
    id: "dc1", module: "research", subjectId: "rs3", subjectTitle: "مدل‌های پایداری اشتغال در طرح‌های خرد روستایی", question: "انتخاب مجری فراخوان",
    options: [{ id: "rs3-ap1", label: "پژوهشکده اقتصاد روستا", score: 85, rank: 1, entityId: "r-rural" }],
    chosenId: "rs3-ap1", chosenLabel: "پژوهشکده اقتصاد روستا", deviates: false, reason: "بالاترین امتیاز داوری و سابقه‌ی همکاری موفق.", committee: "کارگروه اشتغال روستایی", decidedBy: "وحید خاوئی", at: "۱۴۰۵/۰۲/۰۱ ۱۱:۰۰",
  },
  {
    id: "dc2", module: "research", subjectId: "rfp1", subjectTitle: "RFP سامانه پایش برخط کیفیت شیر خام", question: "انتخاب فناور برتر",
    options: [
      { id: "v1", label: "زیست‌فناور کیمیا", score: 85.6, rank: 1, entityId: "e-kimia" },
      { id: "v3", label: "تیم دانشگاهی صنعتی‌شریف", score: 77.6, rank: 2 },
      { id: "v2", label: "پایش‌گستر آزما", score: 77, rank: 3, entityId: "e-azma" },
    ],
    chosenId: "v1", chosenLabel: "زیست‌فناور کیمیا", deviates: false, reason: "رتبه‌ی اول ارزیابی ترکیبی فنی و کسب‌وکاری.", committee: "کمیسیون معاملات", decidedBy: "وحید خاوئی", at: "۱۴۰۵/۰۳/۰۲ ۱۲:۳۰",
  },
  {
    id: "dc3", module: "award", subjectId: "ac-1404:aw1-04", subjectTitle: "جایزه ۱۴۰۴ — نوآوری‌های پیاده‌سازی‌شده", question: "اعلام برگزیده‌ی محور",
    options: [
      { id: "o2", label: "تشخیص خودکار حوادث آزادراه", score: 86, rank: 1, entityId: "e-bina" },
      { id: "o1", label: "بازیافت پساب صنعتی کارخانه نوشابه", score: 84.5, rank: 2, entityId: "e-zistpala" },
      { id: "o3", label: "بومی‌سازی قطعات کوره نیروگاه", score: 71, rank: 3, entityId: "e-hararat" },
    ],
    chosenId: "o1", chosenLabel: "بازیافت پساب صنعتی کارخانه نوشابه", deviates: true,
    reason: "اختلاف امتیاز ناچیز بود و شورای جایزه به اثر زیست‌محیطی و قابلیت تعمیم در سه شرکت دیگر وزن بیشتری داد (صورت‌جلسه‌ی ۱۴۰۴/۰۹/۰۵).",
    committee: "شورای سیاست‌گذاری جایزه", decidedBy: "حسین دهقان", at: "۱۴۰۴/۰۹/۰۵ ۱۰:۰۰",
  },
  {
    id: "dc4", module: "contracts", subjectId: "tn4", subjectTitle: "چاپ و توزیع شماره ۱۲ ماهنامه بنیاد", question: "ابلاغ برنده‌ی مناقصه",
    options: [
      { id: "b2", label: "نشر نگاره", score: 74, rank: 1 },
      { id: "b1", label: "چاپخانه اندیشه", score: 80, rank: 2 },
    ],
    chosenId: "b1", chosenLabel: "چاپخانه اندیشه", deviates: true, reason: "پیشنهاد کمترین قیمت (نشر نگاره) به‌دلیل نداشتن ظرفیت چاپ در مهلت مقرر در کمیسیون پذیرفته نشد.", committee: "کمیسیون معاملات", decidedBy: "محسن مردعلی", at: "۱۴۰۵/۰۲/۲۸ ۰۹:۰۰",
  },
];

const seedOutcomes = (): Outcome[] => [
  { id: "oc1", module: "contracts", subjectId: "ct4", subjectTitle: "تأمین بذر و نهاده طرح‌های کشاورزی قلعه‌گنج", entityIds: [], successPct: 100, delivered: "کامل", schedule: "به‌موقع", budget: "مطابق بودجه", quality: 4, outputs: ["تحویل نهاده به ۱۸ تعاونی"], notes: "تسویه و آزادسازی ضمانت‌نامه انجام شد.", recordedBy: "حسین دهقان", at: "۱۴۰۵/۰۲/۰۱ ۱۰:۰۰" },
  { id: "oc2", module: "research", subjectId: "sb3", subjectTitle: "الگوی آبیاری دقیق مبتنی بر سنجش از دور", entityIds: ["r-ghanbari"], successPct: 90, delivered: "کامل", schedule: "تأخیر کم", budget: "مطابق بودجه", quality: 5, trlBefore: 2, trlAfter: 5, outputs: ["۷ عنوان RFP پیشنهادی", "کتابچه‌ی نهایی"], notes: "دو عنوان RFP به فراخوان تبدیل شد.", recordedBy: "وحید خاوئی", at: "۱۴۰۴/۱۲/۲۰ ۱۰:۰۰" },
  { id: "oc3", module: "award", subjectId: "o1", subjectTitle: "بازیافت پساب صنعتی کارخانه نوشابه", entityIds: ["e-zistpala"], successPct: 80, delivered: "بخشی", schedule: "به‌موقع", budget: "مطابق بودجه", quality: 4, outputs: ["تعمیم به لبنیات پاک"], notes: "پیگیری پس از جایزه: تعمیم در یک شرکت انجام شد، دو شرکت دیگر در صف.", recordedBy: "محسن مردعلی", at: "۱۴۰۵/۰۲/۱۵ ۱۰:۰۰" },
];

export function initialInnovation(): InnStore {
  const award = seedAward();
  const tr = seedTraining();
  const esign: ESignDoc[] = eSignDocuments.map((d) => ({ ...d, steps: d.steps.map((s) => ({ ...s, status: s.status as ESignDoc["steps"][number]["status"] })) }));
  return {
    version: INN_VERSION,
    seq: 20,
    entities: seedEntities(),
    fieldDefs: seedFieldDefs(),
    calls: seedCalls(),
    rfps: seedRfps(),
    sabbaticals: seedSabbaticals(),
    projectLinks: seedProjectLinks(),
    contracts: seedContracts(),
    tenders: seedTenders(),
    esign,
    nfProjects: withDemoScopes(mockNf, 19),
    employment: seedEmployment(),
    awardCycles: award.cycles,
    awardTracks: award.tracks,
    awardEntries: award.entries,
    assignments: award.assignments,
    courses: tr.courses,
    enrollments: tr.enrollments,
    paths: tr.paths,
    questions: tr.questions,
    quizzes: tr.quizzes,
    jobAssignments: tr.jobs,
    decisions: seedDecisions(),
    outcomes: seedOutcomes(),
    logs: [
      { id: "il1", seq: 1, at: "۱۴۰۵/۰۳/۰۲ ۱۲:۳۰", actor: "وحید خاوئی", module: "research", action: "فناور برتر RFP را انتخاب کرد", subject: { id: "rfp1", title: "RFP سامانه پایش کیفیت شیر خام" } },
      { id: "il2", seq: 2, at: "۱۴۰۵/۰۳/۰۶ ۰۹:۱۰", actor: "وحید خاوئی", module: "contracts", action: "قرارداد را به مرحله‌ی «امضاشده» برد", subject: { id: "ct6", title: "استقرار سامانه پایش کیفیت شیر خام" } },
      { id: "il3", seq: 3, at: "۱۴۰۵/۰۳/۰۵ ۱۰:۰۰", actor: "دکتر نگین فرهمند", module: "award", action: "تعارض منافع اعلام کرد", subject: { id: "ae2", title: "داشبورد پایش لحظه‌ای مصرف انرژی نیروگاه" } },
      { id: "il4", seq: 4, at: "۱۴۰۵/۰۲/۱۰ ۱۱:۲۰", actor: "واحد داده‌های زیست‌بوم", module: "ecosystem", action: "TRL و تعداد نیرو را به‌روز کرد", subject: { id: "e-signal", title: "سیگنال امید" } },
      { id: "il5", seq: 5, at: "۱۴۰۵/۰۲/۱۵ ۰۸:۴۵", actor: SYS, module: "training", action: "گواهی دوره را صادر کرد", subject: { id: "tc1", title: "مدیریت پروژه‌های تحقیق و توسعه" } },
      { id: "il6", seq: 6, at: "۱۴۰۵/۰۲/۲۸ ۰۹:۰۰", actor: "محسن مردعلی", module: "funds", action: "قسط دوم طرح پوشاک لنده را در انتظار پرداخت گذاشت", subject: { id: "fn2", title: "کارگاه تولید پوشاک — شهرستان لنده" } },
    ],
  };
}
