// قواعد «گزارش تخلف تأییدشده» و «هرزنامه» مسدودسازی خودکار (F12): هرجا صف گزارش‌ها دیده می‌شود
// (پیشخوان نظارت شبکه، تنظیمات مسدودسازی) گزارش‌های تأییدشده‌ی هر کاربر شمرده و قاعده اعمال می‌شود؛
// کاربر با دلیل و زمان پایان مطلع می‌شود.
import { useEffect } from "react";
import type { AbuseReport } from "../social/types";
import { useInbox } from "../context/InboxContext";
import { users } from "../data/mock";
import { blockKindShort, evaluateRule } from "./blocks";
import { msFromStamp } from "./securityClock";

export function useAbuseRules(reports: AbuseReport[]) {
  const inbox = useInbox();
  useEffect(() => {
    const confirmed = reports.filter((r) => r.status === "hidden" || r.status === "removed");
    const byUser = new Map<string, AbuseReport[]>();
    confirmed.forEach((r) => byUser.set(r.target_owner_id, [...(byUser.get(r.target_owner_id) ?? []), r]));
    byUser.forEach((list, uid) => {
      const times = (rs: AbuseReport[]) => rs.map((r) => msFromStamp(r.resolved_at ?? r.created_at)).filter((x): x is number => x !== null);
      const b = evaluateRule("abuse_reports", uid, times(list)) ?? evaluateRule("spam", uid, times(list.filter((r) => r.reason === "spam")));
      const name = users.find((u) => u.id === uid)?.name;
      if (b && name) inbox.send([name], "security", `حساب شما ${blockKindShort[b.kind]} شد${b.until ? ` تا ${b.until}` : " (دائم)"}. دلیل: ${b.reason}`, `/dashboard/profile/${uid}?tab=security`, { urgent: true, system: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);
}
