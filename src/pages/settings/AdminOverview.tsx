// ---------------------------------------------------------------------------
// «راهبری دسترسی ← نمای کلی» (/admin) — v6.8 `10_admin`: ردیف شاخص‌ها (همه از داده محاسبه می‌شوند،
// بدون عدد ثابت)، کارت‌های ورود به بخش‌ها، «کاربران اخیر» و «دعوت‌های ثبت‌شده»، و برگه‌ی
// «گزارش فضای کار». فقط بخش‌هایی که کاربر اجازه‌شان را دارد نمایش داده می‌شود.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, FileText, History, MessagesSquare, Network, Plus, ShieldCheck, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button, { buttonClass } from "../../components/ui/Button";
import Sheet, { SheetSection } from "../../components/ui/Sheet";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/Avatar";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useLocalStore } from "../../iam/store";
import { membershipStatusLabel } from "../../iam/model";
import { inviteStore } from "./InviteImportSection";
import { daysAgoLabel, fmtN, lastActivityDays, useSubtree, userOf } from "./iam/shared";

/**
 * آمار کل فضای کار از داده (بدون عدد ثابت) — برای ردیف شاخص «نمای کلی» و آمار صفحه‌ی عمومی (WP6).
 * فقط اقلام عمومی/منتشرشده شمرده می‌شوند.
 */
export function useWorkspaceStats() {
  const t = useTenancy();
  const s = useSocial();
  const km = useKnowledge();
  const pm = useProjectsPM();
  return useMemo(() => {
    const live = pm.projects.filter((p) => !p.meta.archived);
    return {
      members: new Set(t.iam.memberships.filter((m) => m.status === "active").map((m) => m.userId)).size,
      units: t.iam.scopes.filter((n) => n.active).length,
      projects: live.length,
      openTasks: live.reduce((n, p) => n + p.tasks.filter((x) => !x.archived && p.columns.find((c) => c.id === x.status)?.kind !== "done").length, 0),
      publishedDocs: km.docs.filter((d) => d.status === "منتشرشده").length,
      questions: s.topics.filter((x) => !x.deleted_at).length,
      news: s.content.filter((c) => c.kind === "news" && !c.is_draft && !c.deleted_at).length,
      events: s.events.filter((e) => !e.deleted_at && !e.is_draft).length,
      channels: s.chats.filter((c) => !c.deleted_at && !c.parent && c.chat_type === "channel").length,
      groups: s.chats.filter((c) => !c.deleted_at && !c.parent && c.chat_type === "group").length,
    };
  }, [t.iam, s.topics, s.content, s.events, s.chats, km.docs, pm.projects]);
}

type Entry = { id: string; title: string; sub: string; icon: LucideIcon; to: string; perms: string[] };

export default function AdminOverview() {
  const t = useTenancy();
  const sub = useSubtree();
  const s = useSocial();
  const km = useKnowledge();
  const invites = useLocalStore(inviteStore);
  const [report, setReport] = useState(false);
  const can = (perms: string[]) => !perms.length || perms.some((p) => t.hasPermission(p));

  const data = useMemo(() => {
    const ms = t.iam.memberships.filter((m) => sub.ids.has(m.scopeId));
    const activeUsers = new Set(ms.filter((m) => m.status === "active").map((m) => m.userId));
    const roles = t.iam.roles.filter((r) => r.active && (sub.ids.has(r.createdIn) || sub.chainIds.has(r.createdIn)));
    const units = sub.nodes.filter((n) => n.active).length;
    const liveBindings = t.iam.bindings.filter((b) => b.active && sub.ids.has(b.scopeId)).length;
    const channels = s.chats.filter((c) => !c.deleted_at && !c.parent && c.chat_type === "channel").length;
    const groups = s.chats.filter((c) => !c.deleted_at && !c.parent && c.chat_type === "group").length;
    const docsInFlow = km.docs.filter((d) => d.status === "در بررسی").length;
    const policies = t.iam.sod.rules.filter((r) => r.active).length;
    return { ms, activeUsers, roles, units, liveBindings, channels, groups, docsInFlow, policies };
  }, [t, sub, s.chats, km.docs]);

  const kpis = [
    { label: "کاربر فعال", value: data.activeUsers.size, href: "/admin/people" },
    { label: "نقش دسترسی", value: data.roles.length, href: "/admin/roles" },
    { label: "واحد سازمانی", value: data.units, href: "/admin/units" },
    { label: "کانال سازمانی", value: data.channels, href: "/channels" },
  ];

  const entries: Entry[] = [
    { id: "people", title: "کاربران و نقش‌ها", sub: `${fmtN(data.activeUsers.size)} کاربر فعال · ${fmtN(data.roles.length)} نقش`, icon: Users, to: "/admin/people", perms: ["iam.members.manage", "users.import", "users.create"] },
    { id: "units", title: "واحدها و ساختار", sub: `${fmtN(data.units)} واحد فعال`, icon: Network, to: "/admin/units", perms: ["iam.structure.view", "iam.structure.manage"] },
    { id: "access", title: "دسترسی به محتوا", sub: `${fmtN(data.liveBindings)} تخصیص فعال · ${fmtN(data.policies)} قاعده‌ی تفکیک وظایف`, icon: ShieldCheck, to: "/settings?section=review", perms: ["iam.review.manage"] },
    { id: "chat", title: "تنظیمات گفت‌وگو", sub: `${fmtN(data.channels)} کانال · ${fmtN(data.groups)} گروه`, icon: MessagesSquare, to: "/settings?section=social", perms: ["social.settings", "social.dashboards", "comments.moderate"] },
    { id: "docs", title: "گردش اسناد", sub: `${fmtN(data.docsInFlow)} سند در گردش بررسی`, icon: FileText, to: "/settings?section=knowledge", perms: ["knowledge.settings"] },
    { id: "brand", title: "ظاهر و هویت", sub: "لوگو، نام سازمان و پاورقی", icon: SlidersHorizontal, to: "/settings/organization", perms: ["settings.branding"] },
    { id: "history", title: "تاریخچه", sub: `${fmtN(t.iam.audits.filter((a) => sub.ids.has(a.scopeId)).length)} رویداد ثبت‌شده`, icon: History, to: "/admin/history", perms: ["iam.audit.view"] },
  ].filter((e) => can(e.perms));

  // کاربران اخیر: بر اساس آخرین فعالیت
  const recent = [...data.activeUsers, ...new Set(data.ms.filter((m) => m.status !== "active").map((m) => m.userId))]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((id) => ({ id, u: userOf(id), m: data.ms.find((m) => m.userId === id && m.primary) ?? data.ms.find((m) => m.userId === id)!, days: lastActivityDays(id) }))
    .filter((x) => x.u)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);
  const myInvites = invites.filter((i) => sub.ids.has(i.scopeId) && i.status === "pending");
  const canInvite = can(["users.create", "iam.members.manage"]);

  // گزارش فضای کار (v6.8 `10_admin_report`) — همه از داده
  const ws = useWorkspaceStats();
  const reportRows = [
    { label: "پروژه‌های فعال", value: ws.projects },
    { label: "کارهای باز", value: ws.openTasks },
    { label: "سند دانش منتشرشده", value: ws.publishedDocs },
    { label: "پرسش‌ها", value: ws.questions },
    { label: "خبر منتشرشده", value: ws.news },
    { label: "رویداد", value: ws.events },
    { label: "عضویت معلق", value: data.ms.filter((m) => m.status === "suspended").length },
    { label: "دعوت باز", value: myInvites.length },
  ];

  return (
    <div>
      <PageHeader
        title="نمای کلی"
        description={`کاربران، دسترسی‌ها و تنظیمات فضای کار — ${t.scopePath(t.contextId)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<ClipboardList size={16} />} onClick={() => setReport(true)}>
              گزارش فضای کار
            </Button>
            {canInvite && (
              <Link to="/admin/people?section=members&tab=invite" className={buttonClass("primary", "md")}>
                <Plus size={16} /> ثبت دعوت
              </Link>
            )}
          </div>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} href={k.href} />
        ))}
      </div>
      {entries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {entries.map((e) => (
            <Card key={e.id} href={e.to}>
              <span className="w-11 h-11 rounded-[10px] bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                <e.icon size={22} strokeWidth={1.5} />
              </span>
              <p className="t-card text-ink-900">{e.title}</p>
              <p className="text-[13px] text-ink-500 mt-1">{e.sub}</p>
            </Card>
          ))}
        </div>
      )}
      <Card title="کاربران اخیر" description="آخرین فعالیت و وضعیت حساب" flush className="mb-4" titleHref={can(["iam.members.manage"]) ? "/admin/people" : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] min-w-[560px]">
            <thead>
              <tr className="text-[12.5px] text-ink-500 border-b border-[var(--color-border)] text-right">
                <th className="px-5 py-2.5 font-medium">کاربر</th>
                <th className="px-3 py-2.5 font-medium">واحد</th>
                <th className="px-3 py-2.5 font-medium">نقش</th>
                <th className="px-3 py-2.5 font-medium">آخرین فعالیت</th>
                <th className="px-5 py-2.5 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-5 py-2.5">
                    <Link to={`/profile/${r.id}`} className="flex items-center gap-2 text-ink-900 hover:text-[var(--color-link)]">
                      <Avatar name={r.u!.name} size={32} /> {r.u!.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-ink-700">{t.scopeLabel(r.m.scopeId)}</td>
                  <td className="px-3 py-2.5 text-ink-700">{t.primaryRoleOf(r.id)?.name ?? r.m.title ?? "—"}</td>
                  <td className="px-3 py-2.5 text-ink-500">{daysAgoLabel(r.days)}</td>
                  <td className="px-5 py-2.5">
                    <Badge tone={r.m.status === "active" ? "success" : r.m.status === "revoked" ? "danger" : "warning"} dot>
                      {membershipStatusLabel[r.m.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="دعوت‌های ثبت‌شده" flush titleHref={canInvite ? "/admin/people?section=members&tab=invite" : undefined}>
        {myInvites.length === 0 ? (
          <EmptyState title="دعوتی ثبت نشده" />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {myInvites.map((i) => (
              <li key={i.id} className="px-5 py-3 flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] text-ink-900">{i.name}</span>
                  <span className="block text-[12.5px] text-ink-500">
                    {t.scopeLabel(i.scopeId)}
                    {i.title ? ` · ${i.title}` : ""} · {i.at}
                  </span>
                </span>
                <Badge tone="info">در انتظار پذیرش</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Sheet open={report} onClose={() => setReport(false)} title="گزارش فضای کار">
        <SheetSection title={t.scopePath(t.contextId)}>
          <ul className="divide-y divide-[var(--color-border)]">
            {[...kpis.map((k) => ({ label: k.label, value: k.value })), ...reportRows].map((r) => (
              <li key={r.label} className="flex items-center justify-between py-2.5 text-[14px]">
                <span className="text-ink-700">{r.label}</span>
                <b className="text-ink-900 tabular-nums">{fmtN(r.value)}</b>
              </li>
            ))}
          </ul>
        </SheetSection>
      </Sheet>
    </div>
  );
}
