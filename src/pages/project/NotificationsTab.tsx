import { useMemo, useState } from "react";
import { Send, FastForward, CheckCheck, SlidersHorizontal, Pencil, ArrowRight, Clock } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import RowActions from "../../components/ui/RowActions";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { channelLabel, eventByCode, type EventCode } from "../../pm/events";
import { actionText, conditionText, isScheduled, ruleActions, triggerText } from "../../pm/automation";
import { fa } from "../../pm/jalali";
import type { NotifRule } from "../../pm/types";
import { useProjectPage, type TabId } from "./shared";
import RuleWizard, { recipientsPhrase, type WizardInit } from "./RuleWizard";

const prTone = { کم: "neutral", عادی: "neutral", مهم: "warning", فوری: "danger" } as const;

/** یک قاعده‌ی ساده به زبان فارسی: «وقتی … ← …» — به اعلان یک رویداد و/یا یک خودکارسازی داخلی گره خورده است */
type SimpleRule = { when: string; event?: string; auto?: string; does?: string };
const groups: { label: string; rules: SimpleRule[] }[] = [
  {
    label: "تسک‌ها",
    rules: [
      { when: "وقتی تسکی به کسی واگذار شد", event: "TASK_ASSIGNED" },
      { when: "یک روز مانده به سررسید تسک", event: "TASK_DUE_SOON", auto: "a2" },
      { when: "وقتی تسک عقب افتاد", event: "TASK_OVERDUE", auto: "a5" },
      { when: "وقتی تسکی متوقف شد", event: "TASK_BLOCKED" },
      { when: "وقتی همه‌ی پیش‌نیازهای یک تسک انجام شد", event: "TASK_UNBLOCKED", auto: "a4" },
      { when: "وقتی سررسید تسکی با تسک‌های وابسته‌اش تعارض پیدا کرد", event: "DEPENDENCY_CONFLICT", auto: "a8" },
      { when: "وقتی تسک به «انجام‌شده» رفت", auto: "a1", does: "پیشرفتش ۱۰۰٪ و چک‌لیستش کامل شود" },
      { when: "سه روز مانده به مایل‌ستونی که تسک ناتمام دارد", event: "MILESTONE_AT_RISK", auto: "a6", does: "«در خطر» علامت بخورد" },
      { when: "وقتی کسی منشن شد", event: "USER_MENTIONED" },
    ],
  },
  {
    label: "جلسات",
    rules: [
      { when: "وقتی جلسه‌ای تنظیم شد", event: "MEETING_SCHEDULED" },
      { when: "وقتی زمان یا شرکت‌کنندگان جلسه تغییر کرد", event: "MEETING_UPDATED" },
      { when: "وقتی جلسه لغو شد", event: "MEETING_CANCELLED" },
      { when: "پیش از شروع جلسه", event: "MEETING_REMINDER" },
      { when: "وقتی صورت‌جلسه منتشر شد", event: "MINUTES_PUBLISHED" },
    ],
  },
  {
    label: "بودجه",
    rules: [
      { when: "وقتی مصرف بودجه از آستانه (۸۰٪ / ۱۰۰٪) گذشت", event: "BUDGET_THRESHOLD_REACHED", auto: "a3" },
      { when: "وقتی هزینه‌ای ثبت شد", event: "EXPENSE_ADDED" },
      { when: "وقتی هزینه‌ای تأیید یا رد شد", event: "EXPENSE_STATUS_CHANGED" },
      { when: "وقتی هزینه‌ی تسکی از بودجه‌اش بیشتر شد", event: "TASK_BUDGET_EXCEEDED" },
    ],
  },
  {
    label: "اعضا",
    rules: [
      { when: "وقتی عضوی به پروژه اضافه شد", event: "PROJECT_MEMBER_ADDED" },
      { when: "وقتی عضوی از پروژه حذف شد", event: "PROJECT_MEMBER_REMOVED" },
      { when: "وقتی دسترسی‌های یک عضو تغییر کرد", event: "MEMBER_PERMISSIONS_CHANGED" },
    ],
  },
  {
    label: "ریسک‌ها",
    rules: [
      { when: "وقتی ریسکی ثبت شد", event: "RISK_ADDED" },
      { when: "وقتی شدت ریسکی بیشتر شد", event: "RISK_ESCALATED" },
      { when: "وقتی ریسک «بحرانی» ثبت یا تشدید شد", auto: "a7", does: "سلامت پروژه دست‌کم «زرد» شود" },
    ],
  },
];

export default function NotificationsTab() {
  const { p, pid, can, refDate, goTab } = useProjectPage();
  const canEdit = can("projects.notifications");
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [view, setView] = useState<"rules" | "outbox">("rules");
  const [who, setWho] = useState("");
  const [wizard, setWizard] = useState<WizardInit | null>(null);

  const mine = useMemo(() => pm.store.notifications.filter((n) => n.projectId === pid), [pm.store.notifications, pid]);
  const outbox = useMemo(() => mine.filter((n) => !who || n.recipient === who), [mine, who]);
  const recipients = [...new Set(mine.map((n) => n.recipient))];

  const ruleOf = (code: string): NotifRule | null => p.notifRules[code as EventCode] ?? eventByCode[code]?.notify ?? null;
  const autoOn = (id: string) => p.automation.find((a) => a.id === id)?.enabled ?? false;
  const isOn = (r: SimpleRule) => (r.event ? !!ruleOf(r.event)?.enabled : true) && (r.auto ? autoOn(r.auto) : true);
  const sentence = (r: SimpleRule) => {
    const tail = r.event ? recipientsPhrase(ruleOf(r.event)) : "";
    return [r.does, tail].filter(Boolean).join(" و ");
  };
  const toggle = (r: SimpleRule) => {
    const next = !isOn(r);
    if (r.event) {
      const base = ruleOf(r.event) ?? { enabled: false, recipients: [], channels: ["inapp"], priority: "عادی" };
      pm.setNotifRule(pid, r.event as EventCode, { ...base, enabled: next, recipients: base.recipients.length ? base.recipients : ["manager"] });
    }
    if (r.auto && autoOn(r.auto) !== next) pm.toggleAutomation(pid, r.auto);
  };
  const customRules = p.customRules ?? [];

  if (view === "outbox")
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setView("rules")} className="text-xs text-brand-700 hover:underline flex items-center gap-1">
            <ArrowRight size={13} /> اعلان‌ها و خودکارسازی
          </button>
          <span className="text-sm font-bold text-ink-900 mr-2">صندوق ارسال</span>
          <select value={who} onChange={(e) => setWho(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto mr-auto">
            <option value="">همه‌ی گیرندگان</option>
            {recipients.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <Button size="sm" variant="ghost" icon={<CheckCheck size={13} />} onClick={() => pm.markAllRead(who || undefined, pid)}>
            خوانده‌شده کن
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<FastForward size={13} />}
            title={`امروزِ دمو: ${refDate}`}
            onClick={() => {
              pm.advanceDays(1);
              notify("یک روز جلو رفتیم — زمان‌بند اجرا شد (سررسید فردا، عقب‌افتادگی، یادآوری جلسه، مایل‌ستون در خطر).", "info");
            }}
          >
            یک روز جلو (دمو)
          </Button>
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
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-ink-500 leading-6 flex-1 min-w-[220px]">هر قاعده را با کلید روشن یا خاموش کنید. جزئیات گیرندگان، کانال و قاعده‌های تازه در «ویرایش پیشرفته» است.</p>
        <button onClick={() => setView("outbox")} className="text-xs text-brand-700 hover:underline flex items-center gap-1">
          <Send size={12} /> صندوق ارسال ({fa(mine.length)})
        </button>
        {canEdit && (
          <Button size="sm" variant="secondary" icon={<SlidersHorizontal size={13} />} onClick={() => setWizard({ kind: "new" })}>
            ویرایش پیشرفته
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {groups.map((g) => (
          <div key={g.label} className="card">
            <p className="px-4 pt-3 pb-1 text-sm font-bold text-ink-900">{g.label}</p>
            <ul className="divide-y divide-ink-100">
              {g.rules.map((r) => {
                const on = isOn(r);
                return (
                  <li key={r.when} className="px-4 py-2.5 flex items-center gap-3">
                    <p className={`flex-1 min-w-0 text-[12.5px] leading-6 ${on ? "text-ink-800" : "text-ink-400"}`}>
                      {r.when} <span className="text-ink-300">←</span> {sentence(r)}
                    </p>
                    {canEdit && r.event && (
                      <button onClick={() => setWizard({ kind: "event", code: r.event! })} className="p-1 text-ink-300 hover:text-brand-700 shrink-0" title="گیرندگان و کانال" aria-label="ویرایش گیرندگان و کانال">
                        <Pencil size={13} />
                      </button>
                    )}
                    {canEdit ? <Toggle on={on} onChange={() => toggle(r)} label={r.when} /> : <Badge tone={on ? "success" : "neutral"}>{on ? "روشن" : "خاموش"}</Badge>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {customRules.length > 0 && (
          <div className="card">
            <p className="px-4 pt-3 pb-1 text-sm font-bold text-ink-900">قاعده‌های شما</p>
            <ul className="divide-y divide-ink-100">
              {customRules.map((r) => (
                <li key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                  <p className={`flex-1 min-w-0 text-[12.5px] leading-6 ${r.enabled ? "text-ink-800" : "text-ink-400"}`}>
                    {isScheduled(r.trigger) && <Clock size={12} className="inline ml-1 text-brand-600" />}
                    وقتی {triggerText(p, r.trigger)}
                    {r.conditions?.length ? ` و ${r.conditions.map((c) => conditionText(p, c)).join(" و ")}` : ""} <span className="text-ink-300">←</span> {ruleActions(r).map((a) => actionText(p, a)).join("، ")}
                  </p>
                  {canEdit && <RowActions onEdit={() => setWizard({ kind: "custom", rule: r })} onDelete={() => confirm({ title: `حذف قاعده‌ی «${r.name}»؟`, onConfirm: () => pm.removeCustomRule(pid, r.id) })} />}
                  {canEdit ? <Toggle on={r.enabled} label={r.name} onChange={() => pm.saveCustomRule(pid, { ...r, enabled: !r.enabled })} /> : <Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "روشن" : "خاموش"}</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {wizard && <RuleWizard init={wizard} onClose={() => setWizard(null)} />}
    </div>
  );
}
