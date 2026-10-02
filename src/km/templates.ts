// ---------------------------------------------------------------------------
// قالب‌های مقاله به تفکیک نوع سند، انواع «ابلاغی» (بخشنامه/دستورالعمل/آیین‌نامه)،
// جدول نگهداشت پیش‌فرض و کمکی‌های فرآیند تصمیم‌دار (خطوط شنا + RACI).
// ---------------------------------------------------------------------------
import { addDays, dayNum } from "../pm/jalali";
import type { KDoc, KProcess, ProcStep, RaciCode } from "./types";

/** انواع سندی که «خواندم و پذیرفتم» و مخاطب‌گزینی دارند */
export const circularTypes = ["بخشنامه", "دستورالعمل", "آیین‌نامه"];
export const isCircularType = (t: string) => circularTypes.includes(t);

const H = (t: string) => `## ${t}`;
const procedure = [
  H("۱. هدف"),
  "این سند به چه منظوری تهیه شده و چه مسئله‌ای را حل می‌کند؟",
  H("۲. دامنه‌ی کاربرد"),
  "- واحدها، فرآیندها و افرادی که مشمول این سند هستند",
  "- مواردی که خارج از دامنه است",
  H("۳. تعاریف"),
  "| اصطلاح | تعریف |",
  "|---|---|",
  "| اصطلاح ۱ | تعریف |",
  H("۴. مسئولیت‌ها"),
  "| نقش | مسئولیت |",
  "|---|---|",
  "| مدیر واحد | تأیید و نظارت |",
  "| کارشناس | اجرا و ثبت سوابق |",
  H("۵. روش اجرا"),
  "1. گام اول",
  "2. گام دوم",
  "3. گام سوم",
  H("۶. سوابق و مستندات"),
  "- فرم‌ها و سوابقی که باید نگهداری شوند",
  H("۷. مراجع و پیوست‌ها"),
  "- اسناد بالادستی و مرتبط",
].join("\n");

export const defaultTemplates: Record<string, string> = {
  دستورالعمل: procedure,
  "روش اجرایی": procedure,
  آیین‌نامه: [
    H("مقدمه و مبانی قانونی"),
    "این آیین‌نامه به استناد … تهیه شده است.",
    H("ماده ۱ — هدف"),
    "…",
    H("ماده ۲ — دامنه‌ی شمول"),
    "…",
    H("ماده ۳ — تعاریف"),
    "| اصطلاح | تعریف |",
    "|---|---|",
    "| … | … |",
    H("ماده ۴ — مسئولیت‌ها"),
    "…",
    H("ماده ۵ — ضوابط اجرایی"),
    "1. …",
    "2. …",
    H("ماده ۶ — تخلفات و پیامدها"),
    "…",
    H("ماده ۷ — زمان اجرا"),
    "این آیین‌نامه در … ماده تهیه و از تاریخ ابلاغ لازم‌الاجراست.",
  ].join("\n"),
  بخشنامه: [
    H("موضوع"),
    "…",
    H("مخاطبان"),
    "- …",
    H("متن ابلاغ"),
    "با سلام؛ احتراماً …",
    H("الزامات و مهلت اجرا"),
    "1. …",
    "2. …",
    H("مرجع پاسخ‌گویی"),
    "واحد … — تلفن داخلی …",
  ].join("\n"),
  گزارش: [H("خلاصه‌ی مدیریتی"), "…", H("مقدمه و هدف"), "…", H("روش و داده‌ها"), "…", H("یافته‌ها"), "- …", H("پیشنهادها"), "1. …", H("پیوست‌ها"), "- …"].join("\n"),
  صورت‌جلسه: [H("مشخصات جلسه"), "| تاریخ | ساعت | محل | دبیر |", "|---|---|---|---|", "| … | … | … | … |", H("حاضران"), "- …", H("دستور جلسه"), "1. …", H("مصوبات"), "| مصوبه | مسئول | مهلت |", "|---|---|---|", "| … | … | … |"].join("\n"),
  "مستندات فنی": [H("معرفی"), "…", H("معماری و اجزا"), "…", H("پیش‌نیازها"), "- …", H("نصب و راه‌اندازی"), "```\n…\n```", H("نگهداری و عیب‌یابی"), "- …"].join("\n"),
  آموزشی: [H("اهداف یادگیری"), "- …", H("مخاطبان"), "…", H("سرفصل‌ها"), "1. …", H("تمرین و ارزیابی"), "- …", H("منابع بیشتر"), "- …"].join("\n"),
};

/** قالب نوع سند: سفارشی تنظیمات یا پیش‌فرض */
export const templateForType = (type: string, custom?: Record<string, string>) => custom?.[type] ?? defaultTemplates[type];

/** دوره‌ی نگهداشت پیش‌فرض (سال، از تاریخ آرشیو) — ۰ یعنی دائمی */
export const defaultRetention: Record<string, number> = {
  دستورالعمل: 10,
  آیین‌نامه: 0,
  بخشنامه: 5,
  "روش اجرایی": 10,
  "مستندات فنی": 5,
  گزارش: 5,
  فرم: 3,
  قرارداد: 15,
  آموزشی: 3,
  صورت‌جلسه: 5,
  سایر: 3,
};
export const retentionOf = (type: string, custom?: Record<string, number>) => custom?.[type] ?? defaultRetention[type] ?? 5;

/** مبنای محاسبه‌ی نگهداشت: تاریخ آرشیو (آخرین گذار به آرشیو) یا آخرین ویرایش */
export function retentionBasis(d: KDoc): string {
  const arch = [...d.workflow].reverse().find((w) => w.to === "آرشیو");
  return (arch?.at ?? d.updatedAt).split(" ")[0];
}
/** وضعیت نگهداشت: سررسید امحا و روزهای گذشته از آن (فقط اسناد آرشیوشده مشمول امحا می‌شوند) */
export function retentionInfo(d: KDoc, custom: Record<string, number> | undefined, today: string) {
  const years = retentionOf(d.type, custom);
  const basis = retentionBasis(d);
  const due = years > 0 ? addDays(basis, Math.round(years * 365.25)) : null;
  const overdue = due ? (dayNum(today) ?? 0) - (dayNum(due) ?? 0) : -1;
  return { years, basis, due, overdue, eligible: d.status === "آرشیو" && !!due && overdue >= 0 };
}

// ------------------------------------------------------------------ فرآیند تصمیم‌دار
/** نمودار پیش‌فرض: گام‌های خطی فرآیند در خط شنای مالک */
export function linearFlow(p: Pick<KProcess, "steps" | "owner">): ProcStep[] {
  const ids = p.steps.map((_, i) => `s${i + 1}`);
  return [
    { id: "start", label: "شروع", kind: "start", lane: p.owner, next: ids[0] ?? "end" },
    ...p.steps.map((label, i) => ({ id: ids[i], label, kind: "task" as const, lane: p.owner, next: ids[i + 1] ?? "end" })),
    { id: "end", label: "پایان", kind: "end", lane: p.owner },
  ];
}
export const flowOf = (p: KProcess): { steps: ProcStep[]; lanes: string[] } => {
  const steps = p.flow?.length ? p.flow : linearFlow(p);
  const lanes = p.lanes?.length ? p.lanes : [...new Set(steps.map((s) => s.lane))];
  return { steps, lanes: [...lanes, ...[...new Set(steps.map((s) => s.lane))].filter((l) => !lanes.includes(l))] };
};

/** نمودار تصمیم‌دار نمونه برای «ثبت و پیگیری طرح‌های اشتغال خرد» */
export const seedProcessFlows: Record<string, Pick<KProcess, "flow" | "lanes" | "raci">> = {
  kp1: {
    lanes: ["متقاضی", "کارشناس ستاد", "کمیته‌ی اشتغال", "واحد مالی"],
    flow: [
      { id: "start", label: "شروع", kind: "start", lane: "متقاضی", next: "a1" },
      { id: "a1", label: "ثبت درخواست", kind: "task", lane: "متقاضی", next: "a2" },
      { id: "a2", label: "ارزیابی اولیه و بازدید میدانی", kind: "task", lane: "کارشناس ستاد", next: "d1" },
      { id: "d1", label: "مدارک کامل است؟", kind: "decision", lane: "کارشناس ستاد", yes: "a3", no: "a1" },
      { id: "a3", label: "طرح در کمیته", kind: "task", lane: "کمیته‌ی اشتغال", next: "d2" },
      { id: "d2", label: "تصویب شد؟", kind: "decision", lane: "کمیته‌ی اشتغال", yes: "a4", no: "end" },
      { id: "a4", label: "انعقاد قرارداد و پرداخت", kind: "task", lane: "واحد مالی", next: "a5" },
      { id: "a5", label: "پایش دوره‌ای", kind: "task", lane: "کارشناس ستاد", next: "end" },
      { id: "end", label: "پایان", kind: "end", lane: "کارشناس ستاد" },
    ],
    raci: {
      a1: { متقاضی: "R", "کارشناس ستاد": "C" },
      a2: { "کارشناس ستاد": "R", "کمیته‌ی اشتغال": "I" },
      a3: { "کمیته‌ی اشتغال": "A", "کارشناس ستاد": "R", "واحد مالی": "C" },
      a4: { "واحد مالی": "R", "کمیته‌ی اشتغال": "A", متقاضی: "I" },
      a5: { "کارشناس ستاد": "R", "کمیته‌ی اشتغال": "I", متقاضی: "C" },
    } as Record<string, Record<string, RaciCode>>,
  },
};
export const raciLabel: Record<RaciCode, string> = { R: "مجری", A: "پاسخ‌گو", C: "مشاور", I: "مطلع" };
