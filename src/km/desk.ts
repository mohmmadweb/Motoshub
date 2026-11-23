// ---------------------------------------------------------------------------
// C4 — ردیف‌های میزکار از مدیریت دانش: اسنادی که منتظر تصمیم من‌اند (بررسی/تأیید/انتشار در
// گردش کار) و سندهای ابلاغی که باید «خواندم و پذیرفتم» بزنم. اقدام‌ها مستقیماً همان گردش کار
// انبار دانش را اجرا می‌کنند (تأیید/انتشار و ارجاع برای اصلاح) تا میزکار و «گردش کار» هم‌خوان بمانند.
// شکل مشترک ردیف: { id, kind, title, meta, due?, priority?, href, actions? }
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { useKnowledge } from "../context/KnowledgeContext";
import { useTenancy } from "../context/TenancyContext";
import { dayNum } from "../pm/jalali";
import { kmDocHref } from "./nav";

export type KmDeskAction = { id: string; label: string; run: () => void; tone?: "primary" | "danger" };
export type KmDeskRow = {
  id: string;
  kind: "km-approval" | "km-ack";
  title: string;
  meta: string;
  due?: string;
  priority?: "زیاد" | "متوسط" | "کم";
  href: string;
  actions?: KmDeskAction[];
};

/** صف دانش برای «میزکار من» */
export function useKmDesk(): { rows: KmDeskRow[]; counts: { approvals: number; acks: number; overdue: number } } {
  const km = useKnowledge();
  const { hasPermission, filterScoped } = useTenancy();
  return useMemo(() => {
    if (!hasPermission("knowledge.list")) return { rows: [], counts: { approvals: 0, acks: 0, overdue: 0 } };
    const today = dayNum(km.today) ?? 0;
    const waiting = filterScoped(km.docs).filter((d) => (d.status === "در بررسی" || d.status === "تأییدشده") && km.isApprover(d));
    let overdue = 0;
    const approvals: KmDeskRow[] = waiting.map((d) => {
      const f = km.flowInfo(d);
      const late = (f?.overdueDays ?? 0) > 0;
      if (late) overdue += 1;
      const publishStep = d.status === "تأییدشده" || f?.step.kind === "publish";
      const stepName = f ? f.step.name : d.status === "تأییدشده" ? "انتشار" : "بررسی و تأیید";
      return {
        id: `km:${d.id}`,
        kind: "km-approval",
        title: d.title,
        meta: `${d.type} · ${stepName}${f?.deputies.some((x) => x.name === km.me) ? " · به جانشینی" : ""} · از ${d.owner}`,
        due: f?.due,
        priority: late ? "زیاد" : d.importance === "حیاتی" ? "زیاد" : d.importance === "مهم" ? "متوسط" : "کم",
        href: kmDocHref(d.id, "workflow"),
        actions: [
          publishStep
            ? { id: "publish", label: "انتشار", tone: "primary", run: () => km.workflow(d.id, "publish") }
            : { id: "approve", label: f ? `تأیید «${f.step.name}»` : "تأیید", tone: "primary", run: () => km.workflow(d.id, "approve") },
          { id: "return", label: "ارجاع برای اصلاح", run: () => km.workflow(d.id, "return", "از میزکار برای اصلاح برگشت داده شد") },
        ],
      };
    });
    const acks: KmDeskRow[] = km.myPendingAcks().map((d) => ({
      id: `km-ack:${d.id}`,
      kind: "km-ack",
      title: d.title,
      meta: `${d.type} ابلاغی · «خواندم و پذیرفتم»`,
      due: d.circular?.deadline ?? undefined,
      priority: d.circular?.deadline && (dayNum(d.circular.deadline) ?? 9e9) < today ? "زیاد" : "متوسط",
      // تأیید خواندن فقط پس از باز کردن سند (در برگه‌ی سند) — از میزکار فقط پیوند
      href: kmDocHref(d.id),
    }));
    const rows = [...approvals, ...acks].sort((a, b) => (a.priority === "زیاد" ? 0 : 1) - (b.priority === "زیاد" ? 0 : 1) || (dayNum(a.due) ?? 9e9) - (dayNum(b.due) ?? 9e9));
    return { rows, counts: { approvals: approvals.length, acks: acks.length, overdue } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [km.docs, km.settings, km.me, hasPermission]);
}
