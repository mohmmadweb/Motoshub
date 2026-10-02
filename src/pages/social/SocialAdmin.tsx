// ---------------------------------------------------------------------------
// «داشبورد مدیریتی شبکه» — ویژه‌ی مدیران:
//   داشبورد هر ماژول (GET /{module}/dashboards/admin/)، صف تأیید نظرها (core/comments)،
//   واکنش‌های مجاز (core/allowed-reactions) و تنظیمات ماژول‌ها (PATCH /{module}/setting/{key}/).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LayoutDashboard, FileText, Image as ImageIcon, CalendarDays, MessagesSquare, MessageCircle, UserPlus, Check, Trash2, CheckCheck, Plus, RotateCcw, Settings2, Smile, ShieldCheck, Trophy, CheckCircle2, Undo2, Flag, EyeOff, Ban, History } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import EmptyState from "../../components/ui/EmptyState";
import AccessDenied from "../../components/ui/AccessDenied";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints, fmtEndpoint, type Ep } from "../../social/endpoints";
import type { AbuseReport, Comment, ContentKind, EntityName, Setting, SocialModule } from "../../social/types";
import { contentKindLabel, entityLabel, moderationActionLabel, reportReasonLabel, reportStatusLabel, reportTargetLabel } from "../../social/types";
import { contentPerm } from "../../context/SocialContext";
import Modal from "../../components/ui/Modal";
import { contentPath } from "./ContentModule";
import { MarkdownView } from "../knowledge/Markdown";
import { ApiChip, Field, UserLine, fa, stamp } from "./kit";

type Tab = "dash" | "review" | "reports" | "comments" | "reactions" | "settings";

const modules: { id: SocialModule; label: string; path: Parameters<typeof endpoints.dashboard>[0]; icon: typeof FileText; to: string }[] = [
  { id: "content", label: "محتوا (مجله، خبر، بلاگ)", path: "content/content", icon: FileText, to: "/dashboard/magazines" },
  { id: "media", label: "رسانه", path: "media/media", icon: ImageIcon, to: "/dashboard/media" },
  { id: "events", label: "رویدادها", path: "events/events", icon: CalendarDays, to: "/dashboard/events" },
  { id: "forums", label: "پرسش و پاسخ", path: "forums/forums", icon: MessagesSquare, to: "/dashboard/forum" },
  { id: "messaging", label: "پیام‌رسان", path: "messaging/messaging", icon: MessageCircle, to: "/dashboard/chat" },
  { id: "relations", label: "ارتباطات", path: "relations/relations", icon: UserPlus, to: "/dashboard/connections" },
];

const appLabel: Record<string, string> = { content: "محتوا", core: "هسته (core)", media: "رسانه", events: "رویدادها", forums: "پرسش و پاسخ", messaging: "پیام‌رسان", relations: "ارتباطات" };
const appOrder = ["content", "core", "media", "events", "forums", "messaging", "relations"];

/** مسیر PATCH تنظیم بر اساس پیشوند کلید (مطابق مسیرهای …/setting/{key}/ در OpenAPI) */
function settingEndpoint(key: string): Ep | null {
  const [app, sub] = key.split(".");
  const p = (base: string): Ep => ({ method: "PATCH", path: `${base}/setting/${key}/` });
  switch (app) {
    case "content":
      return p(`/content/${sub === "blog" ? "blogs" : sub === "magazine" ? "magazines" : "news"}`);
    case "media":
      return p("/media/media/posts");
    case "events":
      return p("/events/events");
    case "forums":
      return p("/forums/forums/topics");
    case "messaging":
      return p(`/messaging/messaging/${["groups", "channels", "direct-messages", "saved-messages", "bots"].includes(sub) ? sub : "groups"}`);
    case "relations":
      return p("/relations/relations/friendships");
    default:
      return null; // core: فقط GET /core/settings/all/
  }
}

export default function SocialAdmin({ embedded = false }: { embedded?: boolean } = {}) {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canComments = hasPermission("comments.moderate");
  const canSettings = hasPermission("social.settings");
  // ?social_tab=review|reports — پیوند اعلان‌های بازبینی و گزارش تخلف مستقیم به همان زبانه
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (params.get("social_tab") as Tab | null) ?? "dash");

  if (!hasPermission("social.dashboards")) return <AccessDenied module="داشبورد مدیریتی شبکه" />;

  const pending = s.comments.filter((c) => !c.approved).sort((a, b) => b.created_at.localeCompare(a.created_at));
  // «پیشنهادی» — صف بازبینی پیش از انتشار (برای دارندگان مجوز manage هر بخش) و صف گزارش‌های تخلف
  const reviewKinds = (["news", "blogs", "magazines"] as ContentKind[]).filter((k) => hasPermission(`${contentPerm(k)}.manage`));
  const reviewQueue = s.content.filter((x) => x.review?.status === "pending" && reviewKinds.includes(x.kind) && s.canView(x, true));
  const openReports = s.reports.filter((r) => r.status === "open");
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "dash", label: "داشبورد" },
    ...(reviewKinds.length ? [{ id: "review" as Tab, label: "صف بازبینی", count: reviewQueue.length }] : []),
    ...(canComments ? [{ id: "reports" as Tab, label: "گزارش‌های تخلف", count: openReports.length }] : []),
    ...(canComments ? [{ id: "comments" as Tab, label: "صف تأیید نظرها", count: pending.length }] : []),
    ...(canSettings ? [{ id: "reactions" as Tab, label: "واکنش‌های مجاز" }, { id: "settings" as Tab, label: "تنظیمات ماژول‌ها" }] : []),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : "dash";

  // ------------------------------------------------------------ نظرها: عنوان و پیوند موجودیت
  const target = (c: Comment): { title: string; to: string | null } => {
    const e = c.entity_name as EntityName;
    const id = c.entity_id;
    switch (e) {
      case "blog":
      case "news":
      case "magazine": {
        const x = s.content.find((i) => i.id === id);
        return { title: x?.title ?? "مطلب حذف‌شده", to: x ? `/dashboard/${x.kind === "news" ? "news" : x.kind === "blogs" ? "blog" : "magazines"}/${x.id}` : null };
      }
      case "media": {
        const x = s.media.find((i) => i.id === id);
        return { title: x?.caption ?? "رسانه‌ی حذف‌شده", to: x ? `/dashboard/media/${id}` : null };
      }
      case "event": {
        const x = s.events.find((i) => i.id === id);
        return { title: x?.title ?? "رویداد حذف‌شده", to: x ? `/dashboard/events/${id}` : null };
      }
      case "topic": {
        const x = s.topics.find((i) => i.id === id);
        return { title: x?.title ?? "پرسش حذف‌شده", to: x ? `/dashboard/forum/${id}` : null };
      }
      case "post": {
        const x = s.posts.find((i) => i.id === id);
        const t = x ? s.topics.find((i) => i.id === x.topic_id) : undefined;
        return { title: t ? `پاسخی در «${t.title}»` : "پاسخ حذف‌شده", to: t ? `/dashboard/forum/${t.id}` : null };
      }
      case "group":
      case "channel": {
        const x = s.chats.find((i) => i.id === id);
        return { title: x?.title ?? "گفتگوی حذف‌شده", to: x ? `/dashboard/${e === "group" ? "groups" : "channels"}/${id}` : null };
      }
    }
  };

  const apiItems: { label: string; ep: Ep }[] =
    active === "dash"
      ? modules.map((m) => ({ label: `داشبورد مدیر — ${m.label}`, ep: endpoints.dashboard(m.path, "admin") }))
      : active === "review"
        ? [
            ...reviewKinds.map((k) => ({ label: `صف بازبینی ${contentKindLabel[k]}`, ep: endpoints.contentReviewQueue(k) })),
            { label: "تأیید و انتشار", ep: endpoints.contentApproveReview("{kind}" as ContentKind, "{id}") },
            { label: "برگشت با یادداشت", ep: endpoints.contentReturnReview("{kind}" as ContentKind, "{id}") },
          ]
        : active === "reports"
          ? [
              { label: "صف گزارش‌های باز", ep: endpoints.reportQueue() },
              { label: "رد گزارش", ep: endpoints.reportDismiss("{id}") },
              { label: "پنهان‌سازی", ep: endpoints.reportHide("{id}") },
              { label: "حذف و اخطار", ep: endpoints.reportRemoveWarn("{id}") },
            ]
      : active === "comments"
        ? [
            { label: "نظرهای تأییدنشده (برای هر entity_name)", ep: endpoints.commentsUnapproved("{entity_name}" as EntityName) },
            { label: "تأیید نظر", ep: endpoints.commentApprove("{entity_name}" as EntityName, "{id}") },
            { label: "حذف نظر", ep: endpoints.commentDelete("{entity_name}" as EntityName, "{id}") },
          ]
        : active === "reactions"
          ? [
              { label: "همه‌ی واکنش‌های مجاز", ep: endpoints.allowedReactions() },
              { label: "واکنش‌های فعال", ep: { method: "GET", path: "/core/allowed-reactions/" } },
            ]
          : [
              { label: "همه‌ی تنظیمات", ep: endpoints.settings() },
              { label: "ویرایش تنظیم یک ماژول", ep: { method: "PATCH", path: "/{module}/setting/{key}/" } },
              { label: "مثال: محتوا/بلاگ", ep: endpoints.contentSetting("blogs", "{key}") },
            ];

  return (
    <div>
      {!embedded && <PageHeader
        title="داشبورد مدیریتی شبکه"
        description="آمار ماژول‌ها، صف تأیید نظرها، واکنش‌های مجاز و تنظیمات شبکه‌ی اجتماعی."
        icon={<LayoutDashboard size={20} />}
        breadcrumb={[{ label: "بخش‌های ویژه مدیران" }, { label: "داشبورد مدیریتی شبکه" }]}
        actions={<ApiChip items={apiItems} />}
      />}
      <Tabs tabs={tabs} active={active} onChange={setTab} />

      {active === "dash" && <DashboardTab />}
      {active === "review" && <ReviewQueueTab />}
      {active === "reports" && <ReportsTab />}

      {active === "comments" && (
        <div className="card">
          <div className="p-3 border-b border-ink-100 flex flex-wrap items-center gap-2">
            <p className="text-[12.5px] text-ink-600 flex-1">
              {pending.length ? `${fa(pending.length)} نظر منتظر تأیید است.` : "صف تأیید خالی است."}
              {s.setting("core.comments.require_approval") !== true && <span className="text-ink-400"> (تأیید پیش از نمایش در تنظیمات خاموش است)</span>}
            </p>
            {pending.length > 1 && (
              <Button
                size="sm"
                variant="primary"
                icon={<CheckCheck size={14} />}
                onClick={() =>
                  confirm({
                    title: `تأیید همه‌ی ${fa(pending.length)} نظر؟`,
                    message: "همه‌ی نظرهای صف برای عموم نمایش داده می‌شوند.",
                    confirmLabel: "بله، تأیید همه",
                    onConfirm: () => {
                      pending.forEach((c) => s.approveComment(c.id));
                      notify(`${fa(pending.length)} نظر تأیید شد.`, "success");
                    },
                  })
                }
              >
                تأیید همه
              </Button>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="py-10">
              <EmptyState icon={<ShieldCheck size={22} />} title="نظری در انتظار تأیید نیست" />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {pending.map((c) => {
                const t = target(c);
                return (
                  <li key={c.id} className="p-3 flex flex-col sm:flex-row sm:items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <UserLine id={c.user_id} size={22} sub={stamp(c.created_at)} />
                        <Badge tone="brand">{entityLabel[c.entity_name]}</Badge>
                        {t.to ? (
                          <Link to={t.to} className="text-[11.5px] text-brand-700 hover:underline truncate max-w-[260px]">
                            {t.title}
                          </Link>
                        ) : (
                          <span className="text-[11.5px] text-ink-400 truncate max-w-[260px]">{t.title}</span>
                        )}
                        {c.parent_id && <span className="text-[10.5px] text-ink-400">(پاسخ به نظر)</span>}
                      </div>
                      <p className="text-[13px] text-ink-800 leading-6 whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        icon={<Check size={13} />}
                        onClick={() => {
                          s.approveComment(c.id);
                          notify("نظر تأیید شد.", "success");
                        }}
                        title={fmtEndpoint(endpoints.commentApprove(c.entity_name, c.id))}
                      >
                        تأیید
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 size={13} />}
                        onClick={() =>
                          confirm({
                            title: "حذف این نظر؟",
                            message: "پاسخ‌های این نظر هم حذف می‌شوند.",
                            onConfirm: () => {
                              s.deleteComment(c.id);
                              notify("نظر حذف شد.", "success");
                            },
                          })
                        }
                        title={fmtEndpoint(endpoints.commentDelete(c.entity_name, c.id))}
                      >
                        حذف
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {active === "reactions" && <ReactionsTab />}

      {active === "settings" && (
        <div className="space-y-4">
          <SettingsTab />
          <div className="card p-4 flex flex-wrap items-center gap-3 border-rose-200">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13px] font-bold text-ink-900">بازنشانی داده‌ی نمونه</p>
              <p className="text-[11.5px] text-ink-500 leading-6">همه‌ی محتوا، گفتگوها، فایل‌ها، نظرها و تنظیمات شبکه به حالت اولیه‌ی نمونه برمی‌گردد (فقط در همین مرورگر).</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={() =>
                confirm({
                  title: "بازنشانی کل داده‌ی شبکه؟",
                  message: "همه‌ی تغییراتی که در بخش شبکه‌ی اجتماعی داده‌اید پاک می‌شود و قابل بازگشت نیست.",
                  confirmLabel: "بله، بازنشانی کن",
                  onConfirm: () => {
                    s.resetSocial();
                    notify("داده‌ی نمونه‌ی شبکه بازنشانی شد.", "success");
                  },
                })
              }
            >
              بازنشانی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================ داشبورد
function DashboardTab() {
  const s = useSocial();
  // فعال‌ترین کاربران — مجموع محتوا، رسانه، پرسش، پاسخ و پیام
  const counts: Record<string, number> = {};
  const add = (uid: string) => (counts[uid] = (counts[uid] ?? 0) + 1);
  s.content.forEach((x) => !x.deleted_at && add(x.user_id));
  s.media.forEach((x) => !x.deleted_at && add(x.user_id));
  s.topics.forEach((x) => !x.deleted_at && add(x.user_id));
  s.posts.forEach((x) => !x.deleted_at && add(x.user_id));
  s.messages.forEach((x) => add(x.user_id));
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const max = top[0]?.[1] ?? 1;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((m) => {
          const stats = s.dashboard(m.id, "admin");
          const I = m.icon;
          const ep = endpoints.dashboard(m.path, "admin");
          return (
            <section key={m.id} className="card p-4 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                  <I size={15} />
                </span>
                <Link to={m.to} className="text-[13px] font-bold text-ink-900 hover:text-brand-700 flex-1 truncate">
                  {m.label}
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {stats.map((st) => (
                  <div key={st.key} className="rounded-lg bg-ink-50 px-2.5 py-2 min-w-0" title={st.key}>
                    <p className="text-[17px] font-bold text-ink-900 tabular-nums leading-6">{fa(st.value)}</p>
                    <p className="text-[10.5px] text-ink-500 truncate">{st.title}</p>
                  </div>
                ))}
              </div>
              <code dir="ltr" className="block text-[10px] text-ink-400 mt-2.5 truncate">
                {fmtEndpoint(ep)}
              </code>
            </section>
          );
        })}
      </div>
      <section className="card p-4 min-w-0 self-start">
        <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5 mb-1">
          <Trophy size={15} className="text-amber-500" /> فعال‌ترین کاربران
        </p>
        <p className="text-[10.5px] text-ink-400 mb-3">مجموع مطلب، رسانه، پرسش، پاسخ و پیام</p>
        {top.length === 0 ? (
          <p className="text-xs text-ink-400">داده‌ای نیست.</p>
        ) : (
          <ul className="space-y-2.5">
            {top.map(([uid, n]) => (
              <li key={uid}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <UserLine id={uid} size={22} />
                  <span className="text-[11.5px] text-ink-600 tabular-nums shrink-0">{fa(n)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(4, (n / max) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ================================================================ واکنش‌ها
function ReactionsTab() {
  const s = useSocial();
  const { notify } = useToast();
  const [emoji, setEmoji] = useState("");
  const [code, setCode] = useState("");
  const add = () => {
    const c = code.trim().toLowerCase().replace(/\s+/g, "_");
    if (!emoji.trim() || !c) return notify("ایموجی و کد را وارد کنید.", "warning");
    if (s.allowedReactions.some((r) => r.code === c)) return notify("این کد قبلاً تعریف شده است.", "warning");
    s.saveAllowedReaction({ emoji: emoji.trim(), code: c, is_active: true });
    setEmoji("");
    setCode("");
    notify("واکنش جدید اضافه شد.", "success");
  };
  const used = (code: string) => s.reactions.filter((r) => r.reaction_code === code).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
      <div className="card">
        <ul className="divide-y divide-ink-100">
          {s.allowedReactions.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-2xl w-9 text-center">{r.emoji}</span>
              <span className="flex-1 min-w-0">
                <code dir="ltr" className="text-[12px] text-ink-700 block truncate text-right">
                  {r.code}
                </code>
                <span className="text-[10.5px] text-ink-400">{fa(used(r.code))} بار استفاده شده</span>
              </span>
              {!r.is_active && <Badge tone="neutral">غیرفعال</Badge>}
              <Toggle on={r.is_active} onChange={() => s.saveAllowedReaction({ ...r, is_active: !r.is_active })} />
            </li>
          ))}
          {s.allowedReactions.length === 0 && <li className="p-4 text-xs text-ink-400">واکنشی تعریف نشده است.</li>}
        </ul>
      </div>
      <div className="card p-4 space-y-3 self-start">
        <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
          <Smile size={15} /> واکنش جدید
        </p>
        <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2">
          <Field label="ایموجی (emoji)">
            <input className="input-field text-center text-lg" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="👏" maxLength={8} />
          </Field>
          <Field label="کد (code)">
            <input className="input-field font-mono" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="clap" />
          </Field>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={add}>
          افزودن
        </Button>
        <p className="text-[10.5px] text-ink-400 leading-5">API فعلی فقط خواندن واکنش‌های مجاز را دارد (GET /core/allowed-reactions/all/)؛ افزودن و فعال/غیرفعال کردن از پنل مدیریت بک‌اند انجام می‌شود.</p>
      </div>
    </div>
  );
}

// ================================================================ تنظیمات
function SettingsTab() {
  const s = useSocial();
  const { notify } = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const groups = [...new Set([...appOrder, ...s.settings.map((x) => x.app_name)])].map((app) => ({ app, items: s.settings.filter((x) => x.app_name === app) })).filter((g) => g.items.length);

  const commit = (st: Setting, raw: string) => {
    if (st.value_type === "int" || st.value_type === "float") {
      const n = st.value_type === "int" ? parseInt(raw, 10) : parseFloat(raw);
      if (Number.isNaN(n)) return notify("عدد معتبر وارد کنید.", "warning");
      if (n === st.value) return;
      s.updateSetting(st.key, n);
    } else {
      if (raw === st.value) return;
      s.updateSetting(st.key, raw);
    }
    setDraft((d) => {
      const { [st.key]: _omit, ...rest } = d;
      void _omit;
      return rest;
    });
    notify(`«${st.label}» ذخیره شد.`, "success");
  };

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.app} className="card">
          <div className="px-4 py-2.5 border-b border-ink-100 flex items-center gap-2">
            <Settings2 size={14} className="text-ink-400" />
            <p className="text-[13px] font-bold text-ink-900 flex-1">{appLabel[g.app] ?? g.app}</p>
            <span className="text-[10.5px] text-ink-400">{fa(g.items.length)} تنظیم</span>
          </div>
          <ul className="divide-y divide-ink-100">
            {g.items.map((st) => {
              const ep = settingEndpoint(st.key);
              const val = draft[st.key] ?? String(st.value);
              return (
                <li key={st.key} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-ink-800">{st.label}</p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <code dir="ltr" className="text-[10.5px] text-ink-500 font-mono break-all">
                        {st.key}
                      </code>
                      <span dir="ltr" className="text-[10px] text-ink-400 font-mono break-all">
                        {ep ? fmtEndpoint(ep) : "GET /core/settings/all/ (بدون PATCH در API)"}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {st.value_type === "bool" ? (
                      <Toggle
                        on={st.value === true}
                        onChange={() => {
                          s.updateSetting(st.key, !(st.value === true));
                          notify(`«${st.label}» ${st.value === true ? "خاموش" : "روشن"} شد.`, "success");
                        }}
                      />
                    ) : (
                      <>
                        <input
                          className={`input-field !py-1.5 ${st.value_type === "str" || st.value_type === "json" ? "w-56 max-w-full" : "w-28"}`}
                          dir="ltr"
                          type={st.value_type === "int" || st.value_type === "float" ? "number" : "text"}
                          step={st.value_type === "float" ? "any" : "1"}
                          value={val}
                          onChange={(e) => setDraft((d) => ({ ...d, [st.key]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && commit(st, val)}
                        />
                        {draft[st.key] !== undefined && draft[st.key] !== String(st.value) && (
                          <Button size="sm" variant="primary" onClick={() => commit(st, val)}>
                            ذخیره
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ================================================================ «پیشنهادی» — صف بازبینی پیش از انتشار
function ReviewQueueTab() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const [viewId, setViewId] = useState<string | null>(null);
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const kinds = (["news", "blogs", "magazines"] as ContentKind[]).filter((k) => hasPermission(`${contentPerm(k)}.manage`));
  const queue = s.content.filter((x) => x.review?.status === "pending" && kinds.includes(x.kind) && s.canView(x, true)).sort((a, b) => (a.review?.submitted_at ?? "").localeCompare(b.review?.submitted_at ?? ""));
  const recent = s.moderationLog.filter((e) => e.action === "review_approve" || e.action === "review_return").slice(0, 6);
  const view = viewId ? s.content.find((x) => x.id === viewId) : undefined;
  const approve = (id: string) => {
    const r = s.approveReview(id);
    notify(r.ok ? "تأیید و منتشر شد؛ نویسنده مطلع شد." : r.error, r.ok ? "success" : "warning");
    setViewId(null);
  };
  return (
    <div className="space-y-4">
      <div className="card">
        <p className="p-3 border-b border-ink-100 text-[12.5px] text-ink-600">
          {queue.length ? `${fa(queue.length)} مطلب منتظر بازبینی پیش از انتشار است (قدیمی‌ترین بالا).` : "صف بازبینی خالی است."} <span className="text-ink-400">مطالب کاربرانی که مجوز انتشار مستقیم ندارند اینجا می‌آیند.</span>
        </p>
        {queue.length === 0 ? (
          <div className="py-10">
            <EmptyState icon={<CheckCircle2 size={22} />} title="مطلبی در انتظار بازبینی نیست" />
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {queue.map((x) => (
              <li key={x.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
                <button onClick={() => setViewId(x.id)} className="min-w-0 flex-1 text-right">
                  <span className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge tone="brand">{contentKindLabel[x.kind]}</Badge>
                    <span className="text-[13px] font-medium text-ink-900 hover:text-brand-700 truncate">{x.title}</span>
                  </span>
                  <span className="block text-[11px] text-ink-400 truncate">
                    {s.userName(x.user_id)} · ارسال {stamp(x.review?.submitted_at)}
                    {(x.review?.history.filter((h) => h.action === "return").length ?? 0) > 0 && ` · ${fa(x.review!.history.filter((h) => h.action === "return").length)} بار برگشت خورده`}
                  </span>
                </button>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="primary" icon={<CheckCircle2 size={13} />} onClick={() => approve(x.id)}>
                    تأیید و انتشار
                  </Button>
                  <Button
                    size="sm"
                    icon={<Undo2 size={13} />}
                    onClick={() => {
                      setReturnFor(x.id);
                      setNote("");
                    }}
                  >
                    برگشت
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {recent.length > 0 && (
        <div className="card p-3">
          <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
            <History size={13} /> آخرین تصمیم‌ها
          </p>
          <ul className="space-y-1">
            {recent.map((e) => (
              <li key={e.id} className="text-[11.5px] text-ink-600 flex items-center gap-2 flex-wrap">
                <Badge tone={e.action === "review_approve" ? "success" : "danger"}>{moderationActionLabel[e.action]}</Badge>
                <span className="truncate max-w-[260px]">{e.target_title}</span>
                <span className="text-ink-400 mr-auto">
                  {s.userName(e.actor_id)} · {stamp(e.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={!!view} onClose={() => setViewId(null)} title={view?.title ?? ""} description={view ? `${contentKindLabel[view.kind]} · ${s.userName(view.user_id)}` : undefined} width="max-w-2xl">
        {view && (
          <div className="space-y-3">
            {view.excerpt && <p className="text-[12.5px] text-ink-600 border-r-2 border-brand-300 pr-3 leading-6">{view.excerpt}</p>}
            <div className="max-h-[50vh] overflow-y-auto">{view.content_format === "markdown" ? <MarkdownView md={view.content} /> : <p className="text-[13px] text-ink-800 leading-7 whitespace-pre-wrap">{view.content}</p>}</div>
            <div className="flex items-center gap-2 pt-2 border-t border-ink-100 flex-wrap">
              <Button variant="primary" size="sm" icon={<CheckCircle2 size={13} />} onClick={() => approve(view.id)}>
                تأیید و انتشار
              </Button>
              <Button size="sm" icon={<Undo2 size={13} />} onClick={() => (setReturnFor(view.id), setNote(""), setViewId(null))}>
                برگشت با یادداشت
              </Button>
              <Link to={contentPath(view)} className="text-[11.5px] text-brand-700 hover:underline mr-auto">
                صفحه‌ی مطلب
              </Link>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!returnFor} onClose={() => setReturnFor(null)} title="برگشت با یادداشت" description={s.content.find((x) => x.id === returnFor)?.title}>
        <div className="space-y-3">
          <textarea className="input-field min-h-[90px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="چه چیزی باید اصلاح شود؟ (برای نویسنده ارسال می‌شود)" autoFocus />
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                if (!returnFor) return;
                const r = s.returnReview(returnFor, note);
                notify(r.ok ? "مطلب با یادداشت به نویسنده برگشت." : r.error, r.ok ? "success" : "warning");
                if (r.ok) setReturnFor(null);
              }}
            >
              ثبت برگشت
            </Button>
            <Button variant="ghost" onClick={() => setReturnFor(null)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ================================================================ «پیشنهادی» — صف گزارش‌های تخلف
function ReportsTab() {
  const s = useSocial();
  const { notify } = useToast();
  const [filter, setFilter] = useState<"open" | "done">("open");
  const [act, setAct] = useState<{ r: AbuseReport; decision: "dismiss" | "hide" | "remove_warn" } | null>(null);
  const [note, setNote] = useState("");
  const list = s.reports.filter((r) => (filter === "open" ? r.status === "open" : r.status !== "open")).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const same = (r: AbuseReport) => s.reports.filter((x) => x.target_type === r.target_type && x.target_id === r.target_id && x.status === "open").length;
  const warnings = (uid: string) => s.moderationLog.filter((e) => e.action === "remove_warn" && e.owner_id === uid).length;
  const linkOf = (r: AbuseReport): string | null => {
    if (r.target_type === "content") {
      const x = s.content.find((c) => c.id === r.target_id);
      return x ? contentPath(x) : null;
    }
    if (r.target_type === "media") return s.media.some((m) => m.id === r.target_id) ? `/dashboard/media/${r.target_id}` : null;
    if (r.target_type === "message") {
      const m = s.messages.find((x) => x.id === r.target_id);
      const c = m ? s.chats.find((x) => x.id === m.chat_id) : undefined;
      if (!c) return null;
      const root = c.parent ?? c.id;
      return c.chat_type === "group" ? `/dashboard/groups/${root}` : c.chat_type === "channel" ? `/dashboard/channels/${root}` : `/dashboard/chat/${c.id}`;
    }
    const cm = s.comments.find((x) => x.id === r.target_id);
    if (!cm) return null;
    if (["news", "blog", "magazine"].includes(cm.entity_name)) {
      const x = s.content.find((c) => c.id === cm.entity_id);
      return x ? contentPath(x) : null;
    }
    return cm.entity_name === "media" ? `/dashboard/media/${cm.entity_id}` : cm.entity_name === "event" ? `/dashboard/events/${cm.entity_id}` : cm.entity_name === "topic" ? `/dashboard/forum/${cm.entity_id}` : null;
  };
  const decisionLabel = { dismiss: "رد گزارش", hide: "پنهان‌سازی", remove_warn: "حذف و اخطار" } as const;
  const run = () => {
    if (!act) return;
    const res = s.resolveReport(act.r.id, act.decision, note);
    notify(res.ok ? (act.decision === "dismiss" ? "گزارش رد شد." : act.decision === "hide" ? "مورد برای دیگران پنهان شد؛ صاحب آن مطلع شد." : "مورد حذف و به صاحب آن اخطار داده شد.") : res.error, res.ok ? "success" : "warning");
    if (res.ok) setAct(null);
  };
  return (
    <div className="card">
      <div className="p-3 border-b border-ink-100 flex items-center gap-2 flex-wrap">
        <p className="text-[12.5px] text-ink-600 flex-1 min-w-[200px]">گزارش‌های کاربران درباره‌ی محتوا، نظر، پیام و رسانه. هر تصمیم در لاگ ممیزی ثبت و به صاحب مورد و گزارش‌دهنده اعلان می‌شود.</p>
        <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50">
          {(
            [
              ["open", `باز (${fa(s.reports.filter((r) => r.status === "open").length)})`],
              ["done", "رسیدگی‌شده"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={`text-xs px-2.5 py-1.5 rounded-md ${filter === id ? "bg-white text-brand-700 font-medium shadow-sm" : "text-ink-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <div className="py-10">
          <EmptyState icon={<ShieldCheck size={22} />} title={filter === "open" ? "گزارش بازی نیست" : "هنوز گزارشی رسیدگی نشده"} />
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {list.map((r) => {
            const to = linkOf(r);
            const n = same(r);
            const w = warnings(r.target_owner_id);
            return (
              <li key={r.id} className="p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="danger" icon={<Flag size={10} />}>
                    {reportReasonLabel[r.reason]}
                  </Badge>
                  <Badge tone="neutral">{reportTargetLabel[r.target_type]}</Badge>
                  {n > 1 && r.status === "open" && <Badge tone="warning">{fa(n)} گزارش</Badge>}
                  {r.status !== "open" && <Badge tone={r.status === "dismissed" ? "neutral" : "navy"}>{reportStatusLabel[r.status]}</Badge>}
                  <span className="text-[11px] text-ink-400 mr-auto">
                    گزارش {s.userName(r.reporter_id)} · {stamp(r.created_at)}
                  </span>
                </div>
                <div className="rounded-lg bg-ink-50 px-3 py-2">
                  <p className="text-[12.5px] text-ink-800 leading-6 break-words">«{r.target_excerpt}»</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    صاحب: {s.userName(r.target_owner_id)}
                    {w > 0 && <span className="text-rose-600"> · {fa(w)} اخطار قبلی</span>}
                    {to ? (
                      <Link to={to} className="text-brand-700 hover:underline mr-2">
                        مشاهده
                      </Link>
                    ) : (
                      <span className="text-ink-400 mr-2">(حذف‌شده)</span>
                    )}
                  </p>
                </div>
                {r.note && <p className="text-[11.5px] text-ink-600">توضیح گزارش‌دهنده: {r.note}</p>}
                {r.status === "open" ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button size="sm" icon={<Check size={13} />} onClick={() => (setAct({ r, decision: "dismiss" }), setNote(""))} title={fmtEndpoint(endpoints.reportDismiss(r.id))}>
                      رد گزارش
                    </Button>
                    <Button size="sm" icon={<EyeOff size={13} />} onClick={() => (setAct({ r, decision: "hide" }), setNote(reportReasonLabel[r.reason]))} disabled={!to} title={fmtEndpoint(endpoints.reportHide(r.id))}>
                      پنهان‌سازی
                    </Button>
                    <Button size="sm" variant="danger" icon={<Ban size={13} />} onClick={() => (setAct({ r, decision: "remove_warn" }), setNote(reportReasonLabel[r.reason]))} disabled={!to} title={fmtEndpoint(endpoints.reportRemoveWarn(r.id))}>
                      حذف و اخطار
                    </Button>
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-500">
                    {s.userName(r.resolved_by ?? "")} · {stamp(r.resolved_at)}
                    {r.resolution_note && ` — «${r.resolution_note}»`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Modal open={!!act} onClose={() => setAct(null)} title={act ? decisionLabel[act.decision] : ""} description={act ? `«${act.r.target_excerpt.slice(0, 80)}»` : undefined}>
        {act && (
          <div className="space-y-3">
            <p className="text-[12px] text-ink-600 leading-6">
              {act.decision === "dismiss"
                ? "گزارش بدون اقدام بسته می‌شود و به گزارش‌دهنده اطلاع داده می‌شود."
                : act.decision === "hide"
                  ? "مورد برای همه به‌جز صاحبش و ناظران پنهان می‌شود و قابل نمایش دوباره است."
                  : "مورد حذف می‌شود و اخطار فوری برای صاحب آن ارسال می‌شود. این اقدام برگشت‌پذیر نیست."}
            </p>
            <textarea className="input-field min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={act.decision === "dismiss" ? "توضیح (اختیاری)" : "دلیل (الزامی؛ برای صاحب مورد ارسال می‌شود)"} />
            <div className="flex gap-2">
              <Button variant={act.decision === "remove_warn" ? "danger" : "primary"} onClick={run}>
                {decisionLabel[act.decision]}
              </Button>
              <Button variant="ghost" onClick={() => setAct(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
