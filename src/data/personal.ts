// ---------------------------------------------------------------------------
// داده‌ی شخصیِ هر کاربر — تا داشبورد، اعلان‌ها و دوستان با ورودِ هر حساب واقعاً
// عوض شوند. کلید = شناسه‌ی کاربر؛ کاربرانِ بدون داده، از fallback استفاده می‌کنند.
// در محصول واقعی این‌ها از API خودِ کاربر می‌آید.
// ---------------------------------------------------------------------------
import type { Notification } from "./mock";

export type PersonalTask = { id: string; text: string; to: string; late?: boolean };
export type PersonalChat = { id: string; with: string; lastMessage: string; unread: number };

export type PersonalBundle = {
  /** «کارهای امروز شما» — اقدامات در انتظارِ همین کاربر */
  tasks: PersonalTask[];
  /** «گروه‌های من» — شناسه‌ی گروه‌هایی که عضوشان است */
  groupIds: string[];
  /** منشن در کانال‌ها */
  mentions: number;
  /** گفتگوهای دارای پیام نخوانده */
  chats: PersonalChat[];
  /** فهرست کاملِ اعلان‌های همین کاربر (خوانده و نخوانده) */
  notifications: Notification[];
  friends: string[];
  incoming: string[];
  outgoing: string[];
  suggested: string[];
  following: string[];
};

const n = (id: string, text: string, time: string, read: boolean, type: Notification["type"]): Notification => ({ id, text, time, read, type });

export const personalData: Record<string, PersonalBundle> = {
  // راهبر پلتفرم — کارهای سطح سیستم
  u1: {
    tasks: [
      { id: "u1-t1", text: "درخواستِ نقشِ سفارشیِ «کارشناس مالی» از هلدینگ سینا در صف تایید است", to: "/dashboard/admin", late: true },
      { id: "u1-t2", text: "۲ گزارش رخداد امنیتی (افتا) منتظر بازبینی شماست", to: "/dashboard/admin" },
      { id: "u1-t3", text: "به‌روزرسانی پارامترهای گردش‌کار صندوق نوآور", to: "/dashboard/admin" },
      { id: "u1-t4", text: "تایید نهاییِ برندسازی سازمانِ هلدینگ صبا", to: "/dashboard/appearance" },
    ],
    groupIds: ["g4", "g5", "g7", "g1"],
    mentions: 4,
    chats: [
      { id: "u1-c1", with: "مدیر امنیت", lastMessage: "لاگ ورودهای ناموفق را برایتان فرستادم.", unread: 3 },
      { id: "u1-c2", with: "دبیرخانه هیئت مدیره", lastMessage: "دستور جلسه‌ی این هفته آماده شد.", unread: 2 },
    ],
    notifications: [
      n("u1-n1", "درخواست نقش جدید از هلدینگ سینا برای تایید ارسال شد", "۱۰ دقیقه پیش", false, "task"),
      n("u1-n2", "۲ بررسی گزارش صندوق از مهلت ۱۵ روزه عبور کرد", "۱ ساعت پیش", false, "system"),
      n("u1-n3", "به‌روزرسانی امنیتی روی همه سازمان‌های سامانه اعمال شد", "دیروز", false, "system"),
      n("u1-n4", "مدیر هلدینگ فردوس یک فراخوان پژوهشی جدید ثبت کرد", "دیروز", true, "system"),
      n("u1-n5", "گزارش ماهانه‌ی مصرف فضای ذخیره‌سازی آماده شد", "۲ روز پیش", true, "system"),
    ],
    friends: ["u2", "u4", "u5", "u7"],
    incoming: ["u9"],
    outgoing: [],
    suggested: ["u6", "u10", "u11"],
    following: ["u2", "u4", "u6", "u12"],
  },

  // مدیر هلدینگ صنایع غذایی سینا
  u2: {
    tasks: [
      { id: "u2-t1", text: "تایید خبر شرکتیِ «برنامه تعمیرات خط ۲» بهنوش", to: "/dashboard/news", late: true },
      { id: "u2-t2", text: "بازبینی گزارش پیشرفت پروژه استقرار سامانه دانش", to: "/dashboard/projects" },
      { id: "u2-t3", text: "امضای قرارداد تأمین اقلام حمایتی زمزم", to: "/dashboard/contracts" },
    ],
    groupIds: ["g2", "g5", "g9", "g6"],
    mentions: 2,
    chats: [
      { id: "u2-c1", with: "مدیر بهنوش", lastMessage: "پیش‌نویس خبر شرکتی را برایتان فرستادم.", unread: 2 },
      { id: "u2-c2", with: "واحد حقوقی", lastMessage: "بند تضمین قرارداد اصلاح شد.", unread: 1 },
    ],
    notifications: [
      n("u2-n1", "خبر شرکتیِ بهنوش منتظر تایید شماست", "۱۵ دقیقه پیش", false, "task"),
      n("u2-n2", "گزارش پیشرفت پروژه‌ی مدیریت دانش به‌روزرسانی شد", "۲ ساعت پیش", false, "system"),
      n("u2-n3", "محسن مردعلی شما را در یک مبحث انجمن منشن کرد", "۳ ساعت پیش", false, "mention"),
      n("u2-n4", "قرارداد «تأمین اقلام حمایتی» وارد مرحله‌ی امضا شد", "دیروز", true, "system"),
    ],
    friends: ["u1", "u12", "u11"],
    incoming: ["u3"],
    outgoing: ["u6"],
    suggested: ["u9", "u10"],
    following: ["u1", "u12"],
  },

  // عضو عادی — شرکت بهنوش (همان چیدمانِ آشنای قبلی حفظ شده)
  u3: {
    tasks: [
      { id: "u3-t1", text: "پاسخ به منشنِ حسین دهقان در پستِ سنجاق‌شده", to: "/dashboard/forum", late: true },
      { id: "u3-t2", text: "تکمیل پروفایل و مهارت‌های شما (۷۰٪ کامل)", to: "/dashboard/profile/u3" },
      { id: "u3-t3", text: "ثبت‌نام در کارگاه «هوش مصنوعی کاربردی در صنعت»", to: "/dashboard/training" },
    ],
    groupIds: ["g1", "g2", "g3", "g4"],
    mentions: 6,
    chats: [
      { id: "u3-c1", with: "همکار واحد فنی", lastMessage: "فایل ارائه را می‌فرستی؟", unread: 5 },
      { id: "u3-c2", with: "گروه ستاد محرومیت‌زدایی", lastMessage: "جلسه‌ی هفته‌ی بعد جابه‌جا شد.", unread: 3 },
    ],
    notifications: [
      n("u3-n1", "حسین دهقان شما را در یک پست منشن کرد", "۱۰ دقیقه پیش", false, "mention"),
      n("u3-n2", "وظیفه‌ی «راه‌اندازی جستجوی پیشرفته اسناد» به شما اختصاص یافت", "۱ ساعت پیش", false, "task"),
      n("u3-n3", "۳ نظر جدید روی پست شما در گروه ستاد محرومیت‌زدایی", "۳ ساعت پیش", true, "comment"),
      n("u3-n4", "پستِ شما ۱۲ پسند جدید گرفت", "دیروز", true, "like"),
    ],
    friends: ["u2", "u6"],
    incoming: ["u7", "u9"],
    outgoing: ["u8"],
    suggested: ["u10", "u11", "u12", "u13"],
    following: ["u6", "u7"],
  },

  // مدیر هلدینگ کشاورزی فردوس پارس
  u4: {
    tasks: [
      { id: "u4-t1", text: "تایید فراخوان پژوهشیِ «بهینه‌سازی کشت کم‌آب»", to: "/dashboard/research", late: true },
      { id: "u4-t2", text: "بازبینی بودجه‌ی پروژه‌ی آبادانی قلعه‌گنج", to: "/dashboard/projects" },
      { id: "u4-t3", text: "معرفی داورِ صنعت برای طرح‌های اشتغال‌زایی", to: "/dashboard/funds" },
    ],
    groupIds: ["g9", "g10", "g2", "g5"],
    mentions: 1,
    chats: [
      { id: "u4-c1", with: "موسسه تحقیقات کشاورزی", lastMessage: "نتایج فاز اول کشت را ثبت کردیم.", unread: 2 },
    ],
    notifications: [
      n("u4-n1", "فراخوان پژوهشی جدید منتظر تایید شماست", "۲۰ دقیقه پیش", false, "task"),
      n("u4-n2", "گزارش بودجه‌ی پروژه‌ی قلعه‌گنج به‌روزرسانی شد", "۴ ساعت پیش", false, "system"),
      n("u4-n3", "پارسا یگانه یک سند در گروه پل دانشگاه و صنعت بارگذاری کرد", "دیروز", true, "system"),
    ],
    friends: ["u1", "u10"],
    incoming: [],
    outgoing: ["u11"],
    suggested: ["u6", "u9", "u12"],
    following: ["u1", "u10"],
  },

  // کارشناس داوری صندوق — نیروگاه‌های صبا
  u5: {
    tasks: [
      { id: "u5-t1", text: "امتیازدهیِ داوریِ طرح NF-1404-1051 — مهلت امروز", to: "/dashboard/funds", late: true },
      { id: "u5-t2", text: "بررسی گزارش مرحله‌ایِ پروژه‌ی LPS مستقل از GPS", to: "/dashboard/funds" },
      { id: "u5-t3", text: "ارجاع طرح «کیت تشخیص سریع» به کمیته سرمایه‌گذاری", to: "/dashboard/funds" },
    ],
    groupIds: ["g8", "g10", "g12", "g3"],
    mentions: 0,
    chats: [
      { id: "u5-c1", with: "دبیر صندوق نوآور", lastMessage: "فرم امتیازدهی داوری را برایتان باز کردم.", unread: 4 },
    ],
    notifications: [
      n("u5-n1", "طرح NF-1404-1051 به شما برای داوری ارجاع شد", "۳۰ دقیقه پیش", false, "task"),
      n("u5-n2", "گزارش مرحله‌ای جدیدی در صف بررسی شما قرار گرفت", "۲ ساعت پیش", false, "task"),
      n("u5-n3", "مهلت بررسی طرح NF-1404-1047 تا ۲ روز دیگر است", "دیروز", true, "system"),
    ],
    friends: ["u1", "u9"],
    incoming: ["u1"],
    outgoing: [],
    suggested: ["u6", "u8", "u10"],
    following: ["u9"],
  },

  // ناظم گروه — ستاد محرومیت‌زدایی
  u7: {
    tasks: [
      { id: "u7-t1", text: "بررسی ۳ پستِ گزارش‌شده در «ستاد محرومیت‌زدایی»", to: "/dashboard/groups/g1", late: true },
      { id: "u7-t2", text: "تایید عضویت ۲ کاربر جدید در گروه", to: "/dashboard/groups/g1" },
      { id: "u7-t3", text: "سنجاق‌کردن جمع‌بندی جلسه‌ی هفتگی گروه", to: "/dashboard/groups/g1" },
    ],
    groupIds: ["g1", "g6", "g2", "g4"],
    mentions: 5,
    chats: [
      { id: "u7-c1", with: "اعضای گروه", lastMessage: "لطفاً گزارش این هفته را تا پنجشنبه بفرستید.", unread: 3 },
    ],
    notifications: [
      n("u7-n1", "۳ پست در گروه ستاد محرومیت‌زدایی گزارش شد و منتظر بررسی است", "۲۵ دقیقه پیش", false, "task"),
      n("u7-n2", "۲ درخواست عضویت جدید در گروه شما", "۱ ساعت پیش", false, "task"),
      n("u7-n3", "شما در یک مبحث انجمن منشن شدید", "۳ ساعت پیش", false, "mention"),
      n("u7-n4", "پستِ سنجاق‌شده‌ی گروه ۸ پسند جدید گرفت", "دیروز", true, "like"),
    ],
    friends: ["u6", "u3", "u10"],
    incoming: [],
    outgoing: ["u3"],
    suggested: ["u2", "u9", "u11"],
    following: ["u6", "u10"],
  },

  // مدیر شرکت — بانک سینا
  u13: {
    tasks: [
      { id: "u13-t1", text: "بازبینی قرارداد «ارزیابی امنیتی سامانه‌های بانک»", to: "/dashboard/contracts", late: true },
      { id: "u13-t2", text: "تایید یادداشت بلاگِ یکی از کارکنان بانک سینا", to: "/dashboard/blog" },
      { id: "u13-t3", text: "دعوت و واردسازیِ ۳ کاربر جدیدِ شرکت", to: "/dashboard/admin" },
    ],
    groupIds: ["g3", "g5", "g2", "g6"],
    mentions: 2,
    chats: [
      { id: "u13-c1", with: "کمیته امنیت اطلاعات", lastMessage: "چک‌لیست انطباق را تکمیل کنید.", unread: 2 },
      { id: "u13-c2", with: "واحد منابع انسانی", lastMessage: "لیست کاربران جدید را فرستادم.", unread: 1 },
    ],
    notifications: [
      n("u13-n1", "قرارداد «ارزیابی امنیتی» منتظر بازبینی شماست", "۱۵ دقیقه پیش", false, "task"),
      n("u13-n2", "یک یادداشت بلاگِ کارمند برای تایید ارسال شد", "۲ ساعت پیش", false, "task"),
      n("u13-n3", "۳ کاربر جدید در انتظار تخصیص نقش هستند", "دیروز", true, "system"),
    ],
    friends: ["u2", "u12"],
    incoming: ["u6"],
    outgoing: [],
    suggested: ["u1", "u9", "u11"],
    following: ["u2", "u12"],
  },
};

const fallback: PersonalBundle = {
  tasks: [
    { id: "fb-t1", text: "تکمیل پروفایل و مهارت‌های شما", to: "/dashboard/profile/u1" },
    { id: "fb-t2", text: "مطالعه‌ی آخرین اطلاعیه‌ی سازمانی", to: "/dashboard/news" },
  ],
  groupIds: ["g4", "g1", "g10"],
  mentions: 1,
  chats: [{ id: "fb-c1", with: "دبیرخانه", lastMessage: "به سامانه خوش آمدید.", unread: 1 }],
  notifications: [
    n("fb-n1", "به فضای کاری سازمانی بنیاد خوش آمدید", "امروز", false, "system"),
    n("fb-n2", "پروفایل خود را کامل کنید تا بهتر دیده شوید", "دیروز", true, "system"),
  ],
  friends: ["u1"],
  incoming: [],
  outgoing: [],
  suggested: ["u2", "u6", "u10"],
  following: ["u1"],
};

export function personalFor(userId: string): PersonalBundle {
  return personalData[userId] ?? fallback;
}
