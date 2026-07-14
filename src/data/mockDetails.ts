// ---------------------------------------------------------------------------
// Advanced module details — keyed by record id from mock.ts
// (project management, contracts, funds, research, advanced reports)
// ---------------------------------------------------------------------------

// ------------------------- Project management -----------------------------
export type ProjectMilestone = {
  id: string;
  title: string;
  due: string;
  status: "انجام‌شده" | "در حال انجام" | "پیش‌رو" | "در خطر";
};

export type ProjectRisk = {
  id: string;
  title: string;
  severity: "کم" | "متوسط" | "بحرانی";
  probability: "کم" | "متوسط" | "زیاد";
  status: "باز" | "در حال رفع" | "بسته";
  owner: string;
  mitigation: string;
};

export type ProjectMember = {
  id: string;
  name: string;
  role: string;
  allocation: number;
  openTasks: number;
};

export type ProjectExpense = {
  id: string;
  title: string;
  category: string;
  amount: string;
  date: string;
  status: "پرداخت‌شده" | "در انتظار تأیید" | "برنامه‌ریزی‌شده";
};

export type ProjectMinute = {
  id: string;
  title: string;
  date: string;
  attendees: number;
  decisions: number;
  followUps: number;
};

export type ProjectDetail = {
  manager: string;
  sponsor: string;
  budgetTotal: string;
  budgetSpent: string;
  milestones: ProjectMilestone[];
  risks: ProjectRisk[];
  team: ProjectMember[];
  expenses: ProjectExpense[];
  minutes: ProjectMinute[];
};

export const projectDetails: Record<string, ProjectDetail> = {
  pr1: {
    manager: "محسن مردعلی",
    sponsor: "بنیاد علوی",
    budgetTotal: "۱۲٬۰۰۰٬۰۰۰٬۰۰۰ ریال",
    budgetSpent: "۶٬۶۰۰٬۰۰۰٬۰۰۰ ریال",
    milestones: [
      { id: "m1", title: "اتمام مطالعات میدانی و نیازسنجی روستاها", due: "۱۴۰۵/۰۱/۲۰", status: "انجام‌شده" },
      { id: "m2", title: "تحویل فاز اول زیرساخت آب‌رسانی (۱۲ روستا)", due: "۱۴۰۵/۰۲/۱۵", status: "انجام‌شده" },
      { id: "m3", title: "راه‌اندازی ۸ کارگاه اشتغال خرد", due: "۱۴۰۵/۰۳/۱۰", status: "در حال انجام" },
      { id: "m4", title: "افتتاح رسمی و تحویل به بهره‌بردار", due: "۱۴۰۵/۰۴/۰۱", status: "پیش‌رو" },
    ],
    risks: [
      { id: "r1", title: "تأخیر در تأمین لوله و اتصالات آب‌رسانی", severity: "بحرانی", probability: "متوسط", status: "در حال رفع", owner: "تیم تدارکات", mitigation: "عقد قرارداد با تأمین‌کننده دوم و پیش‌خرید اقلام بحرانی" },
      { id: "r2", title: "کمبود نیروی آموزش‌دیده محلی برای کارگاه‌ها", severity: "متوسط", probability: "زیاد", status: "باز", owner: "تیم آموزش", mitigation: "دوره تربیت تسهیل‌گر ۲۴ نفر-ساعت پیش از راه‌اندازی" },
      { id: "r3", title: "نوسان قیمت مصالح ساختمانی", severity: "متوسط", probability: "متوسط", status: "بسته", owner: "واحد مالی", mitigation: "قرارداد با نرخ ثابت با پیمانکار عمرانی" },
    ],
    team: [
      { id: "tm1", name: "محسن مردعلی", role: "مدیر پروژه", allocation: 80, openTasks: 1 },
      { id: "tm2", name: "وحید خاوئی", role: "کارشناس اشتغال و توانمندسازی", allocation: 60, openTasks: 1 },
      { id: "tm3", name: "تیم عمرانی", role: "پیمانکار زیرساخت", allocation: 100, openTasks: 1 },
      { id: "tm4", name: "تیم آموزش", role: "تسهیل‌گری و آموزش", allocation: 40, openTasks: 1 },
    ],
    expenses: [
      { id: "e1", title: "خرید لوله و اتصالات فاز اول", category: "زیرساخت", amount: "۲٬۸۰۰٬۰۰۰٬۰۰۰ ریال", date: "۱۴۰۵/۰۱/۲۸", status: "پرداخت‌شده" },
      { id: "e2", title: "دستمزد پیمانکار عمرانی — صورت‌وضعیت ۲", category: "پیمانکاری", amount: "۱٬۹۰۰٬۰۰۰٬۰۰۰ ریال", date: "۱۴۰۵/۰۲/۲۰", status: "پرداخت‌شده" },
      { id: "e3", title: "تجهیز کارگاه‌های اشتغال (چرخ خیاطی، ابزار)", category: "تجهیزات", amount: "۱٬۲۰۰٬۰۰۰٬۰۰۰ ریال", date: "۱۴۰۵/۰۳/۰۵", status: "در انتظار تأیید" },
      { id: "e4", title: "دوره تربیت تسهیل‌گران محلی", category: "آموزش", amount: "۳۵۰٬۰۰۰٬۰۰۰ ریال", date: "۱۴۰۵/۰۳/۲۰", status: "برنامه‌ریزی‌شده" },
    ],
    minutes: [
      { id: "mn1", title: "جلسه هماهنگی با فرمانداری قلعه‌گنج", date: "۱۴۰۵/۰۲/۰۸", attendees: 9, decisions: 4, followUps: 3 },
      { id: "mn2", title: "کمیته راهبری — پایش پیشرفت فاز دوم", date: "۱۴۰۵/۰۲/۲۲", attendees: 6, decisions: 3, followUps: 2 },
    ],
  },
  pr2: {
    manager: "وحید خاوئی",
    sponsor: "معاونت برنامه‌ریزی بنیاد",
    budgetTotal: "۵٬۰۰۰٬۰۰۰٬۰۰۰ ریال",
    budgetSpent: "۱٬۵۰۰٬۰۰۰٬۰۰۰ ریال",
    milestones: [
      { id: "m1", title: "دسته‌بندی و برچسب‌گذاری آرشیو اسناد", due: "۱۴۰۵/۰۳/۰۱", status: "انجام‌شده" },
      { id: "m2", title: "استقرار موتور جستجوی پیشرفته", due: "۱۴۰۵/۰۳/۲۵", status: "در خطر" },
      { id: "m3", title: "آموزش کاربران کلیدی واحدها", due: "۱۴۰۵/۰۴/۱۵", status: "پیش‌رو" },
    ],
    risks: [
      { id: "r1", title: "تأخیر تیم سامانه در ماژول جستجو", severity: "بحرانی", probability: "زیاد", status: "باز", owner: "تیم سامانه", mitigation: "افزودن یک توسعه‌دهنده و بازتعریف محدوده MVP" },
      { id: "r2", title: "مقاومت واحدها در به‌اشتراک‌گذاری اسناد", severity: "متوسط", probability: "متوسط", status: "در حال رفع", owner: "دبیرخانه", mitigation: "ابلاغیه سطوح دسترسی و جلسات توجیهی" },
    ],
    team: [
      { id: "tm1", name: "وحید خاوئی", role: "مدیر پروژه", allocation: 50, openTasks: 1 },
      { id: "tm2", name: "دبیرخانه", role: "متولی محتوا", allocation: 30, openTasks: 0 },
      { id: "tm3", name: "تیم سامانه", role: "توسعه و استقرار", allocation: 100, openTasks: 2 },
    ],
    expenses: [
      { id: "e1", title: "لایسنس موتور جستجو", category: "نرم‌افزار", amount: "۶۰۰٬۰۰۰٬۰۰۰ ریال", date: "۱۴۰۵/۰۲/۱۰", status: "پرداخت‌شده" },
      { id: "e2", title: "دستمزد تیم دسته‌بندی اسناد", category: "نیروی انسانی", amount: "۹۰۰٬۰۰۰٬۰۰۰ ریال", date: "۱۴۰۵/۰۲/۲۸", status: "پرداخت‌شده" },
    ],
    minutes: [
      { id: "mn1", title: "جلسه کیک‌آف با معاونت برنامه‌ریزی", date: "۱۴۰۵/۰۱/۳۰", attendees: 8, decisions: 5, followUps: 4 },
    ],
  },
  pr3: {
    manager: "واحد حقوقی",
    sponsor: "هیئت مدیره بنیاد",
    budgetTotal: "۳٬۰۰۰٬۰۰۰٬۰۰۰ ریال",
    budgetSpent: "۲۴۰٬۰۰۰٬۰۰۰ ریال",
    milestones: [
      { id: "m1", title: "احصای فهرست اموال مازاد قابل واگذاری", due: "۱۴۰۵/۰۴/۱۰", status: "در حال انجام" },
      { id: "m2", title: "ارزش‌گذاری رسمی دارایی‌ها", due: "۱۴۰۵/۰۴/۲۰", status: "در خطر" },
      { id: "m3", title: "برگزاری نخستین مزایده عمومی", due: "۱۴۰۵/۰۵/۱۵", status: "پیش‌رو" },
    ],
    risks: [
      { id: "r1", title: "طولانی‌شدن فرآیند ارزش‌گذاری کارشناسی", severity: "بحرانی", probability: "زیاد", status: "باز", owner: "واحد حقوقی", mitigation: "به‌کارگیری هم‌زمان سه هیئت کارشناسی رسمی" },
    ],
    team: [
      { id: "tm1", name: "واحد حقوقی", role: "راهبر واگذاری", allocation: 70, openTasks: 1 },
      { id: "tm2", name: "واحد مالی", role: "ارزش‌گذاری و تسویه", allocation: 40, openTasks: 0 },
    ],
    expenses: [
      { id: "e1", title: "حق‌الزحمه هیئت کارشناسی رسمی", category: "خدمات مشاوره", amount: "۲۴۰٬۰۰۰٬۰۰۰ ریال", date: "۱۴۰۵/۰۴/۰۵", status: "در انتظار تأیید" },
    ],
    minutes: [],
  },
};

// ----------------------------- Contracts ----------------------------------
export type ContractPayment = {
  id: string;
  title: string;
  amount: string;
  due: string;
  status: "پرداخت‌شده" | "در انتظار تأیید" | "آینده";
};

export type ContractObligation = {
  id: string;
  title: string;
  due: string;
  done: boolean;
};

export type ContractApproval = {
  id: string;
  role: string;
  name: string;
  status: "تأیید شده" | "در انتظار" | "رد شده";
  date?: string;
};

export type ContractEvent = { id: string; text: string; date: string };

export type ContractDetail = {
  type: "فناورانه" | "پژوهشی" | "عمرانی" | "خدماتی";
  method: "فراخوان عمومی" | "استعلام محدود" | "ترک تشریفات";
  guarantee: string;
  payments: ContractPayment[];
  obligations: ContractObligation[];
  approvals: ContractApproval[];
  history: ContractEvent[];
};

export const contractDetails: Record<string, ContractDetail> = {
  ct1: {
    type: "عمرانی",
    method: "استعلام محدود",
    guarantee: "ضمانت‌نامه بانکی حسن انجام کار — ۱۰٪ مبلغ قرارداد",
    payments: [
      { id: "p1", title: "پیش‌پرداخت (۲۵٪)", amount: "۱٬۰۵۰٬۰۰۰٬۰۰۰ ریال", due: "۱۴۰۵/۰۲/۰۱", status: "پرداخت‌شده" },
      { id: "p2", title: "صورت‌وضعیت ۱ — اتمام تیرگذاری ۶ روستا", amount: "۱٬۲۶۰٬۰۰۰٬۰۰۰ ریال", due: "۱۴۰۵/۰۴/۰۱", status: "در انتظار تأیید" },
      { id: "p3", title: "تسویه نهایی پس از تحویل موقت", amount: "۱٬۸۹۰٬۰۰۰٬۰۰۰ ریال", due: "۱۴۰۵/۰۶/۱۵", status: "آینده" },
    ],
    obligations: [
      { id: "o1", title: "تحویل نقشه‌های اجرایی شبکه توزیع", due: "۱۴۰۵/۰۲/۲۰", done: true },
      { id: "o2", title: "برق‌رسانی به ۶ روستای اولویت‌دار", due: "۱۴۰۵/۰۴/۰۱", done: true },
      { id: "o3", title: "برق‌رسانی به ۵ روستای باقی‌مانده", due: "۱۴۰۵/۰۵/۳۰", done: false },
      { id: "o4", title: "آموزش بهره‌برداری به دهیاری‌ها", due: "۱۴۰۵/۰۶/۱۰", done: false },
    ],
    approvals: [
      { id: "a1", role: "کارشناس فنی", name: "وحید خاوئی", status: "تأیید شده", date: "۱۴۰۵/۰۱/۲۵" },
      { id: "a2", role: "مدیر امور قراردادها", name: "محسن مردعلی", status: "تأیید شده", date: "۱۴۰۵/۰۱/۲۷" },
      { id: "a3", role: "معاونت مالی", name: "واحد مالی", status: "تأیید شده", date: "۱۴۰۵/۰۱/۲۹" },
    ],
    history: [
      { id: "h1", text: "قرارداد در سامانه ثبت شد", date: "۱۴۰۵/۰۱/۲۰" },
      { id: "h2", text: "زنجیره تأیید تکمیل و قرارداد ابلاغ شد", date: "۱۴۰۵/۰۱/۲۹" },
      { id: "h3", text: "پیش‌پرداخت واریز شد", date: "۱۴۰۵/۰۲/۰۱" },
      { id: "h4", text: "صورت‌وضعیت ۱ توسط پیمانکار بارگذاری شد", date: "۱۴۰۵/۰۳/۲۸" },
    ],
  },
  ct2: {
    type: "خدماتی",
    method: "فراخوان عمومی",
    guarantee: "سفته به مبلغ ۲۰٪ قرارداد",
    payments: [
      { id: "p1", title: "پرداخت ماهانه بر اساس تناژ حمل", amount: "۱۵۰٬۰۰۰٬۰۰۰ ریال/ماه", due: "پایان هر ماه", status: "آینده" },
    ],
    obligations: [
      { id: "o1", title: "ارائه برنامه لجستیک و ناوگان", due: "۱۴۰۵/۰۴/۲۰", done: true },
      { id: "o2", title: "پوشش ۴ استان هدف در فاز اول", due: "۱۴۰۵/۰۵/۱۵", done: false },
    ],
    approvals: [
      { id: "a1", role: "کارشناس فنی", name: "تیم لجستیک", status: "تأیید شده", date: "۱۴۰۵/۰۴/۱۰" },
      { id: "a2", role: "کمیته داوری", name: "کارگروه قراردادها", status: "در انتظار" },
      { id: "a3", role: "معاونت مالی", name: "واحد مالی", status: "در انتظار" },
    ],
    history: [
      { id: "h1", text: "فراخوان عمومی منتشر شد", date: "۱۴۰۵/۰۳/۱۵" },
      { id: "h2", text: "۷ پیشنهاد دریافت و وارد داوری شد", date: "۱۴۰۵/۰۴/۰۵" },
    ],
  },
  ct3: {
    type: "فناورانه",
    method: "فراخوان عمومی",
    guarantee: "—",
    payments: [],
    obligations: [
      { id: "o1", title: "تدوین شرح خدمات ارزیابی امنیتی", due: "۱۴۰۵/۰۵/۰۵", done: true },
    ],
    approvals: [
      { id: "a1", role: "کمیته امنیت اطلاعات", name: "کمیته امنیت", status: "تأیید شده", date: "۱۴۰۵/۰۴/۲۵" },
      { id: "a2", role: "معاونت فناوری", name: "دفتر فناوری اطلاعات", status: "در انتظار" },
    ],
    history: [
      { id: "h1", text: "فراخوان ارزیابی امنیتی منتشر شد", date: "۱۴۰۵/۰۴/۲۵" },
    ],
  },
  ct4: {
    type: "عمرانی",
    method: "استعلام محدود",
    guarantee: "ضمانت‌نامه بانکی — آزادشده",
    payments: [
      { id: "p1", title: "پیش‌پرداخت", amount: "۷۵۰٬۰۰۰٬۰۰۰ ریال", due: "۱۴۰۴/۱۱/۱۵", status: "پرداخت‌شده" },
      { id: "p2", title: "تسویه نهایی", amount: "۱٬۷۵۰٬۰۰۰٬۰۰۰ ریال", due: "۱۴۰۵/۰۲/۰۱", status: "پرداخت‌شده" },
    ],
    obligations: [
      { id: "o1", title: "تحویل بذر و نهاده به ۱۸ تعاونی", due: "۱۴۰۴/۱۲/۲۰", done: true },
      { id: "o2", title: "گزارش توزیع و رسید تحویل", due: "۱۴۰۵/۰۱/۲۰", done: true },
    ],
    approvals: [
      { id: "a1", role: "کارشناس فنی", name: "تیم کشاورزی", status: "تأیید شده", date: "۱۴۰۴/۱۱/۰۵" },
      { id: "a2", role: "معاونت مالی", name: "واحد مالی", status: "تأیید شده", date: "۱۴۰۴/۱۱/۱۰" },
    ],
    history: [
      { id: "h1", text: "قرارداد ثبت و ابلاغ شد", date: "۱۴۰۴/۱۱/۰۱" },
      { id: "h2", text: "تحویل کامل اقلام و تأیید کارفرما", date: "۱۴۰۵/۰۱/۲۲" },
      { id: "h3", text: "تسویه نهایی و آزادسازی ضمانت‌نامه", date: "۱۴۰۵/۰۲/۰۱" },
    ],
  },
};

// ------------------------------- Funds -------------------------------------
export type FundTranche = {
  id: string;
  title: string;
  amount: string;
  condition: string;
  status: "پرداخت‌شده" | "در انتظار" | "مشروط";
};

export type FundKpi = { label: string; value: string; target: string; onTrack: boolean };

export type FundDetail = {
  requested: string;
  approved: string;
  score: number;
  committee: string;
  region: string;
  field: string;
  tranches: FundTranche[];
  kpis: FundKpi[];
  notes: string;
};

export const fundDetails: Record<string, FundDetail> = {
  fn1: {
    requested: "۱٬۰۰۰٬۰۰۰٬۰۰۰ ریال",
    approved: "۸۰۰٬۰۰۰٬۰۰۰ ریال",
    score: 82,
    committee: "کارگروه اشتغال روستایی",
    region: "کرمان — قلعه‌گنج",
    field: "دامپروری",
    tranches: [
      { id: "t1", title: "قسط اول — خرید دام", amount: "۴۰۰٬۰۰۰٬۰۰۰ ریال", condition: "عقد قرارداد و ارائه سند تعاونی", status: "پرداخت‌شده" },
      { id: "t2", title: "قسط دوم — تجهیز جایگاه دام", amount: "۲۵۰٬۰۰۰٬۰۰۰ ریال", condition: "تأیید بازدید میدانی ناظر", status: "پرداخت‌شده" },
      { id: "t3", title: "قسط سوم — سرمایه در گردش", amount: "۱۵۰٬۰۰۰٬۰۰۰ ریال", condition: "رسیدن به ۷۰٪ اشتغال تعهدشده", status: "مشروط" },
    ],
    kpis: [
      { label: "اشتغال ایجادشده", value: "۱۴ نفر", target: "۲۰ نفر", onTrack: true },
      { label: "بازپرداخت اقساط", value: "۳ از ۳ به‌موقع", target: "بدون تأخیر", onTrack: true },
      { label: "رأس دام فعال", value: "۱۸۰", target: "۲۰۰", onTrack: true },
    ],
    notes: "طرح از نظر پایداری درآمد در وضعیت مطلوب است؛ پیشنهاد تمدید حمایت برای فاز توسعه.",
  },
  fn2: {
    requested: "۷۰۰٬۰۰۰٬۰۰۰ ریال",
    approved: "۵۵۰٬۰۰۰٬۰۰۰ ریال",
    score: 76,
    committee: "کارگروه توانمندسازی بانوان",
    region: "کهگیلویه و بویراحمد — لنده",
    field: "پوشاک",
    tranches: [
      { id: "t1", title: "قسط اول — تجهیز کارگاه", amount: "۳۵۰٬۰۰۰٬۰۰۰ ریال", condition: "تحویل مکان کارگاه", status: "پرداخت‌شده" },
      { id: "t2", title: "قسط دوم — مواد اولیه", amount: "۲۰۰٬۰۰۰٬۰۰۰ ریال", condition: "شروع تولید آزمایشی", status: "در انتظار" },
    ],
    kpis: [
      { label: "اشتغال ایجادشده", value: "۸ نفر", target: "۱۵ نفر", onTrack: true },
      { label: "تولید ماهانه", value: "—", target: "۱٬۲۰۰ دست", onTrack: false },
    ],
    notes: "راه‌اندازی خط تولید در انتظار اتمام آموزش فنی؛ برنامه جبرانی تدوین شده است.",
  },
  fn3: {
    requested: "۹۰۰٬۰۰۰٬۰۰۰ ریال",
    approved: "—",
    score: 61,
    committee: "کارگروه کشاورزی",
    region: "آذربایجان غربی — چالدران",
    field: "گلخانه",
    tranches: [],
    kpis: [],
    notes: "در انتظار تکمیل مدارک فنی گلخانه و استعلام آب منطقه‌ای.",
  },
};

export const fundOverview = {
  totalCapital: "۲۵٬۰۰۰٬۰۰۰٬۰۰۰ ریال",
  allocated: "۱٬۳۵۰٬۰۰۰٬۰۰۰ ریال",
  successRate: "۶۸٪",
  avgReviewDays: 18,
};

export type ReviewSession = { id: string; title: string; date: string; items: number; committee: string };
export const reviewSessions: ReviewSession[] = [
  { id: "rv1", title: "جلسه داوری طرح‌های اشتغال خرد — نوبت ۱۴", date: "۱۴۰۵/۰۴/۱۸", items: 6, committee: "کارگروه اشتغال روستایی" },
  { id: "rv2", title: "بررسی طرح‌های کشاورزی نیمه اول سال", date: "۱۴۰۵/۰۴/۲۵", items: 4, committee: "کارگروه کشاورزی" },
];

// ------------------------------ Research -----------------------------------
export type ResearchApplicant = {
  id: string;
  name: string;
  affiliation: string;
  score?: number;
  status: "در بررسی" | "پذیرفته" | "رد شده";
};

export type ResearchDetail = {
  description: string;
  budget: string;
  duration: string;
  supervisor: string;
  outputs: string[];
  applicantsList: ResearchApplicant[];
  progress?: number;
};

export const researchDetails: Record<string, ResearchDetail> = {
  rs1: {
    description: "سنجش میدانی اثر اجتماعی و اقتصادی طرح‌های محرومیت‌زدایی بنیاد در ۵ شهرستان هدف، با روش ترکیبی (پیمایش + مصاحبه عمیق) و ارائه مدل ارزیابی قابل تکرار.",
    budget: "۱٬۲۰۰٬۰۰۰٬۰۰۰ ریال",
    duration: "۹ ماه",
    supervisor: "دفتر مطالعات راهبردی بنیاد",
    outputs: ["گزارش سیاستی", "مقاله علمی-پژوهشی", "داشبورد شاخص‌های اثر اجتماعی"],
    applicantsList: [
      { id: "ap1", name: "گروه پژوهشی دانشگاه تهران", affiliation: "دانشکده علوم اجتماعی", score: 87, status: "در بررسی" },
      { id: "ap2", name: "پژوهشکده مطالعات توسعه", affiliation: "جهاد دانشگاهی", score: 81, status: "در بررسی" },
      { id: "ap3", name: "هسته پژوهشی رفاه اجتماعی", affiliation: "دانشگاه علامه طباطبائی", score: 74, status: "در بررسی" },
      { id: "ap4", name: "تیم مستقل پژوهش میدانی", affiliation: "—", status: "رد شده" },
    ],
  },
  rs2: {
    description: "استخراج الگوی کشت بهینه برای اراضی کم‌آب جنوب کرمان بر پایه داده‌های اقلیمی ۱۰ ساله و آزمایش مزرعه‌ای در دو سایت پایلوت.",
    budget: "۹۰۰٬۰۰۰٬۰۰۰ ریال",
    duration: "۱۲ ماه",
    supervisor: "هلدینگ کشاورزی فردوس پارس",
    outputs: ["نقشه الگوی کشت", "دستورالعمل ترویجی", "گزارش پایلوت مزرعه‌ای"],
    applicantsList: [
      { id: "ap1", name: "گروه زراعت دانشگاه شهید باهنر", affiliation: "دانشکده کشاورزی", score: 79, status: "در بررسی" },
      { id: "ap2", name: "مرکز تحقیقات کشاورزی جنوب کرمان", affiliation: "سازمان تات", status: "در بررسی" },
    ],
  },
  rs3: {
    description: "شناسایی عوامل پایداری اشتغال در طرح‌های خرد روستایی حمایت‌شده و ارائه چارچوب پایش پس از تخصیص برای صندوق.",
    budget: "۶۵۰٬۰۰۰٬۰۰۰ ریال",
    duration: "۶ ماه",
    supervisor: "کارگروه اشتغال روستایی",
    outputs: ["چارچوب پایش پایداری", "گزارش تحلیلی ۱۲ استان"],
    applicantsList: [
      { id: "ap1", name: "پژوهشکده اقتصاد روستا", affiliation: "دانشگاه تربیت مدرس", score: 85, status: "پذیرفته" },
    ],
    progress: 55,
  },
};

// --------------------------- Advanced reports ------------------------------
export const contractFunnel = [
  { stage: "فراخوان", count: 6, value: "۳٬۱۰۰٬۰۰۰٬۰۰۰ ریال" },
  { stage: "مذاکره", count: 4, value: "۲٬۴۰۰٬۰۰۰٬۰۰۰ ریال" },
  { stage: "داوری", count: 3, value: "۲٬۹۰۰٬۰۰۰٬۰۰۰ ریال" },
  { stage: "در حال اجرا", count: 5, value: "۹٬۸۰۰٬۰۰۰٬۰۰۰ ریال" },
  { stage: "تسویه‌شده", count: 8, value: "۱۴٬۲۰۰٬۰۰۰٬۰۰۰ ریال" },
];

export const holdingComparison = [
  { label: "بنیاد علوی", projects: 12, contracts: 7, funds: 9 },
  { label: "هلدینگ سینا", projects: 8, contracts: 11, funds: 3 },
  { label: "هلدینگ صبا", projects: 6, contracts: 9, funds: 2 },
  { label: "فردوس پارس", projects: 5, contracts: 6, funds: 5 },
  { label: "ستاد مرکزی", projects: 9, contracts: 4, funds: 4 },
];

export const crossTabStatuses = ["در حال انجام", "انجام‌شده", "تأخیر دارد", "برنامه‌ریزی"] as const;
export const crossTabRows = [
  { dept: "محرومیت‌زدایی", values: [14, 11, 5, 8] },
  { dept: "اقتصادی و هلدینگ‌ها", values: [9, 7, 2, 4] },
  { dept: "فرهنگی و اجتماعی", values: [6, 8, 1, 3] },
  { dept: "حقوقی و واگذاری‌ها", values: [4, 3, 3, 2] },
  { dept: "منابع انسانی", values: [3, 4, 1, 2] },
];

export type SavedReport = {
  id: string;
  name: string;
  module: string;
  groupBy: string;
  schedule: "بدون زمان‌بندی" | "هفتگی" | "ماهانه";
  lastRun: string;
  format: "Excel" | "PDF" | "CSV";
};

export const savedReports: SavedReport[] = [
  { id: "sr1", name: "پایش هفتگی پروژه‌های محرومیت‌زدایی", module: "پروژه‌ها", groupBy: "وضعیت", schedule: "هفتگی", lastRun: "۱۴۰۵/۰۴/۱۲", format: "PDF" },
  { id: "sr2", name: "گزارش مالی قراردادهای جاری", module: "قراردادها", groupBy: "هلدینگ", schedule: "ماهانه", lastRun: "۱۴۰۵/۰۴/۰۱", format: "Excel" },
  { id: "sr3", name: "کارنامه صندوق — هیئت مدیره", module: "صندوق", groupBy: "منطقه", schedule: "ماهانه", lastRun: "۱۴۰۵/۰۳/۳۰", format: "PDF" },
];
