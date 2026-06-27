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
  logoColor: "#6c5ce7",
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
    logoColor: "#e17055",
    plan: "سازمانی",
    users: 4200,
    modules: ["شبکه اجتماعی", "مدیریت دانش"],
  },
  {
    id: "vazarat-olum",
    name: "وزارت علوم",
    domain: "olum.motoshub.app",
    logoColor: "#00b894",
    plan: "حرفه‌ای",
    users: 860,
    modules: ["شبکه اجتماعی", "مدیریت دانش", "مدیریت پروژه"],
  },
  {
    id: "fata",
    name: "پلیس فتا",
    domain: "fata.motoshub.app",
    logoColor: "#2d3436",
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
  avatarColor: "#6c5ce7",
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
    avatarColor: "#00b894",
    skills: ["مدیریت محصول", "استراتژی"],
    online: true,
  },
  {
    id: "u3",
    name: "جعفر حبیبی",
    role: "عضو هیات‌مدیره",
    org: "هلدینگ دانشمند",
    avatarColor: "#e17055",
    skills: ["سرمایه‌گذاری خطرپذیر", "نظارت فنی"],
    online: false,
  },
  {
    id: "u4",
    name: "محمدرضا محمدخانی",
    role: "مدیرعامل و عضو هیات‌مدیره",
    org: "هلدینگ دانشمند",
    avatarColor: "#0984e3",
    skills: ["راهبری سازمانی"],
    online: false,
  },
  {
    id: "u5",
    name: "یاسر علی‌مردانی",
    role: "توسعه‌دهنده بک‌اند",
    org: "شرکت دانش‌افراز فاخر ایرانیان",
    avatarColor: "#fdcb6e",
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
    color: "#6c5ce7",
    unread: 4,
    category: "فنی",
  },
  {
    id: "g2",
    name: "صندوق نوآوری و شتاب‌دهی",
    description: "پایش طرح‌های سرمایه‌گذاری و عملکرد شرکت‌های سرمایه‌پذیر",
    members: 9,
    privacy: "خصوصی",
    color: "#00b894",
    unread: 0,
    category: "سرمایه‌گذاری",
  },
  {
    id: "g3",
    name: "قراردادهای فناورانه",
    description: "مدیریت مذاکره، داوری و زمان‌بندی تعهدات قراردادها",
    members: 12,
    privacy: "خصوصی",
    color: "#e17055",
    unread: 2,
    category: "حقوقی",
  },
  {
    id: "g4",
    name: "اطلاع‌رسانی عمومی هلدینگ",
    description: "کانال رسمی اخبار و اطلاعیه‌های هلدینگ دانشمند",
    members: 1280,
    privacy: "عمومی",
    color: "#0984e3",
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
  messages: { from: "me" | "them"; text: string; time: string }[];
};

export const chatThreads: ChatThread[] = [
  {
    id: "c1",
    with: "یاسر علی‌مردانی",
    avatarColor: "#fdcb6e",
    lastMessage: "ماژول SMS رو وصل کردم به API جدید",
    time: "۱۰:۴۲",
    unread: 2,
    messages: [
      { from: "them", text: "سلام، API گیت‌وی رو تست کردم برای پیامک‌ها", time: "۱۰:۳۰" },
      { from: "me", text: "عالی، نتیجه چی شد؟", time: "۱۰:۳۵" },
      { from: "them", text: "ماژول SMS رو وصل کردم به API جدید، کار می‌کنه ✅", time: "۱۰:۴۲" },
    ],
  },
  {
    id: "c2",
    with: "فرشاد حاج‌محمدی",
    avatarColor: "#00b894",
    lastMessage: "جلسه فردا ساعت ۱۰",
    time: "دیروز",
    unread: 0,
    messages: [
      { from: "them", text: "جلسه فردا ساعت ۱۰ با کارفرما هست، حاضر باش", time: "دیروز" },
    ],
  },
];
