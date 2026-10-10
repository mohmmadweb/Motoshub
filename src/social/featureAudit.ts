// ---------------------------------------------------------------------------
// «پیشنهادی» — رویدادهای ممیزی اقلام F01–F05 (نظرسنجی، خوراک، آپارات) و F13 (ضدویروس)
// به شکل یکسان برای «لاگ ممیزی یکپارچه» (src/pages/settings/UnifiedAuditSection.tsx).
// تغییر تنظیمات ضدویروس جداگانه با emitSettingsChange در «تغییر تنظیمات» هم ثبت می‌شود.
// ---------------------------------------------------------------------------
import { useSocial } from "../context/SocialContext";
import { avEventLabel, useAntivirus } from "./av";

export type ComposerAuditEntry = { id: string; at: string; actor_id: string; action: string; target: string; note?: string; area: "poll" | "feed" | "aparat" | "link_preview" | "category" | "friendship" | "antivirus" };

export function useComposerAuditEntries(): ComposerAuditEntry[] {
  const s = useSocial();
  const avs = useAntivirus();
  return [
    ...s.featureLog.map((e) => ({ id: `fx-${e.id}`, at: e.at, actor_id: e.actor_id, action: e.action, target: e.target, note: e.note, area: e.area })),
    ...avs.events.map((e) => ({ id: `av-${e.id}`, at: e.at, actor_id: e.actor_id, action: avEventLabel[e.action], target: e.target, note: e.note, area: "antivirus" as const })),
  ];
}
