// ---------------------------------------------------------------------------
// داده‌های نمونه‌ی مدیریت دانش بر اساس مستندات موسسه تحقیق و توسعه بنیاد:
// سندهای فرصت R&D و شناسنامه‌های تجمیعی (محصولات، شرکت‌ها و فناوران همکار).
// ---------------------------------------------------------------------------

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
// ۴۵=ویرایش اول ارائه‌شده، ۶۵=اصلاحات تیم راهبر، ۸۵=پیش‌نویس نهایی، ۱۰۰=تحویل‌شده
export const rndDocStates: { threshold: number; label: string }[] = [
  { threshold: 10, label: "بازدید و احصاء عناوین" },
  { threshold: 20, label: "عناوین احصاء شده — در بررسی" },
  { threshold: 45, label: "ویرایش اول ارائه شده" },
  { threshold: 65, label: "اصلاحات توسط تیم راهبر" },
  { threshold: 85, label: "پیش‌نویس نهایی در بررسی" },
  { threshold: 100, label: "سند تدوین، تایید و تحویل شده" },
];

export const rndOpportunityDocs: RndOpportunityDoc[] = [
  { id: "rd1", company: "دشت ناز ساری", holding: "فردوس پارس", progress: 100, statusLabel: "سند تدوین، تایید و تحویل شده" },
  { id: "rd2", company: "بهنوش ایران", holding: "صنایع غذایی سینا", progress: 100, statusLabel: "سند تدوین، تایید و تحویل شده" },
  { id: "rd3", company: "زمزم ایران", holding: "صنایع غذایی سینا", progress: 85, statusLabel: "پیش‌نویس نهایی در بررسی" },
  { id: "rd4", company: "لبنیات پاک", holding: "صنایع غذایی سینا", progress: 65, statusLabel: "اصلاحات توسط تیم راهبر" },
  { id: "rd5", company: "سینا ریل پارس", holding: "پایا ترابر سینا", progress: 45, statusLabel: "ویرایش اول ارائه شده" },
  { id: "rd6", company: "آزادراه تهران - شمال", holding: "پایا ترابر سینا", progress: 100, statusLabel: "سند تدوین، تایید و تحویل شده" },
  { id: "rd7", company: "بانک سینا", holding: "مالی و سرمایه‌گذاری سینا", progress: 20, statusLabel: "عناوین احصاء شده — در بررسی", obstacles: "در انتظار تعیین نماینده تحول دیجیتال" },
  { id: "rd8", company: "بیمه سینا", holding: "مالی و سرمایه‌گذاری سینا", progress: 10, statusLabel: "بازدید و احصاء عناوین" },
  { id: "rd9", company: "نیروگاه‌های صبا", holding: "برق و انرژی صبا", progress: 45, statusLabel: "ویرایش اول ارائه شده" },
  { id: "rd10", company: "انرژی گستر سینا", holding: "برق و انرژی صبا", progress: 65, statusLabel: "اصلاحات توسط تیم راهبر", obstacles: "نیاز به جلسه تکمیلی با معاونت بهره‌برداری" },
  { id: "rd11", company: "کاوه پارس (فولاد)", holding: "کاوه پارس", progress: 20, statusLabel: "عناوین احصاء شده — در بررسی" },
  { id: "rd12", company: "هتل‌های پارسیان", holding: "سیاحتی پارسیان", progress: 10, statusLabel: "بازدید و احصاء عناوین" },
];

// ------------------- شناسنامه‌های تجمیعی -------------------
export type SupportedProduct = { id: string; name: string; company: string; trl: number; status: string };
export const supportedProducts: SupportedProduct[] = [
  { id: "sp1", name: "کیت تشخیص سریع آنتی‌بیوتیک شیر", company: "زیست‌فناور کیمیا", trl: 7, status: "در حال استقرار در لبنیات پاک" },
  { id: "sp2", name: "سامانه تشخیص خودکار حوادث جاده‌ای", company: "بینا رایان", trl: 9, status: "بهره‌برداری تجاری" },
  { id: "sp3", name: "پهپاد سمپاش ۲۰ لیتری", company: "پرواز سبز", trl: 8, status: "پایلوت مزارع دشت ناز" },
  { id: "sp4", name: "خمیرکاغذ کرافت ارگانوسولو", company: "اکال زیست پایدار", trl: 4, status: "پروتوتایپ در صندوق نوآور" },
];

export type SupportedVenture = { id: string; name: string; supportType: "قرارداد فناورانه" | "بذرمایه" | "سرمایه خطرپذیر"; field: string; year: string };
export const supportedVentures: SupportedVenture[] = [
  { id: "sv1", name: "اکال زیست پایدار", supportType: "قرارداد فناورانه", field: "زیست‌فناوری", year: "۱۴۰۴" },
  { id: "sv2", name: "زیست‌پالا", supportType: "بذرمایه", field: "محیط زیست", year: "۱۴۰۴" },
  { id: "sv3", name: "رهیاب‌انرژی", supportType: "بذرمایه", field: "انرژی", year: "۱۴۰۳" },
  { id: "sv4", name: "بینا رایان", supportType: "سرمایه خطرپذیر", field: "بینایی ماشین", year: "۱۴۰۲" },
  { id: "sv5", name: "سیگنال امید", supportType: "قرارداد فناورانه", field: "هوش مصنوعی", year: "۱۴۰۴" },
];

export type PartnerTechnologist = { id: string; name: string; expertise: string; projects: number; rating: number };
export const partnerTechnologists: PartnerTechnologist[] = [
  { id: "pt1", name: "شرکت شتابدهی و فناوری راهبر بنیاد", expertise: "راهبری و شتابدهی تیم‌ها", projects: 5, rating: 4.6 },
  { id: "pt2", name: "زیست‌فناور کیمیا", expertise: "کیت‌های تشخیصی", projects: 2, rating: 4.4 },
  { id: "pt3", name: "فوتونیک آریا", expertise: "لیدار و سنجش نوری", projects: 1, rating: 4.0 },
  { id: "pt4", name: "پرواز سبز", expertise: "پهپاد کشاورزی", projects: 1, rating: 4.5 },
];
