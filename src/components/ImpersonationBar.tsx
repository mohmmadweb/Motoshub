// نوار کهربایی «مشاهده به‌عنوان» رسمی (جدا از پرسوناهای دمو در هدر): تا وقتی مدیری با
// مجوز iam.impersonate سامانه را از دید کاربر دیگری می‌بیند، بالای صفحه ثابت می‌ماند.
// همه‌ی اکشن‌های IAM در این حالت رد می‌شوند (readOnly) و شروع/پایان در تاریخچه ثبت می‌شود.
import { useEffect, useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { useTenancy } from "../context/TenancyContext";

export function ImpersonationBar() {
  const { impersonation, actingUser, realActingUser, endImpersonation } = useTenancy();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!impersonation) return;
    const h = window.setInterval(() => setNow(Date.now()), 20000);
    return () => window.clearInterval(h);
  }, [impersonation]);
  if (!impersonation) return null;
  const left = Math.max(0, Math.ceil((impersonation.endsAt - now) / 60000));
  return (
    <>
      {/* جای خالی هم‌ارتفاع تا محتوا زیر نوار ثابت نرود */}
      <div className="h-10" aria-hidden />
      <div role="status" className="fixed top-0 inset-x-0 z-[60] h-10 bg-amber-400 text-amber-950 border-b border-amber-500 shadow-sm" dir="rtl">
        <div className="h-full max-w-7xl mx-auto px-3 flex items-center gap-2 text-[12.5px]">
          <Eye size={15} className="shrink-0" />
          <p className="min-w-0 flex-1 truncate">
            در حال مشاهده به‌عنوان <b>{actingUser.name}</b> — فقط‌خواندنی
            <span className="hidden sm:inline">
              {" "}
              · {left.toLocaleString("fa-IR")} دقیقه باقی‌مانده · توسط {realActingUser.name}
            </span>
          </p>
          <button type="button" onClick={endImpersonation} className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-950 text-amber-50 px-2.5 py-1 text-[12px] font-semibold hover:bg-amber-900">
            <LogOut size={13} /> پایان
          </button>
        </div>
      </div>
    </>
  );
}

export default ImpersonationBar;
