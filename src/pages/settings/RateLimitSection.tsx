// ---------------------------------------------------------------------------
// «محدودیت درخواست‌ها» (F10 · اقلام ۱.۱۹.۱ و ۱.۱۹.۲) — تنظیمات سامانه ← ورود و امنیت.
// سقف عمومی API هر کاربر = همان «محدودیت نرخ درخواست» پارامترهای زیرساخت (منبع واحد)؛ اینجا
// سقف IP، ظرفیت انفجاری، سقف تولید محتوا به تفکیک نوع و بازه، استثنای نقش‌ها، سقف ویژه‌ی نقش،
// IPهای سفید، شمارنده‌های زنده، کاربران محدودشده (با رفع محدودیت) و پیش‌نمایش پاسخ ۴۲۹.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, Play, Plus, RotateCcw, Save, ShieldCheck, Trash2, Users, Zap } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSettings } from "../../context/SettingsContext";
import { users } from "../../data/mock";
import { diffKeys, emitSettingsChange } from "../../iam/settingsAudit";
import { WINDOW_OPTIONS, defaultRatePolicy, hit, rateKindEndpoints, rateKindLabel, resetUserLimits, saveRatePolicy, usage, useRateLimit, windowLabel, type RateKind, type RateLimitPolicy } from "../../iam/rateLimit";
import { securityEndpoints } from "../../iam/securityEndpoints";
import { THIS_DEVICE_IP } from "../../iam/loginHistory";
import { ApiChip } from "../social/kit";
import { Callout, Field, SectionHead, fmtN } from "./iam/shared";

const KINDS: RateKind[] = ["api", "message", "post", "upload"];

export default function RateLimitSection() {
  const t = useTenancy();
  const { settings, update } = useSettings();
  const st = useRateLimit();
  const { notify } = useToast();
  const canEdit = t.hasPermission("settings.security") && !t.readOnly;
  const [d, setD] = useState<RateLimitPolicy>(st.policy);
  const [apiUser, setApiUser] = useState(settings.rateLimitPerMinute);
  const [ip, setIp] = useState("");
  const [simUser, setSimUser] = useState(t.actingUser.id);
  const [simKind, setSimKind] = useState<RateKind>("message");
  const [last429, setLast429] = useState<{ retry: number; kind: RateKind; max: number; win: number } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const h = window.setInterval(() => tick((x) => x + 1), 2000);
    return () => window.clearInterval(h);
  }, []);
  const dirty = JSON.stringify(d) !== JSON.stringify(st.policy) || apiUser !== settings.rateLimitPerMinute;
  const roles = useMemo(() => t.iam.roles.filter((r) => r.active), [t.iam.roles]);
  const setLimit = (kind: string, patch: Partial<RateLimitPolicy["limits"][number]>) => setD((x) => ({ ...x, limits: x.limits.map((l) => (l.kind === kind ? { ...l, ...patch } : l)) }));

  const save = () => {
    const strip = (p: RateLimitPolicy) => ({ ...p, updatedAt: undefined, updatedBy: undefined });
    const diff = diffKeys(strip(st.policy), strip(d));
    saveRatePolicy(d, t.actingUser.name);
    // منبع واحد: سقف عمومی در پارامترهای زیرساخت (خودش در تاریخچه ثبت می‌شود)
    if (apiUser !== settings.rateLimitPerMinute) update({ rateLimitPerMinute: apiUser });
    if (diff) emitSettingsChange({ area: "محدودیت درخواست‌ها", summary: `تغییر ${Object.keys(diff.after).join("، ")}`, before: diff.before, after: diff.after });
    notify("محدودیت درخواست‌ها ذخیره شد و همین حالا اعمال می‌شود.", "success");
  };

  // شبیه‌ساز: ارسال پشت‌سرهم درخواست تا رسیدن به سقف
  const simulate = (n: number) => {
    const roleIds = t.rolesOf(simUser).filter((b) => b.live).map((b) => b.role.id);
    let blocked = 0;
    let res: ReturnType<typeof hit> = { ok: true };
    for (let i = 0; i < n; i++) {
      const r = hit(simUser, simKind, { roleIds });
      if (!r.ok) {
        blocked++;
        res = r;
      }
    }
    const u = usage(st, simUser, simKind, roleIds);
    if (!res.ok) setLast429({ retry: res.retryAfter, kind: simKind, max: u.max, win: u.window_seconds });
    notify(blocked ? `${fmtN(n - blocked)} درخواست پذیرفته و ${fmtN(blocked)} درخواست با ۴۲۹ رد شد.` : `${fmtN(n)} درخواست پذیرفته شد.`, blocked ? "warning" : "success");
  };

  // کاربران محدودشده: تعداد رخداد به تفکیک کاربر
  const byUser = useMemo(() => {
    const m = new Map<string, { n: number; last: string; kinds: Set<RateKind> }>();
    st.events.forEach((e) => {
      const x = m.get(e.user_id) ?? { n: 0, last: e.at, kinds: new Set<RateKind>() };
      x.n++;
      x.kinds.add(e.kind);
      m.set(e.user_id, x);
    });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [st.events]);
  const uname = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const liveUsers = [...new Set(Object.keys(st.hits).map((k) => k.split(":")[0]))];

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<Gauge size={18} />}
        title="محدودیت درخواست‌ها"
        description="سقف درخواست API و تولید محتوا برای جلوگیری از پر شدن سامانه توسط کاربر ناهنجار یا بات. با عبور از سقف، ارسال تا پایان بازه رد و پیام «X ثانیه دیگر تلاش کنید» نمایش داده می‌شود."
        actions={
          <>
            <ApiChip items={[{ label: "سیاست محدودیت", ep: securityEndpoints.rateLimits() }, { label: "ذخیره‌ی سیاست", ep: securityEndpoints.rateLimitsSave() }, { label: "رخدادهای محدودسازی", ep: securityEndpoints.rateLimitEvents() }, { label: "رفع محدودیت کاربر", ep: securityEndpoints.rateLimitReset("{id}") }]} />
            {st.policy.updatedAt && <span className="text-[11px] text-ink-400">آخرین ذخیره: {st.policy.updatedAt} — {st.policy.updatedBy}</span>}
            <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} disabled={!canEdit} onClick={() => setD(defaultRatePolicy())}>
              پیش‌فرض
            </Button>
            <Button variant="primary" size="sm" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
              ذخیره
            </Button>
          </>
        }
      />

      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
            <Zap size={15} className="text-brand-600" /> سقف عمومی API
            {d.enabled ? <Badge tone="success">فعال</Badge> : <Badge tone="neutral">خاموش</Badge>}
          </p>
          <Toggle on={d.enabled} disabled={!canEdit} onChange={() => setD((x) => ({ ...x, enabled: !x.enabled }))} label="محدودسازی نرخ درخواست" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="هر کاربر (درخواست/دقیقه)" hint="همان «محدودیت نرخ درخواست» در زیرساخت ← تنظیمات کلی">
            <input type="number" min={10} max={10000} className="input-field" value={apiUser} disabled={!canEdit} onChange={(e) => setApiUser(Math.max(10, Number(e.target.value) || 10))} />
          </Field>
          <Field label="هر IP (درخواست/دقیقه)">
            <input type="number" min={10} max={100000} className="input-field" value={d.api_per_minute_ip} disabled={!canEdit} onChange={(e) => setD((x) => ({ ...x, api_per_minute_ip: Math.max(10, Number(e.target.value) || 10) }))} />
          </Field>
          <Field label="ظرفیت انفجاری (٪)" hint="درخواست اضافه‌ی مجاز در جهش کوتاه">
            <input type="number" min={0} max={200} className="input-field" value={d.burst} disabled={!canEdit} onChange={(e) => setD((x) => ({ ...x, burst: Math.max(0, Math.min(200, Number(e.target.value) || 0)) }))} />
          </Field>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
          <Activity size={15} className="text-brand-600" /> سقف تولید محتوا به تفکیک گروه endpoint
        </p>
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {d.limits.map((l) => (
            <li key={l.kind} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_110px_130px] gap-2 items-center">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink-800">{rateKindLabel[l.kind]}</p>
                <p className="text-[10.5px] text-ink-400 truncate" dir="ltr">
                  {rateKindEndpoints[l.kind]}
                </p>
              </div>
              <input type="number" min={1} max={100000} className="input-field" aria-label={`سقف ${rateKindLabel[l.kind]}`} value={l.max} disabled={!canEdit} onChange={(e) => setLimit(l.kind, { max: Math.max(1, Number(e.target.value) || 1) })} />
              <select className="input-field" aria-label={`بازه‌ی ${rateKindLabel[l.kind]}`} value={l.window_seconds} disabled={!canEdit} onChange={(e) => setLimit(l.kind, { window_seconds: Number(e.target.value) })}>
                {WINDOW_OPTIONS.map((w) => (
                  <option key={w.s} value={w.s}>
                    در هر {w.label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <p className="text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-brand-600" /> استثناها و سقف ویژه‌ی نقش
          </p>
          <div className="rounded-lg border border-ink-200 max-h-56 overflow-y-auto divide-y divide-ink-100">
            {roles.map((r) => {
              const ex = d.exempt_roles.includes(r.id);
              const ov = d.role_overrides.find((o) => o.role_id === r.id);
              return (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 text-[12px] flex-wrap">
                  <span className="flex-1 min-w-[120px] truncate text-ink-800">{r.name}</span>
                  <label className="flex items-center gap-1 text-ink-600">
                    <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={ex} disabled={!canEdit} onChange={() => setD((x) => ({ ...x, exempt_roles: ex ? x.exempt_roles.filter((y) => y !== r.id) : [...x.exempt_roles, r.id] }))} /> معاف
                  </label>
                  {!ex && (
                    <input
                      type="number"
                      min={0}
                      placeholder="سقف ویژه"
                      aria-label={`سقف ویژه‌ی API برای ${r.name}`}
                      className="input-field !w-24 !py-1 text-[12px]"
                      value={ov?.api_per_minute ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setD((x) => ({ ...x, role_overrides: [...x.role_overrides.filter((o) => o.role_id !== r.id), ...(v > 0 ? [{ role_id: r.id, api_per_minute: v }] : [])] }));
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-400 leading-5">نقش‌های معاف (مثلاً راهبر یا بات‌ها) شمارش نمی‌شوند؛ «سقف ویژه» جای سقف عمومی API را برای آن نقش می‌گیرد.</p>
          <Field label="IPهای سفید (بدون محدودیت)">
            <div className="flex gap-2">
              <input className="input-field" dir="ltr" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="10.20.0.0/16" disabled={!canEdit} />
              <Button
                size="sm"
                icon={<Plus size={13} />}
                disabled={!canEdit}
                onClick={() => {
                  const v = ip.trim();
                  if (!/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(v)) return notify("نشانی IP یا بازه‌ی CIDR معتبر وارد کنید.", "warning");
                  if (!d.whitelist_ips.includes(v)) setD((x) => ({ ...x, whitelist_ips: [...x.whitelist_ips, v] }));
                  setIp("");
                }}
              >
                افزودن
              </Button>
            </div>
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {d.whitelist_ips.map((w) => (
              <span key={w} className="inline-flex items-center gap-1 rounded-full border border-ink-200 pl-1 pr-2 py-0.5 text-[11px] text-ink-700" dir="ltr">
                {w}
                <button type="button" disabled={!canEdit} onClick={() => setD((x) => ({ ...x, whitelist_ips: x.whitelist_ips.filter((y) => y !== w) }))} aria-label={`حذف ${w}`} className="text-ink-400 hover:text-rose-600">
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
            <Play size={15} className="text-brand-600" /> آزمون زنده
          </p>
          <div className="grid grid-cols-2 gap-2">
            <select className="input-field" value={simUser} onChange={(e) => setSimUser(e.target.value)} aria-label="کاربر">
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <select className="input-field" value={simKind} onChange={(e) => setSimKind(e.target.value as RateKind)} aria-label="نوع درخواست">
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {rateKindLabel[k]}
                </option>
              ))}
            </select>
          </div>
          {(() => {
            const roleIds = t.rolesOf(simUser).filter((b) => b.live).map((b) => b.role.id);
            const u = usage(st, simUser, simKind, roleIds);
            const pct = Number.isFinite(u.max) ? Math.min(100, (u.used / u.max) * 100) : 0;
            return (
              <div>
                <div className="flex items-center justify-between text-[11.5px] text-ink-600 mb-1">
                  <span>
                    مصرف: <b className="text-ink-900">{fmtN(u.used)}</b> از {Number.isFinite(u.max) ? fmtN(u.max) : "∞"} در هر {windowLabel(u.window_seconds)}
                  </span>
                  {u.resetIn > 0 && <span className="text-ink-400">آزادسازی تا {fmtN(Math.ceil(u.resetIn / 1000))} ثانیه</span>}
                </div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => simulate(1)}>
              ۱ درخواست
            </Button>
            <Button size="sm" onClick={() => simulate(10)}>
              ۱۰ درخواست پشت‌سرهم
            </Button>
            <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => (resetUserLimits(simUser), setLast429(null), notify("شمارنده‌های این کاربر صفر شد.", "info"))}>
              صفر کردن
            </Button>
          </div>
          <div>
            <p className="text-[11.5px] text-ink-500 mb-1">پیش‌نمایش پاسخ درگاه API هنگام عبور از سقف:</p>
            <pre dir="ltr" className="text-[10.5px] leading-5 rounded-lg bg-ink-900 text-ink-100 p-2.5 overflow-x-auto whitespace-pre">{`HTTP/1.1 429 Too Many Requests
Retry-After: ${last429?.retry ?? 42}
X-RateLimit-Limit: ${last429?.max ?? d.limits[0].max}
X-RateLimit-Remaining: 0
Content-Type: application/json

{"error": "rate_limited", "kind": "${last429?.kind ?? "message"}",
 "detail": "تعداد درخواست‌های شما از حد مجاز بیشتر است؛ ${(last429?.retry ?? 42).toLocaleString("fa-IR")} ثانیه دیگر تلاش کنید."}`}</pre>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-[13px] font-bold text-ink-800 flex items-center gap-1.5">
          <Users size={15} className="text-rose-600" /> کاربران محدودشده ({fmtN(byUser.length)})
        </p>
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {byUser.map(([uid, x]) => {
            const active = liveUsers.includes(uid) && KINDS.some((k) => {
              const u = usage(st, uid, k);
              return Number.isFinite(u.max) && u.used >= u.max;
            });
            return (
              <li key={uid} className="px-4 py-2.5 flex items-center gap-2 flex-wrap text-[12px]">
                <span className="flex-1 min-w-[140px] text-ink-800 truncate">{uname(uid)}</span>
                <span className="text-ink-500">{[...x.kinds].map((k) => rateKindLabel[k]).join("، ")}</span>
                <Badge tone={x.n >= 3 ? "danger" : "warning"}>{fmtN(x.n)} بار</Badge>
                <span className="text-[11px] text-ink-400">آخرین: {x.last}</span>
                {active && <Badge tone="danger">اکنون محدود</Badge>}
                <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => (resetUserLimits(uid), notify(`محدودیت «${uname(uid)}» رفع شد.`, "success"))}>
                  رفع محدودیت
                </Button>
              </li>
            );
          })}
          {byUser.length === 0 && <li className="px-4 py-3 text-xs text-ink-400">رخداد محدودسازی ثبت نشده است.</li>}
        </ul>
        <div className="px-4 py-2.5 border-t border-ink-100">
          <Callout tone="neutral">هر رخداد محدودسازی در «لاگ ممیزی» ثبت می‌شود؛ عبور مکرر از سقف طبق «مسدودسازی خودکار» به تعلیق ارسال می‌انجامد. IP همین مرورگر در دمو <span dir="ltr">{THIS_DEVICE_IP}</span> است.</Callout>
        </div>
      </div>
    </div>
  );
}
