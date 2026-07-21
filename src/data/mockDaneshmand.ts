// ---------------------------------------------------------------------------
// داده‌های نمونه بر اساس مستندات موسسه تحقیق و توسعه دانشمند:
// ساختار هلدینگ/شرکت و تفکیک محتوا، پورتفولیوی تبادل فناوری، سندهای فرصت R&D،
// جایزه نوآوری، آموزش، گردش امضای الکترونیک، فرم‌های امتیازدهی داوری، دستیار هوشمند
// ---------------------------------------------------------------------------

// ------------------- ساختار هلدینگ‌ها و شرکت‌های زیرمجموعه -------------------
export type SubCompany = { id: string; name: string };
export type Holding = { id: string; name: string; color: string; companies: SubCompany[] };

export const holdings: Holding[] = [
  {
    id: "h-ferdows",
    name: "هلدینگ کشاورزی فردوس پارس",
    color: "#0d9488",
    companies: [
      { id: "c-dashtnaz", name: "کشت و صنعت دشت ناز ساری" },
      { id: "c-ferdows-agri", name: "موسسه تحقیقات کشاورزی دانشمند" },
    ],
  },
  {
    id: "h-sina-food",
    name: "هلدینگ صنایع غذایی سینا",
    color: "#b45309",
    companies: [
      { id: "c-behnoush", name: "بهنوش ایران" },
      { id: "c-zamzam", name: "زمزم ایران" },
      { id: "c-pak", name: "لبنیات پاک" },
    ],
  },
  {
    id: "h-saba",
    name: "هلدینگ برق و انرژی صبا",
    color: "#0f172a",
    companies: [
      { id: "c-saba-niru", name: "نیروگاه‌های صبا" },
      { id: "c-energy-sina", name: "انرژی گستر سینا" },
    ],
  },
  {
    id: "h-paya",
    name: "هلدینگ پایا ترابر سینا",
    color: "#7c3aed",
    companies: [
      { id: "c-sina-rail", name: "سینا ریل پارس" },
      { id: "c-azadrah", name: "آزادراه تهران - شمال" },
    ],
  },
  {
    id: "h-mali",
    name: "هلدینگ مالی و سرمایه‌گذاری سینا",
    color: "#1f4f99",
    companies: [
      { id: "c-bank-sina", name: "بانک سینا" },
      { id: "c-bime-sina", name: "بیمه سینا" },
    ],
  },
];

export const allCompanies: (SubCompany & { holdingId: string; holdingName: string })[] = holdings.flatMap((h) =>
  h.companies.map((c) => ({ ...c, holdingId: h.id, holdingName: h.name }))
);

export type ContentScope = "سراسری" | "هلدینگ" | "شرکت";

// دامنه انتشار محتوای شرکتی: خبر با scope «شرکت» فقط برای اعضای همان شرکت،
// «هلدینگ» برای همه شرکت‌های آن هلدینگ و «سراسری» برای کل مجموعه نمایش داده می‌شود.
export type ScopedNews = {
  id: string;
  title: string;
  summary: string;
  date: string;
  scope: ContentScope;
  holdingId?: string;
  companyId?: string;
};

export const scopedNews: ScopedNews[] = [
  { id: "sn1", title: "ابلاغ برنامه سالانه فراخوان نیازهای فناورانه ۱۴۰۵", summary: "همه هلدینگ‌ها فهرست فرصت‌های تحقیق و توسعه خود را تا پایان تیرماه به‌روزرسانی کنند.", date: "۱۴۰۵/۰۴/۰۱", scope: "سراسری" },
  { id: "sn2", title: "رونمایی از سامانه جامع مدیریت پروژه‌های فناورانه", summary: "سامانه جدید برای تمامی شرکت‌های زیرمجموعه در دسترس قرار گرفت.", date: "۱۴۰۵/۰۳/۲۸", scope: "سراسری" },
  { id: "sn3", title: "نتایج پایلوت پهپاد سمپاش در مزارع دشت ناز", summary: "گزارش فاز نخست پروژه پهپاد کشاورزی برای مدیران هلدینگ منتشر شد.", date: "۱۴۰۵/۰۴/۰۳", scope: "هلدینگ", holdingId: "h-ferdows" },
  { id: "sn4", title: "برنامه نوسازی ناوگان حمل داخلی کارخانه بهنوش", summary: "جزئیات پروژه انبارداری هوشمند UWB فقط برای همکاران بهنوش.", date: "۱۴۰۵/۰۴/۰۲", scope: "شرکت", holdingId: "h-sina-food", companyId: "c-behnoush" },
  { id: "sn5", title: "آغاز استقرار سامانه تشخیص نقص خط تولید (هوش مصنوعی) در زمزم", summary: "زمان‌بندی نصب دوربین‌های خط تولید و توقف‌های برنامه‌ریزی‌شده ویژه کارکنان زمزم.", date: "۱۴۰۵/۰۴/۰۵", scope: "شرکت", holdingId: "h-sina-food", companyId: "c-zamzam" },
  { id: "sn6", title: "فراخوان داخلی ایده‌های بهبود زنجیره سرد لبنیات", summary: "کارکنان لبنیات پاک تا ۱۵ مرداد فرصت ثبت ایده دارند.", date: "۱۴۰۵/۰۴/۰۴", scope: "شرکت", holdingId: "h-sina-food", companyId: "c-pak" },
  { id: "sn7", title: "جمع‌بندی مطالعات لیدار واگن‌های باری", summary: "نتایج آزمون میدانی لیدار برای مدیران هلدینگ پایا ترابر ارائه شد.", date: "۱۴۰۵/۰۳/۳۰", scope: "هلدینگ", holdingId: "h-paya" },
  { id: "sn8", title: "گزارش بهره‌برداری سامانه تشخیص خودکار حوادث آزادراه", summary: "آمار سه‌ماهه سامانه ویژه شرکت آزادراه تهران - شمال.", date: "۱۴۰۵/۰۴/۰۶", scope: "شرکت", holdingId: "h-paya", companyId: "c-azadrah" },
  { id: "sn9", title: "دستور جلسه کمیته تحول دیجیتال بانک سینا", summary: "بررسی پروژه‌های هوش مصنوعی بانکداری — ویژه اعضای بانک سینا.", date: "۱۴۰۵/۰۴/۰۷", scope: "شرکت", holdingId: "h-mali", companyId: "c-bank-sina" },
];

// --------------------- پورتفولیوی قراردادهای تبادل فناوری ---------------------
export type TechTransferContract = {
  id: string;
  type: string; // نوع قرارداد
  title: string;
  nazer: string; // ناظر فنی پروژه
  city: string;
  holding: string; // هلدینگ متقاضی
  company: string; // شرکت متقاضی
  mojri: string; // مجری پروژه
  companyRole: string; // نقش شرکت متقاضی
  daneshmandRole: string; // نقش دانشمند
  amount: string; // مبلغ قرارداد
  commitment: string; // تعهد دانشمند
  physicalProgress: number; // درصد پیشرفت فیزیکی
  timeProgress: number; // درصد پیشرفت زمانی
  financialProgress: number; // درصد پیشرفت مالی
  guarantee: string;
  note?: string;
};

export const techTransferContracts: TechTransferContract[] = [
  { id: "tt1", type: "تبادل فناوری", title: "پهپاد سمپاش کشاورزی — مزارع دشت ناز", nazer: "کارشناس ارشد کشاورزی و امنیت غذایی", city: "ساری", holding: "فردوس پارس", company: "دشت ناز ساری", mojri: "شرکت فناور پرواز سبز", companyRole: "بهره‌بردار و کارفرما", daneshmandRole: "ناظر و هماهنگ‌کننده", amount: "۱۸ میلیارد ریال", commitment: "۹ میلیارد ریال (۵۰٪)", physicalProgress: 70, timeProgress: 80, financialProgress: 55, guarantee: "ضمانت‌نامه بانکی" },
  { id: "tt2", type: "تبادل فناوری", title: "سامانه MOT چاه‌های نفت", nazer: "رییس بخش انرژی و نفت و گاز", city: "اهواز", holding: "انرژی گستر سینا", company: "پدکس", mojri: "شرکت دانش‌بنیان ژرف‌کاو", companyRole: "کارفرما", daneshmandRole: "هماهنگ‌کننده مالی", amount: "۴۲ میلیارد ریال", commitment: "۲۱ میلیارد ریال (۵۰٪)", physicalProgress: 45, timeProgress: 60, financialProgress: 40, guarantee: "سفته", note: "صورت‌وضعیت ۲ در انتظار تایید ناظر" },
  { id: "tt3", type: "تبادل فناوری", title: "انبارداری هوشمند مبتنی بر UWB", nazer: "رییس بخش اقتصاد دیجیتال", city: "تهران", holding: "صنایع غذایی سینا", company: "بهنوش ایران", mojri: "تیم فناور ردیاب", companyRole: "بهره‌بردار", daneshmandRole: "ناظر و هماهنگ‌کننده", amount: "۱۲ میلیارد ریال", commitment: "۶ میلیارد ریال (۵۰٪)", physicalProgress: 90, timeProgress: 95, financialProgress: 75, guarantee: "چک" },
  { id: "tt4", type: "تبادل فناوری", title: "تشخیص خودکار حوادث آزادراه تهران - شمال", nazer: "رییس بخش حمل‌ونقل ترکیبی", city: "تهران", holding: "پایا ترابر سینا", company: "آزادراه تهران - شمال", mojri: "شرکت بینا رایان", companyRole: "بهره‌بردار و کارفرما", daneshmandRole: "ناظر و هماهنگ‌کننده", amount: "۲۵ میلیارد ریال", commitment: "۱۲.۵ میلیارد ریال (۵۰٪)", physicalProgress: 100, timeProgress: 100, financialProgress: 85, guarantee: "ضمانت‌نامه بانکی", note: "در انتظار آزادسازی حسن انجام کار" },
  { id: "tt5", type: "تبادل فناوری", title: "لیدار پایش واگن‌های باری", nazer: "رییس بخش حمل‌ونقل ترکیبی", city: "اصفهان", holding: "پایا ترابر سینا", company: "سینا ریل پارس", mojri: "شرکت فوتونیک آریا", companyRole: "خریدار", daneshmandRole: "پیمانکار", amount: "۹ میلیارد ریال", commitment: "۴.۵ میلیارد ریال (۵۰٪)", physicalProgress: 30, timeProgress: 45, financialProgress: 25, guarantee: "سفته", note: "تاخیر در واردات قطعات — درخواست الحاقیه زمانی" },
  { id: "tt6", type: "تبادل فناوری", title: "کیت تشخیص سریع آنتی‌بیوتیک در شیر خام", nazer: "کارشناس ارشد امنیت غذایی", city: "تهران", holding: "صنایع غذایی سینا", company: "لبنیات پاک", mojri: "شرکت زیست‌فناور کیمیا", companyRole: "بهره‌بردار", daneshmandRole: "ناظر و هماهنگ‌کننده", amount: "۷ میلیارد ریال", commitment: "۳.۵ میلیارد ریال (۵۰٪)", physicalProgress: 60, timeProgress: 55, financialProgress: 50, guarantee: "چک" },
  { id: "tt7", type: "آموزشی-پژوهشی", title: "برنامه جامع آموزش هوش مصنوعی", nazer: "مجتبی سروش‌پور", city: "تهران", holding: "ستاد دانشمند", company: "ایرانسل لبز", mojri: "موسسه آموزشی و پژوهشی سینا", companyRole: "کارفرما", daneshmandRole: "طرف دوم", amount: "۹۹ میلیارد ریال", commitment: "—", physicalProgress: 40, timeProgress: 50, financialProgress: 35, guarantee: "—" },
  { id: "tt8", type: "تبادل فناوری", title: "کوره عملیات حرارتی قطعات نیروگاهی", nazer: "رییس بخش انرژی", city: "کرج", holding: "برق و انرژی صبا", company: "نیروگاه‌های صبا", mojri: "شرکت مهندسی حرارت گستر", companyRole: "کارفرما", daneshmandRole: "ناظر و هماهنگ‌کننده", amount: "۳۱ میلیارد ریال", commitment: "۱۵.۵ میلیارد ریال (۵۰٪)", physicalProgress: 15, timeProgress: 20, financialProgress: 20, guarantee: "ضمانت‌نامه بانکی", note: "نیازمند استعلام از واحد مالی" },
];

// ------------------------ سندهای فرصت‌های تحقیق و توسعه ------------------------
export type RndOpportunityDoc = {
  id: string;
  company: string;
  holding: string;
  progress: number; // ۰ تا ۱۰۰
  statusLabel: string;
  obstacles?: string;
};

// state machine تدوین سند: ۱۰=بازدید و احصاء عناوین، ۲۰=عناوین در بررسی،
// ۴۵=ویرایش اول ارائه‌شده، ۶۵=اصلاحات تیم تا ثریا، ۸۵=پیش‌نویس نهایی، ۱۰۰=تحویل‌شده
export const rndDocStates: { threshold: number; label: string }[] = [
  { threshold: 10, label: "بازدید و احصاء عناوین" },
  { threshold: 20, label: "عناوین احصاء شده — در بررسی" },
  { threshold: 45, label: "ویرایش اول ارائه شده" },
  { threshold: 65, label: "اصلاحات توسط تیم تا ثریا" },
  { threshold: 85, label: "پیش‌نویس نهایی در بررسی" },
  { threshold: 100, label: "سند تدوین، تایید و تحویل شده" },
];

export const rndOpportunityDocs: RndOpportunityDoc[] = [
  { id: "rd1", company: "دشت ناز ساری", holding: "فردوس پارس", progress: 100, statusLabel: "سند تدوین، تایید و تحویل شده" },
  { id: "rd2", company: "بهنوش ایران", holding: "صنایع غذایی سینا", progress: 100, statusLabel: "سند تدوین، تایید و تحویل شده" },
  { id: "rd3", company: "زمزم ایران", holding: "صنایع غذایی سینا", progress: 85, statusLabel: "پیش‌نویس نهایی در بررسی" },
  { id: "rd4", company: "لبنیات پاک", holding: "صنایع غذایی سینا", progress: 65, statusLabel: "اصلاحات توسط تیم تا ثریا" },
  { id: "rd5", company: "سینا ریل پارس", holding: "پایا ترابر سینا", progress: 45, statusLabel: "ویرایش اول ارائه شده" },
  { id: "rd6", company: "آزادراه تهران - شمال", holding: "پایا ترابر سینا", progress: 100, statusLabel: "سند تدوین، تایید و تحویل شده" },
  { id: "rd7", company: "بانک سینا", holding: "مالی و سرمایه‌گذاری سینا", progress: 20, statusLabel: "عناوین احصاء شده — در بررسی", obstacles: "در انتظار تعیین نماینده تحول دیجیتال" },
  { id: "rd8", company: "بیمه سینا", holding: "مالی و سرمایه‌گذاری سینا", progress: 10, statusLabel: "بازدید و احصاء عناوین" },
  { id: "rd9", company: "نیروگاه‌های صبا", holding: "برق و انرژی صبا", progress: 45, statusLabel: "ویرایش اول ارائه شده" },
  { id: "rd10", company: "انرژی گستر سینا", holding: "برق و انرژی صبا", progress: 65, statusLabel: "اصلاحات توسط تیم تا ثریا", obstacles: "نیاز به جلسه تکمیلی با معاونت بهره‌برداری" },
  { id: "rd11", company: "کاوه پارس (فولاد)", holding: "کاوه پارس", progress: 20, statusLabel: "عناوین احصاء شده — در بررسی" },
  { id: "rd12", company: "هتل‌های پارسیان", holding: "سیاحتی پارسیان", progress: 10, statusLabel: "بازدید و احصاء عناوین" },
];

// ------------------------------ جایزه نوآوری ------------------------------
export type AwardTrack = {
  id: string;
  title: string;
  categories: string[];
  submissions: number;
  judged: number;
};

export const awardTracks: AwardTrack[] = [
  { id: "aw1", title: "نوآوری‌های پیاده‌سازی‌شده", categories: ["نوآوری در فرآیند", "تحول دیجیتال", "ساخت داخل", "محصول", "خدمت", "نوآوری سبز"], submissions: 34, judged: 21 },
  { id: "aw2", title: "ایده‌های نوآورانه", categories: ["فرآیندی", "محصول و خدمت", "دیجیتال"], submissions: 58, judged: 40 },
  { id: "aw3", title: "راه‌حل‌های خلاقانه", categories: ["حل مسئله صنعتی", "بهبود بهره‌وری"], submissions: 19, judged: 12 },
];

export type AwardEntry = {
  id: string;
  title: string;
  track: string;
  company: string;
  status: "ثبت‌شده" | "صحت‌سنجی هلدینگ" | "در حال داوری" | "امتیازدهی شده" | "منتخب مرحله نهایی";
  score?: number;
  editUsed: boolean; // یک بار امکان ویرایش
};

export const awardEntries: AwardEntry[] = [
  { id: "ae1", title: "بازیافت حرارت خط پاستوریزاسیون", track: "نوآوری‌های پیاده‌سازی‌شده", company: "لبنیات پاک", status: "منتخب مرحله نهایی", score: 88, editUsed: true },
  { id: "ae2", title: "داشبورد پایش لحظه‌ای مصرف انرژی نیروگاه", track: "نوآوری‌های پیاده‌سازی‌شده", company: "نیروگاه‌های صبا", status: "امتیازدهی شده", score: 76, editUsed: false },
  { id: "ae3", title: "ایده سامانه رزرو هوشمند ناوگان ریلی", track: "ایده‌های نوآورانه", company: "سینا ریل پارس", status: "در حال داوری", editUsed: true },
  { id: "ae4", title: "کاهش ضایعات بطری با بازرسی ماشینی", track: "راه‌حل‌های خلاقانه", company: "زمزم ایران", status: "صحت‌سنجی هلدینگ", editUsed: false },
  { id: "ae5", title: "کیف پول سازمانی کارکنان", track: "ایده‌های نوآورانه", company: "بانک سینا", status: "ثبت‌شده", editUsed: false },
];

// --------------------------------- آموزش ---------------------------------
export type TrainingCourse = {
  id: string;
  title: string;
  instructor: string;
  date: string;
  hours: number;
  capacity: number;
  enrolled: number;
  status: "ثبت‌نام باز" | "در حال برگزاری" | "برگزار شده";
  attendanceRate?: number; // درصد حضور
  satisfaction?: number; // ارزشیابی از ۵
  effectiveness?: "در انتظار سنجش" | "اثربخش" | "نیازمند دوره تکمیلی";
  certificates?: number; // گواهینامه صادرشده
};

export const trainingCourses: TrainingCourse[] = [
  { id: "tc1", title: "مدیریت پروژه‌های تحقیق و توسعه (ویژه مدیران پروژه)", instructor: "موسسه آموزشی و پژوهشی سینا", date: "۱۴۰۵/۰۲/۱۰", hours: 16, capacity: 30, enrolled: 28, status: "برگزار شده", attendanceRate: 92, satisfaction: 4.4, effectiveness: "اثربخش", certificates: 26 },
  { id: "tc2", title: "ارزیابی و ارزش‌گذاری طرح‌های فناورانه", instructor: "کانون ارزیابی و شایستگی دانشمند", date: "۱۴۰۵/۰۳/۰۵", hours: 12, capacity: 25, enrolled: 25, status: "برگزار شده", attendanceRate: 88, satisfaction: 4.1, effectiveness: "نیازمند دوره تکمیلی", certificates: 22 },
  { id: "tc3", title: "آشنایی با فرآیندهای صندوق نوآور (ویژه راهبران و ناظران)", instructor: "صندوق نوآور", date: "۱۴۰۵/۰۴/۲۵", hours: 8, capacity: 40, enrolled: 31, status: "در حال برگزاری", attendanceRate: 95 },
  { id: "tc4", title: "هوش مصنوعی کاربردی در صنعت (مقدماتی)", instructor: "ایرانسل لبز — برنامه جامع AI", date: "۱۴۰۵/۰۵/۱۰", hours: 24, capacity: 60, enrolled: 44, status: "ثبت‌نام باز" },
  { id: "tc5", title: "مستندسازی و مدیریت دانش پروژه‌ها", instructor: "مدیریت آموزش‌های تخصصی", date: "۱۴۰۵/۰۵/۲۰", hours: 8, capacity: 35, enrolled: 12, status: "ثبت‌نام باز" },
  { id: "tc6", title: "تربیت ارزیاب جایزه نوآوری و فناوری بنیاد", instructor: "معاونت ترویج نوآوری", date: "۱۴۰۵/۰۶/۰۱", hours: 16, capacity: 20, enrolled: 7, status: "ثبت‌نام باز" },
];

// -------------------------- گردش امضای الکترونیک --------------------------
export type SignatureStep = {
  role: string;
  name: string;
  status: "امضا شد" | "در انتظار امضا" | "در نوبت";
  date?: string;
};

export type ESignDocument = {
  id: string;
  title: string;
  kind: "قرارداد صندوق نوآور" | "قرارداد تبادل فناوری" | "متمم قرارداد" | "صورت‌جلسه";
  relatedTo: string;
  method: "امضای الکترونیک غیرحضوری";
  steps: SignatureStep[];
  letterNo?: string; // شماره نامه پس از تکمیل امضاها
};

export const eSignDocuments: ESignDocument[] = [
  {
    id: "es1",
    title: "قرارداد پروژه NF-1404-1051 — سامانه تشخیص نقص خط تولید زمزم",
    kind: "قرارداد صندوق نوآور",
    relatedTo: "NF-1404-1051",
    method: "امضای الکترونیک غیرحضوری",
    steps: [
      { role: "مجری", name: "سیگنال امید", status: "در انتظار امضا" },
      { role: "راهبر", name: "شتابدهی تا ثریا", status: "در نوبت" },
      { role: "مدیرعامل موسسه", name: "صاحب امضا ۱", status: "در نوبت" },
      { role: "عضو هیئت مدیره", name: "صاحب امضا ۲", status: "در نوبت" },
    ],
  },
  {
    id: "es2",
    title: "قرارداد پروژه NF-1404-1053 — قطعات CFRP بدنه خودرو",
    kind: "قرارداد صندوق نوآور",
    relatedTo: "NF-1404-1053",
    method: "امضای الکترونیک غیرحضوری",
    steps: [
      { role: "مجری", name: "کربنیکس", status: "امضا شد", date: "۱۴۰۴/۱۰/۲۲" },
      { role: "راهبر", name: "شتابدهی تا ثریا", status: "امضا شد", date: "۱۴۰۴/۱۰/۲۳" },
      { role: "مدیرعامل موسسه", name: "صاحب امضا ۱", status: "امضا شد", date: "۱۴۰۴/۱۰/۲۴" },
      { role: "عضو هیئت مدیره", name: "صاحب امضا ۲", status: "امضا شد", date: "۱۴۰۴/۱۰/۲۵" },
    ],
    letterNo: "د/۱۴۰۴/۲۹۸۱",
  },
  {
    id: "es3",
    title: "متمم زمانی قرارداد لیدار واگن‌های باری",
    kind: "متمم قرارداد",
    relatedTo: "سینا ریل پارس",
    method: "امضای الکترونیک غیرحضوری",
    steps: [
      { role: "مجری", name: "فوتونیک آریا", status: "امضا شد", date: "۱۴۰۵/۰۴/۰۱" },
      { role: "ناظر فنی", name: "رییس بخش حمل‌ونقل", status: "امضا شد", date: "۱۴۰۵/۰۴/۰۲" },
      { role: "مدیرعامل موسسه", name: "صاحب امضا ۱", status: "در انتظار امضا" },
      { role: "عضو هیئت مدیره", name: "صاحب امضا ۲", status: "در نوبت" },
    ],
  },
];

// ------------------------- فرم‌های امتیازدهی داوری -------------------------
export type ScreeningForm = {
  total: number; // از ۲۰۰
  threshold: number; // حد نصاب ۸۰
  topCriteria: { title: string; max: number; score: number }[]; // منتخب از ۲۲ معیار
};

export type JuryForm = {
  total: number; // از ۱۰۰
  threshold: number; // حد نصاب ~۵۰
  dimensions: { title: string; max: number; score: number }[]; // ۵ بُعد
};

export const nfEvaluations: Record<string, { screening: ScreeningForm; jury?: JuryForm }> = {
  "NF-1404-1001": {
    screening: {
      total: 138,
      threshold: 80,
      topCriteria: [
        { title: "جانمایی در زنجیره ارزش بنیاد", max: 20, score: 16 },
        { title: "نوآوری و تمایز فناورانه", max: 15, score: 12 },
        { title: "توان فنی و سابقه تیم", max: 15, score: 11 },
        { title: "اندازه و رشد بازار", max: 15, score: 9 },
        { title: "آمادگی نمونه اولیه (TRL)", max: 10, score: 7 },
      ],
    },
    jury: {
      total: 71,
      threshold: 50,
      dimensions: [
        { title: "راهبردی", max: 20, score: 16 },
        { title: "فنی و اجرایی", max: 25, score: 18 },
        { title: "تجاری و بازار", max: 25, score: 16 },
        { title: "حقوقی", max: 10, score: 8 },
        { title: "مالی", max: 20, score: 13 },
      ],
    },
  },
  "NF-1404-1004": {
    screening: {
      total: 121,
      threshold: 80,
      topCriteria: [
        { title: "جانمایی در زنجیره ارزش بنیاد", max: 20, score: 13 },
        { title: "نوآوری و تمایز فناورانه", max: 15, score: 12 },
        { title: "توان فنی و سابقه تیم", max: 15, score: 10 },
        { title: "اندازه و رشد بازار", max: 15, score: 10 },
        { title: "آمادگی نمونه اولیه (TRL)", max: 10, score: 6 },
      ],
    },
    jury: {
      total: 66,
      threshold: 50,
      dimensions: [
        { title: "راهبردی", max: 20, score: 14 },
        { title: "فنی و اجرایی", max: 25, score: 17 },
        { title: "تجاری و بازار", max: 25, score: 15 },
        { title: "حقوقی", max: 10, score: 7 },
        { title: "مالی", max: 20, score: 13 },
      ],
    },
  },
  "NF-1404-1047": {
    screening: {
      total: 145,
      threshold: 80,
      topCriteria: [
        { title: "جانمایی در زنجیره ارزش بنیاد", max: 20, score: 17 },
        { title: "نوآوری و تمایز فناورانه", max: 15, score: 13 },
        { title: "توان فنی و سابقه تیم", max: 15, score: 12 },
        { title: "اندازه و رشد بازار", max: 15, score: 10 },
        { title: "آمادگی نمونه اولیه (TRL)", max: 10, score: 8 },
      ],
    },
    jury: {
      total: 74,
      threshold: 50,
      dimensions: [
        { title: "راهبردی", max: 20, score: 17 },
        { title: "فنی و اجرایی", max: 25, score: 19 },
        { title: "تجاری و بازار", max: 25, score: 17 },
        { title: "حقوقی", max: 10, score: 8 },
        { title: "مالی", max: 20, score: 13 },
      ],
    },
  },
  "NF-1404-1051": {
    screening: {
      total: 152,
      threshold: 80,
      topCriteria: [
        { title: "جانمایی در زنجیره ارزش بنیاد", max: 20, score: 18 },
        { title: "نوآوری و تمایز فناورانه", max: 15, score: 12 },
        { title: "توان فنی و سابقه تیم", max: 15, score: 13 },
        { title: "اندازه و رشد بازار", max: 15, score: 11 },
        { title: "آمادگی نمونه اولیه (TRL)", max: 10, score: 8 },
      ],
    },
    jury: {
      total: 78,
      threshold: 50,
      dimensions: [
        { title: "راهبردی", max: 20, score: 18 },
        { title: "فنی و اجرایی", max: 25, score: 20 },
        { title: "تجاری و بازار", max: 25, score: 18 },
        { title: "حقوقی", max: 10, score: 8 },
        { title: "مالی", max: 20, score: 14 },
      ],
    },
  },
  "NF-1404-1053": {
    screening: {
      total: 109,
      threshold: 80,
      topCriteria: [
        { title: "جانمایی در زنجیره ارزش بنیاد", max: 20, score: 12 },
        { title: "نوآوری و تمایز فناورانه", max: 15, score: 11 },
        { title: "توان فنی و سابقه تیم", max: 15, score: 9 },
        { title: "اندازه و رشد بازار", max: 15, score: 8 },
        { title: "آمادگی نمونه اولیه (TRL)", max: 10, score: 6 },
      ],
    },
    jury: {
      total: 58,
      threshold: 50,
      dimensions: [
        { title: "راهبردی", max: 20, score: 12 },
        { title: "فنی و اجرایی", max: 25, score: 15 },
        { title: "تجاری و بازار", max: 25, score: 13 },
        { title: "حقوقی", max: 10, score: 7 },
        { title: "مالی", max: 20, score: 11 },
      ],
    },
  },
};

// ------------------------------ دستیار هوشمند ------------------------------
export type AssistantExchange = { q: string; a: string };

export const assistantSamples: AssistantExchange[] = [
  {
    q: "پروژه رزورسینول چی شد؟",
    a: "پروژه NF-1404-1004 «استحصال رزورسینول» (مجری: رزوراه) در گام «نظارت و راهبری» است. پیشرفت تاییدشده ۲۸٪ و مطابق زمان‌بندی است. گزارش فاز ۱ تایید نهایی شده و پرداخت مرحله ۱ (۲۶۶ میلیون ریال) در انتظار دستور پرداخت مدیر صندوق است. تاکنون ۶۳۰ میلیون ریال (پیش‌پرداخت) به مجری واریز شده.",
  },
  {
    q: "کدام پروژه‌ها از برنامه عقب هستند؟",
    a: "پروژه NF-1404-1053 «قطعات CFRP» با پیشرفت ۸٪ حدود ۱۲٪ از برنامه عقب است (علت: انتظار پرداخت پیش‌پرداخت). همچنین در قرارداد تبادل فناوری «لیدار واگن‌های باری» پیشرفت فیزیکی ۳۰٪ در برابر پیشرفت زمانی ۴۵٪ است و متمم زمانی در گردش امضاست.",
  },
  {
    q: "کدام گزارش‌ها بررسی‌نشده مانده‌اند؟",
    a: "گزارش ماهانه ماه چهارم پروژه NF-1404-1001 بیش از ۱۵ روز در انتظار بررسی ناظر (مرضیه خاتمی‌فرد) است — اعلان اسکالیشن ارسال شده. گزارش ماهانه ماه پنجم پروژه NF-1404-1047 نیز نزد هر سه بررسی‌کننده در صف است.",
  },
  {
    q: "خلاصه وضعیت مالی صندوق نوآور را بده",
    a: "۵ پروژه فعال با مجموع مبلغ ۱۴٬۰۰۰ میلیون ریال (سهم دانشمند ۵۰٪). پرداختی تاکنون ۱٬۹۲۰ میلیون ریال، در انتظار پرداخت ۹۶۴ میلیون ریال، حسن انجام کار نزد مجریان ۱۹۲ میلیون ریال. نزدیک‌ترین اقدام مالی: دستور پرداخت مرحله ۱ پروژه ۱۰۰۱ که صادر شده و نزد واحد مالی است.",
  },
  {
    q: "آیا پروژه خوابیده‌ای داریم؟",
    a: "بر اساس گزارش‌های تعاملات، هیچ پروژه‌ای بیش از یک ماه بدون تعامل معنادار نبوده است. نزدیک‌ترین مورد به هشدار: NF-1404-1001 که گزارش تعاملات ماه چهارم آن هنوز بارگذاری نشده — اگر تا ۷ روز دیگر ثبت نشود، به‌عنوان «در معرض توقف» علامت‌گذاری می‌شود.",
  },
];
