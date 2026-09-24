// ---------------------------------------------------------------------------
// «داشبورد مدیریتی شبکه» — ویژه‌ی مدیران:
//   داشبورد هر ماژول (GET /{module}/dashboards/admin/)، صف تأیید نظرها (core/comments)،
//   واکنش‌های مجاز (core/allowed-reactions) و تنظیمات ماژول‌ها (PATCH /{module}/setting/{key}/).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, FileText, Image as ImageIcon, CalendarDays, MessagesSquare, MessageCircle, UserPlus, Check, Trash2, CheckCheck, Plus, RotateCcw, Settings2, Smile, ShieldCheck, Trophy } from "lucide-react";
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
import type { Comment, EntityName, Setting, SocialModule } from "../../social/types";
import { entityLabel } from "../../social/types";
import { ApiChip, Field, UserLine, fa, stamp } from "./kit";

type Tab = "dash" | "comments" | "reactions" | "settings";

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

export default function SocialAdmin() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canComments = hasPermission("comments.moderate");
  const canSettings = hasPermission("social.settings");
  const [tab, setTab] = useState<Tab>("dash");

  if (!hasPermission("social.dashboards")) return <AccessDenied module="داشبورد مدیریتی شبکه" />;

  const pending = s.comments.filter((c) => !c.approved).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "dash", label: "داشبورد" },
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
        return { title: x?.title ?? "مطلب حذف‌شده", to: x ? `/dashboard/${x.kind === "news" ? "news" : "magazines"}/${x.id}` : null };
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
      <PageHeader
        title="داشبورد مدیریتی شبکه"
        description="آمار ماژول‌ها، صف تأیید نظرها، واکنش‌های مجاز و تنظیمات شبکه‌ی اجتماعی."
        icon={<LayoutDashboard size={20} />}
        breadcrumb={[{ label: "بخش‌های ویژه مدیران" }, { label: "داشبورد مدیریتی شبکه" }]}
        actions={<ApiChip items={apiItems} />}
      />
      <Tabs tabs={tabs} active={active} onChange={setTab} />

      {active === "dash" && <DashboardTab />}

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
