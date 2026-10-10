// ---------------------------------------------------------------------------
// تب «امنیت و نشست‌ها» پروفایل (F07 · ۱.۱۶.۱):
//  • آخرین ورودهای موفق (۲۰ مورد): زمان شمسی، IP، مکان تقریبی، مرورگر و سیستم‌عامل، روش ورود، وضعیت نشست
//  • برجسته‌سازی ورود از دستگاه/کشور تازه + «این من نبودم» → بستن همه‌ی نشست‌های دیگر، تغییر گذرواژه، ممیزی
//  • نشست‌های فعال (همان رکوردها؛ پایان نشست واقعی)
//  • نمای مدیر: همین فهرست + وضعیت مسدودی در «جزئیات عضو» تنظیمات (UserSecurityPanel)
// ---------------------------------------------------------------------------
import { useState } from "react";
import { AlertTriangle, Ban, ChevronDown, History, KeyRound, Laptop, LogOut, MapPin, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useInbox } from "../../context/InboxContext";
import { users } from "../../data/mock";
import { LOGIN_LIST_LIMIT, activeSessionsOf, endSession, loginMethodLabel, loginsOf, noveltyOf, reportNotMe, useLoginHistory, type LoginEvent } from "../../iam/loginHistory";
import { useLoginPolicy } from "../../iam/loginPolicy";
import { activeBlockOf, blockKindLabel, blockMessage, blocksStore } from "../../iam/blocks";
import { BlockUserButton } from "../../iam/BlockUserModal";
import { emitSecurityAudit } from "../../iam/securityAudit";
import { securityEndpoints } from "../../iam/securityEndpoints";
import { useLocalStore } from "../../iam/store";
import { ApiChip } from "../social/kit";

const DeviceIcon = ({ e }: { e: LoginEvent }) => (e.device === "mobile" ? <Smartphone size={15} /> : <Laptop size={15} />);

/** یک ردیف ورود */
function LoginRow({ e, current, flagged, onNotMe }: { e: LoginEvent; current: boolean; flagged: string | null; onNotMe?: () => void }) {
  return (
    <li className={`flex items-start gap-3 px-3 py-2.5 ${flagged ? "bg-amber-50/60" : current ? "bg-emerald-50/50" : ""}`}>
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${flagged ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"}`}>
        <DeviceIcon e={e} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-ink-800 flex items-center gap-1.5 flex-wrap">
          <span dir="ltr">{e.user_agent}</span>
          <span className="text-[11px] font-normal text-ink-400">· {loginMethodLabel[e.method]}</span>
          {current && <Badge tone="success">نشست فعلی</Badge>}
          {flagged && (
            <Badge tone="warning" icon={<AlertTriangle size={10} />}>
              {flagged}
            </Badge>
          )}
        </p>
        <p className="text-[11.5px] text-ink-500 flex items-center gap-1 mt-0.5 flex-wrap">
          <span>{e.at}</span>·<MapPin size={11} /> {e.geo} ·{" "}
          <span dir="ltr" className="font-mono text-[11px]">
            {e.ip}
          </span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge tone={e.session_status === "active" ? "brand" : "neutral"}>{e.session_status === "active" ? "فعال" : "پایان‌یافته"}</Badge>
        {onNotMe && (
          <button type="button" onClick={onNotMe} className="text-[11px] text-rose-600 hover:underline">
            این من نبودم
          </button>
        )}
      </div>
    </li>
  );
}

/** «آخرین ورودهای موفق» — userId خودم یا (برای مدیر) هر کاربر */
export function LoginHistoryCard({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const st = useLoginHistory();
  const t = useTenancy();
  const isMe = userId === t.actingUser.id && !t.readOnly;
  const [all, setAll] = useState(false);
  const [notMe, setNotMe] = useState<LoginEvent | "any" | null>(null);
  const list = loginsOf(st, userId, LOGIN_LIST_LIMIT);
  const current = st.current[userId];
  const flagOf = (e: LoginEvent) => {
    if (e.session_id === current) return null;
    const n = noveltyOf(st, e);
    return n.newCountry ? "کشور تازه" : n.newDevice ? "دستگاه تازه" : null;
  };
  const shown = all ? list : list.slice(0, compact ? 4 : 5);
  const flagged = list.filter((e) => flagOf(e));
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <History size={15} className="text-brand-600" /> آخرین ورودهای موفق
          </h3>
          <p className="text-[11.5px] text-ink-500 mt-0.5">
            {list.length.toLocaleString("fa-IR")} ورود اخیر · نگهداری {st.retention_days.toLocaleString("fa-IR")} روز
            {flagged.length > 0 && <span className="text-amber-700"> · {flagged.length.toLocaleString("fa-IR")} ورود از دستگاه یا کشور تازه</span>}
          </p>
        </div>
        <span className="flex items-center gap-1.5">
          {!compact && <ApiChip items={[{ label: "ورودهای من", ep: securityEndpoints.myLogins() }, { label: "ورودهای کاربر (مدیر)", ep: securityEndpoints.userLogins("{id}") }, { label: "این من نبودم", ep: securityEndpoints.notMe() }, { label: "پایان نشست", ep: securityEndpoints.sessionEnd("{id}") }]} />}
          {isMe && (
            <Button size="sm" variant="ghost" className="text-rose-600" icon={<ShieldAlert size={13} />} onClick={() => setNotMe("any")}>
              این من نبودم
            </Button>
          )}
        </span>
      </div>
      <ul className="divide-y divide-ink-100 border-t border-ink-100">
        {shown.map((e) => (
          <LoginRow key={e.id} e={e} current={e.session_id === current} flagged={flagOf(e)} onNotMe={isMe && flagOf(e) ? () => setNotMe(e) : undefined} />
        ))}
        {list.length === 0 && <li className="px-4 py-3 text-xs text-ink-400">ورودی در بازه‌ی نگهداری ثبت نشده است.</li>}
      </ul>
      {list.length > shown.length || all ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="w-full border-t border-ink-100 py-2 text-[12px] text-brand-700 hover:bg-ink-50 flex items-center justify-center gap-1">
          {all ? "نمایش کمتر" : `نمایش همه (${list.length.toLocaleString("fa-IR")})`} <ChevronDown size={13} className={all ? "rotate-180" : ""} />
        </button>
      ) : null}
      {notMe && <NotMeModal userId={userId} suspect={notMe === "any" ? undefined : notMe} onClose={() => setNotMe(null)} />}
    </div>
  );
}

/** «این من نبودم»: بستن نشست‌های دیگر → تغییر گذرواژه */
function NotMeModal({ userId, suspect, onClose }: { userId: string; suspect?: LoginEvent; onClose: () => void }) {
  const st = useLoginHistory();
  const policy = useLoginPolicy();
  const inbox = useInbox();
  const { notify } = useToast();
  const [step, setStep] = useState<"confirm" | "password">("confirm");
  const [closed, setClosed] = useState(0);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const others = activeSessionsOf(st, userId).filter((e) => e.session_id !== st.current[userId]).length;
  const name = users.find((u) => u.id === userId)?.name ?? "";
  const rules = policy.password;
  const pwError = (v: string) =>
    v.length < rules.minLength ? `دست‌کم ${rules.minLength.toLocaleString("fa-IR")} نویسه` : rules.requireDigits && !/\d|[۰-۹]/.test(v) ? "دست‌کم یک رقم" : rules.requireMixedCase && !(/[a-z]/.test(v) && /[A-Z]/.test(v)) ? "حروف کوچک و بزرگ لاتین" : rules.requireSymbols && !/[^\w\s]/.test(v) ? "دست‌کم یک نماد" : "";
  return (
    <Modal open onClose={onClose} title={step === "confirm" ? "این ورود کار شما نبود؟" : "تغییر گذرواژه"} width="max-w-md">
      {step === "confirm" ? (
        <div className="space-y-3">
          {suspect && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 leading-6">
              {suspect.at} · <span dir="ltr">{suspect.user_agent}</span> · {suspect.geo} · <span dir="ltr">{suspect.ip}</span>
            </div>
          )}
          <p className="text-[12.5px] text-ink-700 leading-6">
            همه‌ی نشست‌های دیگرِ حساب ({others.toLocaleString("fa-IR")} نشست) فوراً بسته می‌شوند، رویداد در لاگ ممیزی ثبت می‌شود و سپس گذرواژه را عوض می‌کنید. نشست همین مرورگر باز می‌ماند.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose}>
              انصراف
            </Button>
            <Button
              variant="danger"
              icon={<LogOut size={14} />}
              onClick={() => {
                const n = reportNotMe(userId, suspect?.id);
                setClosed(n);
                inbox.send([name], "security", `گزارش «این من نبودم» ثبت شد؛ ${n.toLocaleString("fa-IR")} نشست دیگر بسته شد. گذرواژه را عوض کنید.`, `/dashboard/profile/${userId}?tab=security`, { urgent: true, system: true });
                setStep("password");
              }}
            >
              بستن نشست‌های دیگر
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const pe = pwError(pw);
            if (pe) return setErr(`گذرواژه‌ی تازه: ${pe}.`);
            if (pw !== pw2) return setErr("تکرار گذرواژه یکسان نیست.");
            emitSecurityAudit({ event: "security.password_changed", affectedUserId: userId, actorId: userId, summary: `گذرواژه‌ی «${name}» پس از گزارش «این من نبودم» تغییر کرد.` });
            notify("گذرواژه تغییر کرد؛ حساب شما امن است.", "success");
            onClose();
          }}
        >
          <p className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <ShieldCheck size={14} /> {closed.toLocaleString("fa-IR")} نشست دیگر بسته شد.
          </p>
          <input type="password" className="input-field" value={pw} onChange={(e) => (setPw(e.target.value), setErr(""))} placeholder="گذرواژه‌ی تازه" aria-label="گذرواژه‌ی تازه" autoComplete="new-password" autoFocus />
          <input type="password" className="input-field" value={pw2} onChange={(e) => (setPw2(e.target.value), setErr(""))} placeholder="تکرار گذرواژه‌ی تازه" aria-label="تکرار گذرواژه" autoComplete="new-password" />
          <p className="text-[11px] text-ink-400 flex items-center gap-1">
            <KeyRound size={11} /> طبق سیاست گذرواژه: دست‌کم {rules.minLength.toLocaleString("fa-IR")} نویسه{rules.requireDigits ? "، رقم" : ""}
            {rules.requireMixedCase ? "، حروف کوچک و بزرگ" : ""}
            {rules.requireSymbols ? "، نماد" : ""}
          </p>
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              بعداً
            </Button>
            <Button type="submit" variant="primary">
              تغییر گذرواژه
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** نشست‌های فعال — از همان رکوردهای ورود؛ «پایان نشست» واقعاً نشست را می‌بندد */
export function ActiveSessionsCard({ userId }: { userId: string }) {
  const st = useLoginHistory();
  const t = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const list = activeSessionsOf(st, userId);
  const current = st.current[userId];
  const canEnd = !t.readOnly && (userId === t.actingUser.id || t.hasPermission("users.edit"));
  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
        <ShieldCheck size={15} className="text-brand-600" /> نشست‌های فعال ({list.length.toLocaleString("fa-IR")})
      </h3>
      <div className="space-y-3">
        {list.map((x) => (
          <div key={x.id} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
              <DeviceIcon e={x} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-800 flex items-center gap-1.5 flex-wrap">
                <span dir="ltr">{x.user_agent}</span> {x.session_id === current && <Badge tone="success">نشست فعلی</Badge>}
              </p>
              <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5 flex-wrap">
                <MapPin size={11} /> {x.geo} · <span dir="ltr">{x.ip}</span> · از {x.at}
              </p>
            </div>
            {x.session_id !== current && canEnd && (
              <Button
                variant="secondary"
                size="sm"
                icon={<LogOut size={12} />}
                onClick={() =>
                  confirm({
                    title: "این نشست پایان یابد؟",
                    message: `${x.user_agent} — ${x.geo}`,
                    confirmLabel: "پایان نشست",
                    onConfirm: () => {
                      endSession(x.session_id, t.realActingUser.id);
                      notify("نشست پایان یافت.", "success");
                    },
                  })
                }
              >
                پایان نشست
              </Button>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-ink-400">نشست فعالی نیست.</p>}
      </div>
    </div>
  );
}

/** نمای مدیر در «جزئیات عضو»: وضعیت مسدودی + اقدام دستی + آخرین ورودها */
export function UserSecurityPanel({ userId }: { userId: string }) {
  useLocalStore(blocksStore);
  const t = useTenancy();
  const b = activeBlockOf(userId);
  if (!t.hasPermission("users.block") && !t.hasPermission("iam.members.manage")) return null;
  return (
    <div className="space-y-3 mb-5">
      <div className={`rounded-lg border px-3 py-2.5 flex items-center gap-2 flex-wrap ${b ? "border-rose-200 bg-rose-50" : "border-ink-100"}`}>
        <Ban size={14} className={b ? "text-rose-600 shrink-0" : "text-ink-400 shrink-0"} />
        <span className={`flex-1 min-w-0 text-[12px] leading-6 ${b ? "text-rose-800" : "text-ink-500"}`}>{b ? `${blockKindLabel[b.kind]} — ${blockMessage(b).split(". ").pop()}${b.until ? ` · تا ${b.until}` : ""}` : "مسدودی فعالی ندارد."}</span>
        <BlockUserButton userId={userId} />
      </div>
      <LoginHistoryCard userId={userId} compact />
    </div>
  );
}
