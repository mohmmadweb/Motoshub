// ---------------------------------------------------------------------------
// هوک میزکار (قرارداد C4) برای «میزکار من» (WP4):
// نامه‌های خوانده‌نشده/ارجاعی به من، فرصت‌های فروشِ من که موعدشان رسیده یا گذشته،
// و (برای دارندگان مجوز مالی) دریافت‌های معوقه.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { useOffice } from "../context/OfficeContext";
import { bucketOf } from "./ledger";
import { daysBetween, OFFICE_TODAY, rialShort, toFa } from "./util";

export type DeskRow = {
  id: string;
  kind: "letter" | "opportunity" | "finance";
  title: string;
  meta: string;
  due?: string;
  priority?: "high" | "medium" | "low";
  href: string;
  actions?: { label: string; href: string }[];
};

export function useOfficeDesk(): { rows: DeskRow[]; counts: { letters: number; opportunities: number; overdue: number } } {
  const o = useOffice();
  return useMemo(() => {
    const letters: DeskRow[] = o.visibleLetters
      .filter((l) => !l.archived && !l.archived_by.includes(o.me))
      .flatMap((l) => {
        const mine = l.parties.find((p) => p.principal_id === o.me);
        if (!mine || mine.seen_at) return [];
        const reg = o.registrationOf(l.id);
        return [
          {
            id: `letter-${l.id}`,
            kind: "letter" as const,
            title: l.subject,
            meta: `${mine.via_referral ? "ارجاع" : mine.role === "cc" ? "رونوشت" : "نامه"} از ${o.nameOf(l.sender_id)}${reg ? ` · ${toFa(reg.number)}` : ""}`,
            due: toFa(l.created_at.split(" ")[0]),
            priority: l.labels.includes("فوری") ? ("high" as const) : ("medium" as const),
            href: `/secretariat?letter=${l.id}`,
          },
        ];
      });

    const opps: DeskRow[] = o.visibleOpportunities
      .filter((x) => x.status === "open" && x.owner_id === o.me && daysBetween(OFFICE_TODAY, x.expected_close_date) <= 7)
      .map((x) => ({
        id: `opp-${x.id}`,
        kind: "opportunity" as const,
        title: x.title,
        meta: `${o.state.customers.find((c) => c.id === x.customer)?.name ?? ""} · ${rialShort(x.value_rial)} · احتمال ${toFa(x.probability)}٪`,
        due: toFa(x.expected_close_date),
        priority: daysBetween(OFFICE_TODAY, x.expected_close_date) < 0 ? ("high" as const) : ("medium" as const),
        href: `/customers/${x.customer}?tab=opportunities&opp=${x.id}`,
      }));

    const overdue: DeskRow[] = o.visibleFinanceDocs
      .filter((d) => d.direction === "receipt" && bucketOf(d) === "overdue")
      .map((d) => ({
        id: `fin-${d.id}`,
        kind: "finance" as const,
        title: `دریافت معوقه — ${o.state.customers.find((c) => c.id === d.customer)?.name ?? ""}`,
        meta: `${rialShort(d.amount_rial)}${d.description ? ` · ${d.description}` : ""}`,
        due: toFa(d.due_date ?? d.date),
        priority: "high" as const,
        href: `/customers/${d.customer}?tab=finance&doc=${d.id}`,
      }));

    return { rows: [...letters, ...opps, ...overdue], counts: { letters: letters.length, opportunities: opps.length, overdue: overdue.length } };
  }, [o]);
}
