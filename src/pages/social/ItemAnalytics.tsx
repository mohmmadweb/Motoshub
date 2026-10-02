// ---------------------------------------------------------------------------
// «پیشنهادی» — آمار هر مطلب/رسانه برای نویسنده و مدیران:
// بازدیدکننده‌ی یکتا، روند بازدید روزانه، واکنش و نظر، نرخ تعامل و تفکیک شرکت.
// بازدیدهای پایه از داده‌ی نمونه شبیه‌سازی می‌شوند و بازدیدهای واقعیِ هر کاربر
// در همین مرورگر (viewLog) روی آن‌ها اضافه می‌شوند.
// endpoint پیشنهادی: GET /content/{kind}/{id}/analytics/ · GET /media/media/posts/{id}/analytics/
// ---------------------------------------------------------------------------
import { useState } from "react";
import { BarChart3, Eye, Users, SmilePlus, MessageSquare, Percent } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { dayNum, fromDayNum } from "../../pm/jalali";
import { endpoints, fmtEndpoint } from "../../social/endpoints";
import type { ContentItem, EntityName, MediaPost } from "../../social/types";
import { contentEntity } from "../../social/types";
import { fa } from "./kit";

/** شرکتِ هر کاربر: عضویت اصلی (یا اولین عضویت فعال)؛ واحد ← شرکتِ بالادست */
export function useCompanyOf() {
  const { iam, membershipsOf, scopeLabel } = useTenancy();
  return (uid: string) => {
    const ms = membershipsOf(uid).filter((m) => m.status === "active");
    const m = ms.find((x) => x.primary) ?? ms[0];
    if (!m) return "بدون عضویت";
    let node = m.scope;
    while (node.type === "unit" && node.parentId) {
      const up = iam.scopes.find((x) => x.id === node.parentId);
      if (!up) break;
      node = up;
    }
    return node.type === "company" ? scopeLabel(node.id) : node.type === "holding" ? `ستاد ${scopeLabel(node.id)}` : "ستاد مرکزی";
  };
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const DAYS = 14;

function compute(s: ReturnType<typeof useSocial>, entity: "content" | "media", x: ContentItem | MediaPost, reactEntity: EntityName) {
  const id = x.id;
  const today = dayNum(s.today) ?? 0;
  const pubDay = dayNum((x.published_at ?? x.created_at).split(" ")[0]) ?? today;
  const real = s.viewsOf(entity, id).filter((v) => v.user_id !== x.user_id);
  const total = entity === "content" ? Math.max((x as ContentItem).views, real.length) : 30 + (hash(id) % 150) + real.length;
  const simTotal = Math.max(0, total - real.length);
  // بازدیدکنندگان شبیه‌سازی‌شده: زیرمجموعه‌ی قطعی از مخاطبان
  const audience = s.audienceOf(x);
  const simUnique = Math.min(audience.length, Math.round(simTotal * 0.45));
  const simUsers = [...audience].sort((a, b) => hash(a + id) - hash(b + id)).slice(0, simUnique);
  const unique = [...new Set([...simUsers, ...real.map((v) => v.user_id)])];
  // روند روزانه: افت نمایی پس از انتشار + بازدیدهای واقعی هر روز
  const span = Math.max(1, Math.min(60, today - pubDay + 1));
  const weights = Array.from({ length: span }, (_, k) => 0.78 ** k * (0.8 + ((hash(`${id}${k}`) % 40) / 100)));
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  const byDay = new Map<number, number>();
  weights.forEach((w, k) => byDay.set(pubDay + k, Math.round((w / wSum) * simTotal)));
  real.forEach((v) => {
    const d = dayNum(v.at.split(" ")[0]) ?? today;
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  });
  const days = Array.from({ length: DAYS }, (_, i) => today - (DAYS - 1 - i)).map((d) => ({ day: d, views: d < pubDay ? 0 : byDay.get(d) ?? 0 }));
  const reactions = s.reactionSummary(reactEntity, id).total;
  const comments = s.commentsFor(reactEntity, id).filter((c) => c.approved).length;
  const engagement = unique.length ? Math.round(((reactions + comments) / unique.length) * 1000) / 10 : 0;
  return { total, unique, audience, days, reactions, comments, engagement, realCount: real.length };
}

/** دکمه‌ی «آمار» + مودال آمار */
export function AnalyticsButton({ entity, item }: { entity: "content" | "media"; item: ContentItem | MediaPost }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" icon={<BarChart3 size={13} />} onClick={() => setOpen(true)}>
        آمار
      </Button>
      {open && <AnalyticsModal entity={entity} item={item} onClose={() => setOpen(false)} />}
    </>
  );
}

function AnalyticsModal({ entity, item, onClose }: { entity: "content" | "media"; item: ContentItem | MediaPost; onClose: () => void }) {
  const s = useSocial();
  const companyOf = useCompanyOf();
  const reactEntity: EntityName = entity === "media" ? "media" : contentEntity[(item as ContentItem).kind];
  const a = compute(s, entity, item, reactEntity);
  const max = Math.max(1, ...a.days.map((d) => d.views));
  const groups = new Map<string, { viewers: number; audience: number }>();
  a.audience.forEach((u) => {
    const k = companyOf(u);
    const g = groups.get(k) ?? { viewers: 0, audience: 0 };
    g.audience += 1;
    groups.set(k, g);
  });
  a.unique.forEach((u) => {
    const k = companyOf(u);
    const g = groups.get(k) ?? { viewers: 0, audience: 0 };
    g.viewers += 1;
    groups.set(k, g);
  });
  const rows = [...groups.entries()].sort((x, y) => y[1].viewers - x[1].viewers);
  const ep = entity === "media" ? endpoints.mediaAnalytics(item.id) : endpoints.contentAnalytics((item as ContentItem).kind, item.id);
  const title = "title" in item ? item.title : item.caption || "پست رسانه";
  const label = (d: number) => fromDayNum(d).split("/").slice(1).join("/");

  return (
    <Modal open onClose={onClose} title="آمار" description={title} width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCard label="بازدید" value={fa(a.total)} icon={<Eye size={16} />} tone="brand" hint={a.realCount ? `${fa(a.realCount)} ثبت‌شده در این مرورگر` : undefined} />
          <StatCard label="بازدیدکننده‌ی یکتا" value={fa(a.unique.length)} icon={<Users size={16} />} tone="success" hint={`از ${fa(a.audience.length)} مخاطب`} />
          <StatCard label="واکنش / نظر" value={`${fa(a.reactions)} / ${fa(a.comments)}`} icon={<SmilePlus size={16} />} tone="warning" />
          <StatCard label="نرخ تعامل" value={`${fa(a.engagement)}٪`} icon={<Percent size={16} />} tone="neutral" hint="(واکنش + نظر) ÷ بازدیدکننده" />
        </div>

        <div className="card p-3">
          <p className="text-xs font-bold text-ink-800 mb-2">روند بازدید {fa(DAYS)} روز اخیر</p>
          <div className="flex items-end gap-1 h-28" role="img" aria-label="نمودار بازدید روزانه">
            {a.days.map((d) => (
              <div key={d.day} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1" title={`${fromDayNum(d.day)}: ${fa(d.views)} بازدید`}>
                <span className="text-[9px] text-ink-400 tabular-nums">{d.views ? fa(d.views) : ""}</span>
                <span className={`w-full rounded-t ${d.day === dayNum(s.today) ? "bg-brand-600" : "bg-brand-300"}`} style={{ height: `${Math.max(d.views ? 4 : 1, (d.views / max) * 80)}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            {a.days.map((d, i) => (
              <span key={d.day} className="flex-1 min-w-0 text-center text-[9px] text-ink-400 tabular-nums">
                {i % 3 === 0 || i === a.days.length - 1 ? label(d.day) : ""}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-3 space-y-2">
          <p className="text-xs font-bold text-ink-800 flex items-center gap-1.5">
            <MessageSquare size={13} /> تفکیک بازدیدکنندگان بر اساس شرکت
          </p>
          {rows.length === 0 && <p className="text-[11px] text-ink-400">هنوز بازدیدی ثبت نشده است.</p>}
          {rows.map(([k, g]) => {
            const p = g.audience ? Math.round((g.viewers / g.audience) * 100) : g.viewers ? 100 : 0;
            return (
              <div key={k}>
                <div className="flex items-center justify-between gap-2 text-[11.5px] mb-0.5">
                  <span className="text-ink-700 truncate min-w-0">{k}</span>
                  <span className="text-ink-500 tabular-nums shrink-0">
                    {fa(g.viewers)} نفر{g.audience ? ` از ${fa(g.audience)} · ${fa(p)}٪ پوشش` : ""}
                  </span>
                </div>
                <span className="block h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, p)}%` }} />
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10.5px] text-ink-400 flex items-center gap-1 flex-wrap">
          بازدیدهای پایه از داده‌ی نمونه شبیه‌سازی شده‌اند؛ بازدیدهای واقعی کاربران همین مرورگر روی آن اضافه می‌شوند. ·
          <code dir="ltr" className="text-amber-700">
            {fmtEndpoint(ep)}
          </code>
          <span className="text-amber-700">(پیشنهادی)</span>
        </p>
      </div>
    </Modal>
  );
}
