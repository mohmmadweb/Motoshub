// ---------------------------------------------------------------------------
// داده‌ی نمونه‌ی «دبیرخانه و مشتریان» — سازمان‌ها عمومی و ساختگی‌اند؛ نام نمایندگانِ مشتری
// ساختگی است. فرستنده/گیرنده‌ها و مسئولان از کاربران نمونه‌ی دمو هستند.
// شماره‌های دبیرخانه با همان issueNumber انبار ساخته می‌شوند تا پیوسته و یکتا باشند.
// ---------------------------------------------------------------------------
import { issueNumber } from "./numbering";
import type {
  AttachmentApi,
  CustomerActivity,
  CustomerContact,
  CustomerFile,
  FinancialDocument,
  Letter,
  LetterParty,
  LetterRegistration,
  NumberSeries,
  OfficeLabel,
  OfficeState,
  Opportunity,
  Paraph,
  Referral,
} from "./types";
import { principalOf } from "./util";

/** با هر تغییر شکل داده‌ی نمونه یک واحد بالا برود (داده‌ی قدیمی مرورگر بازسازی می‌شود) */
export const OFFICE_STORE_VERSION = 1;
export const OFFICE_STORE_KEY = "kariz.office.v1";

const P = (id: string) => principalOf(id);
const att = (id: number, name: string, size: number, mime = "application/pdf"): AttachmentApi => ({ id, name, size, mime });
const party = (uid: string, role: "to" | "cc", seen_at: string | null = null, via_referral: number | null = null): LetterParty => ({ principal_id: P(uid), role, seen_at, ...(via_referral ? { via_referral } : {}) });

// ------------------------------------------------------------------ برچسب‌ها

const labels: OfficeLabel[] = [
  ...(
    [
      ["صنعتی", "brand"],
      ["مشتری کلیدی", "success"],
      ["پیگیری", "warning"],
      ["پخش", "info"],
      ["ساختمانی", "neutral"],
      ["فناوری", "info"],
      ["درمان", "neutral"],
      ["تعاونی", "neutral"],
      ["حمل‌ونقل", "neutral"],
      ["خرده‌فروشی", "neutral"],
      ["مشاوره", "neutral"],
    ] as const
  ).map(([title, tone], i) => ({ id: 1 + i, namespace: "crm" as const, title, tone })),
  ...(
    [
      ["فروش جدید", "brand"],
      ["تمدید قرارداد", "success"],
      ["مناقصه", "warning"],
      ["خدمات پس از فروش", "info"],
    ] as const
  ).map(([title, tone], i) => ({ id: 20 + i, namespace: "sales" as const, title, tone })),
  ...(
    [
      ["پیش‌پرداخت", "brand"],
      ["قسط قرارداد", "info"],
      ["تسویه", "success"],
      ["هزینه‌ی حمل", "neutral"],
      ["جریمه‌ی تأخیر", "danger"],
    ] as const
  ).map(([title, tone], i) => ({ id: 30 + i, namespace: "finance" as const, title, tone })),
  ...(
    [
      ["فوری", "danger"],
      ["قرارداد", "brand"],
      ["مالی", "info"],
      ["اداری", "neutral"],
    ] as const
  ).map(([title, tone], i) => ({ id: 40 + i, namespace: "letter" as const, title, tone })),
];

// ------------------------------------------------------------------ مشتریان

const C = (
  id: number,
  party_type: CustomerFile["party_type"],
  name: string,
  extra: Partial<CustomerFile> & { owner: string; access: string[] },
): CustomerFile => ({
  id,
  party_type,
  name,
  trade_name: extra.trade_name ?? "",
  national_id: extra.national_id ?? "",
  economic_code: extra.economic_code ?? "",
  phones: extra.phones ?? [],
  email: extra.email ?? "",
  website: extra.website ?? "",
  address: extra.address ?? "",
  postal_code: extra.postal_code ?? "",
  labels: extra.labels ?? [],
  access: [...new Set([extra.owner, ...extra.access])].map(P),
  owner_id: P(extra.owner),
  created_at: extra.created_at ?? "1404/08/12 10:20",
  description: extra.description ?? "",
  created_by: P(extra.owner),
});

const customers: CustomerFile[] = [
  C(1, "company", "شرکت فولاد البرز پویا", {
    trade_name: "البرز پویا",
    national_id: "10320987451",
    economic_code: "411198765432",
    phones: [
      { label: "دفتر مرکزی", number: "02188776655" },
      { label: "فکس", number: "02188776650" },
    ],
    email: "info@alborzpouya.example",
    website: "alborzpouya.example",
    address: "تهران، خیابان شهید بهشتی، خیابان پاکستان، پلاک ۱۸، طبقه‌ی ۴",
    postal_code: "1531733117",
    labels: ["صنعتی", "مشتری کلیدی"],
    owner: "u4",
    access: ["u5", "u1"],
    created_at: "1404/07/03 09:10",
    description: "تأمین قطعات فولادی خطوط تولید؛ قرارداد سالانه از مهر ۱۴۰۴.",
  }),
  C(2, "company", "گروه صنعتی آرین تجهیز", {
    trade_name: "آرین تجهیز",
    national_id: "10103456789",
    economic_code: "411234567890",
    phones: [{ label: "دفتر مرکزی", number: "02634567890" }],
    email: "sales@ariantajhiz.example",
    address: "کرج، شهرک صنعتی سیمین‌دشت، خیابان دوم",
    postal_code: "3197654321",
    labels: ["صنعتی"],
    owner: "u5",
    access: ["u4", "u1"],
    created_at: "1404/08/20 11:45",
  }),
  C(3, "company", "شرکت پخش سپید رایان", {
    trade_name: "سپید رایان",
    national_id: "10861234570",
    economic_code: "411876543210",
    phones: [
      { label: "تلفن ثابت", number: "03132223344" },
      { label: "موبایل", number: "09131112233" },
    ],
    address: "اصفهان، خیابان آتشگاه، کوچه‌ی ۱۴",
    postal_code: "8155566677",
    labels: ["پخش", "پیگیری"],
    owner: "u4",
    access: ["u1"],
    created_at: "1404/09/02 14:00",
  }),
  C(4, "company", "هلدینگ ساختمانی نوین‌سازه", {
    trade_name: "نوین‌سازه",
    national_id: "10102233445",
    economic_code: "411556677889",
    phones: [{ label: "دفتر مرکزی", number: "02122334455" }],
    email: "contact@novinsazeh.example",
    website: "novinsazeh.example",
    address: "تهران، بزرگراه حقانی، برج نگار، طبقه‌ی ۱۱",
    postal_code: "1518911111",
    labels: ["ساختمانی", "مشتری کلیدی"],
    owner: "u3",
    access: ["u4", "u1"],
    created_at: "1404/07/15 08:30",
  }),
  C(5, "company", "شرکت رایانش ابری پارسه", {
    trade_name: "پارسه‌کلاد",
    national_id: "14009876543",
    economic_code: "411009988776",
    phones: [{ label: "پشتیبانی", number: "02191001234" }],
    email: "hello@parsehcloud.example",
    website: "parsehcloud.example",
    address: "تهران، پارک فناوری پردیس، ساختمان نوآوری ۲",
    labels: ["فناوری"],
    owner: "u5",
    access: ["u1"],
    created_at: "1404/10/05 10:00",
  }),
  C(6, "company", "بیمارستان خصوصی مهرآفرین", {
    national_id: "10260011223",
    economic_code: "411220033445",
    phones: [{ label: "امور قراردادها", number: "05138445566" }],
    address: "مشهد، بلوار سجاد، خیابان بهار",
    postal_code: "9185713111",
    labels: ["درمان"],
    owner: "u3",
    access: [],
    created_at: "1404/11/18 12:10",
    description: "پرونده‌ی محدود — فقط مسئول پرونده دسترسی دارد.",
  }),
  C(7, "company", "تعاونی مصرف کارکنان صنایع غذایی", {
    national_id: "10530044556",
    phones: [{ label: "تلفن ثابت", number: "04133556677" }],
    address: "تبریز، شهرک صنعتی غرب، بلوار اصلی",
    labels: ["تعاونی"],
    owner: "u4",
    access: ["u5", "u1"],
    created_at: "1404/12/01 09:00",
  }),
  C(8, "company", "شرکت حمل‌ونقل ریلی ترابر شرق", {
    trade_name: "ترابر شرق",
    national_id: "10380066778",
    economic_code: "411330044556",
    phones: [{ label: "دفتر مرکزی", number: "05132001122" }],
    address: "مشهد، میدان راه‌آهن، ساختمان ترابر",
    labels: ["حمل‌ونقل", "پیگیری"],
    owner: "u5",
    access: ["u4", "u1"],
    created_at: "1405/01/20 16:20",
  }),
  C(9, "person", "بهرام نیک‌نام", {
    national_id: "0071234567",
    phones: [{ label: "موبایل", number: "09121234455" }],
    email: "b.niknam@example.com",
    address: "تهران، خیابان دماوند، کوچه‌ی گلستان، پلاک ۷",
    labels: ["خرده‌فروشی"],
    owner: "u4",
    access: ["u1"],
    created_at: "1405/02/02 11:00",
    description: "پیمانکار مستقل نصب تجهیزات.",
  }),
  C(10, "person", "سارا رحیمی‌فر", {
    national_id: "1270987654",
    phones: [{ label: "موبایل", number: "09133344556" }],
    email: "s.rahimifar@example.com",
    address: "اصفهان، خیابان نظر شرقی",
    labels: ["مشاوره"],
    owner: "u3",
    access: ["u1"],
    created_at: "1405/02/14 15:30",
  }),
];

const contacts: CustomerContact[] = [
  { id: 1, customer: 1, name: "مهندس رضا کاظمی", position: "مدیر خرید", email: "r.kazemi@alborzpouya.example", mobile: "09121110001", phone: "02188776655" },
  { id: 2, customer: 1, name: "فریبا صالحی", position: "کارشناس مالی", email: "f.salehi@alborzpouya.example", mobile: "09121110002", phone: "" },
  { id: 3, customer: 2, name: "مهندس امیر توکلی", position: "مدیرعامل", email: "a.tavakoli@ariantajhiz.example", mobile: "09121110003", phone: "" },
  { id: 4, customer: 3, name: "حمید شریفی", position: "مدیر فروش", email: "", mobile: "09131110004", phone: "03132223344" },
  { id: 5, customer: 4, name: "مهندس نرگس افشار", position: "مدیر پروژه", email: "n.afshar@novinsazeh.example", mobile: "09121110005", phone: "" },
  { id: 6, customer: 4, name: "کامران یزدانی", position: "مدیر مالی", email: "k.yazdani@novinsazeh.example", mobile: "09121110006", phone: "" },
  { id: 7, customer: 5, name: "پویا مقدم", position: "مدیر فنی", email: "p.moghadam@parsehcloud.example", mobile: "09121110007", phone: "" },
  { id: 8, customer: 6, name: "دکتر لیلا حسینی", position: "معاون اداری", email: "", mobile: "09151110008", phone: "05138445566" },
  { id: 9, customer: 8, name: "مهندس بابک ستوده", position: "مدیر بازرگانی", email: "b.sotoudeh@tarabar.example", mobile: "09151110009", phone: "" },
];

// ------------------------------------------------------------------ فرصت‌های فروش

const O = (id: number, customer: number, title: string, value_rial: number, probability: number, owner: string, status: Opportunity["status"], expected_close_date: string, extra: Partial<Opportunity> = {}): Opportunity => ({
  id,
  customer,
  title,
  value_rial,
  probability: status === "won" ? 100 : status === "lost" ? 0 : probability,
  owner_id: P(owner),
  labels: extra.labels ?? [],
  attachments: extra.attachments ?? [],
  status,
  expected_close_date,
  description: extra.description ?? "",
  created_at: extra.created_at ?? "1405/01/15 10:00",
  created_by: P(owner),
  closed_at: status === "open" ? null : (extra.closed_at ?? expected_close_date),
});

const opportunities: Opportunity[] = [
  O(1, 1, "تمدید قرارداد سالانه‌ی تأمین قطعات ۱۴۰۵", 18_500_000_000, 80, "u4", "open", "1405/04/10", { labels: ["تمدید قرارداد"], description: "پیش‌نویس قرارداد ارسال شده؛ منتظر نظر واحد حقوقی مشتری.", attachments: [att(9001, "پیش‌نویس-قرارداد-۱۴۰۵.pdf", 412000)] }),
  O(2, 1, "خط تولید دوم — قطعات ریختگی", 9_200_000_000, 40, "u5", "open", "1405/06/01", { labels: ["فروش جدید"] }),
  O(3, 2, "نوسازی تجهیزات کارگاه مونتاژ", 6_750_000_000, 60, "u5", "open", "1405/03/20", { labels: ["فروش جدید"], description: "بازدید فنی انجام شد؛ پیشنهاد قیمت نسخه‌ی دوم." }),
  O(4, 3, "قرارداد پخش استانی — منطقه‌ی مرکزی", 4_300_000_000, 50, "u4", "open", "1405/03/05", { labels: ["فروش جدید"], description: "موعد گذشته؛ پیگیری تلفنی لازم است." }),
  O(5, 4, "مناقصه‌ی تأسیسات برج اداری", 32_000_000_000, 20, "u3", "open", "1405/05/15", { labels: ["مناقصه"], attachments: [att(9002, "اسناد-مناقصه.zip", 5_300_000, "application/zip")] }),
  O(6, 4, "پشتیبانی سالانه‌ی تجهیزات کارگاهی", 2_400_000_000, 90, "u3", "open", "1405/03/12", { labels: ["خدمات پس از فروش"] }),
  O(7, 5, "زیرساخت ابری سامانه‌ی جامع", 7_800_000_000, 60, "u5", "open", "1405/04/25", { labels: ["فروش جدید"] }),
  O(8, 6, "تجهیز بخش تصویربرداری", 12_600_000_000, 40, "u3", "open", "1405/07/01", { labels: ["مناقصه"] }),
  O(9, 7, "تأمین اقلام فصلی فروشگاه تعاونی", 1_900_000_000, 80, "u4", "open", "1405/03/30", { labels: ["تمدید قرارداد"] }),
  O(10, 8, "اجاره‌ی واگن‌های باری", 5_500_000_000, 20, "u5", "open", "1405/06/20", { labels: ["فروش جدید"] }),
  O(11, 1, "قرارداد تأمین قطعات ۱۴۰۴", 15_000_000_000, 100, "u4", "won", "1404/07/01", { labels: ["تمدید قرارداد"], closed_at: "1404/06/28", created_at: "1404/05/10 09:00" }),
  O(12, 4, "تأمین تجهیزات کارگاه فاز ۱", 8_400_000_000, 100, "u3", "won", "1404/09/15", { labels: ["فروش جدید"], closed_at: "1404/09/10", created_at: "1404/07/20 10:00" }),
  O(13, 2, "قطعات یدکی خط پرس", 3_100_000_000, 100, "u5", "won", "1405/02/10", { labels: ["خدمات پس از فروش"], closed_at: "1405/02/08", created_at: "1404/12/05 10:00" }),
  O(14, 3, "انبار مرکزی پخش — اجاره", 2_800_000_000, 0, "u4", "lost", "1405/01/30", { labels: ["فروش جدید"], description: "مشتری پیشنهاد رقیب را پذیرفت.", closed_at: "1405/01/28", created_at: "1404/11/02 10:00" }),
  O(15, 9, "نصب تجهیزات فروشگاه", 650_000_000, 60, "u4", "open", "1405/03/18", { labels: ["فروش جدید"] }),
  O(16, 10, "مشاوره‌ی بهینه‌سازی فرآیند فروش", 480_000_000, 0, "u3", "lost", "1405/02/25", { closed_at: "1405/02/24", created_at: "1405/02/14 16:00" }),
];

// ------------------------------------------------------------------ اسناد مالی

let fdId = 0;
const F = (
  customer: number,
  direction: FinancialDocument["direction"],
  form: FinancialDocument["form"],
  amount_rial: number,
  date: string,
  extra: Partial<FinancialDocument> & { by?: string } = {},
): FinancialDocument => ({
  id: ++fdId,
  customer,
  direction,
  form,
  amount_rial,
  date,
  due_date: extra.due_date ?? (form === "cash" ? null : date),
  is_cashed: extra.is_cashed ?? form === "cash",
  status: extra.status ?? "active",
  cancel_type: extra.cancel_type ?? null,
  description: extra.description ?? "",
  labels: extra.labels ?? [],
  attachments: extra.attachments ?? [],
  ...(extra.cheque ? { cheque: extra.cheque } : {}),
  created_by: P(extra.by ?? "u4"),
  created_at: `${date} 10:00`,
  ...(extra.cancel_note ? { cancel_note: extra.cancel_note, cancelled_at: extra.cancelled_at ?? null } : {}),
});

const cheque = (number: string, bank: string, sayad_id: string) => ({ number, bank, sayad_id });

const financeDocs: FinancialDocument[] = [
  // فولاد البرز پویا — قرارداد ۱۴۰۴
  F(1, "receipt", "cash", 3_000_000_000, "1404/07/05", { labels: ["پیش‌پرداخت"], description: "پیش‌پرداخت قرارداد تأمین قطعات ۱۴۰۴", attachments: [att(9101, "رسید-واریز-پیش‌پرداخت.jpg", 230000, "image/jpeg")] }),
  F(1, "receipt", "cheque", 3_000_000_000, "1404/09/01", { due_date: "1404/10/01", is_cashed: true, labels: ["قسط قرارداد"], description: "قسط اول", cheque: cheque("774512", "بانک ملت", "1234567890123456") }),
  F(1, "receipt", "cheque", 3_000_000_000, "1404/11/01", { due_date: "1404/12/01", is_cashed: true, labels: ["قسط قرارداد"], description: "قسط دوم", cheque: cheque("774513", "بانک ملت", "1234567890123457") }),
  F(1, "receipt", "cheque", 3_000_000_000, "1405/01/15", { due_date: "1405/02/15", is_cashed: false, labels: ["قسط قرارداد"], description: "قسط سوم — سررسید گذشته و هنوز وصول نشده", cheque: cheque("774514", "بانک ملت", "1234567890123458") }),
  F(1, "receipt", "cheque", 3_000_000_000, "1405/03/01", { due_date: "1405/04/01", is_cashed: false, labels: ["قسط قرارداد"], description: "قسط چهارم", cheque: cheque("774515", "بانک ملت", "1234567890123459") }),
  F(1, "payment", "cash", 180_000_000, "1404/08/20", { labels: ["هزینه‌ی حمل"], description: "هزینه‌ی حمل محموله‌ی اول" }),
  F(1, "receipt", "probable", 4_500_000_000, "1405/04/20", { labels: ["پیش‌پرداخت"], description: "پیش‌پرداخت قرارداد ۱۴۰۵ (در صورت امضا)" }),
  // آرین تجهیز
  F(2, "receipt", "cash", 1_550_000_000, "1405/02/10", { labels: ["پیش‌پرداخت"], description: "پیش‌پرداخت قطعات یدکی خط پرس", by: "u5" }),
  F(2, "receipt", "cheque", 1_550_000_000, "1405/02/10", { due_date: "1405/03/25", is_cashed: false, labels: ["تسویه"], description: "تسویه‌ی قطعات یدکی", cheque: cheque("332109", "بانک صادرات", "2234567890123401"), by: "u5" }),
  F(2, "payment", "cash", 95_000_000, "1405/02/18", { labels: ["هزینه‌ی حمل"], description: "حمل به کرج", by: "u5" }),
  // سپید رایان
  F(3, "receipt", "cheque", 650_000_000, "1404/10/12", { due_date: "1404/11/12", is_cashed: false, status: "cancelled", cancel_type: "cheque_returned", cancel_note: "چک برگشت خورد؛ جایگزین نقدی دریافت شد.", cancelled_at: "1404/11/14", labels: ["تسویه"], description: "تسویه‌ی سفارش آزمایشی", cheque: cheque("554432", "بانک تجارت", "3234567890123402") }),
  F(3, "receipt", "cash", 650_000_000, "1404/11/16", { labels: ["تسویه"], description: "جایگزین چک برگشتی" }),
  F(3, "receipt", "probable", 1_200_000_000, "1405/02/30", { labels: ["پیش‌پرداخت"], description: "پیش‌پرداخت قرارداد پخش — وعده‌ی اردیبهشت" }),
  // نوین‌سازه
  F(4, "receipt", "cash", 2_500_000_000, "1404/09/12", { labels: ["پیش‌پرداخت"], description: "پیش‌پرداخت تأمین تجهیزات کارگاه فاز ۱", by: "u3" }),
  F(4, "receipt", "cheque", 2_950_000_000, "1404/10/20", { due_date: "1404/12/20", is_cashed: true, labels: ["قسط قرارداد"], cheque: cheque("110022", "بانک پاسارگاد", "4234567890123403"), by: "u3" }),
  F(4, "receipt", "cheque", 2_950_000_000, "1405/01/20", { due_date: "1405/03/20", is_cashed: false, labels: ["تسویه"], description: "تسویه‌ی فاز ۱", cheque: cheque("110023", "بانک پاسارگاد", "4234567890123404"), by: "u3" }),
  F(4, "payment", "cash", 320_000_000, "1404/12/05", { labels: ["جریمه‌ی تأخیر"], description: "جریمه‌ی تأخیر تحویل طبق بند ۹ قرارداد", by: "u3" }),
  F(4, "payment", "probable", 400_000_000, "1405/04/15", { labels: ["هزینه‌ی حمل"], description: "هزینه‌ی حمل تجهیزات فاز ۲ (برآورد)", by: "u3" }),
  // پارسه‌کلاد
  F(5, "payment", "cheque", 850_000_000, "1405/01/25", { due_date: "1405/02/25", is_cashed: true, description: "خرید سرویس آزمایشی", cheque: cheque("988765", "بانک سامان", "5234567890123405"), by: "u5" }),
  F(5, "receipt", "probable", 2_000_000_000, "1405/05/01", { labels: ["پیش‌پرداخت"], description: "در صورت امضای قرارداد زیرساخت", by: "u5" }),
  // مهرآفرین (پرونده‌ی محدود)
  F(6, "receipt", "cash", 1_100_000_000, "1405/01/10", { labels: ["پیش‌پرداخت"], description: "پیش‌پرداخت مطالعه‌ی امکان‌سنجی", by: "u3" }),
  // تعاونی
  F(7, "receipt", "cash", 760_000_000, "1404/12/10", { labels: ["تسویه"], description: "سفارش نوروزی", by: "u4" }),
  F(7, "receipt", "cheque", 940_000_000, "1405/02/20", { due_date: "1405/03/02", is_cashed: false, labels: ["قسط قرارداد"], description: "سفارش اردیبهشت", cheque: cheque("445566", "بانک کشاورزی", "6234567890123406"), by: "u4" }),
  // ترابر شرق
  F(8, "payment", "cash", 210_000_000, "1405/02/05", { labels: ["هزینه‌ی حمل"], description: "حمل آزمایشی محموله", by: "u5" }),
  F(8, "receipt", "probable", 1_000_000_000, "1405/06/25", { description: "در صورت عقد قرارداد اجاره", by: "u5" }),
  // اشخاص
  F(9, "receipt", "cash", 120_000_000, "1405/02/22", { labels: ["پیش‌پرداخت"], description: "پیش‌پرداخت نصب" }),
  F(9, "payment", "cash", 40_000_000, "1405/03/01", { description: "خرید قطعات مصرفی نصب" }),
  F(10, "payment", "cash", 60_000_000, "1405/02/28", { description: "حق‌الزحمه‌ی جلسه‌ی مشاوره‌ی اولیه", by: "u3" }),
];

// ------------------------------------------------------------------ فعالیت‌ها

let acId = 0;
const A = (customer: number, kind: CustomerActivity["kind"], text: string, author: string, created_at: string, extra: Partial<CustomerActivity> = {}): CustomerActivity => ({
  id: ++acId,
  customer,
  kind,
  text,
  author_id: P(author),
  attachments: extra.attachments ?? [],
  created_at,
  ...(extra.ref ? { ref: extra.ref } : {}),
});

const activities: CustomerActivity[] = [
  A(1, "call_out", "تماس با مهندس کاظمی درباره‌ی زمان‌بندی تحویل محموله‌ی خرداد؛ قرار شد برنامه‌ی جدید تا پنجشنبه ارسال شود.", "u4", "1405/03/04 11:20"),
  A(1, "minutes", "جلسه‌ی بازبینی قرارداد ۱۴۰۵ با واحد خرید مشتری", "u4", "1405/02/28 10:00", { ref: { type: "meeting", id: null, title: "بازبینی قرارداد سالانه‌ی ۱۴۰۵ — فولاد البرز پویا", status: "امضاشده" } }),
  A(1, "task", "پیگیری وصول چک قسط سوم", "u4", "1405/02/16 09:00", { ref: { type: "task", id: null, title: "پیگیری وصول چک قسط سوم البرز پویا", status: "در حال انجام" } }),
  A(1, "file", "مشخصات فنی قطعات سفارش ۱۴۰۵", "u5", "1405/02/20 15:10", { attachments: [att(9201, "مشخصات-فنی-قطعات.xlsx", 88000, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")] }),
  A(1, "note", "مشتری درخواست تخفیف ۵٪ برای تسویه‌ی نقدی قسط چهارم دارد؛ با مدیر مالی هماهنگ شود.", "u5", "1405/03/06 13:40"),
  A(2, "call_in", "مدیرعامل آرین تجهیز درباره‌ی پیشنهاد قیمت نسخه‌ی دوم تماس گرفت؛ خواستار کاهش زمان تحویل است.", "u5", "1405/03/02 10:05"),
  A(2, "task", "تهیه‌ی پیشنهاد قیمت نسخه‌ی دوم نوسازی کارگاه", "u5", "1405/02/25 12:00", { ref: { type: "task", id: null, title: "پیشنهاد قیمت نسخه‌ی دوم — آرین تجهیز", status: "انجام‌شده" } }),
  A(3, "call_out", "پیگیری قرارداد پخش استانی؛ مدیر فروش در سفر است، تماس مجدد شنبه.", "u4", "1405/03/07 16:30"),
  A(3, "note", "چک برگشتی آبان با پرداخت نقدی جایگزین شد؛ برای سفارش‌های بعدی چک صیادی ثبت‌شده لازم است.", "u4", "1404/11/16 12:00"),
  A(4, "minutes", "جلسه‌ی شروع فاز ۲ تأمین تجهیزات", "u3", "1405/02/12 09:30", { ref: { type: "meeting", id: null, title: "شروع فاز ۲ تأمین تجهیزات — نوین‌سازه", status: "در انتظار امضا" } }),
  A(4, "call_in", "مدیر مالی نوین‌سازه زمان وصول چک تسویه را تأیید کرد (۲۰ خرداد).", "u3", "1405/03/03 11:00"),
  A(4, "file", "اسناد مناقصه‌ی تأسیسات برج اداری", "u3", "1405/02/18 14:00", { attachments: [att(9202, "اسناد-مناقصه.zip", 5_300_000, "application/zip")] }),
  A(5, "note", "نسخه‌ی آزمایشی سرویس ابری رضایت‌بخش بوده؛ آماده‌ی ارائه‌ی پیشنهاد نهایی.", "u5", "1405/02/27 10:30"),
  A(6, "call_out", "هماهنگی بازدید از بخش تصویربرداری برای برآورد تجهیزات.", "u3", "1405/03/01 09:15"),
  A(7, "call_in", "درخواست افزودن اقلام بهداشتی به سفارش فصلی.", "u4", "1405/03/05 12:20"),
  A(8, "task", "ارسال پیش‌نویس قرارداد اجاره‌ی واگن", "u5", "1405/03/06 10:00", { ref: { type: "task", id: null, title: "پیش‌نویس قرارداد اجاره‌ی واگن — ترابر شرق", status: "برای انجام" } }),
  A(9, "note", "نصب در دو مرحله انجام می‌شود؛ مرحله‌ی اول ۱۵ خرداد.", "u4", "1405/03/02 17:00"),
];

// ------------------------------------------------------------------ دبیرخانه

const baseSeries: NumberSeries[] = [
  { id: 1, scope_id: "root", title: "وارده‌ی عمومی", prefix: "و", use_jalali_year: true, counter: 0, suffix: "", reset_yearly: true, direction: "incoming", start_number: 1, reference_year: 1405, pad: 4, active: true },
  { id: 2, scope_id: "root", title: "صادره‌ی عمومی", prefix: "ص", use_jalali_year: true, counter: 0, suffix: "", reset_yearly: true, direction: "outgoing", start_number: 1, reference_year: 1405, pad: 4, active: true },
  { id: 3, scope_id: "root", title: "صادره‌ی محرمانه", prefix: "م", use_jalali_year: true, counter: 0, suffix: "", reset_yearly: true, direction: "outgoing", start_number: 1500, reference_year: 1405, pad: 4, active: true },
];

const L = (id: number, subject: string, body: string, sender: string, parties: LetterParty[], created_at: string, extra: Partial<Letter> = {}): Letter => ({
  id,
  subject,
  body,
  sender_id: P(sender),
  parties,
  labels: extra.labels ?? [],
  attachments: extra.attachments ?? [],
  related_task: extra.related_task ?? null,
  case_links: extra.case_links ?? [],
  archived: extra.archived ?? false,
  created_at,
  kind: extra.kind ?? "internal",
  archived_by: extra.archived_by ?? [],
  ...(extra.related_task_title ? { related_task_title: extra.related_task_title } : {}),
});

const cust = (...ids: number[]) => ids.map((id) => ({ type: "customer_file" as const, id }));

const letters: Letter[] = [
  L(1, "درخواست تمدید قرارداد تأمین قطعات ۱۴۰۵", "با سلام و احترام،\nبه استحضار می‌رساند قرارداد تأمین قطعات فولادی فی‌مابین در پایان خرداد ۱۴۰۵ به پایان می‌رسد. خواهشمند است نسبت به تمدید قرارداد با شرایط پیوست اقدام فرمایید.\nبا تشکر", "u4", [party("u1", "to"), party("u5", "to", "1405/03/02 10:40"), party("u3", "cc", "1405/03/02 12:05")], "1405/03/02 09:00", { kind: "incoming", labels: ["قرارداد"], case_links: cust(1), attachments: [att(9301, "نامه‌ی-البرز-پویا-اسکن.pdf", 640000)] }),
  L(2, "پیشنهاد قیمت نوسازی تجهیزات کارگاه — نسخه‌ی دوم", "پیرو مذاکرات انجام‌شده، پیشنهاد قیمت نسخه‌ی دوم با کاهش زمان تحویل به ۴۵ روز تقدیم می‌شود.", "u5", [party("u1", "to", "1405/03/03 08:50"), party("u4", "cc")], "1405/03/02 17:15", { kind: "outgoing", labels: ["قرارداد"], case_links: cust(2), attachments: [att(9302, "پیشنهاد-قیمت-نسخه-۲.pdf", 318000)] }),
  L(3, "گزارش وصول مطالبات خرداد", "گزارش وضعیت چک‌های سررسیدشده و معوقه‌ی مشتریان کلیدی پیوست است. لطفاً موارد معوقه در جلسه‌ی هفتگی بررسی شود.", "u3", [party("u1", "to"), party("u4", "to", "1405/03/07 09:12")], "1405/03/07 08:30", { labels: ["مالی", "فوری"], case_links: cust(1, 4), attachments: [att(9303, "گزارش-وصول-خرداد.xlsx", 54000, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")] }),
  L(4, "اعلام برنامه‌ی بازدید از کارگاه مشتری", "بازدید فنی از کارگاه آرین تجهیز روز دوشنبه ۱۱ خرداد ساعت ۱۰ انجام می‌شود. حضور کارشناس فنی الزامی است.", "u1", [party("u5", "to", "1405/03/05 10:00"), party("u4", "cc", null)], "1405/03/05 09:20", { labels: ["اداری"], case_links: cust(2) }),
  L(5, "استعلام شرایط قرارداد پخش استانی", "خواهشمند است شرایط پیشنهادی قرارداد پخش استانی منطقه‌ی مرکزی را اعلام فرمایید.", "u4", [party("u1", "to", "1405/02/28 11:00"), party("u2", "to", null, 1)], "1405/02/28 10:15", { kind: "incoming", case_links: cust(3) }),
  L(6, "پاسخ به استعلام شرایط پخش استانی", "در پاسخ به نامه‌ی شما، شرایط قرارداد پخش استانی شامل سقف اعتبار، دوره‌ی تسویه‌ی ۶۰ روزه و حداقل خرید ماهانه به پیوست ارسال می‌شود.", "u1", [party("u4", "to", "1405/03/01 12:30")], "1405/03/01 11:40", { kind: "outgoing", case_links: cust(3), attachments: [att(9304, "شرایط-قرارداد-پخش.pdf", 201000)] }),
  L(7, "دعوت به جلسه‌ی هماهنگی مناقصه‌ی تأسیسات", "جلسه‌ی هماهنگی تیم فنی و مالی برای آماده‌سازی پاکت‌های مناقصه‌ی برج اداری نوین‌سازه روز سه‌شنبه برگزار می‌شود.", "u3", [party("u1", "to", "1405/02/20 09:00"), party("u4", "to", "1405/02/20 09:30"), party("u5", "cc", "1405/02/20 10:00")], "1405/02/19 16:00", { labels: ["اداری"], case_links: cust(4), archived_by: [P("u1")] }),
  L(8, "ارسال قرارداد محرمانه‌ی تجهیز بخش تصویربرداری", "قرارداد محرمانه‌ی مطالعه‌ی امکان‌سنجی تجهیز بخش تصویربرداری جهت امضا ارسال می‌شود.", "u3", [party("u1", "to", "1405/01/12 10:10")], "1405/01/11 15:00", { kind: "outgoing", labels: ["قرارداد"], case_links: cust(6) }),
  L(9, "درخواست اصلاح فاکتور حمل", "خواهشمند است فاکتور هزینه‌ی حمل محموله‌ی اردیبهشت با مبلغ توافقی اصلاح شود.", "u5", [party("u1", "to")], "1405/03/08 08:45", { labels: ["مالی"], case_links: cust(8) }),
  L(10, "صورت‌وضعیت فاز ۱ تجهیزات کارگاه", "صورت‌وضعیت نهایی فاز ۱ همراه با گواهی تحویل ارسال می‌شود.", "u3", [party("u4", "to", "1404/09/16 10:00"), party("u1", "cc", "1404/09/16 11:30")], "1404/09/16 09:00", { kind: "outgoing", case_links: cust(4), archived: true }),
  L(11, "یادداشت داخلی: هماهنگی تحویل محموله‌ی خرداد", "لطفاً هماهنگی‌های لازم با واحد انبار برای تحویل محموله‌ی خرداد البرز پویا انجام شود.", "u4", [party("u5", "to", "1405/03/06 09:00")], "1405/03/05 18:10", { case_links: cust(1), related_task_title: "تحویل محموله‌ی خرداد — البرز پویا" }),
];

const paraphs: Paraph[] = [
  { id: 1, letter: 1, author_id: P("u5"), parent: null, text: "پیش‌نویس قرارداد ۱۴۰۵ آماده است؛ با واحد حقوقی هماهنگ می‌کنم.", attachments: [], created_at: "1405/03/02 10:55" },
  { id: 2, letter: 1, author_id: P("u3"), parent: 1, text: "سقف افزایش قیمت را ۱۵٪ در نظر بگیرید.", attachments: [], created_at: "1405/03/02 12:20" },
  { id: 3, letter: 3, author_id: P("u4"), parent: null, text: "چک قسط سوم البرز پویا هفته‌ی آینده وصول می‌شود؛ تماس گرفته شد.", attachments: [], created_at: "1405/03/07 09:40" },
  { id: 4, letter: 5, author_id: P("u1"), parent: null, text: "جهت بررسی و تهیه‌ی پاسخ.", attachments: [], created_at: "1405/02/28 11:05" },
  { id: 5, letter: 7, author_id: P("u4"), parent: null, text: "پاکت مالی تا دوشنبه آماده می‌شود.", attachments: [], created_at: "1405/02/20 11:00" },
];

const referrals: Referral[] = [{ id: 1, letter: 5, from_id: P("u1"), to_ids: [P("u2")], note: "لطفاً شرایط قرارداد را بررسی و پاسخ را آماده کنید.", created_at: "1405/02/28 11:05" }];

/** ثبت‌های دبیرخانه به ترتیب زمانی — با issueNumber (پیوسته و یکتا) */
function buildRegistrations(series: NumberSeries[]): { series: NumberSeries[]; registrations: LetterRegistration[] } {
  const plan: { letter: number; series: number; at: string; ext?: [string, string]; org: string; by: string }[] = [
    { letter: 8, series: 3, at: "1405/01/11 15:20", org: "بیمارستان خصوصی مهرآفرین", by: "u1" },
    { letter: 5, series: 1, at: "1405/02/28 10:20", ext: ["1405/پ/221", "1405/02/27"], org: "شرکت پخش سپید رایان", by: "u1" },
    { letter: 6, series: 2, at: "1405/03/01 11:45", org: "شرکت پخش سپید رایان", by: "u1" },
    { letter: 1, series: 1, at: "1405/03/02 09:05", ext: ["ب/3456", "1405/03/01"], org: "شرکت فولاد البرز پویا", by: "u1" },
    { letter: 2, series: 2, at: "1405/03/02 17:30", org: "گروه صنعتی آرین تجهیز", by: "u1" },
  ];
  // ثبت ۱۴۰۴ (سری‌ها در ۱۴۰۵ از نو شروع شده‌اند)
  const regs: LetterRegistration[] = [
    { letter: 10, direction: "outgoing", series: 2, number: "ص/1404/0087", registered_at: "1404/09/16 09:10", external_number: "", external_date: "", external_org: "هلدینگ ساختمانی نوین‌سازه", registered_by: P("u1"), counter: 87, reference_year: 1404 },
  ];
  const list = series.map((s) => ({ ...s }));
  for (const x of plan) {
    const s = list.find((y) => y.id === x.series)!;
    const r = issueNumber(s, x.at, regs);
    if (!r.ok) continue;
    Object.assign(s, r.series);
    regs.push({
      letter: x.letter,
      direction: s.direction,
      series: s.id,
      number: r.number,
      registered_at: x.at,
      external_number: x.ext?.[0] ?? "",
      external_date: x.ext?.[1] ?? "",
      external_org: x.org,
      registered_by: P(x.by),
      counter: r.counter,
      reference_year: r.reference_year,
    });
  }
  return { series: list, registrations: regs };
}

export function seedOffice(): OfficeState {
  const { series, registrations } = buildRegistrations(baseSeries);
  return {
    version: OFFICE_STORE_VERSION,
    seq: 10000,
    series,
    letters,
    paraphs,
    referrals,
    registrations,
    customers,
    contacts,
    activities,
    opportunities,
    financeDocs,
    labels,
  };
}
