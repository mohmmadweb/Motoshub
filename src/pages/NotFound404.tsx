import { Link } from "react-router-dom";
import { Compass, Home, Search } from "lucide-react";
import CreditFooter from "../components/CreditFooter";

// صفحه ۴۰۴ اختصاصی — برای مسیرهای ناموجود یا جابه‌جاشده
export default function NotFound404() {
  return (
    <div dir="rtl" className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <span className="mx-auto w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
          <Compass size={28} />
        </span>
        <p className="text-4xl font-black text-ink-900 mb-1">۴۰۴</p>
        <h1 className="text-base font-bold text-ink-900 mb-2">این صفحه پیدا نشد</h1>
        <p className="text-[13px] text-ink-500 leading-7 mb-6">
          آدرس واردشده وجود ندارد یا جابه‌جا شده است. اگر دنبال «برنامه‌ی تحویل» یا اسناد فنی هستید، به{" "}
          <a href="https://docs.shub.ir" className="text-brand-600 font-medium hover:underline">docs.shub.ir</a> منتقل شده‌اند.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link to="/dashboard" className="btn bg-brand-600 text-white hover:bg-brand-700 text-[13px] px-4 py-2.5">
            <Home size={14} /> داشبورد
          </Link>
          <Link to="/dashboard/search" className="btn bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 text-[13px] px-4 py-2.5">
            <Search size={14} /> جستجوی سراسری
          </Link>
        </div>
      </div>
      <CreditFooter />
    </div>
  );
}
