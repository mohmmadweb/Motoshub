import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { systemIdentity } from "../data/tenancy";
import { demoPersonas } from "../data/mock";
import { useTenancy } from "../context/TenancyContext";
import Button from "../components/ui/Button";

// ورود ساده: فقط نام کاربری و گذرواژه.
// جابه‌جایی بین کاربران/نقش‌های نمایشی بعد از ورود، از «مشاهده به‌عنوان» در هدر انجام می‌شود.
export default function Login() {
  const navigate = useNavigate();
  const { setActingUser } = useTenancy();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ u?: string; p?: string }>({});

  const submit = () => {
    const errs = {
      u: username.trim() ? undefined : "نام کاربری الزامی است.",
      p: password.trim() ? undefined : "گذرواژه الزامی است.",
    };
    setErrors(errs);
    if (errs.u || errs.p) return;
    setActingUser(demoPersonas[0].id);
    navigate("/dashboard");
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <span className="bg-white rounded-xl px-3 py-2 mb-4 border border-ink-100">
            <img src="/bonyad-logo.png" alt={systemIdentity.name} className="h-9 w-auto" />
          </span>
          <h1 className="font-bold text-base text-ink-900">ورود به سامانه</h1>
          <p className="text-xs text-ink-500 mt-1">{systemIdentity.name}</p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, u: undefined })); }}
              className={`input-field ${errors.u ? "input-error" : ""}`}
              placeholder="نام کاربری"
              aria-label="نام کاربری"
              autoComplete="username"
              autoFocus
            />
            {errors.u && <p className="field-error">{errors.u}</p>}
          </div>
          <div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, p: undefined })); }}
                className={`input-field pl-10 ${errors.p ? "input-error" : ""}`}
                placeholder="گذرواژه"
                aria-label="گذرواژه"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "پنهان کردن گذرواژه" : "نمایش گذرواژه"}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-ink-400 hover:text-ink-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.p && <p className="field-error">{errors.p}</p>}
          </div>

          <Button type="submit" variant="primary" className="w-full justify-center !mt-5">
            ورود
          </Button>
        </form>
      </div>
    </div>
  );
}
