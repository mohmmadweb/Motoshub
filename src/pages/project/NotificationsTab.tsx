import { useMemo, useState } from "react";
import { Bell, Zap, Send, RotateCcw, FastForward, Mail, Smartphone, MessageSquareText, MonitorSmartphone, CheckCheck } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { EVENT_CATALOG, categoryLabel, channelLabel, eventByCode, recipientLabel, type EventCategory, type EventCode } from "../../pm/events";
import { fa } from "../../pm/jalali";
import type { NotifChannel, NotifPriority, NotifRule, RecipientRole } from "../../pm/types";
import { SectionTitle, useProjectPage, type TabId } from "./shared";

type View = "rules" | "outbox" | "automation";
const channelIcon: Record<NotifChannel, typeof Mail> = { inapp: MonitorSmartphone, email: Mail, sms: MessageSquareText, push: Smartphone };
const allChannels: NotifChannel[] = ["inapp", "email", "sms", "push"];
const allPriorities: NotifPriority[] = ["کم", "عادی", "مهم", "فوری"];
const prTone = { کم: "neutral", عادی: "neutral", مهم: "warning", فوری: "danger" } as const;

export default function NotificationsTab() {
  const { p, pid, canEdit, refDate, goTab } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [view, setView] = useState<View>("rules");
  const [cat, setCat] = useState<EventCategory | "">("");
  const [onlyNotifying, setOnlyNotifying] = useState(true);
  const [who, setWho] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const outbox = useMemo(() => pm.store.notifications.filter((n) => n.projectId === pid && (!who || n.recipient === who)), [pm.store.notifications, pid, who]);
  const recipients = [...new Set(pm.store.notifications.filter((n) => n.projectId === pid).map((n) => n.recipient))];

  const ruleOf = (code: string): NotifRule | null => p.notifRules[code as EventCode] ?? eventByCode[code]?.notify ?? null;
  const setRule = (code: string, rule: NotifRule) => pm.setNotifRule(pid, code as EventCode, rule);

  const events = EVENT_CATALOG.filter((e) => (!cat || e.category === cat) && (!onlyNotifying || ruleOf(e.code)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden">
          {(
            [
              ["rules", "قواعد اعلان", Bell],
              ["outbox", `صندوق ارسال (${fa(pm.store.notifications.filter((n) => n.projectId === pid).length)})`, Send],
              ["automation", "خودکارسازی", Zap],
            ] as const
          ).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id)} className={`px-3 py-1.5 text-xs flex items-center gap-1 ${view === id ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <div className="mr-auto flex items-center gap-2 text-xs bg-white border border-ink-200 rounded-lg px-3 py-1.5">
          <span className="text-ink-500">
            امروزِ دمو: <b className="text-ink-900">{refDate}</b>
          </span>
          <Button
            size="sm"
            variant="ghost"
            icon={<FastForward size={13} />}
            onClick={() => {
              pm.advanceDays(1);
              notify("یک روز جلو رفتیم — زمان‌بند اجرا شد (سررسید فردا، عقب‌افتادگی، یادآوری جلسه، مایل‌ستون در خطر).", "info");
            }}
          >
            یک روز جلو
          </Button>
        </div>
      </div>

      {view === "rules" && (
        <>
          <div className="card p-4 text-xs text-ink-600 leading-6">
            <p>
              برای هر رویداد مشخص کنید <b>چه کسی</b> (بر اساس نقشش نسبت به آن رویداد)، <b>از چه کانالی</b> و با <b>چه اولویتی</b> مطلع شود. پیش‌فرض‌ها از کاتالوگ رویدادها می‌آیند و برای هر پروژه قابل بازنویسی‌اند.
              قواعد عمومی: انجام‌دهنده برای کار خودش اعلان نمی‌گیرد؛ گیرنده‌ی تکراری ادغام می‌شود؛ رویدادهای «کم» فقط درون‌برنامه و در خلاصه‌ی روزانه؛ «فوری» از پیامک هم استفاده می‌کند.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={cat} onChange={(e) => setCat(e.target.value as EventCategory)} className="input-field !py-1.5 !text-xs !w-auto">
              <option value="">همه‌ی دسته‌ها</option>
              {(Object.keys(categoryLabel) as EventCategory[]).map((c) => (
                <option key={c} value={c}>
                  {categoryLabel[c]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-ink-600">
              <input type="checkbox" checked={onlyNotifying} onChange={(e) => setOnlyNotifying(e.target.checked)} className="accent-[var(--color-brand-600)]" /> فقط رویدادهایی که اعلان دارند
            </label>
            <span className="text-xs text-ink-400">{fa(events.length)} رویداد</span>
          </div>
          <div className="card divide-y divide-ink-100">
            {events.map((e) => {
              const rule = ruleOf(e.code);
              const custom = !!p.notifRules[e.code as EventCode];
              const base: NotifRule = rule ?? { enabled: false, recipients: [], channels: ["inapp"], priority: "عادی" };
              return (
                <div key={e.code} className={`p-3 grid grid-cols-1 lg:grid-cols-[260px_1fr_auto] gap-3 ${rule?.enabled ? "" : "opacity-70"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      {canEdit && <Toggle on={!!rule?.enabled} label={`اعلان ${e.label}`} onChange={() => setRule(e.code, { ...base, enabled: !rule?.enabled, recipients: base.recipients.length ? base.recipients : ["manager"] })} />}
                      <p className="text-xs font-bold text-ink-900">{e.label}</p>
                    </div>
                    <p dir="ltr" className="font-mono text-[10.5px] text-ink-400 text-left mt-0.5">
                      {e.code}
                    </p>
                    <p className="text-[10.5px] text-ink-400 mt-0.5">
                      {categoryLabel[e.category]} · {e.trigger === "system" ? "خودکار" : "اقدام کاربر"}
                      {custom && <span className="text-amber-700"> · سفارشی این پروژه</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10.5px] text-ink-400 mb-1">گیرندگان</p>
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(recipientLabel) as RecipientRole[])
                        .filter((r) => base.recipients.includes(r) || (canEdit && editing === e.code))
                        .map((r) => {
                          const on = base.recipients.includes(r);
                          return (
                            <button
                              key={r}
                              disabled={!canEdit || !rule?.enabled}
                              onClick={() => setRule(e.code, { ...base, recipients: on ? base.recipients.filter((x) => x !== r) : [...base.recipients, r] })}
                              className={`text-[10.5px] px-1.5 py-0.5 rounded border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-dashed border-ink-300 text-ink-400 hover:text-ink-700"}`}
                            >
                              {recipientLabel[r]}
                            </button>
                          );
                        })}
                      {canEdit && rule?.enabled && (
                        <button onClick={() => setEditing(editing === e.code ? null : e.code)} className="text-[10.5px] px-1.5 py-0.5 text-brand-700 hover:underline">
                          {editing === e.code ? "بستن" : "+ گیرنده"}
                        </button>
                      )}
                      {!base.recipients.length && <span className="text-[11px] text-ink-400">فقط ثبت در تاریخچه</span>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <div className="flex gap-1">
                      {allChannels.map((c) => {
                        const Icon = channelIcon[c];
                        const on = base.channels.includes(c);
                        return (
                          <button key={c} disabled={!canEdit || !rule?.enabled} onClick={() => setRule(e.code, { ...base, channels: on ? base.channels.filter((x) => x !== c) : [...base.channels, c] })} title={channelLabel[c]} aria-label={channelLabel[c]} className={`w-7 h-7 rounded-md border flex items-center justify-center ${on ? "bg-navy-900 border-navy-900 text-white" : "border-ink-200 text-ink-300"}`}>
                            <Icon size={13} />
                          </button>
                        );
                      })}
                    </div>
                    <select disabled={!canEdit || !rule?.enabled} value={base.priority} onChange={(ev) => setRule(e.code, { ...base, priority: ev.target.value as NotifPriority })} className="input-field !py-1 !text-[11px] !w-auto">
                      {allPriorities.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                    {custom && canEdit && (
                      <button onClick={() => pm.setNotifRule(pid, e.code as EventCode, null)} className="p-1 text-ink-400 hover:text-brand-600" title="بازگشت به پیش‌فرض" aria-label="بازگشت به پیش‌فرض">
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "outbox" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={who} onChange={(e) => setWho(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
              <option value="">همه‌ی گیرندگان</option>
              {recipients.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <span className="text-xs text-ink-400">{fa(outbox.length)} اعلان</span>
            <Button size="sm" variant="ghost" icon={<CheckCheck size={13} />} className="mr-auto" onClick={() => pm.markAllRead(who || undefined, pid)}>
              خوانده‌شده کن
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {recipients.slice(0, 12).map((r) => {
              const n = pm.store.notifications.filter((x) => x.projectId === pid && x.recipient === r);
              return (
                <button key={r} onClick={() => setWho(who === r ? "" : r)} className={`card p-2.5 text-right ${who === r ? "ring-2 ring-brand-300" : ""}`}>
                  <p className="text-xs font-medium text-ink-800 truncate">{r}</p>
                  <p className="text-[11px] text-ink-400">
                    {fa(n.length)} اعلان · {fa(n.filter((x) => !x.read).length)} نخوانده
                  </p>
                </button>
              );
            })}
          </div>
          <div className="card divide-y divide-ink-100">
            {outbox.map((n) => (
              <div key={n.id} className={`p-3 flex items-start gap-3 ${n.read ? "" : "bg-brand-50/40"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-800 leading-6">{n.text}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-ink-400">
                    <span className="text-ink-700 font-medium">به: {n.recipient}</span>
                    <span>({n.reason})</span>
                    <span>· {n.channels.map((c) => channelLabel[c]).join("، ")}</span>
                    <Badge tone={prTone[n.priority]}>{n.priority}</Badge>
                    <span dir="ltr" className="font-mono text-[10px] bg-ink-100 rounded px-1">
                      {n.event}
                    </span>
                    <span>
                      · {n.date} {n.time}
                    </span>
                  </div>
                </div>
                <button onClick={() => goTab(n.link.tab as TabId, n.link.entityId)} className="text-[11px] text-brand-700 hover:underline shrink-0">
                  مشاهده
                </button>
              </div>
            ))}
            {outbox.length === 0 && <p className="text-center text-xs text-ink-400 py-8">اعلانی ارسال نشده است.</p>}
          </div>
        </>
      )}

      {view === "automation" && (
        <div className="space-y-3">
          <SectionTitle icon={<Zap size={15} className="text-amber-500" />} title="قواعد خودکارسازی" hint="کارهای تکراری خودکار انجام می‌شوند (بند ۳۹ سند). هر اجرا با رویداد AUTOMATION_TRIGGERED یا رویداد مربوط در تاریخچه ثبت می‌شود." />
          {p.automation.map((a) => (
            <div key={a.id} className="card p-4 flex items-start gap-3">
              {canEdit ? <Toggle on={a.enabled} label={a.name} onChange={() => pm.toggleAutomation(pid, a.id)} /> : <Badge tone={a.enabled ? "success" : "neutral"}>{a.enabled ? "فعال" : "غیرفعال"}</Badge>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900">{a.name}</p>
                <p className="text-[11px] text-ink-500 mt-1 leading-5">
                  <span className="text-ink-400">اگر:</span> {a.trigger} <span className="text-ink-400 mx-1">←</span> <span className="text-ink-400">آنگاه:</span> {a.action}
                </p>
              </div>
              <span className="text-[11px] text-ink-400 whitespace-nowrap">{fa(a.runs)} بار اجرا</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
