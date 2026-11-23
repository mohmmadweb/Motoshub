import { Link } from "react-router-dom";
import { Compass, Home, Search } from "lucide-react";
import CreditFooter from "../components/CreditFooter";
import { EmptyLeaves } from "../components/ui/brand-leaf";

// صفحه ۴۰۴ اختصاصی — برای مسیرهای ناموجود یا جابه‌جاشده؛ embedded = داخل پوسته‌ی برنامه
export default function NotFound404({ embedded = false }: { embedded?: boolean }) {
  const card = (
    <div className="card max-w-md w-full p-8 text-center">
      <span className="relative mx-auto w-14 h-14 rounded-[14px] bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
        <EmptyLeaves />
        <Compass size={28} className="relative" />
      </span>
      <p className="text-4xl font-black text-ink-900 mb-1">۴۰۴</p>
      <h1 className="text-[18px] font-bold text-ink-900 mb-2">این صفحه پیدا نشد</h1>
      <p className="text-[14px] text-ink-500 leading-7 mb-6">
        آدرس واردشده وجود ندارد یا جابه‌جا شده است. اگر دنبال «برنامه‌ی تحویل» یا اسناد فنی هستید، به{" "}
        <a href="https://docs.shub.ir" className="text-link font-medium hover:underline">
          docs.shub.ir
        </a>{" "}
        منتقل شده‌اند.
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Link to="/dashboard" className="btn btn-primary">
          <Home size={18} /> میزکار من
        </Link>
        <Link to="/globalsearch" className="btn btn-outline">
          <Search size={18} /> جستجوی سراسری
        </Link>
      </div>
    </div>
  );
  if (embedded) return <div className="min-h-[60vh] flex items-center justify-center">{card}</div>;
  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-4">
      {card}
      <CreditFooter />
    </div>
  );
}
