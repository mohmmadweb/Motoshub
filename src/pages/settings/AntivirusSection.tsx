// ---------------------------------------------------------------------------
// «پیشنهادی» — F13 تنظیمات سامانه ← امنیت ← «ضدویروس» (ClamAV برای فایل‌های پیوست)
// ۱.۱۹.۷ اسکن همه‌ی بارگذاری‌ها · ۱.۱۹.۸ عدم ذخیره‌ی فایل آلوده و اطلاع‌رسانی · ۱.۱۹.۹ اسکن دوره‌ای فایل‌های میزبان
// وضعیت سرویس (نسخه، تاریخ پایگاه امضا، «به‌روزرسانی اکنون») · اسکن هنگام بارگذاری · حداکثر حجم ·
// رفتار در خطای سرویس (رد یا قرنطینه) · زمان‌بندی (روزانه/هفتگی و ساعت) · «اسکن اکنون» · گزارش آخرین اسکن ·
// قرنطینه با اسکن دوباره، آزادسازی و حذف. هر تغییر در لاگ ممیزی یکپارچه («تغییر تنظیمات» و رویدادهای ضدویروس).
// در دمو فایلی با نام EICAR (مثلاً eicar.com.txt) آلوده شناخته می‌شود.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Bug, CheckCircle2, ChevronDown, ChevronLeft, Clock, Database, FileWarning, Play, RefreshCw, RotateCcw, ShieldCheck, ShieldAlert, Trash2, Unlock, Server } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import StatCard from "../../components/ui/StatCard";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { users } from "../../data/mock";
import { endpoints } from "../../social/endpoints";
import { av, avSourceLabel, nextRunLabel, useAntivirus, type AvSettings } from "../../social/av";
import { emitSettingsChange } from "../../iam/settingsAudit";
import { ApiChip } from "../social/kit";
import { Callout, SectionHead, fmtN } from "./iam/shared";

const days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const uname = (id: string) => users.find((u) => u.id === id)?.name ?? id;
const dur = (sec: number) => (sec >= 60 ? `${fmtN(Math.floor(sec / 60))} دقیقه و ${fmtN(sec % 60)} ثانیه` : `${fmtN(sec)} ثانیه`);

export default function AntivirusSection() {
  const t = useTenancy();
  const s = useSocial();
  const { notify } = useToast();
  const confirm = useConfirm();
  const st = useAntivirus();
  const canEdit = t.hasPermission("settings.security") && !t.readOnly;
  const me = t.actingUser.id;
  const [showRuns, setShowRuns] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [maxSize, setMaxSize] = useState(String(st.settings.max_size_mb));
  const [time, setTime] = useState(st.settings.schedule.time);

  const change = (patch: Partial<AvSettings>, summary: string) => {
    if (!canEdit) return;
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    (Object.keys(patch) as (keyof AvSettings)[]).forEach((k) => {
      before[k] = st.settings[k];
      after[k] = k === "schedule" ? { ...st.settings.schedule, ...(patch.schedule ?? {}) } : patch[k];
    });
    av.updateSettings(me, patch, summary);
    emitSettingsChange({ area: "ضدویروس ClamAV", summary, before, after });
    notify(`${summary} ذخیره شد.`, "success");
  };
  const quarantined = st.quarantine.filter((q) => q.status === "quarantined");
  const resolved = st.quarantine.filter((q) => q.status !== "quarantined");
  const last = st.runs[0];

  const scanNow = () => {
    const r = s.avScanHosted("manual");
    notify(r.infected ? `اسکن کامل شد: ${fmtN(r.infected)} فایل آلوده قرنطینه شد.` : `اسکن ${fmtN(r.scanned)} فایل کامل شد؛ فایل آلوده‌ای پیدا نشد.`, r.infected ? "warning" : "success");
  };

  return (
    <div className="space-y-5">
      <SectionHead
        icon={<ShieldCheck size={18} />}
        title="ضدویروس"
        description="اسکن ClamAV برای همه‌ی بارگذاری‌ها (پیوست، مدیریت فایل، رسانه، مدیریت دانش) و اسکن دوره‌ای فایل‌های میزبان. فایل آلوده ذخیره نمی‌شود."
        actions={
          <ApiChip
            items={[
              { label: "تنظیمات ضدویروس", ep: endpoints.avSettings() },
              { label: "ذخیره‌ی تنظیمات", ep: endpoints.avSettingsUpdate() },
              { label: "اسکن اکنون", ep: endpoints.avScanNow() },
              { label: "گزارش اسکن‌ها", ep: endpoints.avRuns() },
              { label: "قرنطینه", ep: endpoints.avQuarantine() },
              { label: "اسکن دوباره", ep: endpoints.avRescan("{id}") },
              { label: "آزادسازی", ep: endpoints.avRelease("{id}") },
              { label: "حذف از قرنطینه", ep: endpoints.avPurge("{id}") },
              { label: "به‌روزرسانی پایگاه امضا", ep: endpoints.avUpdateSignatures() },
            ]}
          />
        }
      />

      {/* وضعیت سرویس */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="سرویس" value={st.settings.engine_online ? "در دسترس" : "قطع"} hint={`${st.engine.engine} ${st.engine.version}`} icon={<Server size={16} />} tone={st.settings.engine_online ? "success" : "danger"} />
        <StatCard label="پایگاه امضا" value={st.engine.signature_version.toLocaleString("fa-IR", { useGrouping: false })} hint={`به‌روزرسانی ${st.engine.signature_date.slice(0, 16)}`} icon={<Database size={16} />} tone="brand" />
        <StatCard label="در قرنطینه" value={fmtN(quarantined.length)} hint="نیازمند تصمیم راهبر" icon={<ShieldAlert size={16} />} tone={quarantined.length ? "warning" : "neutral"} />
        <StatCard label="آخرین اسکن دوره‌ای" value={last ? `${fmtN(last.files_scanned)} فایل` : "—"} hint={last ? `${last.started_at.slice(0, 16)} · ${fmtN(last.infected.length)} آلوده` : undefined} icon={<Clock size={16} />} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          icon={<RefreshCw size={13} />}
          disabled={!canEdit}
          onClick={() => {
            av.updateSignatures(me);
            notify("پایگاه امضای ClamAV به‌روز شد (freshclam).", "success");
          }}
        >
          به‌روزرسانی اکنون
        </Button>
        <span className="text-[11px] text-ink-400">{fmtN(st.engine.signatures)} امضا</span>
        {canEdit && (
          <label className="mr-auto flex items-center gap-2 text-[11px] text-ink-500" title="فقط برای نمایش رفتار «خطای سرویس»">
            شبیه‌سازی قطع سرویس
            <Toggle on={!st.settings.engine_online} onChange={() => change({ engine_online: !st.settings.engine_online }, st.settings.engine_online ? "شبیه‌سازی قطع سرویس ClamAV" : "بازگشت سرویس ClamAV")} />
          </label>
        )}
      </div>
      <Callout icon={<Bug size={14} />} tone="neutral">
        برای آزمایش، فایلی با نام <code dir="ltr">eicar.com.txt</code> را در هر بخش بارگذاری کنید: «آلوده — ذخیره نشد» نمایش داده می‌شود، فایل در هیچ فهرستی ذخیره نمی‌شود و کاربر و راهبر اعلان می‌گیرند.
      </Callout>

      {/* اسکن هنگام بارگذاری */}
      <section className="card p-4 space-y-3">
        <p className="text-[13px] font-bold text-ink-900">اسکن هنگام بارگذاری</p>
        <label className="flex items-center justify-between gap-3 text-[12.5px] text-ink-700">
          <span>
            اسکن هر فایل پیش از ذخیره
            <span className="block text-[11px] text-ink-400">پیوست‌ها، مدیریت فایل، رسانه و مدیریت دانش</span>
          </span>
          <Toggle on={st.settings.scan_on_upload} onChange={() => change({ scan_on_upload: !st.settings.scan_on_upload }, st.settings.scan_on_upload ? "خاموش کردن اسکن هنگام بارگذاری" : "روشن کردن اسکن هنگام بارگذاری")} disabled={!canEdit} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[12px] font-semibold text-ink-700 mb-1">حداکثر حجم اسکن (مگابایت)</span>
            <span className="flex gap-2">
              <input className="input-field !w-28" type="number" min={1} max={2048} dir="ltr" value={maxSize} onChange={(e) => setMaxSize(e.target.value)} disabled={!canEdit} />
              {Number(maxSize) !== st.settings.max_size_mb && Number(maxSize) > 0 && (
                <Button size="sm" variant="primary" onClick={() => change({ max_size_mb: Math.round(Number(maxSize)) }, `حداکثر حجم اسکن ${fmtN(Math.round(Number(maxSize)))} مگابایت`)}>
                  ذخیره
                </Button>
              )}
            </span>
            <span className="block text-[11px] text-ink-400 mt-1">فایل بزرگ‌تر «خطای اسکن» تلقی می‌شود.</span>
          </label>
          <label className="block">
            <span className="block text-[12px] font-semibold text-ink-700 mb-1">رفتار در خطای سرویس یا حجم بیش از سقف</span>
            <select className="input-field" value={st.settings.on_error} disabled={!canEdit} onChange={(e) => change({ on_error: e.target.value as AvSettings["on_error"] }, e.target.value === "reject" ? "رفتار خطا: رد بارگذاری" : "رفتار خطا: قرنطینه برای بررسی")}>
              <option value="reject">رد بارگذاری (ایمن‌تر)</option>
              <option value="quarantine">قرنطینه برای بررسی راهبر</option>
            </select>
          </label>
        </div>
      </section>

      {/* اسکن دوره‌ای */}
      <section className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-bold text-ink-900">اسکن دوره‌ای همه‌ی فایل‌های میزبان</p>
          <Badge tone={st.settings.schedule.enabled ? "success" : "neutral"}>{nextRunLabel(st)}</Badge>
          {canEdit && (
            <Button size="sm" variant="primary" icon={<Play size={13} />} className="mr-auto" onClick={scanNow} disabled={!st.settings.engine_online}>
              اسکن اکنون
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-[12.5px] text-ink-700">
            <Toggle on={st.settings.schedule.enabled} onChange={() => change({ schedule: { ...st.settings.schedule, enabled: !st.settings.schedule.enabled } }, st.settings.schedule.enabled ? "خاموش کردن اسکن دوره‌ای" : "روشن کردن اسکن دوره‌ای")} disabled={!canEdit} />
            زمان‌بندی
          </label>
          <select className="input-field !w-auto" value={st.settings.schedule.frequency} disabled={!canEdit} onChange={(e) => change({ schedule: { ...st.settings.schedule, frequency: e.target.value as "daily" | "weekly" } }, e.target.value === "daily" ? "اسکن دوره‌ای روزانه" : "اسکن دوره‌ای هفتگی")} aria-label="تکرار">
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
          </select>
          {st.settings.schedule.frequency === "weekly" && (
            <select className="input-field !w-auto" value={st.settings.schedule.weekday} disabled={!canEdit} onChange={(e) => change({ schedule: { ...st.settings.schedule, weekday: Number(e.target.value) } }, `اسکن هفتگی روز ${days[Number(e.target.value)]}`)} aria-label="روز هفته">
              {days.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <span className="flex items-center gap-1.5">
            <input className="input-field !w-20" dir="ltr" value={time} onChange={(e) => setTime(e.target.value)} disabled={!canEdit} aria-label="ساعت اسکن" />
            {time !== st.settings.schedule.time && /^[۰-۹]{2}:[۰-۹]{2}$/.test(time) && (
              <Button size="sm" onClick={() => change({ schedule: { ...st.settings.schedule, time } }, `ساعت اسکن دوره‌ای ${time}`)}>
                ذخیره
              </Button>
            )}
          </span>
        </div>
        {last && (
          <div className={`rounded-lg border px-3 py-2.5 text-[12px] ${last.infected.length ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/50"}`}>
            <p className="font-medium text-ink-800 flex items-center gap-1.5">
              {last.infected.length ? <FileWarning size={14} className="text-amber-600" /> : <CheckCircle2 size={14} className="text-emerald-600" />}
              آخرین اسکن ({last.trigger === "schedule" ? "زمان‌بندی‌شده" : "دستی"}) — {last.started_at.slice(0, 16)}
            </p>
            <p className="text-ink-600 mt-0.5">
              {fmtN(last.files_scanned)} فایل · {fmtN(last.infected.length)} آلوده · مدت {dur(last.duration_sec)} · پایگاه امضا {last.signature_version.toLocaleString("fa-IR", { useGrouping: false })}
            </p>
            {last.infected.map((x) => (
              <p key={x.file_name} className="text-[11px] text-rose-700" dir="auto">
                {x.file_name} — {x.signature}
              </p>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setShowRuns((x) => !x)} className="text-[11.5px] text-brand-700 flex items-center gap-1">
          {showRuns ? <ChevronDown size={13} /> : <ChevronLeft size={13} />} تاریخچه‌ی اسکن‌ها ({fmtN(st.runs.length)})
        </button>
        {showRuns && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px] min-w-[480px]">
              <thead>
                <tr className="text-ink-400 border-b border-ink-100">
                  <th className="text-right font-medium py-1.5">شروع</th>
                  <th className="text-right font-medium">نوع</th>
                  <th className="text-right font-medium">فایل</th>
                  <th className="text-right font-medium">آلوده</th>
                  <th className="text-right font-medium">مدت</th>
                </tr>
              </thead>
              <tbody>
                {st.runs.slice(0, 15).map((r) => (
                  <tr key={r.id} className="border-b border-ink-50">
                    <td className="py-1.5 text-ink-700">{r.started_at.slice(0, 16)}</td>
                    <td>{r.trigger === "schedule" ? "زمان‌بندی‌شده" : "دستی"}</td>
                    <td>{fmtN(r.files_scanned)}</td>
                    <td className={r.infected.length ? "text-rose-600 font-medium" : ""}>{fmtN(r.infected.length)}</td>
                    <td>{dur(r.duration_sec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* قرنطینه */}
      <section className="card">
        <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
          <ShieldAlert size={15} className="text-rose-600" />
          <p className="text-[13px] font-bold text-ink-900">قرنطینه ({fmtN(quarantined.length)})</p>
        </div>
        {quarantined.length === 0 ? (
          <p className="text-xs text-ink-400 px-4 py-4">فایلی در قرنطینه نیست.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {quarantined.map((q) => (
              <li key={q.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink-800 truncate" dir="auto">
                    {q.file_name} <span className="text-[11px] text-ink-400 font-normal">· {q.size}</span>
                  </p>
                  <p className="text-[11px] text-ink-500 flex flex-wrap gap-x-2">
                    <span className={q.reason === "infected" ? "text-rose-600 font-medium" : "text-amber-700"}>{q.signature ?? "خطای اسکن"}</span>
                    <span>{avSourceLabel[q.source]}</span>
                    <span>بارگذاری: {uname(q.uploaded_by)}</span>
                    <span>{q.detected_at.slice(0, 16)} ({q.detected_by === "upload" ? "هنگام بارگذاری" : q.detected_by === "schedule" ? "اسکن دوره‌ای" : "اسکن دستی"})</span>
                  </p>
                </div>
                {canEdit && (
                  <span className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<RotateCcw size={12} />}
                      onClick={() => {
                        const v = av.rescan(me, q.id);
                        notify(v?.status === "clean" ? "اسکن دوباره: سالم — می‌توانید آزاد کنید." : `اسکن دوباره: ${v?.signature ?? v?.reason ?? "آلوده"}`, v?.status === "clean" ? "success" : "warning");
                      }}
                    >
                      اسکن دوباره
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Unlock size={12} />}
                      onClick={() =>
                        confirm({
                          title: `«${q.file_name}» از قرنطینه آزاد شود؟`,
                          message: q.reason === "infected" ? `این فایل با امضای «${q.signature}» آلوده شناخته شده است. فقط در صورت اطمینان از «مثبت کاذب» آزاد کنید.` : "فایل به درایو مبدأ برمی‌گردد و بارگذاری‌کننده اعلان می‌گیرد.",
                          confirmLabel: "آزادسازی",
                          onConfirm: () => {
                            const r = s.releaseQuarantined(q);
                            notify(r.ok ? "فایل آزاد شد." : r.error, r.ok ? "success" : "warning");
                          },
                        })
                      }
                    >
                      آزادسازی
                    </Button>
                    <button
                      type="button"
                      onClick={() => confirm({ title: `«${q.file_name}» برای همیشه حذف شود؟`, confirmLabel: "حذف دائم", onConfirm: () => (av.resolve(me, q.id, "deleted"), notify("فایل از قرنطینه حذف شد.", "success")) })}
                      className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-ink-50"
                      aria-label="حذف دائم"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {resolved.length > 0 && (
          <div className="px-4 py-2.5 border-t border-ink-100">
            <button type="button" onClick={() => setShowResolved((x) => !x)} className="text-[11.5px] text-ink-500 flex items-center gap-1">
              {showResolved ? <ChevronDown size={13} /> : <ChevronLeft size={13} />} رسیدگی‌شده ({fmtN(resolved.length)})
            </button>
            {showResolved && (
              <ul className="mt-2 space-y-1">
                {resolved.map((q) => (
                  <li key={q.id} className="text-[11px] text-ink-500 flex flex-wrap gap-x-2">
                    <span className="text-ink-700" dir="auto">
                      {q.file_name}
                    </span>
                    <Badge tone={q.status === "released" ? "success" : "neutral"}>{q.status === "released" ? "آزادشده" : "حذف‌شده"}</Badge>
                    <span>
                      {q.resolved_by ? uname(q.resolved_by) : ""} · {q.resolved_at?.slice(0, 16)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
