export type Tenant = {
  id: string;
  name: string;
  domain: string;
  logoColor: string;
  plan: "پایه" | "حرفه‌ای" | "سازمانی";
  users: number;
  modules: string[];
};

export const currentTenant: Tenant = {
  id: "bonyad",
  name: "بنیاد مستضعفان انقلاب اسلامی",
  domain: "bonyad.net",
  logoColor: "#1f4f99",
  plan: "سازمانی",
  users: 1280,
  modules: ["شبکه اجتماعی", "مدیریت دانش", "مدیریت پروژه", "گزارش‌گیری پیشرفته"],
};

export const tenants: Tenant[] = [
  currentTenant,
  {
    id: "alavi",
    name: "بنیاد علوی",
    domain: "alavi.bonyad.net",
    logoColor: "#b45309",
    plan: "سازمانی",
    users: 4200,
    modules: ["شبکه اجتماعی", "مدیریت دانش"],
  },
  {
    id: "sina-food",
    name: "هلدینگ صنایع غذایی سینا",
    domain: "sinafood.bonyad.net",
    logoColor: "#0d9488",
    plan: "حرفه‌ای",
    users: 860,
    modules: ["شبکه اجتماعی", "مدیریت دانش", "مدیریت پروژه"],
  },
  {
    id: "saba-energy",
    name: "هلدینگ برق و انرژی صبا",
    domain: "saba.bonyad.net",
    logoColor: "#0f172a",
    plan: "پایه",
    users: 310,
    modules: ["شبکه اجتماعی"],
  },
];

export type UserProfile = {
  id: string;
  name: string;
  role: string;
  org: string;
  avatarColor: string;
  skills: string[];
  online: boolean;
};

export const currentUser: UserProfile = {
  id: "u1",
  name: "پایگاه اطلاع‌رسانی بنیاد",
  role: "راهبر سامانه",
  org: "بنیاد مستضعفان انقلاب اسلامی",
  avatarColor: "#1f4f99",
  skills: ["مدیریت محتوا", "روابط‌عمومی", "گزارش‌نویسی", "راهبری سامانه"],
  online: true,
};

export const users: UserProfile[] = [
  currentUser,
  {
    id: "u2",
    name: "حسین دهقان",
    role: "رئیس بنیاد مستضعفان",
    org: "بنیاد مستضعفان انقلاب اسلامی",
    avatarColor: "#0d9488",
    skills: ["راهبری کلان", "سیاست‌گذاری"],
    online: true,
  },
  {
    id: "u3",
    name: "محمد سعیدی‌کیا",
    role: "رئیس پیشین بنیاد",
    org: "بنیاد مستضعفان انقلاب اسلامی",
    avatarColor: "#b45309",
    skills: ["عمران و آبادانی", "نظارت راهبردی"],
    online: false,
  },
  {
    id: "u4",
    name: "وحید خاوئی",
    role: "مدیرعامل بنیاد علوی",
    org: "بنیاد علوی",
    avatarColor: "#1f4f99",
    skills: ["محرومیت‌زدایی", "توسعه منطقه‌ای"],
    online: false,
  },
  {
    id: "u5",
    name: "محسن مردعلی",
    role: "قائم‌مقام بنیاد علوی",
    org: "بنیاد علوی",
    avatarColor: "#7c3aed",
    skills: ["اشتغال‌زایی", "طرح‌های خرد و متوسط"],
    online: true,
  },
  // --- نخبگان و فناوران شبکه (شخصیت‌های نمایشی) ---
  { id: "u6", name: "دکتر آرین صدرا", role: "پژوهشگر هوش مصنوعی — برگزیده بنیاد ملی نخبگان", org: "دانشگاه صنعتی شریف", avatarColor: "#dc2626", skills: ["بینایی ماشین", "یادگیری عمیق", "MLOps"], online: true },
  { id: "u7", name: "دکتر مهسا نیک‌اندیش", role: "متخصص زیست‌فناوری و بنیان‌گذار استارتاپ", org: "پارک فناوری پردیس", avatarColor: "#0d9488", skills: ["زیست‌فناوری", "کیت تشخیصی", "تجاری‌سازی"], online: true },
  { id: "u8", name: "مهندس کیان راستین", role: "طراح سیستم‌های نهفته — مدال‌آور المپیاد", org: "تیم فناور چکاوکی", avatarColor: "#1f4f99", skills: ["الکترونیک", "IoT", "موقعیت‌یابی"], online: false },
  { id: "u9", name: "دکتر نگین فرهمند", role: "استاد مهندسی انرژی و مشاور صنعت", org: "دانشگاه تهران", avatarColor: "#b45309", skills: ["بهینه‌سازی انرژی", "نیروگاه", "ممیزی انرژی"], online: true },
  { id: "u10", name: "مهندس پارسا یگانه", role: "کارآفرین حوزه کشاورزی دقیق", org: "استارتاپ کشت‌یار", avatarColor: "#7c3aed", skills: ["سنجش از دور", "پهپاد", "کشاورزی دقیق"], online: true },
  { id: "u11", name: "دکتر شایان مهرورز", role: "پژوهشگر مواد پیشرفته و کامپوزیت", org: "پژوهشگاه پلیمر", avatarColor: "#0f172a", skills: ["کامپوزیت", "CFRP", "متالورژی"], online: false },
  { id: "u12", name: "دکتر یاسمن روشن", role: "متخصص اقتصاد نوآوری و ارزش‌گذاری", org: "موسسه تحقیق و توسعه بنیاد", avatarColor: "#0d9488", skills: ["ارزش‌گذاری استارتاپ", "TRL", "سرمایه خطرپذیر"], online: true },
  { id: "u13", name: "مهندس بردیا کوشا", role: "توسعه‌دهنده ارشد نرم‌افزار صنعتی", org: "سیگنال امید", avatarColor: "#dc2626", skills: ["پردازش تصویر", "YOLO", "استقرار لبه"], online: true },
];

export type Group = {
  id: string;
  name: string;
  description: string;
  members: number;
  privacy: "عمومی" | "خصوصی";
  color: string;
  unread: number;
  category: string;
  createdAt: string; // تاریخ ساخت (شمسی)
  lastActivityAt: string; // آخرین فعالیت (شمسی)
  lastActivityRel: string; // نمایش نسبی
};

export const groups: Group[] = [
  {
    id: "g1",
    createdAt: "۱۴۰۳/۰۹/۱۲",
    lastActivityAt: "۱۴۰۵/۰۴/۳۱",
    lastActivityRel: "۲ ساعت پیش",
    name: "ستاد محرومیت‌زدایی",
    description: "هماهنگی طرح‌های آبادانی و پیشرفت بنیاد علوی در قلعه‌گنج، لنده و چالدران",
    members: 18,
    privacy: "خصوصی",
    color: "#1f4f99",
    unread: 4,
    category: "محرومیت‌زدایی",
  },
  {
    id: "g2",
    createdAt: "۱۴۰۴/۰۲/۰۵",
    lastActivityAt: "۱۴۰۵/۰۴/۲۹",
    lastActivityRel: "۲ روز پیش",
    name: "مردمی‌سازی اقتصاد",
    description: "پایش تفاهم‌نامه‌های هلدینگ‌ها و طرح‌های خرد و متوسط اشتغال‌زایی",
    members: 9,
    privacy: "خصوصی",
    color: "#0d9488",
    unread: 0,
    category: "اقتصادی",
  },
  {
    id: "g3",
    createdAt: "۱۴۰۳/۱۱/۲۰",
    lastActivityAt: "۱۴۰۵/۰۴/۳۰",
    lastActivityRel: "دیروز",
    name: "قراردادها و واگذاری‌ها",
    description: "مدیریت مذاکره، ارزیابی و زمان‌بندی واگذاری اموال و بنگاه‌های بنیاد",
    members: 12,
    privacy: "خصوصی",
    color: "#b45309",
    unread: 2,
    category: "حقوقی",
  },
  {
    id: "g4",
    createdAt: "۱۴۰۲/۰۶/۰۱",
    lastActivityAt: "۱۴۰۵/۰۴/۳۱",
    lastActivityRel: "۱ ساعت پیش",
    name: "اطلاع‌رسانی عمومی بنیاد",
    description: "کانال رسمی اخبار و اطلاعیه‌های بنیاد مستضعفان انقلاب اسلامی",
    members: 1280,
    privacy: "عمومی",
    color: "#0f172a",
    unread: 1,
    category: "اطلاع‌رسانی",
  },
  {
    id: "g5",
    createdAt: "۱۴۰۳/۰۳/۱۵",
    lastActivityAt: "۱۴۰۵/۰۴/۳۱",
    lastActivityRel: "۳ ساعت پیش",
    name: "انجمن هلدینگ‌های بنیاد",
    description: "هم‌افزایی و تبادل تجربه میان مدیران هلدینگ‌ها و شرکت‌های زیرمجموعه بنیاد",
    members: 640,
    privacy: "عمومی",
    color: "#7c3aed",
    unread: 3,
    category: "اقتصادی",
  },
  {
    id: "g6",
    createdAt: "۱۴۰۴/۰۱/۱۰",
    lastActivityAt: "۱۴۰۵/۰۴/۲۵",
    lastActivityRel: "۶ روز پیش",
    name: "باشگاه خیرین و مشارکت‌های اجتماعی",
    description: "معرفی برنامه‌های نیکوکاری، رویدادها و فرصت‌های مشارکت اجتماعی بنیاد",
    members: 305,
    privacy: "عمومی",
    color: "#0d9488",
    unread: 0,
    category: "اجتماعی",
  },
  {
    id: "g7",
    createdAt: "۱۴۰۴/۰۵/۰۲",
    lastActivityAt: "۱۴۰۵/۰۴/۳۰",
    lastActivityRel: "دیروز",
    name: "کمیته راهبری امنیت اطلاعات",
    description: "پایش سیاست‌های امنیتی، بررسی حوادث و تصمیم‌گیری درباره انطباق با استاندارد افتا",
    members: 11,
    privacy: "خصوصی",
    color: "#dc2626",
    unread: 2,
    category: "امنیت",
  },
  { id: "g8", createdAt: "۱۴۰۴/۱۱/۰۱", lastActivityAt: "۱۴۰۵/۰۴/۳۱", lastActivityRel: "۳۰ دقیقه پیش", name: "باشگاه نخبگان هوش مصنوعی", description: "هم‌فکری پژوهشگران AI کشور روی مسائل واقعی صنایع بنیاد — از بینایی ماشین تا LLMها", members: 148, privacy: "عمومی", color: "#dc2626", unread: 7, category: "فناوری" },
  { id: "g9", createdAt: "۱۴۰۴/۱۲/۱۰", lastActivityAt: "۱۴۰۵/۰۴/۳۰", lastActivityRel: "دیروز", name: "شبکه فناوران زیست‌فناوری و سلامت", description: "اتصال آزمایشگاه‌ها و استارتاپ‌های زیستی به نیازهای صنایع غذایی و کشاورزی", members: 86, privacy: "عمومی", color: "#0d9488", unread: 3, category: "فناوری" },
  { id: "g10", createdAt: "۱۴۰۴/۰۸/۲۰", lastActivityAt: "۱۴۰۵/۰۴/۳۱", lastActivityRel: "۱ ساعت پیش", name: "پل دانشگاه و صنعت", description: "طرح مسائل صنعتی هلدینگ‌ها و یافتن تیم حل‌مسئله از میان اساتید و دانشجویان نخبه", members: 214, privacy: "عمومی", color: "#1f4f99", unread: 12, category: "فناوری" },
  { id: "g11", createdAt: "۱۴۰۳/۱۲/۰۵", lastActivityAt: "۱۴۰۵/۰۴/۲۹", lastActivityRel: "۲ روز پیش", name: "تیم‌های راهی شو ۱۴۰۳", description: "فضای اختصاصی تیم‌های پذیرفته‌شده رویداد راهی شو: منتورینگ، هم‌رسانی تجربه و گزارش پیشرفت", members: 42, privacy: "خصوصی", color: "#7c3aed", unread: 5, category: "فناوری" },
  { id: "g12", createdAt: "۱۴۰۴/۰۹/۱۵", lastActivityAt: "۱۴۰۵/۰۴/۲۸", lastActivityRel: "۳ روز پیش", name: "انرژی و صنایع سبز", description: "گفتگوی متخصصان انرژی درباره بهینه‌سازی مصرف نیروگاه‌ها و فناوری‌های تجدیدپذیر", members: 97, privacy: "عمومی", color: "#b45309", unread: 0, category: "فناوری" },
];

export type Post = {
  id: string;
  authorId: string;
  groupId?: string;
  content: string;
  time: string;
  likes: number;
  comments: number;
  tags: string[];
  pinned?: boolean;
  attachment?: { type: "poll" | "image" | "doc"; label: string };
};

export const posts: Post[] = [
  {
    id: "p1",
    authorId: "u2",
    groupId: "g4",
    content:
      "برنامه‌ی پنج‌برابر شدن خدمات محرومیت‌زدایی بنیاد ابلاغ شد. از همه‌ی هلدینگ‌ها و واحدها می‌خواهیم برنامه‌ی مشارکت خود را تا پایان ماه ثبت کنند.",
    time: "۲ ساعت پیش",
    likes: 24,
    comments: 6,
    tags: ["محرومیت‌زدایی", "ابلاغیه"],
    pinned: true,
  },
  {
    id: "p2",
    authorId: "u1",
    groupId: "g1",
    content:
      "گزارش پیشرفت طرح‌های آبادانی قلعه‌گنج در بخش مدیریت دانش بارگذاری شد. جمع‌بندی وضعیت لنده و چالدران هفته‌ی آینده منتشر می‌شود.",
    time: "۵ ساعت پیش",
    likes: 12,
    comments: 3,
    tags: ["قلعه‌گنج", "گزارش"],
  },
  {
    id: "p3",
    authorId: "u5",
    groupId: "g1",
    content: "برای فاز بعدی طرح‌های اشتغال‌زایی، کدام حوزه در اولویت باشد؟",
    time: "روز گذشته",
    likes: 8,
    comments: 11,
    tags: ["نظرسنجی"],
    attachment: { type: "poll", label: "کشاورزی و دامپروری در برابر صنایع خرد و کارگاهی" },
  },
  {
    id: "p4",
    authorId: "u3",
    groupId: "g2",
    content:
      "گزارش عملکرد فصلی طرح‌های خرد و متوسط اشتغال‌زایی نهایی شد. لطفاً قبل از جلسه‌ی هیات عامل بررسی کنید.",
    time: "۲ روز پیش",
    likes: 5,
    comments: 2,
    tags: ["گزارش", "اشتغال"],
    attachment: { type: "doc", label: "گزارش-عملکرد-فصلی-اشتغال.pdf" },
  },
  {
    id: "p5",
    authorId: "u6",
    groupId: "g8",
    content:
      "مدل تشخیص نقص بطری که با تیم سیگنال امید روی خط زمزم آموزش دادیم به دقت ۹۸.۲٪ رسید. دیتاست برچسب‌خورده (۴۰ هزار فریم) را برای پژوهشگران باشگاه به اشتراک می‌گذارم — کافیست عضو گروه باشید.",
    time: "۳ ساعت پیش",
    likes: 41,
    comments: 12,
    tags: ["بینایی-ماشین", "صنعت"],
    pinned: true,
    attachment: { type: "doc", label: "dataset-bottling-defects-v2.md" },
  },
  {
    id: "p6",
    authorId: "u7",
    groupId: "g9",
    content:
      "بعد از ۸ ماه، کیت تشخیص آنتی‌بیوتیک شیر ما مجوز آزمایش میدانی در لبنیات پاک را گرفت. مسیر از پروپوزال صندوق نوآور تا خط تولید را در یک یادداشت بلاگ نوشتم؛ برای تیم‌هایی که تازه شروع می‌کنند شاید مفید باشد.",
    time: "۵ ساعت پیش",
    likes: 33,
    comments: 9,
    tags: ["زیست‌فناوری", "تجربه"],
  },
  {
    id: "p7",
    authorId: "u9",
    groupId: "g12",
    content:
      "برای مسئله بازیافت حرارت کوره‌های صبا دو راهکار ORC و مبدل صفحه‌ای را مقایسه کرده‌ام. نظرسنجی می‌گذارم — متخصصان ترمودینامیک لطفاً شرکت کنند.",
    time: "دیروز",
    likes: 19,
    comments: 15,
    tags: ["انرژی", "نظرسنجی"],
    attachment: { type: "poll", label: "ORC در برابر مبدل صفحه‌ای برای بازیافت حرارت" },
  },
  {
    id: "p8",
    authorId: "u10",
    groupId: "g10",
    content:
      "دنبال یک متخصص خاک‌شناسی برای فاز دوم پروژه آبیاری دقیق دشت ناز هستیم (همکاری پاره‌وقت، قرارداد از طریق موسسه تحقیق و توسعه بنیاد). رزومه‌ها را در همین گروه یا پیام مستقیم بفرستید.",
    time: "دیروز",
    likes: 14,
    comments: 21,
    tags: ["فرصت-همکاری", "کشاورزی-دقیق"],
  },
  {
    id: "p9",
    authorId: "u12",
    groupId: "g11",
    content:
      "به ۵ تیم راهی شو: جلسات منتورینگ ارزش‌گذاری این هفته برگزار می‌شود. پیش از جلسه، بخش مالی شناسنامه پروژه‌تان را در سامانه به‌روز کنید تا وقت جلسه صرف اعداد نشود.",
    time: "۲ روز پیش",
    likes: 11,
    comments: 4,
    tags: ["منتورینگ", "راهی-شو"],
  },
  {
    id: "p10",
    authorId: "u1",
    groupId: "g4",
    content:
      "هماهنگی درون‌سازمانی: جلسه مشترک معاونت توسعه فناوری بنیاد با مدیران R&D هلدینگ‌ها پنجشنبه برگزار می‌شود. دستور جلسه: جمع‌بندی سندهای فرصت‌های تحقیق و توسعه و اولویت‌بندی RFPهای پاییز.",
    time: "۴ ساعت پیش",
    likes: 9,
    comments: 3,
    tags: ["هماهنگی", "هلدینگ‌ها"],
  },
  {
    id: "p11",
    authorId: "u11",
    groupId: "g8",
    content:
      "تجربه ساخت قطعه CFRP با قالب داخلی: هزینه ۴۰٪ کمتر از نمونه وارداتی و استحکام خمشی بهتر. مقاله روش ساخت را در بانک دانش گذاشتم؛ نقد فنی استقبال می‌شود.",
    time: "۳ روز پیش",
    likes: 27,
    comments: 8,
    tags: ["کامپوزیت", "ساخت-داخل"],
    attachment: { type: "doc", label: "cfrp-layup-method-fa.pdf" },
  },
];

export type Visibility = "عمومی" | "خصوصی";

export type ForumTopic = {
  id: string;
  title: string;
  author: string;
  replies: number;
  views: number;
  lastActivity: string;
  category: string;
  solved?: boolean;
  visibility: Visibility;
};

export const forumTopics: ForumTopic[] = [
  {
    id: "f1",
    title: "تجربه‌های موفق اشتغال‌زایی روستایی در قلعه‌گنج — چه الگوهایی قابل تکرار است؟",
    author: "وحید خاوئی",
    replies: 14,
    views: 212,
    lastActivity: "۱ ساعت پیش",
    category: "محرومیت‌زدایی",
    solved: true,
    visibility: "عمومی",
  },
  {
    id: "f2",
    title: "استاندارد گزارش‌دهی ماهانه هلدینگ‌ها به ستاد مرکزی",
    author: "محسن مردعلی",
    replies: 9,
    views: 134,
    lastActivity: "۳ ساعت پیش",
    category: "اقتصادی",
    visibility: "عمومی",
  },
  {
    id: "f3",
    title: "چارچوب ارزیابی طرح‌های پیشنهادی مناطق محروم پیش از تخصیص منابع",
    author: "حسین دهقان",
    replies: 6,
    views: 98,
    lastActivity: "دیروز",
    category: "راهبری",
    visibility: "خصوصی",
  },
  {
    id: "f4",
    title: "چگونه فرآیند واگذاری بنگاه‌ها را شفاف و رقابتی برگزار کنیم؟",
    author: "محسن مردعلی",
    replies: 11,
    views: 176,
    lastActivity: "۲ ساعت پیش",
    category: "حقوقی",
    solved: true,
    visibility: "عمومی",
  },
  {
    id: "f5",
    title: "مقایسه مدل‌های حمایت از زنجیره تأمین داخلی در تفاهم‌نامه‌های مردمی‌سازی",
    author: "وحید خاوئی",
    replies: 8,
    views: 145,
    lastActivity: "۴ ساعت پیش",
    category: "اقتصادی",
    visibility: "عمومی",
  },
  {
    id: "f6",
    title: "بهترین شیوه‌ی مستندسازی مصوبات هیات عامل برای بازیابی سریع",
    author: "پایگاه اطلاع‌رسانی بنیاد",
    replies: 5,
    views: 87,
    lastActivity: "دیروز",
    category: "مدیریت دانش",
    visibility: "عمومی",
  },
  {
    id: "f7",
    title: "طراحی نظام پایش برخط پیشرفت طرح‌های عمرانی مناطق محروم",
    author: "حسین دهقان",
    replies: 17,
    views: 268,
    lastActivity: "۶ ساعت پیش",
    category: "محرومیت‌زدایی",
    solved: true,
    visibility: "عمومی",
  },
  {
    id: "f8",
    title: "الزامات حفاظت از داده‌های ذی‌نفعان در سامانه‌های ثبت طرح",
    author: "محسن مردعلی",
    replies: 4,
    views: 62,
    lastActivity: "۱ روز پیش",
    category: "امنیت",
    visibility: "عمومی",
  },
  {
    id: "f9",
    title: "استاندارد نام‌گذاری و دسته‌بندی اسناد در بانک دانش سازمانی",
    author: "پایگاه اطلاع‌رسانی بنیاد",
    replies: 13,
    views: 190,
    lastActivity: "۲ روز پیش",
    category: "مدیریت دانش",
    solved: true,
    visibility: "عمومی",
  },
  {
    id: "f10",
    title: "بودجه‌بندی برنامه‌های نیکوکاری سال آینده — معیارهای اولویت‌بندی",
    author: "محمد سعیدی‌کیا",
    replies: 3,
    views: 54,
    lastActivity: "۳ روز پیش",
    category: "راهبری",
    visibility: "خصوصی",
  },
  {
    id: "f11",
    title: "تجربه‌ی راه‌اندازی مدرسه‌سازی مشارکتی با خیرین محلی",
    author: "وحید خاوئی",
    replies: 7,
    views: 121,
    lastActivity: "۴ روز پیش",
    category: "اجتماعی",
    visibility: "عمومی",
  },
  {
    id: "f12",
    title: "چگونه رضایت‌سنجی ذی‌نفعان طرح‌های محرومیت‌زدایی را استاندارد کنیم؟",
    author: "حسین دهقان",
    replies: 2,
    views: 39,
    lastActivity: "۵ روز پیش",
    category: "محرومیت‌زدایی",
    visibility: "عمومی",
  },
  { id: "f13", title: "چالش استقرار مدل‌های بینایی ماشین روی لبه (Edge) در محیط صنعتی — تجربه‌هایتان چیست؟", author: "دکتر آرین صدرا", replies: 23, views: 412, lastActivity: "۱ ساعت پیش", category: "فناوری", solved: false, visibility: "عمومی" },
  { id: "f14", title: "مسیر اخذ مجوز کیت‌های تشخیصی آزمایشگاهی: از نمونه اولیه تا پروانه", author: "دکتر مهسا نیک‌اندیش", replies: 17, views: 268, lastActivity: "۴ ساعت پیش", category: "فناوری", solved: true, visibility: "عمومی" },
  { id: "f15", title: "مقایسه UWB و BLE برای موقعیت‌یابی داخل انبار — دقت در برابر هزینه", author: "مهندس کیان راستین", replies: 14, views: 199, lastActivity: "دیروز", category: "فناوری", visibility: "عمومی" },
  { id: "f16", title: "ارزش‌گذاری استارتاپ پیش‌درآمد: کدام روش برای کمیته سرمایه‌گذاری قانع‌کننده‌تر است؟", author: "دکتر یاسمن روشن", replies: 19, views: 301, lastActivity: "۶ ساعت پیش", category: "اقتصادی", solved: true, visibility: "عمومی" },
  { id: "f17", title: "فرآیند داخلی بنیاد برای ارجاع مسئله فنی هلدینگ به شبکه نخبگان — پیشنهاد بهبود", author: "پایگاه اطلاع‌رسانی بنیاد", replies: 8, views: 122, lastActivity: "۲ روز پیش", category: "راهبری", visibility: "خصوصی" },
  { id: "f18", title: "الگوی کشت کم‌آب‌بر با داده ماهواره‌ای: نتایج پایلوت جنوب کرمان", author: "مهندس پارسا یگانه", replies: 11, views: 187, lastActivity: "۳ روز پیش", category: "فناوری", visibility: "عمومی" },
];

export type KnowledgeDoc = {
  id: string;
  title: string;
  category: string;
  type: "قرارداد" | "آموزشی" | "صورت‌جلسه" | "گزارش";
  updatedAt: string;
  owner: string;
  size: string;
  visibility: Visibility;
};

export const knowledgeDocs: KnowledgeDoc[] = [
  {
    id: "d1",
    title: "چارچوب حقوقی واگذاری هتل‌ها و اموال مازاد بنیاد",
    category: "آرشیو قراردادها",
    type: "قرارداد",
    updatedAt: "۱۴۰۵/۰۲/۰۱",
    owner: "واحد حقوقی",
    size: "۱.۲ مگابایت",
    visibility: "خصوصی",
  },
  {
    id: "d2",
    title: "راهنمای کاربری سامانه ارتباطات سازمانی بنیاد — نسخه ۲",
    category: "مستندات آموزشی",
    type: "آموزشی",
    updatedAt: "۱۴۰۵/۰۱/۲۰",
    owner: "پایگاه اطلاع‌رسانی",
    size: "۸۴۰ کیلوبایت",
    visibility: "عمومی",
  },
  {
    id: "d3",
    title: "صورت‌جلسه هیات عامل — بررسی برنامه پنج‌برابر شدن خدمات محرومیت‌زدایی",
    category: "آرشیو مصوبات و جلسات",
    type: "صورت‌جلسه",
    updatedAt: "۱۴۰۵/۰۱/۱۵",
    owner: "دبیرخانه",
    size: "۳۱۰ کیلوبایت",
    visibility: "خصوصی",
  },
  {
    id: "d4",
    title: "گزارش پیشرفت طرح‌های آبادانی قلعه‌گنج — نیم‌سال نخست",
    category: "مدیریت دانش",
    type: "گزارش",
    updatedAt: "۱۴۰۵/۰۲/۱۰",
    owner: "بنیاد علوی",
    size: "۲.۴ مگابایت",
    visibility: "عمومی",
  },
  {
    id: "d5",
    title: "شیوه‌نامه ثبت و پیگیری طرح‌های خرد و متوسط اشتغال‌زایی",
    category: "مستندات آموزشی",
    type: "آموزشی",
    updatedAt: "۱۴۰۵/۰۲/۲۵",
    owner: "بنیاد علوی",
    size: "۶۲۰ کیلوبایت",
    visibility: "عمومی",
  },
  {
    id: "d6",
    title: "استاندارد نگارش و دسته‌بندی اسناد در بانک دانش بنیاد",
    category: "مستندات آموزشی",
    type: "آموزشی",
    updatedAt: "۱۴۰۵/۰۲/۱۲",
    owner: "پایگاه اطلاع‌رسانی بنیاد",
    size: "۴۱۰ کیلوبایت",
    visibility: "عمومی",
  },
  {
    id: "d7",
    title: "گزارش سالانه تفاهم‌نامه‌های مردمی‌سازی اقتصاد و هلدینگ‌های طرف قرارداد",
    category: "مدیریت دانش",
    type: "گزارش",
    updatedAt: "۱۴۰۵/۰۱/۳۰",
    owner: "محسن مردعلی",
    size: "۳.۱ مگابایت",
    visibility: "خصوصی",
  },
  {
    id: "d8",
    title: "صورت‌جلسه کارگاه آموزشی راهبران سامانه — دور اول",
    category: "آرشیو مصوبات و جلسات",
    type: "صورت‌جلسه",
    updatedAt: "۱۴۰۵/۰۲/۲۹",
    owner: "دبیرخانه",
    size: "۲۲۰ کیلوبایت",
    visibility: "عمومی",
  },
  {
    id: "d9",
    title: "تفاهم‌نامه همکاری هلدینگ برق و انرژی صبا در طرح‌های مناطق محروم",
    category: "آرشیو قراردادها",
    type: "قرارداد",
    updatedAt: "۱۴۰۵/۰۲/۰۸",
    owner: "واحد حقوقی",
    size: "۹۸۰ کیلوبایت",
    visibility: "خصوصی",
  },
  {
    id: "d10",
    title: "گزارش ارزیابی امنیتی سامانه‌های اطلاعاتی بنیاد",
    category: "مدیریت دانش",
    type: "گزارش",
    updatedAt: "۱۴۰۵/۰۳/۰۱",
    owner: "کمیته امنیت اطلاعات",
    size: "۱.۷ مگابایت",
    visibility: "عمومی",
  },
];

export type Task = {
  id: string;
  title: string;
  status: "برنامه‌ریزی" | "در حال انجام" | "بازبینی" | "انجام‌شده";
  assignee: string;
  priority: "کم" | "متوسط" | "زیاد";
  due: string;
  progress: number;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  health: "سبز" | "زرد" | "قرمز";
  progress: number;
  budgetUsed: number;
  deadline: string;
  tasks: Task[];
};

export const projects: Project[] = [
  {
    id: "pr1",
    name: "طرح آبادانی و پیشرفت قلعه‌گنج — فاز دوم",
    client: "بنیاد علوی",
    health: "سبز",
    progress: 70,
    budgetUsed: 55,
    deadline: "۱۴۰۵/۰۴/۰۱",
    tasks: [
      { id: "t1", title: "تکمیل زیرساخت آب‌رسانی روستاهای هدف", status: "انجام‌شده", assignee: "محسن مردعلی", priority: "زیاد", due: "۱۴۰۵/۰۲/۱۵", progress: 100 },
      { id: "t2", title: "راه‌اندازی کارگاه‌های اشتغال خرد", status: "در حال انجام", assignee: "وحید خاوئی", priority: "زیاد", due: "۱۴۰۵/۰۲/۲۸", progress: 60 },
      { id: "t3", title: "بازسازی و تجهیز مدارس منطقه", status: "در حال انجام", assignee: "تیم عمرانی", priority: "متوسط", due: "۱۴۰۵/۰۳/۰۵", progress: 45 },
      { id: "t4", title: "آموزش تسهیل‌گران محلی (۲۴ نفر-ساعت)", status: "برنامه‌ریزی", assignee: "تیم آموزش", priority: "متوسط", due: "۱۴۰۵/۰۳/۲۰", progress: 0 },
    ],
  },
  {
    id: "pr2",
    name: "استقرار سامانه جامع مدیریت دانش بنیاد",
    client: "بنیاد مستضعفان انقلاب اسلامی",
    health: "زرد",
    progress: 35,
    budgetUsed: 30,
    deadline: "۱۴۰۵/۰۵/۰۱",
    tasks: [
      { id: "t5", title: "دسته‌بندی آرشیو مصوبات و قراردادها", status: "انجام‌شده", assignee: "دبیرخانه", priority: "زیاد", due: "۱۴۰۵/۰۳/۰۱", progress: 100 },
      { id: "t6", title: "راه‌اندازی جستجوی پیشرفته اسناد", status: "در حال انجام", assignee: "تیم سامانه", priority: "زیاد", due: "۱۴۰۵/۰۳/۲۵", progress: 40 },
      { id: "t7", title: "تعریف سطوح دسترسی واحدها و هلدینگ‌ها", status: "برنامه‌ریزی", assignee: "تیم سامانه", priority: "متوسط", due: "۱۴۰۵/۰۴/۱۰", progress: 0 },
    ],
  },
  {
    id: "pr3",
    name: "برنامه واگذاری هتل‌ها و اموال مازاد",
    client: "بنیاد مستضعفان انقلاب اسلامی",
    health: "قرمز",
    progress: 10,
    budgetUsed: 8,
    deadline: "۱۴۰۵/۰۶/۰۱",
    tasks: [
      { id: "t8", title: "ارزش‌گذاری دارایی‌ها و آماده‌سازی اسناد واگذاری", status: "برنامه‌ریزی", assignee: "واحد حقوقی", priority: "متوسط", due: "۱۴۰۵/۰۴/۲۰", progress: 0 },
    ],
  },
];

export type Notification = {
  id: string;
  text: string;
  time: string;
  read: boolean;
  type: "mention" | "like" | "comment" | "system" | "task";
};

export const notifications: Notification[] = [
  { id: "n1", text: "حسین دهقان شما را در یک پست منشن کرد", time: "۱۰ دقیقه پیش", read: false, type: "mention" },
  { id: "n2", text: "وظیفه «راه‌اندازی جستجوی پیشرفته اسناد» به شما اختصاص یافت", time: "۱ ساعت پیش", read: false, type: "task" },
  { id: "n3", text: "۳ نظر جدید روی پست شما در گروه ستاد محرومیت‌زدایی", time: "۳ ساعت پیش", read: true, type: "comment" },
  { id: "n4", text: "به‌روزرسانی امنیتی روی همه سازمان‌های سامانه اعمال شد", time: "دیروز", read: true, type: "system" },
];

export type ChatThread = {
  id: string;
  with: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unread: number;
  online?: boolean;
  messages: { from: "me" | "them"; text: string; time: string; read?: boolean }[];
};

export const chatThreads: ChatThread[] = [
  {
    id: "c1",
    with: "محسن مردعلی",
    avatarColor: "#fdcb6e",
    lastMessage: "فهرست طرح‌های آماده داوری را بارگذاری کردم",
    time: "۱۰:۴۲",
    unread: 2,
    online: true,
    messages: [
      { from: "them", text: "سلام، فهرست طرح‌های فراخوان دوم را جمع‌بندی کردم", time: "۱۰:۳۰" },
      { from: "me", text: "عالی، چند طرح واجد شرایط شدند؟", time: "۱۰:۳۵", read: true },
      { from: "them", text: "فهرست طرح‌های آماده داوری را بارگذاری کردم، ۳۸ طرح", time: "۱۰:۴۲" },
    ],
  },
  {
    id: "c2",
    with: "حسین دهقان",
    avatarColor: "#00b894",
    lastMessage: "جلسه فردا ساعت ۱۰",
    time: "دیروز",
    unread: 0,
    online: false,
    messages: [
      { from: "them", text: "جلسه فردا ساعت ۱۰ درباره برنامه محرومیت‌زدایی است، حاضر باشید", time: "دیروز" },
      { from: "me", text: "حتماً، دستور جلسه را ارسال می‌کنم", time: "دیروز", read: true },
    ],
  },
  {
    id: "c3",
    with: "گروه ستاد محرومیت‌زدایی",
    avatarColor: "#1f4f99",
    lastMessage: "وحید: گزارش قلعه‌گنج آپلود شد",
    time: "۰۹:۱۰",
    unread: 5,
    online: false,
    messages: [
      { from: "them", text: "گزارش پیشرفت قلعه‌گنج آپلود شد، در بخش مدیریت دانش", time: "۰۹:۱۰" },
    ],
  },
  {
    id: "c4",
    with: "دکتر آرین صدرا",
    avatarColor: "#dc2626",
    lastMessage: "دیتاست را برایتان به اشتراک گذاشتم",
    time: "۱۱:۲۰",
    unread: 1,
    online: true,
    messages: [
      { from: "me", text: "سلام دکتر، برای مسئله کنترل کیفیت خط بهنوش امکان همکاری هست؟", time: "۱۱:۰۵", read: true },
      { from: "them", text: "حتماً. مشابه پروژه زمزم است؛ دیتاست را برایتان به اشتراک گذاشتم، جلسه‌ای بگذاریم", time: "۱۱:۲۰" },
    ],
  },
  {
    id: "c5",
    with: "دکتر مهسا نیک‌اندیش",
    avatarColor: "#0d9488",
    lastMessage: "پروپوزال فاز دوم را در سامانه ثبت کردم",
    time: "دیروز",
    unread: 0,
    online: true,
    messages: [
      { from: "them", text: "پروپوزال فاز دوم کیت تشخیصی را در سامانه ثبت کردم، کد NF جدید گرفت", time: "دیروز" },
      { from: "me", text: "عالی! ارزیابی اولیه هوشمند تا فردا انجام می‌شود و نتیجه اطلاع‌رسانی خواهد شد", time: "دیروز", read: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Events & sessions (Phase 1 — مدیریت رویدادها و جلسات)
// ---------------------------------------------------------------------------
export type EventItem = {
  id: string;
  title: string;
  date: string;
  jalaliDate: string;
  time: string;
  location: string;
  attendees: number;
  hashtags: string[];
  description: string;
  visibility: Visibility;
  mode: "حضوری" | "آنلاین";
  joinLink?: string;
  mapUrl?: string;
};

export const events: EventItem[] = [
  {
    id: "e1",
    mode: "حضوری",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Milad+Tower+Tehran",
    title: "جلسه هیات عامل — مرور برنامه محرومیت‌زدایی",
    date: "2026-07-12",
    jalaliDate: "۱۴۰۵/۰۴/۲۱",
    time: "۱۰:۰۰ - ۱۱:۳۰",
    location: "برج‌های دوقلوی بنیاد، تهران / لینک برخط",
    attendees: 12,
    hashtags: ["هیات-عامل", "محرومیت‌زدایی"],
    description: "مرور پیشرفت برنامه پنج‌برابر شدن خدمات محرومیت‌زدایی و تصمیم‌گیری درباره تخصیص فاز بعد.",
    visibility: "عمومی",
  },
  {
    id: "e2",
    mode: "حضوری",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Tehran+Azadi+Tower",
    title: "کارگاه آموزشی راهبران سامانه ارتباطات سازمانی",
    date: "2026-07-20",
    jalaliDate: "۱۴۰۵/۰۴/۲۹",
    time: "۰۹:۰۰ - ۱۳:۰۰",
    location: "سالن آموزش دفتر مرکزی بنیاد",
    attendees: 48,
    hashtags: ["آموزش"],
    description: "آموزش راهبران واحدها و هلدینگ‌ها برای مدیریت گروه‌ها، اسناد و سطوح دسترسی.",
    visibility: "عمومی",
  },
  {
    id: "e3",
    mode: "آنلاین",
    joinLink: "https://meet.example.ir/davari-f2",
    title: "داوری طرح‌های اشتغال‌زایی — فراخوان دوم",
    date: "2026-08-02",
    jalaliDate: "۱۴۰۵/۰۵/۱۲",
    time: "۱۴:۰۰ - ۱۶:۰۰",
    location: "برخط — اتاق گفتگوی بنیاد علوی",
    attendees: 7,
    hashtags: ["اشتغال‌زایی", "داوری"],
    description: "بررسی و امتیازدهی طرح‌های خرد و متوسط ثبت‌شده در فراخوان دوم مناطق هدف.",
    visibility: "خصوصی",
  },
  {
    id: "e4",
    mode: "آنلاین",
    joinLink: "https://www.skyroom.online/ch/bonyad/kb-webinar",
    title: "وبینار معرفی بانک دانش بنیاد برای واحدهای سازمانی",
    date: "2026-07-15",
    jalaliDate: "۱۴۰۵/۰۴/۲۴",
    time: "۱۶:۰۰ - ۱۷:۳۰",
    location: "برخط — اسکای‌روم",
    attendees: 96,
    hashtags: ["وبینار", "مدیریت-دانش"],
    description: "معرفی قابلیت‌های جستجوی پیشرفته، دسته‌بندی اسناد و سطح دسترسی در بانک دانش بنیاد.",
    visibility: "عمومی",
  },
  {
    id: "e5",
    mode: "حضوری",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Tehran+Book+Garden",
    title: "گردهمایی مدیران هلدینگ‌های بنیاد",
    date: "2026-07-28",
    jalaliDate: "۱۴۰۵/۰۵/۰۶",
    time: "۱۷:۰۰ - ۲۰:۰۰",
    location: "مجموعه فرهنگی بنیاد، تهران",
    attendees: 64,
    hashtags: ["هلدینگ‌ها", "هم‌افزایی"],
    description: "دیدار مدیران هلدینگ‌ها و شرکت‌های زیرمجموعه و ارائه نقشه راه مردمی‌سازی اقتصاد.",
    visibility: "عمومی",
  },
  {
    id: "e6",
    mode: "حضوری",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=University+of+Tehran",
    title: "کارگاه امنیت سایبری و آشنایی با استاندارد افتا",
    date: "2026-08-10",
    jalaliDate: "۱۴۰۵/۰۵/۲۰",
    time: "۰۹:۳۰ - ۱۲:۳۰",
    location: "سالن آموزش دفتر مرکزی بنیاد",
    attendees: 37,
    hashtags: ["امنیت", "افتا"],
    description: "آموزش الزامات امنیتی افتا و بررسی چک‌لیست انطباق برای واحدهای فناوری اطلاعات.",
    visibility: "عمومی",
  },
  {
    id: "e7",
    mode: "حضوری",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Tehran+Milad+Tower",
    title: "نشست فصلی پایش تفاهم‌نامه‌های مردمی‌سازی اقتصاد",
    date: "2026-08-18",
    jalaliDate: "۱۴۰۵/۰۵/۲۸",
    time: "۱۱:۰۰ - ۱۳:۰۰",
    location: "دفتر مرکزی بنیاد",
    attendees: 14,
    hashtags: ["مردمی‌سازی", "فصلی"],
    description: "مرور عملکرد فصلی هفت تفاهم‌نامه هلدینگ‌ها و تصمیم‌گیری درباره طرح‌های جدید.",
    visibility: "خصوصی",
  },
];

// ---------------------------------------------------------------------------
// Blog (Phase 1)
// ---------------------------------------------------------------------------
export type BlogPost = {
  id: string;
  title: string;
  author: string;
  excerpt: string;
  date: string;
  rating: number;
  tags: string[];
  visibility: Visibility;
};

export const blogPosts: BlogPost[] = [
  {
    id: "b1",
    title: "روایت قلعه‌گنج؛ الگویی که به لنده و چالدران رسید",
    author: "وحید خاوئی",
    excerpt: "مرور تجربه‌ی نخستین منطقه‌ی هدف رفع محرومیت بنیاد علوی و درس‌هایی که برای مناطق جدید به کار گرفتیم.",
    date: "۱۴۰۵/۰۲/۱۸",
    rating: 4.6,
    tags: ["محرومیت‌زدایی", "توسعه منطقه‌ای"],
    visibility: "عمومی",
  },
  {
    id: "b2",
    title: "پشت صحنه‌ی هفت تفاهم‌نامه مردمی‌سازی اقتصاد",
    author: "محسن مردعلی",
    excerpt: "چگونه هلدینگ‌های بنیاد برای حمایت از بیش از هشت هزار طرح خرد و متوسط هم‌قسم شدند.",
    date: "۱۴۰۵/۰۲/۰۵",
    rating: 4.2,
    tags: ["مردمی‌سازی", "اشتغال"],
    visibility: "عمومی",
  },
  {
    id: "b3",
    title: "از توزیع کفش دانش‌آموزی تا مدرسه‌سازی؛ زنجیره حمایت آموزشی بنیاد",
    author: "پایگاه اطلاع‌رسانی بنیاد",
    excerpt: "نگاهی به برنامه‌های حمایت آموزشی بنیاد در مناطق کم‌برخوردار، از تجهیز دانش‌آموزان تا نوسازی مدارس.",
    date: "۱۴۰۵/۰۲/۲۲",
    rating: 4.7,
    tags: ["آموزش", "اجتماعی"],
    visibility: "عمومی",
  },
  {
    id: "b4",
    title: "شفافیت در واگذاری‌ها؛ چرا و چگونه",
    author: "پایگاه اطلاع‌رسانی بنیاد",
    excerpt: "مرور سازوکار ارزش‌گذاری و عرضه‌ی عمومی دارایی‌های مازاد بنیاد و پاسخ به پرسش‌های پرتکرار.",
    date: "۱۴۰۵/۰۲/۱۲",
    rating: 4.4,
    tags: ["شفافیت", "واگذاری"],
    visibility: "عمومی",
  },
  {
    id: "b5",
    title: "مستندسازی تجربه‌های محرومیت‌زدایی؛ چرا بانک دانش مهم است",
    author: "محسن مردعلی",
    excerpt: "اگر تجربه‌ی تسهیل‌گران محلی ثبت نشود، هر منطقه‌ی جدید از صفر شروع می‌کند. راهکار ما برای ثبت دانش میدانی.",
    date: "۱۴۰۵/۰۱/۲۸",
    rating: 4.5,
    tags: ["مدیریت دانش", "مستندسازی"],
    visibility: "عمومی",
  },
  {
    id: "b6",
    title: "درس‌های هماهنگی ۱۱ هلدینگ و ۱۶۹ شرکت در یک برنامه واحد",
    author: "حسین دهقان",
    excerpt: "چالش‌های واقعی هم‌راستا کردن مجموعه‌های اقتصادی متنوع بنیاد حول ماموریت اجتماعی مشترک.",
    date: "۱۴۰۵/۰۱/۱۵",
    rating: 4.3,
    tags: ["راهبری", "هلدینگ‌ها"],
    visibility: "خصوصی",
  },
  {
    id: "b7",
    title: "چرا زنجیره تأمین داخلی را در اولویت تفاهم‌نامه‌ها گذاشتیم",
    author: "وحید خاوئی",
    excerpt: "تقویت تولیدکنندگان خرد محلی به‌جای واردات؛ منطق اقتصادی و اجتماعی این انتخاب.",
    date: "۱۴۰۵/۰۱/۰۸",
    rating: 4.1,
    tags: ["اقتصادی", "زنجیره تأمین"],
    visibility: "عمومی",
  },
];

// ---------------------------------------------------------------------------
// Media — Photos & Video (Phase 1)
// ---------------------------------------------------------------------------
export type MediaItem = {
  id: string;
  kind: "photo" | "video";
  title: string;
  album: string;
  uploadedBy: string;
  date: string;
  rating: number;
  tags: string[];
  color: string;
  visibility: Visibility;
};

export const mediaItems: MediaItem[] = [
  { id: "m1", kind: "photo", title: "افتتاح مدرسه نوساز در قلعه‌گنج", album: "رویدادهای رسمی", uploadedBy: "پایگاه اطلاع‌رسانی بنیاد", date: "۱۴۰۵/۰۲/۰۱", rating: 4.8, tags: ["افتتاحیه", "مدرسه‌سازی"], color: "#82aee6", visibility: "عمومی" },
  { id: "m2", kind: "photo", title: "کارگاه آموزشی تسهیل‌گران محلی", album: "آموزش", uploadedBy: "وحید خاوئی", date: "۱۴۰۵/۰۲/۱۰", rating: 4.5, tags: ["آموزش"], color: "#93a2b8", visibility: "عمومی" },
  { id: "m3", kind: "video", title: "بازدید رئیس بنیاد از نمایشگاه آگروفود ۱۴۰۵", album: "رویدادهای رسمی", uploadedBy: "پایگاه اطلاع‌رسانی بنیاد", date: "۱۴۰۵/۰۲/۲۰", rating: 4.9, tags: ["آگروفود", "صنایع غذایی سینا"], color: "#1f4f99", visibility: "عمومی" },
  { id: "m4", kind: "video", title: "ضبط جلسه‌ی داوری طرح‌های اشتغال‌زایی", album: "بنیاد علوی", uploadedBy: "محسن مردعلی", date: "۱۴۰۵/۰۳/۰۱", rating: 4.1, tags: ["داوری"], color: "#5e7191", visibility: "خصوصی" },
  { id: "m5", kind: "photo", title: "گردهمایی سالانه مدیران هلدینگ‌های بنیاد", album: "رویدادهای رسمی", uploadedBy: "پایگاه اطلاع‌رسانی بنیاد", date: "۱۴۰۵/۰۲/۱۵", rating: 4.7, tags: ["گردهمایی", "هلدینگ‌ها"], color: "#b45309", visibility: "عمومی" },
  { id: "m6", kind: "video", title: "گفتگو درباره برنامه پنج‌برابر شدن خدمات محرومیت‌زدایی", album: "برنامه‌های بنیاد", uploadedBy: "پایگاه اطلاع‌رسانی بنیاد", date: "۱۴۰۵/۰۲/۲۵", rating: 4.6, tags: ["مصاحبه", "محرومیت‌زدایی"], color: "#0d9488", visibility: "عمومی" },
  { id: "m7", kind: "photo", title: "بازدید هیات نظارتی از طرح‌های لنده", album: "رویدادهای رسمی", uploadedBy: "محسن مردعلی", date: "۱۴۰۵/۰۳/۰۵", rating: 4.3, tags: ["بازدید", "لنده"], color: "#7c3aed", visibility: "خصوصی" },
  { id: "m8", kind: "photo", title: "آیین توزیع کفش دانش‌آموزی در مناطق کم‌برخوردار", album: "برنامه‌های اجتماعی", uploadedBy: "وحید خاوئی", date: "۱۴۰۵/۰۲/۱۸", rating: 4.4, tags: ["دانش‌آموزان", "اجتماعی"], color: "#dc2626", visibility: "عمومی" },
  { id: "m9", kind: "video", title: "معرفی بانک دانش بنیاد برای واحدهای سازمانی", album: "برنامه‌های بنیاد", uploadedBy: "پایگاه اطلاع‌رسانی بنیاد", date: "۱۴۰۵/۰۳/۱۰", rating: 4.8, tags: ["دمو", "مدیریت-دانش"], color: "#0f172a", visibility: "عمومی" },
  { id: "m10", kind: "photo", title: "جشن پایان فاز نخست آبادانی چالدران", album: "رویدادهای رسمی", uploadedBy: "محسن مردعلی", date: "۱۴۰۵/۰۳/۱۵", rating: 4.9, tags: ["جشن", "چالدران"], color: "#1f4f99", visibility: "عمومی" },
];

// ---------------------------------------------------------------------------
// News (Phase 1)
// ---------------------------------------------------------------------------
export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  date: string;
  comments: number;
  views: number;
  pinned?: boolean;
  visibility: Visibility;
};

export const newsItems: NewsItem[] = [
  {
    id: "nw1",
    views: 2140,
    title: "خدمات محرومیت‌زدایی بنیاد پنج برابر می‌شود",
    summary: "در چارچوب ماموریت‌های جدید بنیاد، دامنه خدمات محرومیت‌زدایی در مناطق هدف گسترش می‌یابد.",
    date: "۱۴۰۵/۰۳/۰۵",
    comments: 14,
    pinned: true,
    visibility: "عمومی",
  },
  {
    id: "nw2",
    views: 3480,
    title: "آمادگی بنیاد برای واگذاری هتل‌ها به ارزش ۴۷ همت",
    summary: "برنامه عرضه عمومی هتل‌ها و اموال مازاد بنیاد در راستای مردمی‌سازی اقتصاد اعلام شد.",
    date: "۱۴۰۵/۰۳/۰۲",
    comments: 6,
    visibility: "عمومی",
  },
  {
    id: "nw3",
    views: 860,
    title: "به‌روزرسانی سیاست‌های دسترسی و نقش‌های سازمانی سامانه",
    summary: "از این پس راهبران واحدها می‌توانند نقش‌های سفارشی ایجاد کنند. مستندات جدید در بانک دانش منتشر شد.",
    date: "۱۴۰۵/۰۲/۲۸",
    comments: 3,
    visibility: "خصوصی",
  },
  {
    id: "nw4",
    views: 2960,
    title: "امضای هفت تفاهم‌نامه مردمی‌سازی اقتصاد میان بنیاد علوی و هلدینگ‌ها",
    summary: "هلدینگ‌های فردوس پارس، کوثر، پارسیان، کاوه پارس، صبا، پایا ترابر سینا و صنایع غذایی سینا برای حمایت از بیش از ۸ هزار طرح خرد و متوسط همکاری می‌کنند.",
    date: "۱۴۰۵/۰۳/۰۸",
    comments: 21,
    pinned: true,
    visibility: "عمومی",
  },
  {
    id: "nw5",
    views: 1725,
    title: "توزیع ۳۰۰ هزار جفت کفش میان دانش‌آموزان مناطق کم‌برخوردار",
    summary: "برنامه تجهیز دانش‌آموزان مناطق هدف تا پایان شهریور تکمیل می‌شود؛ ۲۰ هزار جفت نخست توزیع شد.",
    date: "۱۴۰۵/۰۲/۲۲",
    comments: 9,
    visibility: "عمومی",
  },
  {
    id: "nw6",
    views: 1210,
    title: "بازدید رئیس بنیاد از نمایشگاه آگروفود ۱۴۰۵ و رونمایی از محصولات جدید صنایع غذایی سینا",
    summary: "در حاشیه نمایشگاه، از محصولات جدید هلدینگ صنایع غذایی سینا رونمایی شد.",
    date: "۱۴۰۵/۰۲/۱۴",
    comments: 5,
    visibility: "عمومی",
  },
  {
    id: "nw7",
    views: 1490,
    title: "برنامه زمان‌بندی جمع‌آوری مدارس ناایمن تا مهرماه اعلام شد",
    summary: "بنیاد برنامه نوسازی و ایمن‌سازی مدارس مناطق هدف را پیش از آغاز سال تحصیلی اجرا می‌کند.",
    date: "۱۴۰۵/۰۲/۰۳",
    comments: 12,
    visibility: "عمومی",
  },
];

// ---------------------------------------------------------------------------
// Security — sessions (Phase 1)
// ---------------------------------------------------------------------------
export type SessionItem = {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current?: boolean;
};

export const activeSessions: SessionItem[] = [
  { id: "s1", device: "Chrome on Windows", location: "تهران، ایران", ip: "37.32.10.21", lastActive: "هم‌اکنون", current: true },
  { id: "s2", device: "اپلیکیشن همراه سامانه", location: "تهران، ایران", ip: "5.210.44.18", lastActive: "۲ ساعت پیش" },
  { id: "s3", device: "Safari on iPhone", location: "اصفهان، ایران", ip: "94.182.3.5", lastActive: "۳ روز پیش" },
];

// ---------------------------------------------------------------------------
// Phase 3 — project/contract/fund/research registries
// ---------------------------------------------------------------------------
export type ContractRecord = {
  id: string;
  title: string;
  vendor: string;
  stage: "مذاکره" | "فراخوان" | "داوری" | "در حال اجرا" | "تسویه‌شده";
  value: string;
  deadline: string;
  owner: string;
};

export const contracts: ContractRecord[] = [
  { id: "ct1", title: "توسعه زیرساخت برق‌رسانی روستاهای مناطق هدف", vendor: "هلدینگ برق و انرژی صبا", stage: "در حال اجرا", value: "۴٬۲۰۰٬۰۰۰٬۰۰۰ ریال", deadline: "۱۴۰۵/۰۶/۱۵", owner: "وحید خاوئی" },
  { id: "ct2", title: "حمل‌ونقل و لجستیک اقلام حمایتی مناطق محروم", vendor: "هلدینگ پایا ترابر سینا", stage: "داوری", value: "۱٬۸۰۰٬۰۰۰٬۰۰۰ ریال", deadline: "۱۴۰۵/۰۵/۰۱", owner: "محسن مردعلی" },
  { id: "ct3", title: "ارزیابی امنیتی سامانه‌های اطلاعاتی بنیاد", vendor: "فراخوان عمومی", stage: "فراخوان", value: "—", deadline: "۱۴۰۵/۰۵/۲۰", owner: "کمیته امنیت اطلاعات" },
  { id: "ct4", title: "تأمین بذر و نهاده طرح‌های کشاورزی قلعه‌گنج", vendor: "هلدینگ کشاورزی فردوس پارس", stage: "تسویه‌شده", value: "۲٬۵۰۰٬۰۰۰٬۰۰۰ ریال", deadline: "۱۴۰۵/۰۲/۰۱", owner: "حسین دهقان" },
];

export type FundRecord = {
  id: string;
  title: string;
  applicant: string;
  stage: "ثبت‌شده" | "انتخاب اولیه" | "داوری" | "تخصیص‌یافته" | "در حال پایش";
  amount: string;
  roi: string;
};

export const funds: FundRecord[] = [
  { id: "fn1", title: "پرورش دام سبک — روستاهای قلعه‌گنج", applicant: "تعاونی دامداران محلی", stage: "در حال پایش", amount: "۸۰۰٬۰۰۰٬۰۰۰ ریال", roi: "۱۸٪" },
  { id: "fn2", title: "کارگاه تولید پوشاک — شهرستان لنده", applicant: "تعاونی بانوان کارآفرین", stage: "تخصیص‌یافته", amount: "۵۵۰٬۰۰۰٬۰۰۰ ریال", roi: "۱۲٪" },
  { id: "fn3", title: "گلخانه صیفی‌جات — شهرستان چالدران", applicant: "گروه کشاورزان جوان", stage: "داوری", amount: "—", roi: "—" },
];

export type ResearchOpportunity = {
  id: string;
  title: string;
  field: string;
  stage: "فراخوان باز" | "بررسی درخواست‌ها" | "داوری" | "در حال اجرا" | "پایان‌یافته";
  applicants: number;
  deadline: string;
};

export const researchOpportunities: ResearchOpportunity[] = [
  { id: "rs1", title: "سنجش اثر اجتماعی طرح‌های محرومیت‌زدایی در مناطق هدف", field: "مطالعات اجتماعی", stage: "بررسی درخواست‌ها", applicants: 9, deadline: "۱۴۰۵/۰۵/۱۰" },
  { id: "rs2", title: "بهینه‌سازی الگوی کشت در اراضی کم‌آب جنوب کرمان", field: "کشاورزی", stage: "فراخوان باز", applicants: 3, deadline: "۱۴۰۵/۰۶/۰۱" },
  { id: "rs3", title: "مدل‌های پایداری اشتغال در طرح‌های خرد روستایی", field: "اقتصاد", stage: "در حال اجرا", applicants: 5, deadline: "۱۴۰۵/۰۴/۲۵" },
];

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export const reportByDepartment = [
  { label: "محرومیت‌زدایی", value: 38 },
  { label: "اقتصادی و هلدینگ‌ها", value: 22 },
  { label: "فرهنگی و اجتماعی", value: 18 },
  { label: "حقوقی و واگذاری‌ها", value: 12 },
  { label: "منابع انسانی", value: 10 },
];

export const reportByStatus = [
  { label: "در حال انجام", value: 45, tone: "brand" as const },
  { label: "انجام‌شده", value: 30, tone: "success" as const },
  { label: "تأخیر دارد", value: 15, tone: "danger" as const },
  { label: "برنامه‌ریزی", value: 10, tone: "neutral" as const },
];

export const monthlyActivity = [
  { month: "فروردین", value: 40 },
  { month: "اردیبهشت", value: 65 },
  { month: "خرداد", value: 52 },
  { month: "تیر", value: 78 },
  { month: "مرداد", value: 61 },
  { month: "شهریور", value: 84 },
];

// ---------------------------------------------------------------------------
// Admin — modules marketplace, pages, menus, roles, file extensions
// ---------------------------------------------------------------------------
export type ModuleDef = {
  id: string;
  name: string;
  description: string;
  category: "اجتماعی" | "دانش و پروژه" | "امنیت" | "زیرساخت";
  core?: boolean;
};

export const moduleCatalog: ModuleDef[] = [
  { id: "social", name: "شبکه اجتماعی", description: "گروه، پست، انجمن، گپ، اعلان", category: "اجتماعی", core: true },
  { id: "events", name: "رویدادها و جلسات", description: "تقویم شمسی/میلادی، دعوت‌نامه، اسناد رویداد", category: "اجتماعی" },
  { id: "blog", name: "بلاگ", description: "انتشار یادداشت‌های کاربران با امتیازدهی", category: "اجتماعی" },
  { id: "media", name: "تصاویر و ویدیو", description: "آلبوم، اتصال آپارات، حریم خصوصی محتوا", category: "اجتماعی" },
  { id: "knowledge", name: "مدیریت دانش", description: "آرشیو اسناد، قراردادها، مصوبات، جستجوی پیشرفته", category: "دانش و پروژه" },
  { id: "projects", name: "مدیریت پروژه", description: "بورد، گانت چارت، بودجه، تسک", category: "دانش و پروژه" },
  { id: "contracts", name: "قراردادها و واگذاری‌ها", description: "مذاکره، داوری، زمان‌بندی تعهدات", category: "دانش و پروژه" },
  { id: "funds", name: "طرح‌های اشتغال‌زایی", description: "ثبت طرح، داوری، تخصیص منابع، گزارش اثربخشی", category: "دانش و پروژه" },
  { id: "research", name: "فرصت‌های پژوهشی", description: "فراخوان، داوری، پیگیری اجرای پژوهش", category: "دانش و پروژه" },
  { id: "reports", name: "گزارش‌گیری پیشرفته", description: "داشبورد مدیریتی و گزارش تجمیعی", category: "دانش و پروژه" },
  { id: "training", name: "آموزش و توانمندسازی", description: "دوره‌ها، تقویم آموزشی، حضور و غیاب، ارزشیابی، گواهینامه", category: "دانش و پروژه" },
  { id: "assistant", name: "دستیار هوشمند (AI)", description: "پرسش‌وپاسخ فارسی از داده‌ها، ارزیابی هوشمند پروپوزال، چت‌بات", category: "دانش و پروژه" },
  { id: "award", name: "جایزه نوآوری", description: "ثبت‌نام سه محور، صحت‌سنجی هلدینگ، داوری و امتیازدهی", category: "اجتماعی" },
  { id: "sms", name: "اعلان پیامکی", description: "اتصال به درگاه‌های پیامک (کاوه‌نگار، فراپیامک و ...)", category: "زیرساخت" },
  { id: "sso", name: "ورود سازمانی (SSO/LDAP)", description: "اتصال به Active Directory یا OIDC سازمان", category: "امنیت" },
  { id: "waf", name: "فایروال و ضدویروس", description: "محدودسازی نرخ درخواست، اسکن ClamAV، کپچا", category: "امنیت" },
  { id: "audit", name: "گزارش رخدادهای امنیتی (Audit Log)", description: "ثبت کامل فعالیت‌های حساس برای ارائه به افتا", category: "امنیت" },
];

export type AdminPageDef = { id: string; title: string; slug: string; visible: boolean };
export const adminPages: AdminPageDef[] = [
  { id: "pg1", title: "درباره ما", slug: "/about", visible: true },
  { id: "pg2", title: "قوانین و مقررات", slug: "/terms", visible: true },
  { id: "pg3", title: "تماس با ما", slug: "/contact", visible: true },
  { id: "pg4", title: "سوالات متداول", slug: "/faq", visible: false },
];

export type AdminMenuDef = { id: string; title: string; order: number; visible: boolean };
export const adminMenus: AdminMenuDef[] = [
  { id: "mn1", title: "داشبورد", order: 1, visible: true },
  { id: "mn2", title: "گروه‌ها", order: 2, visible: true },
  { id: "mn3", title: "مدیریت دانش", order: 3, visible: true },
  { id: "mn4", title: "مدیریت پروژه", order: 4, visible: true },
  { id: "mn5", title: "طرح‌های اشتغال‌زایی", order: 5, visible: false },
];

// ---------------------------------------------------------------------------
// Roles & granular permissions (custom roles)
// ---------------------------------------------------------------------------
export type PermissionGroup = {
  id: string;
  label: string;
  actions: { id: string; label: string }[];
};

export const permissionCatalog: PermissionGroup[] = [
  {
    id: "users",
    label: "کاربران",
    actions: [
      { id: "users.list", label: "مشاهده فهرست کاربران" },
      { id: "users.create", label: "ایجاد کاربر جدید" },
      { id: "users.edit", label: "ویرایش کاربران" },
      { id: "users.import", label: "واردسازی دسته‌ای کاربران" },
      { id: "users.block", label: "مسدودسازی کاربران" },
      { id: "users.guest", label: "دعوت حساب مهمان" },
    ],
  },
  {
    id: "roles",
    label: "نقش‌ها و دسترسی",
    actions: [
      { id: "roles.list", label: "مشاهده فهرست نقش‌ها" },
      { id: "roles.create", label: "ایجاد نقش جدید" },
      { id: "roles.edit", label: "ویرایش نقش و دسترسی‌ها" },
      { id: "roles.delete", label: "حذف نقش" },
      { id: "roles.assign", label: "تخصیص نقش به کاربران" },
    ],
  },
  {
    id: "news",
    label: "اخبار سازمان",
    actions: [
      { id: "news.list", label: "مشاهده اخبار" },
      { id: "news.create", label: "افزودن خبر" },
      { id: "news.edit", label: "ویرایش خبر" },
      { id: "news.delete", label: "حذف خبر" },
      { id: "news.pin", label: "سنجاق‌کردن خبر" },
      { id: "news.comments", label: "مدیریت و تایید نظرات اخبار" },
    ],
  },
  {
    id: "blog",
    label: "بلاگ",
    actions: [
      { id: "blog.list", label: "مشاهده یادداشت‌ها" },
      { id: "blog.create", label: "انتشار یادداشت" },
      { id: "blog.edit", label: "ویرایش یادداشت" },
      { id: "blog.delete", label: "حذف یادداشت" },
      { id: "blog.comments", label: "مدیریت نظرات بلاگ" },
    ],
  },
  {
    id: "groups",
    label: "گروه‌های تعاملی",
    actions: [
      { id: "groups.list", label: "مشاهده گروه‌ها" },
      { id: "groups.create", label: "ایجاد گروه" },
      { id: "groups.edit", label: "ویرایش گروه" },
      { id: "groups.delete", label: "حذف گروه" },
      { id: "groups.members", label: "مدیریت اعضای گروه" },
      { id: "groups.post", label: "انتشار پست در گروه" },
    ],
  },
  {
    id: "forum",
    label: "انجمن",
    actions: [
      { id: "forum.list", label: "مشاهده مباحث" },
      { id: "forum.create", label: "ایجاد مبحث جدید" },
      { id: "forum.reply", label: "پاسخ به مباحث" },
      { id: "forum.edit", label: "ویرایش مباحث" },
      { id: "forum.delete", label: "حذف مباحث" },
      { id: "forum.solve", label: "علامت‌گذاری پاسخ برگزیده" },
    ],
  },
  {
    id: "events",
    label: "رویدادها و جلسات",
    actions: [
      { id: "events.list", label: "مشاهده رویدادها" },
      { id: "events.create", label: "ایجاد رویداد" },
      { id: "events.edit", label: "ویرایش رویداد" },
      { id: "events.delete", label: "حذف رویداد" },
      { id: "events.invite", label: "ارسال دعوت‌نامه" },
    ],
  },
  {
    id: "media",
    label: "تصاویر و ویدیو",
    actions: [
      { id: "media.list", label: "مشاهده رسانه‌ها" },
      { id: "media.upload", label: "بارگذاری تصویر و ویدیو" },
      { id: "media.edit", label: "ویرایش رسانه" },
      { id: "media.delete", label: "حذف رسانه" },
      { id: "media.albums", label: "مدیریت آلبوم‌ها" },
    ],
  },
  {
    id: "chat",
    label: "گفتگو و کانال‌ها",
    actions: [
      { id: "chat.view", label: "مشاهده و ارسال پیام" },
      { id: "chat.channels", label: "ایجاد و مدیریت کانال" },
      { id: "chat.pin", label: "سنجاق‌کردن پیام" },
      { id: "chat.integrations", label: "مدیریت وب‌هوک‌ها و بات‌ها" },
    ],
  },
  {
    id: "knowledge",
    label: "مدیریت دانش",
    actions: [
      { id: "knowledge.list", label: "مشاهده اسناد" },
      { id: "knowledge.upload", label: "بارگذاری سند" },
      { id: "knowledge.edit", label: "ویرایش سند" },
      { id: "knowledge.delete", label: "حذف سند" },
      { id: "knowledge.categories", label: "مدیریت دسته‌بندی اسناد" },
      { id: "knowledge.visibility", label: "تغییر سطح دسترسی اسناد" },
    ],
  },
  {
    id: "projects",
    label: "مدیریت پروژه",
    actions: [
      { id: "projects.list", label: "مشاهده پروژه‌ها" },
      { id: "projects.create", label: "ایجاد پروژه" },
      { id: "projects.edit", label: "ویرایش پروژه" },
      { id: "projects.delete", label: "حذف پروژه" },
      { id: "projects.tasks", label: "ایجاد و تخصیص وظایف" },
      { id: "projects.progress", label: "ثبت گزارش پیشرفت" },
    ],
  },
  {
    id: "contracts",
    label: "قراردادها",
    actions: [
      { id: "contracts.list", label: "مشاهده قراردادها" },
      { id: "contracts.create", label: "ثبت قرارداد" },
      { id: "contracts.edit", label: "ویرایش قرارداد" },
      { id: "contracts.delete", label: "حذف قرارداد" },
      { id: "contracts.stage", label: "تغییر مرحله قرارداد" },
    ],
  },
  {
    id: "funds",
    label: "صندوق نوآوری و شتاب‌دهی",
    actions: [
      { id: "funds.list", label: "مشاهده طرح‌ها" },
      { id: "funds.submit", label: "ثبت طرح جدید" },
      { id: "funds.refer", label: "ارجاع طرح به داوری" },
      { id: "funds.score", label: "امتیازدهی و داوری طرح" },
      { id: "funds.allocate", label: "تخصیص منابع و اقساط" },
      { id: "funds.monitor", label: "پایش و ثبت KPI طرح" },
    ],
  },
  {
    id: "research",
    label: "فرصت‌های پژوهشی",
    actions: [
      { id: "research.list", label: "مشاهده فراخوان‌ها" },
      { id: "research.create", label: "ایجاد فراخوان" },
      { id: "research.edit", label: "ویرایش فراخوان" },
      { id: "research.close", label: "بستن فراخوان" },
    ],
  },
  {
    id: "reports",
    label: "گزارش‌گیری",
    actions: [
      { id: "reports.view", label: "مشاهده داشبورد گزارش‌ها" },
      { id: "reports.export", label: "دریافت خروجی گزارش" },
    ],
  },
  {
    id: "training",
    label: "آموزش و توانمندسازی",
    actions: [
      { id: "training.list", label: "مشاهده دوره‌ها" },
      { id: "training.create", label: "تعریف دوره جدید" },
      { id: "training.enroll", label: "ثبت‌نام در دوره" },
      { id: "training.evaluate", label: "ارزشیابی و سنجش اثربخشی" },
      { id: "training.certificate", label: "صدور گواهینامه" },
    ],
  },
  {
    id: "companies",
    label: "هلدینگ‌ها و شرکت‌ها",
    actions: [
      { id: "companies.view", label: "مشاهده ساختار هلدینگ‌ها" },
      { id: "companies.manage", label: "مدیریت شرکت‌های زیرمجموعه" },
      { id: "companies.publish-global", label: "انتشار محتوای سراسری" },
      { id: "companies.publish-holding", label: "انتشار در سطح هلدینگ" },
    ],
  },
  {
    id: "assistant",
    label: "دستیار هوشمند",
    actions: [
      { id: "assistant.chat", label: "پرسش‌وپاسخ از دستیار مدیریتی" },
      { id: "assistant.evaluate", label: "اجرای ارزیابی هوشمند پروپوزال" },
      { id: "assistant.configure", label: "پیکربندی چت‌بات‌ها" },
    ],
  },
  {
    id: "settings",
    label: "تنظیمات سامانه",
    actions: [
      { id: "settings.branding", label: "برندسازی سازمان" },
      { id: "settings.modules", label: "فعال/غیرفعال‌سازی ماژول‌ها" },
      { id: "settings.pages", label: "مدیریت صفحات و منوها" },
      { id: "settings.security", label: "تنظیمات امنیت و انطباق" },
      { id: "settings.system", label: "تنظیمات کلی سیستم" },
      { id: "settings.storage", label: "مدیریت فضای ذخیره‌سازی" },
    ],
  },
];

export const allPermissionIds: string[] = permissionCatalog.flatMap((g) => g.actions.map((a) => a.id));

export type RoleDef = {
  id: string;
  title: string;
  scope: "پلتفرم" | "سازمان" | "گروه";
  members: number;
  description: string;
  permissions: string[];
  system?: boolean;
};

export const roles: RoleDef[] = [
  { id: "r1", title: "راهبر پلتفرم", scope: "پلتفرم", members: 2, description: "دسترسی کامل به همه‌ی سازمان‌ها و تنظیمات زیرساخت", permissions: [...allPermissionIds], system: true },
  { id: "r2", title: "مدیر سازمان", scope: "سازمان", members: 4, description: "مدیریت کامل یک سازمان: کاربران، ماژول‌ها، برندسازی", permissions: allPermissionIds.filter((p) => !p.startsWith("settings.system") && !p.startsWith("settings.storage")), system: true },
  { id: "r3", title: "ناظم گروه", scope: "گروه", members: 18, description: "مدیریت محتوا و اعضای یک گروه مشخص", permissions: ["groups.list", "groups.edit", "groups.members", "groups.post", "forum.list", "forum.create", "forum.reply", "forum.solve", "chat.view", "chat.pin", "media.list", "media.upload", "news.list", "blog.list", "events.list"], system: true },
  {
    id: "r4",
    title: "عضو عادی",
    scope: "گروه",
    members: 1280,
    description: "دسترسی استاندارد به محتوای عمومی و گروه‌های عضو",
    permissions: ["news.list", "blog.list", "groups.list", "groups.post", "forum.list", "forum.reply", "events.list", "media.list", "chat.view", "knowledge.list", "reports.view"],
    system: true,
  },
  {
    id: "r5",
    title: "کارشناس داوری صندوق",
    scope: "سازمان",
    members: 7,
    description: "نقش سفارشی: بررسی، امتیازدهی و پایش طرح‌های صندوق نوآوری",
    permissions: ["funds.list", "funds.refer", "funds.score", "funds.monitor", "reports.view", "knowledge.list", "events.list", "chat.view"],
  },
];

export type RoleAssignment = Record<string, string>;
export const initialRoleAssignments: RoleAssignment = {
  u1: "r1",
  u2: "r2",
  u3: "r4",
  u4: "r2",
  u5: "r5",
};

export const allowedFileExtensions = ["jpg", "png", "gif", "mp4", "avi", "pdf", "docx", "xlsx", "pptx", "zip"];

// ---------------------------------------------------------------------------
// Global search demo results
// ---------------------------------------------------------------------------
export type SearchResult = { id: string; type: "پست" | "گروه" | "سند" | "پروژه" | "کاربر"; title: string; snippet: string };
export const searchResults: SearchResult[] = [
  { id: "sr1", type: "سند", title: "چارچوب حقوقی واگذاری هتل‌ها و اموال مازاد بنیاد", snippet: "آرشیو قراردادها · بروزرسانی ۱۴۰۵/۰۲/۰۱" },
  { id: "sr2", type: "پروژه", title: "طرح آبادانی و پیشرفت قلعه‌گنج — فاز دوم", snippet: "کارفرما: بنیاد علوی · پیشرفت ۷۰٪" },
  { id: "sr3", type: "گروه", title: "ستاد محرومیت‌زدایی", snippet: "۱۸ عضو · خصوصی" },
  { id: "sr4", type: "پست", title: "گزارش پیشرفت طرح‌های آبادانی قلعه‌گنج بارگذاری شد", snippet: "۱۲ پسندیدن · ۳ نظر" },
  { id: "sr5", type: "کاربر", title: "محسن مردعلی", snippet: "قائم‌مقام بنیاد علوی · بنیاد علوی" },
];

// ---------------------------------------------------------------------------
// Internal communication workspace (Mattermost-inspired) — channels, presence,
// threads, reactions, pinned/saved messages. Distinct from "Groups": Groups
// are community/social (public browsing, posts, likes, forum-per-group);
// Channels are the internal team-communication workspace (sidebar categories,
// threaded replies, slash commands, integrations).
// ---------------------------------------------------------------------------
export type PresenceStatus = "online" | "away" | "dnd" | "offline";

export const userPresence: Record<string, PresenceStatus> = {
  u1: "online",
  u2: "dnd",
  u3: "offline",
  u4: "away",
  u5: "online",
  u6: "online",
  u7: "online",
  u8: "offline",
  u9: "online",
  u10: "online",
  u11: "away",
  u12: "online",
  u13: "dnd",
};

export type Channel = {
  id: string;
  name: string;
  topic: string;
  type: "public" | "private";
  category: "علاقه‌مندی‌ها" | "کانال‌ها" | "بایگانی‌شده";
  unread: number;
  mentions: number;
  members: number;
  pinnedCount: number;
};

export const channels: Channel[] = [
  { id: "ch1", name: "همگانی", topic: "اطلاعیه‌های عمومی و هماهنگی کلی واحدها", type: "public", category: "علاقه‌مندی‌ها", unread: 3, mentions: 1, members: 42, pinnedCount: 2 },
  { id: "ch2", name: "ستاد-محرومیت‌زدایی", topic: "هماهنگی طرح‌های قلعه‌گنج، لنده و چالدران", type: "private", category: "کانال‌ها", unread: 12, mentions: 2, members: 9, pinnedCount: 4 },
  { id: "ch3", name: "روابط-عمومی", topic: "هماهنگی اخبار، بازدیدها و انتشار محتوا", type: "public", category: "کانال‌ها", unread: 0, mentions: 0, members: 6, pinnedCount: 1 },
  { id: "ch4", name: "حوادث-و-پشتیبانی", topic: "گزارش و پیگیری حوادث عملیاتی سامانه (Playbooks)", type: "private", category: "کانال‌ها", unread: 1, mentions: 0, members: 5, pinnedCount: 0 },
  { id: "ch5", name: "بایگانی-فراخوان-اول", topic: "آرشیو هماهنگی‌های فراخوان اول طرح‌های اشتغال", type: "private", category: "بایگانی‌شده", unread: 0, mentions: 0, members: 4, pinnedCount: 0 },
  { id: "ch6", name: "شبکه-نخبگان", topic: "هماهنگی همکاری پژوهشگران برگزیده با مسائل صنایع بنیاد", type: "public", category: "کانال‌ها", unread: 6, mentions: 1, members: 148, pinnedCount: 3 },
  { id: "ch7", name: "هماهنگی-هلدینگ‌ها", topic: "ارتباط ستاد بنیاد با رابطین R&D دوازده هلدینگ", type: "private", category: "کانال‌ها", unread: 4, mentions: 2, members: 14, pinnedCount: 2 },
];

export type ReactionIcon = "ThumbsUp" | "Heart" | "Smile" | "CheckCircle2";
export type Reaction = { icon: ReactionIcon; count: number; reactedByMe?: boolean };

export type ChannelMessage = {
  id: string;
  channelId: string;
  authorId: string;
  text: string;
  time: string;
  pinned?: boolean;
  saved?: boolean;
  reactions?: Reaction[];
  threadReplies?: number;
};

export const channelMessages: ChannelMessage[] = [
  { id: "cm1", channelId: "ch1", authorId: "u2", text: "صبح بخیر همگی، امروز ساعت ۱۰ جلسه‌ی مرور برنامه محرومیت‌زدایی داریم.", time: "۰۸:۴۰", pinned: true, reactions: [{ icon: "ThumbsUp", count: 6, reactedByMe: true }] },
  { id: "cm2", channelId: "ch1", authorId: "u3", text: "ممنون از اطلاع‌رسانی، حتماً حضور دارم.", time: "۰۸:۴۲" },
  { id: "cm3", channelId: "ch2", authorId: "u4", text: "جمع‌بندی وضعیت طرح‌های قلعه‌گنج را در بانک دانش گذاشتم. لطفاً پیش از جلسه مرور کنید.", time: "۰۹:۱۵", reactions: [{ icon: "CheckCircle2", count: 3 }], threadReplies: 4 },
  { id: "cm4", channelId: "ch2", authorId: "u5", text: "فهرست ۳۸ طرح واجد شرایط فراخوان دوم نهایی شد و برای داوری آماده است.", time: "۰۹:۴۰", saved: true, reactions: [{ icon: "Heart", count: 2 }] },
  { id: "cm5", channelId: "ch3", authorId: "u1", text: "پیش‌نویس خبر بازدید از نمایشگاه آگروفود آماده است، نظرتان را می‌خواهم.", time: "دیروز", threadReplies: 7 },
  { id: "cm6", channelId: "ch4", authorId: "u5", text: "اجرای Playbook «واکنش به افزایش غیرعادی ترافیک» شروع شد — مرحله ۱ از ۵.", time: "۱۱:۰۲" },
  { id: "cm7", channelId: "ch6", authorId: "u6", text: "نتایج مدل تشخیص نقص روی خط زمزم منتشر شد؛ چه کسی برای تعمیم به خط بهنوش داوطلب است؟", time: "۱۰:۱۵", pinned: true, reactions: [{ icon: "ThumbsUp", count: 12, reactedByMe: true }], threadReplies: 9 },
  { id: "cm8", channelId: "ch6", authorId: "u9", text: "برای مسئله بازیافت حرارت صبا یک تیم سه‌نفره تشکیل دادیم؛ نیازمند یک متخصص مبدل حرارتی هستیم.", time: "۱۰:۴۰", reactions: [{ icon: "Heart", count: 5 }], threadReplies: 4 },
  { id: "cm9", channelId: "ch7", authorId: "u1", text: "رابطین محترم هلدینگ‌ها: مهلت به‌روزرسانی سندهای فرصت‌های تحقیق و توسعه پایان تیرماه است. وضعیت فعلی در «مدیریت دانش ← سندهای فرصت» قابل مشاهده است.", time: "۰۹:۰۰", pinned: true, reactions: [{ icon: "CheckCircle2", count: 7 }] },
  { id: "cm10", channelId: "ch7", authorId: "u12", text: "جمع‌بندی جلسه با بانک سینا: دو مسئله تحول دیجیتال برای فراخوان پاییز آماده شد؛ RFP تا هفته آینده تدوین می‌شود.", time: "۰۹:۳۵", threadReplies: 3 },
];

export type Integration = {
  id: string;
  name: string;
  type: "وب‌هوک ورودی" | "وب‌هوک خروجی" | "بات" | "دستور اسلش";
  channel: string;
  status: "فعال" | "غیرفعال";
  createdBy: string;
};

export const integrations: Integration[] = [
  { id: "ig1", name: "اعلان بارگذاری گزارش‌های مناطق", type: "وب‌هوک ورودی", channel: "ستاد-محرومیت‌زدایی", status: "فعال", createdBy: "تیم سامانه" },
  { id: "ig2", name: "ارسال گزارش روزانه به دفتر ریاست", type: "وب‌هوک خروجی", channel: "همگانی", status: "فعال", createdBy: "تیم سامانه" },
  { id: "ig3", name: "ربات یادآور جلسات و وظایف", type: "بات", channel: "ستاد-محرومیت‌زدایی", status: "فعال", createdBy: "تیم سامانه" },
  { id: "ig4", name: "/task — ایجاد سریع تسک از چت", type: "دستور اسلش", channel: "همه‌ی کانال‌ها", status: "فعال", createdBy: "تیم سامانه" },
  { id: "ig5", name: "/poll — نظرسنجی سریع", type: "دستور اسلش", channel: "همه‌ی کانال‌ها", status: "غیرفعال", createdBy: "تیم سامانه" },
];

export type GuestAccount = { id: string; name: string; org: string; channels: string[]; expires: string };
export const guestAccounts: GuestAccount[] = [
  { id: "gu1", name: "ناظر میدانی طرح‌های قلعه‌گنج", org: "خارج از سازمان", channels: ["ستاد-محرومیت‌زدایی"], expires: "۱۴۰۵/۰۴/۳۰" },
];

export type PlaybookTemplate = { id: string; name: string; category: string; steps: number; usedCount: number };
export const playbookTemplates: PlaybookTemplate[] = [
  { id: "pb1", name: "واکنش به افزایش غیرعادی ترافیک", category: "عملیات/امنیت", steps: 5, usedCount: 3 },
  { id: "pb2", name: "فرآیند افتتاح و تحویل طرح عمرانی", category: "مدیریت پروژه", steps: 6, usedCount: 1 },
  { id: "pb3", name: "آماده‌سازی کارگاه آموزشی راهبران", category: "آموزش", steps: 4, usedCount: 2 },
];
