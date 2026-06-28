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
  id: "daneshmand",
  name: "هلدینگ دانشمند",
  domain: "daneshmand.motoshub.app",
  logoColor: "#1f4f99",
  plan: "سازمانی",
  users: 1280,
  modules: ["شبکه اجتماعی", "مدیریت دانش", "مدیریت پروژه", "گزارش‌گیری پیشرفته"],
};

export const tenants: Tenant[] = [
  currentTenant,
  {
    id: "bank-mellat",
    name: "بانک ملت",
    domain: "bankmellat.motoshub.app",
    logoColor: "#b45309",
    plan: "سازمانی",
    users: 4200,
    modules: ["شبکه اجتماعی", "مدیریت دانش"],
  },
  {
    id: "vazarat-olum",
    name: "وزارت علوم",
    domain: "olum.motoshub.app",
    logoColor: "#0d9488",
    plan: "حرفه‌ای",
    users: 860,
    modules: ["شبکه اجتماعی", "مدیریت دانش", "مدیریت پروژه"],
  },
  {
    id: "fata",
    name: "پلیس فتا",
    domain: "fata.motoshub.app",
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
  name: "رضا سمیع‌زاده",
  role: "مدیر فنی پروژه",
  org: "شرکت دانش‌افراز فاخر ایرانیان",
  avatarColor: "#1f4f99",
  skills: ["معماری نرم‌افزار", "PHP/Oxwall", "React", "DevOps"],
  online: true,
};

export const users: UserProfile[] = [
  currentUser,
  {
    id: "u2",
    name: "فرشاد حاج‌محمدی",
    role: "مدیرعامل",
    org: "شرکت دانش‌افراز فاخر ایرانیان",
    avatarColor: "#0d9488",
    skills: ["مدیریت محصول", "استراتژی"],
    online: true,
  },
  {
    id: "u3",
    name: "جعفر حبیبی",
    role: "عضو هیات‌مدیره",
    org: "هلدینگ دانشمند",
    avatarColor: "#b45309",
    skills: ["سرمایه‌گذاری خطرپذیر", "نظارت فنی"],
    online: false,
  },
  {
    id: "u4",
    name: "محمدرضا محمدخانی",
    role: "مدیرعامل و عضو هیات‌مدیره",
    org: "هلدینگ دانشمند",
    avatarColor: "#1f4f99",
    skills: ["راهبری سازمانی"],
    online: false,
  },
  {
    id: "u5",
    name: "یاسر علی‌مردانی",
    role: "توسعه‌دهنده بک‌اند",
    org: "شرکت دانش‌افراز فاخر ایرانیان",
    avatarColor: "#7c3aed",
    skills: ["PHP", "SMS Gateways", "Smarty"],
    online: true,
  },
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
};

export const groups: Group[] = [
  {
    id: "g1",
    name: "توسعه موتوشاب",
    description: "هماهنگی تیم فنی پروژه ادغام موتوشاب و میزیتو",
    members: 18,
    privacy: "خصوصی",
    color: "#1f4f99",
    unread: 4,
    category: "فنی",
  },
  {
    id: "g2",
    name: "صندوق نوآوری و شتاب‌دهی",
    description: "پایش طرح‌های سرمایه‌گذاری و عملکرد شرکت‌های سرمایه‌پذیر",
    members: 9,
    privacy: "خصوصی",
    color: "#0d9488",
    unread: 0,
    category: "سرمایه‌گذاری",
  },
  {
    id: "g3",
    name: "قراردادهای فناورانه",
    description: "مدیریت مذاکره، داوری و زمان‌بندی تعهدات قراردادها",
    members: 12,
    privacy: "خصوصی",
    color: "#b45309",
    unread: 2,
    category: "حقوقی",
  },
  {
    id: "g4",
    name: "اطلاع‌رسانی عمومی هلدینگ",
    description: "کانال رسمی اخبار و اطلاعیه‌های هلدینگ دانشمند",
    members: 1280,
    privacy: "عمومی",
    color: "#0f172a",
    unread: 1,
    category: "اطلاع‌رسانی",
  },
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
      "نسخه جدید موتوشاب با هسته اجتماعی Motoshub و ماژول‌های مدیریت پروژه Mizito ادغام شد. از همه همکاران برای تست فاز اول دعوت می‌کنیم.",
    time: "۲ ساعت پیش",
    likes: 24,
    comments: 6,
    tags: ["موتوشاب", "انتشار"],
    pinned: true,
  },
  {
    id: "p2",
    authorId: "u1",
    groupId: "g1",
    content:
      "API گیت‌وی بین هسته PHP و سرویس‌های جدید Node.js راه‌اندازی شد. مستندات OpenAPI به‌زودی در بخش مدیریت دانش بارگذاری می‌شود.",
    time: "۵ ساعت پیش",
    likes: 12,
    comments: 3,
    tags: ["بک‌اند", "API"],
  },
  {
    id: "p3",
    authorId: "u5",
    groupId: "g1",
    content: "کدوم مسیر احراز هویت رو ترجیح می‌دید؟",
    time: "روز گذشته",
    likes: 8,
    comments: 11,
    tags: ["نظرسنجی"],
    attachment: { type: "poll", label: "JWT در برابر OAuth2/SSO سازمانی" },
  },
  {
    id: "p4",
    authorId: "u3",
    groupId: "g2",
    content:
      "گزارش بازگشت سرمایه سه‌ماهه صندوق شتاب‌دهی نهایی شد. لطفاً قبل از جلسه هیات‌مدیره بررسی کنید.",
    time: "۲ روز پیش",
    likes: 5,
    comments: 2,
    tags: ["گزارش", "مالی"],
    attachment: { type: "doc", label: "گزارش-بازگشت-سرمایه-Q1.pdf" },
  },
];

export type ForumTopic = {
  id: string;
  title: string;
  author: string;
  replies: number;
  views: number;
  lastActivity: string;
  category: string;
  solved?: boolean;
};

export const forumTopics: ForumTopic[] = [
  {
    id: "f1",
    title: "بهترین روش multi-tenancy برای پلتفرم: shared-schema یا DB-per-tenant؟",
    author: "رضا سمیع‌زاده",
    replies: 14,
    views: 212,
    lastActivity: "۱ ساعت پیش",
    category: "معماری",
    solved: true,
  },
  {
    id: "f2",
    title: "مهاجرت احراز هویت Oxwall به JWT بدون شکستن سشن‌های فعال",
    author: "یاسر علی‌مردانی",
    replies: 9,
    views: 134,
    lastActivity: "۳ ساعت پیش",
    category: "بک‌اند",
  },
  {
    id: "f3",
    title: "استاندارد طراحی Gantt chart برای ماژول مدیریت پروژه",
    author: "فرشاد حاج‌محمدی",
    replies: 6,
    views: 98,
    lastActivity: "دیروز",
    category: "فرانت‌اند",
  },
];

export type KnowledgeDoc = {
  id: string;
  title: string;
  category: string;
  type: "قرارداد" | "آموزشی" | "صورت‌جلسه" | "گزارش";
  updatedAt: string;
  owner: string;
  size: string;
};

export const knowledgeDocs: KnowledgeDoc[] = [
  {
    id: "d1",
    title: "قرارداد استقرار و توسعه شبکه اجتماعی دانشمند",
    category: "آرشیو قراردادها",
    type: "قرارداد",
    updatedAt: "۱۴۰۵/۰۲/۰۱",
    owner: "واحد حقوقی",
    size: "۱.۲ مگابایت",
  },
  {
    id: "d2",
    title: "راهنمای کامل کاربری موتوشاب — نسخه ۲",
    category: "مستندات آموزشی",
    type: "آموزشی",
    updatedAt: "۱۴۰۵/۰۱/۲۰",
    owner: "تیم محصول",
    size: "۸۴۰ کیلوبایت",
  },
  {
    id: "d3",
    title: "صورت‌جلسه هیات‌مدیره — بررسی فاز دوم پروژه",
    category: "آرشیو مصوبات و جلسات",
    type: "صورت‌جلسه",
    updatedAt: "۱۴۰۵/۰۱/۱۵",
    owner: "دبیرخانه",
    size: "۳۱۰ کیلوبایت",
  },
  {
    id: "d4",
    title: "گزارش پیشرفت فاز اول — ارائه به ناظر کارفرما",
    category: "مدیریت دانش",
    type: "گزارش",
    updatedAt: "۱۴۰۵/۰۲/۱۰",
    owner: "مدیر پروژه",
    size: "۲.۴ مگابایت",
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
    name: "استقرار و شخصی‌سازی نسخه پایه موتوشاب",
    client: "هلدینگ دانشمند",
    health: "سبز",
    progress: 70,
    budgetUsed: 55,
    deadline: "۱۴۰۵/۰۴/۰۱",
    tasks: [
      { id: "t1", title: "پیکربندی زیرساخت Docker", status: "انجام‌شده", assignee: "یاسر علی‌مردانی", priority: "زیاد", due: "۱۴۰۵/۰۲/۱۵", progress: 100 },
      { id: "t2", title: "توسعه API Gateway", status: "در حال انجام", assignee: "رضا سمیع‌زاده", priority: "زیاد", due: "۱۴۰۵/۰۲/۲۸", progress: 60 },
      { id: "t3", title: "طراحی UI جدید داشبورد", status: "در حال انجام", assignee: "تیم فرانت‌اند", priority: "متوسط", due: "۱۴۰۵/۰۳/۰۵", progress: 45 },
      { id: "t4", title: "آموزش کاربران (۲۴ نفر-ساعت)", status: "برنامه‌ریزی", assignee: "تیم پشتیبانی", priority: "متوسط", due: "۱۴۰۵/۰۳/۲۰", progress: 0 },
    ],
  },
  {
    id: "pr2",
    name: "ماژول مدیریت دانش و پروفایل سازمانی",
    client: "هلدینگ دانشمند",
    health: "زرد",
    progress: 35,
    budgetUsed: 30,
    deadline: "۱۴۰۵/۰۵/۰۱",
    tasks: [
      { id: "t5", title: "مدل‌سازی دیتابیس اسناد و دسته‌بندی", status: "انجام‌شده", assignee: "رضا سمیع‌زاده", priority: "زیاد", due: "۱۴۰۵/۰۳/۰۱", progress: 100 },
      { id: "t6", title: "موتور جستجوی پیشرفته (Elasticsearch)", status: "در حال انجام", assignee: "یاسر علی‌مردانی", priority: "زیاد", due: "۱۴۰۵/۰۳/۲۵", progress: 40 },
      { id: "t7", title: "پروفایل سازمانی و سطح دسترسی", status: "برنامه‌ریزی", assignee: "تیم فرانت‌اند", priority: "متوسط", due: "۱۴۰۵/۰۴/۱۰", progress: 0 },
    ],
  },
  {
    id: "pr3",
    name: "صندوق نوآوری و مدیریت قراردادهای فناورانه",
    client: "هلدینگ دانشمند",
    health: "قرمز",
    progress: 10,
    budgetUsed: 8,
    deadline: "۱۴۰۵/۰۶/۰۱",
    tasks: [
      { id: "t8", title: "نیازمندی‌های داوری و تخصیص منابع", status: "برنامه‌ریزی", assignee: "جعفر حبیبی", priority: "متوسط", due: "۱۴۰۵/۰۴/۲۰", progress: 0 },
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
  { id: "n1", text: "فرشاد حاج‌محمدی شما را در یک پست منشن کرد", time: "۱۰ دقیقه پیش", read: false, type: "mention" },
  { id: "n2", text: "وظیفه «توسعه API Gateway» به شما اختصاص یافت", time: "۱ ساعت پیش", read: false, type: "task" },
  { id: "n3", text: "۳ نظر جدید روی پست شما در گروه توسعه موتوشاب", time: "۳ ساعت پیش", read: true, type: "comment" },
  { id: "n4", text: "به‌روزرسانی امنیتی روی همه تننت‌ها اعمال شد", time: "دیروز", read: true, type: "system" },
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
    with: "یاسر علی‌مردانی",
    avatarColor: "#fdcb6e",
    lastMessage: "ماژول SMS رو وصل کردم به API جدید",
    time: "۱۰:۴۲",
    unread: 2,
    online: true,
    messages: [
      { from: "them", text: "سلام، API گیت‌وی رو تست کردم برای پیامک‌ها", time: "۱۰:۳۰" },
      { from: "me", text: "عالی، نتیجه چی شد؟", time: "۱۰:۳۵", read: true },
      { from: "them", text: "ماژول SMS رو وصل کردم به API جدید، کار می‌کنه", time: "۱۰:۴۲" },
    ],
  },
  {
    id: "c2",
    with: "فرشاد حاج‌محمدی",
    avatarColor: "#00b894",
    lastMessage: "جلسه فردا ساعت ۱۰",
    time: "دیروز",
    unread: 0,
    online: false,
    messages: [
      { from: "them", text: "جلسه فردا ساعت ۱۰ با کارفرما هست، حاضر باش", time: "دیروز" },
      { from: "me", text: "حتماً، یادداشت کردم", time: "دیروز", read: true },
    ],
  },
  {
    id: "c3",
    with: "گروه توسعه موتوشاب",
    avatarColor: "#1f4f99",
    lastMessage: "محمدرضا: گزارش فاز اول آپلود شد",
    time: "۰۹:۱۰",
    unread: 5,
    online: false,
    messages: [
      { from: "them", text: "گزارش فاز اول آپلود شد، در بخش مدیریت دانش", time: "۰۹:۱۰" },
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
};

export const events: EventItem[] = [
  {
    id: "e1",
    title: "جلسه بازبینی فاز اول پروژه موتوشاب",
    date: "2026-07-12",
    jalaliDate: "۱۴۰۵/۰۴/۲۱",
    time: "۱۰:۰۰ - ۱۱:۳۰",
    location: "سالن جلسات طبقه ۱۵ / لینک برخط",
    attendees: 12,
    hashtags: ["فاز-اول", "ناظر"],
    description: "ارائه گزارش پیشرفت کار به ناظر کارفرما و تصمیم‌گیری درباره تحویل موقت.",
  },
  {
    id: "e2",
    title: "کارگاه آموزشی کاربران موتوشاب",
    date: "2026-07-20",
    jalaliDate: "۱۴۰۵/۰۴/۲۹",
    time: "۰۹:۰۰ - ۱۳:۰۰",
    location: "سالن آموزش هلدینگ دانشمند",
    attendees: 48,
    hashtags: ["آموزش"],
    description: "آموزش ۲۴ نفر-ساعت طبق ماده ۵ قرارداد برای راهبران و کاربران شبکه.",
  },
  {
    id: "e3",
    title: "داوری طرح‌های صندوق نوآوری — دور دوم",
    date: "2026-08-02",
    jalaliDate: "۱۴۰۵/۰۵/۱۲",
    time: "۱۴:۰۰ - ۱۶:۰۰",
    location: "برخط — اتاق گفتگوی صندوق",
    attendees: 7,
    hashtags: ["صندوق-نوآوری", "داوری"],
    description: "بررسی و امتیازدهی طرح‌های ثبت‌شده در فراخوان دوم شتاب‌دهی.",
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
};

export const blogPosts: BlogPost[] = [
  {
    id: "b1",
    title: "چرا multi-tenancy هیبریدی برای موتوشاب انتخاب درستی است",
    author: "رضا سمیع‌زاده",
    excerpt: "مقایسه‌ی shared-schema و database-per-tenant برای سازمان‌های کوچک در برابر مشتریان حساس مثل بانک‌ها و نهادهای دولتی.",
    date: "۱۴۰۵/۰۲/۱۸",
    rating: 4.6,
    tags: ["معماری", "SaaS"],
  },
  {
    id: "b2",
    title: "تجربه‌ی پیاده‌سازی ضد ویروس ClamAV روی پیوست‌های موتوشاب",
    author: "یاسر علی‌مردانی",
    excerpt: "گزارش از راه‌اندازی اسکن خودکار فایل‌های پیوست‌شده و جلوگیری از ذخیره‌ی فایل آلوده.",
    date: "۱۴۰۵/۰۲/۰۵",
    rating: 4.2,
    tags: ["امنیت"],
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
};

export const mediaItems: MediaItem[] = [
  { id: "m1", kind: "photo", title: "افتتاحیه‌ی فاز اول پروژه", album: "رویدادهای رسمی", uploadedBy: "فرشاد حاج‌محمدی", date: "۱۴۰۵/۰۲/۰۱", rating: 4.8, tags: ["افتتاحیه"], color: "#82aee6" },
  { id: "m2", kind: "photo", title: "کارگاه آموزشی تیم فنی", album: "آموزش", uploadedBy: "رضا سمیع‌زاده", date: "۱۴۰۵/۰۲/۱۰", rating: 4.5, tags: ["آموزش"], color: "#93a2b8" },
  { id: "m3", kind: "video", title: "معرفی نسخه‌ی جدید موتوشاب", album: "معرفی محصول", uploadedBy: "تیم محصول", date: "۱۴۰۵/۰۲/۲۰", rating: 4.9, tags: ["محصول", "آپارات"], color: "#1f4f99" },
  { id: "m4", kind: "video", title: "ضبط جلسه‌ی داوری صندوق نوآوری", album: "صندوق نوآوری", uploadedBy: "جعفر حبیبی", date: "۱۴۰۵/۰۳/۰۱", rating: 4.1, tags: ["صندوق"], color: "#5e7191" },
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
  pinned?: boolean;
};

export const newsItems: NewsItem[] = [
  {
    id: "nw1",
    title: "انتشار نسخه‌ی یکپارچه‌ی موتوشاب و میزیتو",
    summary: "هسته‌ی اجتماعی موتوشاب با ماژول‌های مدیریت پروژه و دانش ادغام شد. اطلاعات کامل در بخش مدیریت دانش موجود است.",
    date: "۱۴۰۵/۰۳/۰۵",
    comments: 14,
    pinned: true,
  },
  {
    id: "nw2",
    title: "برگزاری کارگاه آموزشی کاربران در هفته‌ی آینده",
    summary: "زمان دقیق و سرفصل‌های کارگاه در بخش رویدادها منتشر شد.",
    date: "۱۴۰۵/۰۳/۰۲",
    comments: 6,
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
  { id: "s2", device: "Motoshub Android App", location: "تهران، ایران", ip: "5.210.44.18", lastActive: "۲ ساعت پیش" },
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
  { id: "ct1", title: "توسعه ماژول هوش مصنوعی تحلیل محتوا", vendor: "شرکت دانش‌بنیان نوآوران داده", stage: "در حال اجرا", value: "۴٬۲۰۰٬۰۰۰٬۰۰۰ ریال", deadline: "۱۴۰۵/۰۶/۱۵", owner: "جعفر حبیبی" },
  { id: "ct2", title: "تامین زیرساخت ابری منطقه‌ای", vendor: "ابرآروان", stage: "داوری", value: "۱٬۸۰۰٬۰۰۰٬۰۰۰ ریال", deadline: "۱۴۰۵/۰۵/۰۱", owner: "رضا سمیع‌زاده" },
  { id: "ct3", title: "مشاوره امنیت و تست نفوذ", vendor: "تیم امن‌افزار شریف", stage: "فراخوان", value: "—", deadline: "۱۴۰۵/۰۵/۲۰", owner: "یاسر علی‌مردانی" },
  { id: "ct4", title: "قرارداد پشتیبانی سال اول موتوشاب", vendor: "دانش‌افراز فاخر ایرانیان", stage: "تسویه‌شده", value: "۲٬۵۰۰٬۰۰۰٬۰۰۰ ریال", deadline: "۱۴۰۵/۰۲/۰۱", owner: "فرشاد حاج‌محمدی" },
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
  { id: "fn1", title: "پلتفرم تحلیل داده‌های سلامت", applicant: "استارتاپ سلامت‌یار", stage: "در حال پایش", amount: "۸۰۰٬۰۰۰٬۰۰۰ ریال", roi: "۱۸٪" },
  { id: "fn2", title: "ربات پاسخگوی هوشمند سازمانی", applicant: "تیم نوآوران زبان", stage: "تخصیص‌یافته", amount: "۵۵۰٬۰۰۰٬۰۰۰ ریال", roi: "۱۲٪" },
  { id: "fn3", title: "سنسور هوشمند پایش انرژی", applicant: "گروه فناوری سبز", stage: "داوری", amount: "—", roi: "—" },
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
  { id: "rs1", title: "پژوهش کاربرد یادگیری ماشین در تشخیص محتوای نامتعارف", field: "هوش مصنوعی", stage: "بررسی درخواست‌ها", applicants: 9, deadline: "۱۴۰۵/۰۵/۱۰" },
  { id: "rs2", title: "بهینه‌سازی مصرف انرژی مراکز داده", field: "زیرساخت", stage: "فراخوان باز", applicants: 3, deadline: "۱۴۰۵/۰۶/۰۱" },
  { id: "rs3", title: "مدل‌های اعتمادسنجی شبکه‌های اجتماعی سازمانی", field: "امنیت", stage: "در حال اجرا", applicants: 5, deadline: "۱۴۰۵/۰۴/۲۵" },
];

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export const reportByDepartment = [
  { label: "فناوری اطلاعات", value: 38 },
  { label: "سرمایه‌گذاری", value: 22 },
  { label: "پژوهش", value: 18 },
  { label: "حقوقی", value: 12 },
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
  { id: "contracts", name: "قراردادهای فناورانه", description: "مذاکره، داوری، زمان‌بندی تعهدات", category: "دانش و پروژه" },
  { id: "funds", name: "صندوق نوآوری و شتاب‌دهی", description: "ثبت طرح، داوری، تخصیص منابع، گزارش بازگشت سرمایه", category: "دانش و پروژه" },
  { id: "research", name: "فرصت‌های پژوهشی", description: "فراخوان، داوری، پیگیری اجرای پژوهش", category: "دانش و پروژه" },
  { id: "reports", name: "گزارش‌گیری پیشرفته", description: "داشبورد مدیریتی و گزارش تجمیعی", category: "دانش و پروژه" },
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
  { id: "mn5", title: "صندوق نوآوری", order: 5, visible: false },
];

export type RoleDef = { id: string; title: string; scope: "پلتفرم" | "سازمان" | "گروه"; members: number; description: string };
export const roles: RoleDef[] = [
  { id: "r1", title: "راهبر پلتفرم", scope: "پلتفرم", members: 2, description: "دسترسی کامل به همه‌ی سازمان‌های مشتری و تنظیمات billing" },
  { id: "r2", title: "مدیر سازمان", scope: "سازمان", members: 4, description: "مدیریت کامل یک سازمان: کاربران، ماژول‌ها، برندسازی" },
  { id: "r3", title: "ناظم گروه", scope: "گروه", members: 18, description: "مدیریت محتوا و اعضای یک گروه مشخص" },
  { id: "r4", title: "عضو عادی", scope: "گروه", members: 1280, description: "دسترسی استاندارد به محتوای عمومی و گروه‌های عضو" },
];

export const allowedFileExtensions = ["jpg", "png", "gif", "mp4", "avi", "pdf", "docx", "xlsx", "pptx", "zip"];

// ---------------------------------------------------------------------------
// Global search demo results
// ---------------------------------------------------------------------------
export type SearchResult = { id: string; type: "پست" | "گروه" | "سند" | "پروژه" | "کاربر"; title: string; snippet: string };
export const searchResults: SearchResult[] = [
  { id: "sr1", type: "سند", title: "قرارداد استقرار و توسعه شبکه اجتماعی دانشمند", snippet: "آرشیو قراردادها · بروزرسانی ۱۴۰۵/۰۲/۰۱" },
  { id: "sr2", type: "پروژه", title: "استقرار و شخصی‌سازی نسخه پایه موتوشاب", snippet: "کارفرما: هلدینگ دانشمند · پیشرفت ۷۰٪" },
  { id: "sr3", type: "گروه", title: "توسعه موتوشاب", snippet: "۱۸ عضو · خصوصی" },
  { id: "sr4", type: "پست", title: "API گیت‌وی بین هسته PHP و سرویس‌های Node.js راه‌اندازی شد", snippet: "۱۲ پسندیدن · ۳ نظر" },
  { id: "sr5", type: "کاربر", title: "یاسر علی‌مردانی", snippet: "توسعه‌دهنده بک‌اند · شرکت دانش‌افراز فاخر ایرانیان" },
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
  { id: "ch1", name: "همگانی", topic: "اطلاعیه‌های عمومی و هماهنگی کلی تیم", type: "public", category: "علاقه‌مندی‌ها", unread: 3, mentions: 1, members: 42, pinnedCount: 2 },
  { id: "ch2", name: "فاز-یک-فنی", topic: "هماهنگی فنی فاز اول پروژه موتوشاب", type: "private", category: "کانال‌ها", unread: 12, mentions: 2, members: 9, pinnedCount: 4 },
  { id: "ch3", name: "طراحی-محصول", topic: "بحث و بررسی طراحی UI/UX", type: "public", category: "کانال‌ها", unread: 0, mentions: 0, members: 6, pinnedCount: 1 },
  { id: "ch4", name: "حوادث-و-پشتیبانی", topic: "گزارش و پیگیری حوادث عملیاتی (Playbooks)", type: "private", category: "کانال‌ها", unread: 1, mentions: 0, members: 5, pinnedCount: 0 },
  { id: "ch5", name: "بایگانی-فاز-صفر", topic: "آرشیو مذاکرات اولیه قرارداد", type: "private", category: "بایگانی‌شده", unread: 0, mentions: 0, members: 4, pinnedCount: 0 },
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
  { id: "cm1", channelId: "ch1", authorId: "u2", text: "صبح بخیر همگی، امروز ساعت ۱۰ جلسه‌ی بازبینی فاز اول داریم.", time: "۰۸:۴۰", pinned: true, reactions: [{ icon: "ThumbsUp", count: 6, reactedByMe: true }] },
  { id: "cm2", channelId: "ch1", authorId: "u4", text: "ممنون از اطلاع‌رسانی، حتماً حضور دارم.", time: "۰۸:۴۲" },
  { id: "cm3", channelId: "ch2", authorId: "u1", text: "API گیت‌وی نسخه‌ی دوم رو merge کردم. کانفیگ jwt secret رو در .env تنظیم کنید.", time: "۰۹:۱۵", reactions: [{ icon: "CheckCircle2", count: 3 }], threadReplies: 4 },
  { id: "cm4", channelId: "ch2", authorId: "u5", text: "وصل‌کردن ماژول پیامک به Gateway جدید تموم شد، تست شد و کار می‌کنه.", time: "۰۹:۴۰", saved: true, reactions: [{ icon: "Heart", count: 2 }] },
  { id: "cm5", channelId: "ch3", authorId: "u2", text: "نسخه‌ی جدید پالت رنگی رو در فیگما گذاشتم، نظرتون رو می‌خوام.", time: "دیروز", threadReplies: 7 },
  { id: "cm6", channelId: "ch4", authorId: "u5", text: "اجرای Playbook «واکنش به افزایش غیرعادی ترافیک» شروع شد — مرحله ۱ از ۵.", time: "۱۱:۰۲" },
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
  { id: "ig1", name: "اعلان دیپلوی CI/CD", type: "وب‌هوک ورودی", channel: "فاز-یک-فنی", status: "فعال", createdBy: "رضا سمیع‌زاده" },
  { id: "ig2", name: "ارسال گزارش روزانه به مدیر پروژه", type: "وب‌هوک خروجی", channel: "همگانی", status: "فعال", createdBy: "یاسر علی‌مردانی" },
  { id: "ig3", name: "ربات یادآور وظایف", type: "بات", channel: "فاز-یک-فنی", status: "فعال", createdBy: "رضا سمیع‌زاده" },
  { id: "ig4", name: "/task — ایجاد سریع تسک از چت", type: "دستور اسلش", channel: "همه‌ی کانال‌ها", status: "فعال", createdBy: "تیم محصول" },
  { id: "ig5", name: "/poll — نظرسنجی سریع", type: "دستور اسلش", channel: "همه‌ی کانال‌ها", status: "غیرفعال", createdBy: "تیم محصول" },
];

export type GuestAccount = { id: string; name: string; org: string; channels: string[]; expires: string };
export const guestAccounts: GuestAccount[] = [
  { id: "gu1", name: "مهندس ناظر بیمه تامین اجتماعی", org: "خارج از سازمان", channels: ["فاز-یک-فنی"], expires: "۱۴۰۵/۰۴/۳۰" },
];

export type PlaybookTemplate = { id: string; name: string; category: string; steps: number; usedCount: number };
export const playbookTemplates: PlaybookTemplate[] = [
  { id: "pb1", name: "واکنش به افزایش غیرعادی ترافیک", category: "عملیات/امنیت", steps: 5, usedCount: 3 },
  { id: "pb2", name: "فرآیند تحویل موقت پروژه", category: "مدیریت پروژه", steps: 6, usedCount: 1 },
  { id: "pb3", name: "آماده‌سازی کارگاه آموزشی کاربران", category: "آموزش", steps: 4, usedCount: 2 },
];
