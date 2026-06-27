import { Link } from "react-router-dom";

const modules = [
  { icon: "👥", title: "شبکه اجتماعی سازمانی", desc: "گروه، انجمن، اعلان، گپ، اخبار و رویدادها — هسته Motoshub" },
  { icon: "📚", title: "مدیریت دانش", desc: "آرشیو اسناد، قراردادها، مصوبات با جستجوی پیشرفته" },
  { icon: "📊", title: "مدیریت پروژه و تسک", desc: "بورد، گانت چارت و بودجه‌بندی — هسته Mizito" },
  { icon: "🏢", title: "چندسازمانی (Multi-tenant)", desc: "یک پلتفرم، برند و دامنه مستقل برای هر مشتری" },
];

export default function Landing() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="flex items-center justify-between px-6 lg:px-16 py-5">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">م</span>
          <span className="font-bold">موتوشاب</span>
        </div>
        <Link
          to="/login"
          className="bg-brand-600 text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-brand-700 transition-colors"
        >
          ورود به پلتفرم
        </Link>
      </header>

      <section className="px-6 lg:px-16 pt-12 pb-20 text-center max-w-3xl mx-auto">
        <span className="tag-pill bg-brand-100 text-brand-700 mb-4">پروتوتایپ نسخه ادغام‌شده Motoshub × Mizito</span>
        <h1 className="text-3xl lg:text-5xl font-extrabold leading-tight text-ink-900 mt-4">
          شبکه اجتماعی و فضای کاری سازمانی،
          <br /> ماژولار و قابل فروش به هر سازمان
        </h1>
        <p className="text-ink-500 mt-5 text-base lg:text-lg leading-8">
          ترکیبی از هسته اجتماعی موتوشاب و موتور مدیریت پروژه میزیتو، پشت یک رابط کاربری یکپارچه و مدرن —
          بدون اینکه کاربر نهایی از دوگانگی فنی پشت صحنه باخبر شود.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link to="/login" className="bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700">
            مشاهده داشبورد نمونه
          </Link>
          <Link to="/app/admin" className="bg-white border border-ink-200 px-6 py-3 rounded-xl font-medium hover:bg-ink-50">
            پنل راهبری چندسازمانی
          </Link>
        </div>
      </section>

      <section className="px-6 lg:px-16 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {modules.map((m) => (
          <div key={m.title} className="card p-5 text-right">
            <div className="text-3xl mb-3">{m.icon}</div>
            <h3 className="font-bold text-sm mb-1">{m.title}</h3>
            <p className="text-xs text-ink-500 leading-6">{m.desc}</p>
          </div>
        ))}
      </section>

      <footer className="px-6 lg:px-16 py-6 text-center text-xs text-ink-400 border-t border-ink-100">
        پروتوتایپ داخلی — ساخته‌شده برای ارائه به تیم محصول و کارفرما. این نسخه از داده‌های نمایشی استفاده می‌کند.
      </footer>
    </div>
  );
}
