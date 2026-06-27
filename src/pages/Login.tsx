import { useNavigate } from "react-router-dom";
import { currentTenant } from "../data/mock";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="card w-full max-w-sm p-7">
        <div className="flex flex-col items-center text-center mb-6">
          <span className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl mb-3">
            م
          </span>
          <h1 className="font-bold text-lg">ورود به موتوشاب</h1>
          <p className="text-xs text-ink-400 mt-1">سازمان: {currentTenant.name}</p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/app/dashboard");
          }}
        >
          <div>
            <label className="text-xs font-medium text-ink-600">نام کاربری یا شماره موبایل</label>
            <input className="mt-1 w-full bg-ink-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-300" placeholder="مثلاً 0912xxxxxxx" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">گذرواژه</label>
            <input type="password" className="mt-1 w-full bg-ink-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-300" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-700">
            ورود
          </button>
          <button
            type="button"
            onClick={() => navigate("/app/dashboard")}
            className="w-full bg-white border border-ink-200 rounded-xl py-2.5 text-sm font-medium hover:bg-ink-50"
          >
            ورود با رمز یک‌بارمصرف پیامکی
          </button>
        </form>

        <p className="text-[11px] text-ink-400 text-center mt-5">
          ورود شما از طریق SSO سازمانی نیز در نسخه نهایی پشتیبانی می‌شود.
        </p>
      </div>
    </div>
  );
}
