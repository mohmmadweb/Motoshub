// ---------------------------------------------------------------------------
// F18 «پروفایل سازمانی» — مدل: org_profile { scope_id, logo, cover, tagline, about, website, address,
// phone, email, domains[], public_fields[] }.
// انبار: motoshub.orgProfiles.v1 · endpoint پیشنهادی: GET/PATCH /identity/iam/scopes/{id}/profile/
// ---------------------------------------------------------------------------
import { createLocalStore } from "../../iam/store";

export type OrgField = "website" | "address" | "phone" | "email";
export const orgFieldLabel: Record<OrgField, string> = { website: "وب‌سایت", address: "نشانی", phone: "تلفن", email: "ایمیل" };
export type OrgProfile = {
  scope_id: string;
  logo: string;
  cover: string;
  tagline: string;
  about: string;
  website: string;
  address: string;
  phone: string;
  email: string;
  domains: string[];
  public_fields: OrgField[];
  updated_at?: string;
  updated_by?: string;
};
type OrgState = {
  profiles: Record<string, OrgProfile>;
  /** scope_id → شناسه‌ی کاربران دنبال‌کننده */
  followers: Record<string, string[]>;
  /** تنظیم راهبری: کدام فیلدها اصلاً می‌توانند عمومی باشند */
  allowed_public: OrgField[];
};

export const emptyProfile = (scope_id: string): OrgProfile => ({ scope_id, logo: "", cover: "", tagline: "", about: "", website: "", address: "", phone: "", email: "", domains: [], public_fields: ["website", "email"] });

const P = (o: Partial<OrgProfile> & { scope_id: string }): OrgProfile => ({ ...emptyProfile(o.scope_id), ...o });
const seed = (): OrgState => ({
  allowed_public: ["website", "address", "phone", "email"],
  followers: {},
  profiles: {
    sys: P({ scope_id: "sys", cover: "/img/meeting.jpg", tagline: "در خدمت محرومان، پیشران توسعه", about: "بنیاد مستضعفان انقلاب اسلامی با هلدینگ‌های تخصصی در کشاورزی، صنایع غذایی، انرژی، حمل‌ونقل و خدمات مالی، یکی از بزرگ‌ترین مجموعه‌های اقتصادی و اجتماعی کشور است.", website: "https://ir-bf.ir", address: "تهران، خیابان شهید بهشتی، برج‌های دوقلوی بنیاد", phone: "۰۲۱-۸۸۵۰۰۰۰۰", email: "info@ir-bf.ir", domains: ["توسعه‌ی اقتصادی", "مسئولیت اجتماعی", "سرمایه‌گذاری", "نوآوری"], public_fields: ["website", "address", "phone", "email"] }),
    "h-ferdows": P({ scope_id: "h-ferdows", cover: "/img/agri-drone.jpg", tagline: "کشاورزی هوشمند و امنیت غذایی", about: "هلدینگ کشاورزی فردوس پارس کشت‌وصنعت‌ها و مؤسسه‌ی تحقیقات کشاورزی بنیاد را راهبری می‌کند؛ از کشاورزی دقیق تا زنجیره‌ی تأمین.", domains: ["کشاورزی دقیق", "بذر و نهاده", "زیست‌فناوری"], website: "https://ferdowspars.ir", email: "info@ferdowspars.ir" }),
    "h-sina-food": P({ scope_id: "h-sina-food", cover: "/img/dairy.jpg", tagline: "سلامت سفره‌ی ایرانی", about: "هلدینگ صنایع غذایی سینا با برندهای بهنوش، زمزم و لبنیات پاک در تولید نوشیدنی، لبنیات و مواد غذایی فعال است.", domains: ["نوشیدنی", "لبنیات", "زنجیره‌ی سرد"], website: "https://sinafood.ir", phone: "۰۲۱-۸۲۱۳۰۰۰۰" }),
    "h-saba": P({ scope_id: "h-saba", cover: "/img/energy.jpg", tagline: "انرژی پایدار برای توسعه", about: "هلدینگ برق و انرژی صبا مالک و بهره‌بردار نیروگاه‌های حرارتی و تجدیدپذیر است و در بهره‌وری انرژی صنایع فعالیت می‌کند.", domains: ["تولید برق", "انرژی تجدیدپذیر", "بهره‌وری انرژی"], website: "https://saba-energy.ir", email: "pr@saba-energy.ir" }),
    "h-paya": P({ scope_id: "h-paya", cover: "/img/rail.jpg", tagline: "حمل‌ونقل و لجستیک یکپارچه", about: "هلدینگ پایا ترابر سینا در حمل‌ونقل ریلی، جاده‌ای و دریایی و خدمات لجستیک فعالیت می‌کند.", domains: ["ریلی", "لجستیک", "انبارداری"] }),
    "h-mali": P({ scope_id: "h-mali", cover: "/img/datacenter.jpg", tagline: "سرمایه‌گذاری مسئولانه", about: "هلدینگ مالی و سرمایه‌گذاری سینا شامل بانک سینا، بیمه و شرکت‌های تأمین سرمایه است.", domains: ["بانکداری", "بیمه", "تأمین مالی"], website: "https://sinabank.ir" }),
    "c-behnoush": P({ scope_id: "c-behnoush", cover: "/img/factory.jpg", tagline: "پیشگام نوشیدنی‌های سالم", about: "بهنوش ایران از قدیمی‌ترین تولیدکنندگان نوشیدنی کشور با خطوط تولید مدرن و صادرات به کشورهای همسایه است.", domains: ["نوشیدنی بدون الکل", "آبمیوه", "صادرات"], website: "https://behnoush.ir", phone: "۰۲۱-۴۴۵۰۰۰۰۰" }),
  },
});

export const orgStore = createLocalStore<OrgState>("motoshub.orgProfiles.v1", seed, (r) => {
  const x = r as OrgState;
  return x && x.profiles ? { ...x, followers: x.followers ?? {}, allowed_public: x.allowed_public ?? ["website", "address", "phone", "email"] } : null;
});
