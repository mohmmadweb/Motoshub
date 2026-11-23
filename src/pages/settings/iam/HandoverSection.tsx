// «اعضا ← انتقال کار به کاربر دیگر» (میزیتو: جابجایی اطلاعات از کاربر قدیمی به کاربر جدید —
// وظایف، گروه‌های گفتگو، پرونده مشتریان). از قرارداد C6 هر انبار استفاده می‌کند و یک رویداد
// `principal.handover` در تاریخچه می‌نویسد. «پیشنهادی»: `POST iam/tenant/principals/{id}/handover/`
// `{ to_principal_id, include: [tasks, chats, customer_files] }`.
import { useMemo, useState } from "react";
import { ArrowLeftRight, Send } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useToast } from "../../../components/ui/ToastProvider";
import { useTenancy } from "../../../context/TenancyContext";
import { useProjectsPM } from "../../../context/ProjectsContext";
import { useSocial } from "../../../context/SocialContext";
import { useInbox } from "../../../context/InboxContext";
import { useMeetings, reassignMeetings } from "../../../context/MeetingsContext";
import { officeHoldingsOf, reassignPrincipal as reassignOffice } from "../../../context/OfficeContext";
import { isAssignedTo } from "../../../pm/rules";
import { isDone } from "../../../pm/selectors";
import { principalIdOf } from "../../../iam/api";
import { Callout, Field, SectionHead, UserPicker, fmtN, userName } from "./shared";

type Part = "tasks" | "meetings" | "chats" | "customers" | "letters";
const partLabel: Record<Part, string> = {
  tasks: "کارهای باز، تأییدها و عضویت پروژه‌ها",
  meetings: "جلسه‌ها و مصوبه‌های باز",
  chats: "عضویت گروه‌ها و کانال‌های گفتگو",
  customers: "پرونده‌های مشتری و فرصت‌های فروش باز",
  letters: "نامه‌های دبیرخانه (افزودن گیرنده‌ی جدید)",
};

export const handoverEndpoint = { method: "POST", path: "/identity/iam/tenant/principals/{principal_id}/handover/", proposed: true } as const;

export function HandoverSection() {
  const t = useTenancy();
  const pm = useProjectsPM();
  const s = useSocial();
  const inbox = useInbox();
  const mt = useMeetings();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [from, setFrom] = useState<string[]>([]);
  const [to, setTo] = useState<string[]>([]);
  const [parts, setParts] = useState<Part[]>(["tasks", "meetings", "chats", "customers"]);
  const [done, setDone] = useState<string | null>(null);

  // افرادی که مدیر اعضا می‌تواند کارشان را جابه‌جا کند: عضو یکی از واحدهای تحت مدیریتش
  const candidates = useMemo(() => [...new Set(t.iam.memberships.filter((m) => t.checkMembership(m.userId, m.scopeId).ok).map((m) => m.userId))], [t]);
  const a = from[0];
  const b = to[0];
  const aName = a ? userName(a) : "";

  const preview = useMemo(() => {
    if (!a) return null;
    const live = pm.projects.filter((p) => !p.meta.archived);
    const tasks = live.reduce((n, p) => n + p.tasks.filter((x) => !x.archived && !isDone(p, x) && (isAssignedTo(x, aName) || x.finalApprover === aName)).length, 0);
    const projects = live.filter((p) => p.members.some((m) => m.name === aName) || p.meta.manager === aName).length;
    const meetings = mt.views.filter((v) => v.minutes_status !== "signed" && (v.organizer === aName || v.participants.some((x) => x.name === aName))).length;
    const chats = s.chats.filter((c) => !c.deleted_at && (c.chat_type === "group" || c.chat_type === "channel") && (c.owner_id === a || c.members.some((m) => m.user_id === a))).length;
    const office = officeHoldingsOf(a);
    return { tasks, projects, meetings, chats, ...office };
  }, [a, aName, pm.projects, mt.views, s.chats]);

  const toggle = (p: Part) => setParts((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const can = !!a && !!b && a !== b && parts.length > 0 && !t.readOnly;

  const run = () => {
    if (!a || !b) return;
    const bName = userName(b);
    const res = { tasks: 0, meetings: 0, chats: 0, customerFiles: 0, opportunities: 0, letters: 0 };
    if (parts.includes("tasks")) res.tasks = pm.reassignPrincipal(aName, bName, { tasks: true, memberships: true });
    if (parts.includes("meetings")) res.meetings = reassignMeetings(aName, bName);
    if (parts.includes("chats")) res.chats = s.reassignPrincipal(a, b).chats;
    if (parts.includes("customers") || parts.includes("letters")) {
      const o = reassignOffice(a, b, { customerFiles: parts.includes("customers"), opportunities: parts.includes("customers"), letters: parts.includes("letters") });
      res.customerFiles = o.customerFiles;
      res.opportunities = o.opportunities;
      res.letters = o.letters;
    }
    const summary = `انتقال کار از «${aName}» به «${bName}»: ${fmtN(res.tasks)} کار، ${fmtN(res.meetings)} جلسه، ${fmtN(res.chats)} گروه/کانال، ${fmtN(res.customerFiles)} پرونده‌ی مشتری، ${fmtN(res.opportunities)} فرصت فروش${parts.includes("letters") ? `، ${fmtN(res.letters)} نامه` : ""}.`;
    t.recordAudit({
      event: "principal.handover",
      targetType: "membership",
      targetId: principalIdOf(a),
      affectedUserId: b,
      summary,
      before: { principal_id: principalIdOf(a) },
      after: { to_principal_id: principalIdOf(b), include: parts, ...res },
    });
    inbox.notify({ recipient_id: b, event_type: "handover", entity_type: "principal", entity_id: principalIdOf(a), data: { text: `کارهای «${aName}» به شما منتقل شد (${fmtN(res.tasks)} کار، ${fmtN(res.chats)} گروه/کانال، ${fmtN(res.customerFiles)} پرونده).`, link: "/activities" } });
    setDone(summary);
    notify("انتقال انجام شد و در تاریخچه ثبت شد.", "success");
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={<ArrowLeftRight size={18} />} title="انتقال کار به کاربر دیگر" description="وقتی کسی جابه‌جا می‌شود یا می‌رود، کارهای باز، گروه‌های گفتگو و پرونده‌های مشتری‌اش را یک‌جا به جانشین بدهید." />
      <Callout tone="neutral">فقط اقلام باز منتقل می‌شوند؛ تاریخچه، نظرها و صورتجلسه‌های امضاشده به نام شخص قبلی می‌ماند. عضویت و نقش‌های سازمانی جداگانه در «اعضا» و «تخصیص نقش» تنظیم می‌شوند.</Callout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field label="از کاربر">
          <UserPicker value={from} onChange={(v) => (setFrom(v), setDone(null))} candidates={candidates} />
        </Field>
        <Field label="به کاربر">
          <UserPicker value={to} onChange={(v) => (setTo(v), setDone(null))} candidates={candidates.filter((x) => x !== a)} />
        </Field>
      </div>
      <div className="card p-4 space-y-2">
        <p className="text-[14px] font-bold text-ink-900">چه چیزهایی منتقل شود؟</p>
        {(Object.keys(partLabel) as Part[]).map((p) => {
          const n = !preview ? null : p === "tasks" ? preview.tasks : p === "meetings" ? preview.meetings : p === "chats" ? preview.chats : p === "customers" ? preview.customerFiles + preview.opportunities : null;
          return (
            <label key={p} className="flex items-center gap-2 text-[13.5px] text-ink-800">
              <input type="checkbox" className="w-4 h-4 accent-[var(--color-brand-600)]" checked={parts.includes(p)} onChange={() => toggle(p)} />
              <span className="flex-1">{partLabel[p]}</span>
              {n !== null && <Badge tone={n ? "brand" : "neutral"}>{fmtN(n)}</Badge>}
            </label>
          );
        })}
        {preview && (
          <p className="text-[12.5px] text-ink-500 pt-1">
            «{aName}» در {fmtN(preview.projects)} پروژه عضو است، {fmtN(preview.tasks)} کار باز، {fmtN(preview.chats)} گروه/کانال و {fmtN(preview.customerFiles)} پرونده‌ی مشتری دارد.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          icon={<Send size={16} />}
          disabled={!can}
          onClick={() =>
            confirm({
              title: `انتقال کار «${aName}» به «${userName(b)}»؟`,
              message: `${parts.map((p) => partLabel[p]).join("، ")} منتقل می‌شود و رویداد آن در تاریخچه ثبت می‌شود.`,
              confirmLabel: "بله، منتقل شود",
              onConfirm: run,
            })
          }
        >
          انتقال
        </Button>
        {a && b && a === b && <span className="text-[12.5px] text-rose-600">مبدأ و مقصد یکی است.</span>}
      </div>
      {done && <Callout>{done}</Callout>}
    </div>
  );
}
