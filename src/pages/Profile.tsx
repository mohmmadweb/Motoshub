// ---------------------------------------------------------------------------
// پروفایل فرد — روی داده‌ی زنده: مطالب و پاسخ‌های منتشرشده، پروژه‌ها و کارهای باز،
// اسناد دانشی، گواهی‌ها، عضویت‌ها و نقش‌ها و «زنجیره‌ی گزارش‌دهی». همه‌چیز با دید بیننده
// فیلتر می‌شود (کسی که بیرون از واحدهای عضویت بیننده و زیرمجموعه‌هایشان است فقط کارت پایه دارد).
// v6.8 (`12_profile_*`): سرآیند با تصویر، سِمت، واحد و «خروج از حساب»؛ زبانه‌ی «نمایه من» با اطلاعات
// سازمانیِ قفل (و اینکه برای تغییر با چه کسی هماهنگ شود) و فیلدهای قابل ویرایش واقعی `PATCH me/`.
// پارامتر: ?tab=overview|activity|work|knowledge|organization|preferences|security
// ---------------------------------------------------------------------------
import { useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Briefcase, MessageCircle, Lock, Building2, LogOut, Pencil, Check, X } from "lucide-react";
import { users, posts } from "../data/mock";
import { useTenancy } from "../context/TenancyContext";
import { useSocial } from "../context/SocialContext";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import PostCard from "../components/PostCard";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastProvider";
import { useVisibleData } from "./search/liveData";
import { ActivityTab, KnowledgeTab, ReportingChain, WorkTab, useProfileData } from "./profile/ProfileTabs";
import { ActiveSessionsCard, LoginHistoryCard, PasswordAndSessionsCard } from "./profile/SecurityTab";
import { editableFields, useSelfProfile, type SelfProfilePatch } from "./profile/profileStore";
import { reportingChain, useManagerOverrides } from "./profile/reporting";
import { MyAppearanceTab } from "./Appearance";
import { UserStatusBadge, UserStatusEditor } from "../components/UserStatus";
import { buttonClass } from "../components/ui/Button";

type TabId = "overview" | "activity" | "work" | "knowledge" | "organization" | "preferences" | "security";
const TAB_IDS: TabId[] = ["overview", "activity", "work", "knowledge", "organization", "preferences", "security"];
const fa = (n: number) => n.toLocaleString("fa-IR");

export default function Profile() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabId | null;
  const [tabState, setTabState] = useState<TabId>(raw && TAB_IDS.includes(raw) ? raw : "overview");
  const user = users.find((u) => u.id === id) ?? users[0];
  const t = useTenancy();
  const s = useSocial();
  const navigate = useNavigate();
  const { notify } = useToast();
  const v = useVisibleData();
  const d = useProfileData(user, v);

  const isMe = user.id === t.actingUser.id;
  const inView = isMe || t.visibleUserIds().includes(user.id);
  const canSecurity = isMe || t.hasPermission("users.edit");
  const tab: TabId = (!canSecurity && tabState === "security") || (!isMe && tabState === "preferences") ? "overview" : tabState;
  const setTab = (x: TabId) => {
    setTabState(x);
    const next = new URLSearchParams(params);
    if (x === "overview") next.delete("tab");
    else next.set("tab", x);
    setParams(next, { replace: true });
  };

  const userRoles = t.rolesOf(user.id).filter((b) => b.live);
  const memberships = t.membershipsOf(user.id);
  const home = memberships.find((m) => m.primary && m.status === "active") ?? memberships.find((m) => m.status === "active");
  const userPosts = posts.filter((p) => p.authorId === user.id);

  const message = () => {
    const chatId = s.openDirect(user.id);
    if (chatId) navigate(`/conversations/${chatId}`);
    else notify("گفتگو باز نشد.", "warning");
  };

  const stats = [
    { label: "مطلب", value: d.content.length + d.media.length + d.events.length },
    { label: "پاسخ", value: d.answers.length },
    { label: "پاسخ پذیرفته", value: d.accepted.length },
    { label: "سند دانش", value: d.docs.length },
    { label: "کار باز", value: d.openTasks.length },
  ];

  const self = useSelfProfile(user);
  const shownName = self.displayName;
  const photoInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return notify("حجم تصویر باید کمتر از ۲ مگابایت باشد.", "warning");
    const r = new FileReader();
    r.onload = () => {
      self.patch({ avatar_url: String(r.result) });
      notify("تصویر نمایه به‌روز شد.", "success");
    };
    r.readAsDataURL(f);
  };

  return (
    <div className="max-w-[56rem] mx-auto">
      <section className="card p-5 md:p-6 mb-5 flex flex-wrap items-center gap-5">
        <div className="relative shrink-0">
          {self.values.avatar_url ? <img src={self.values.avatar_url} alt="" className="w-[72px] h-[72px] rounded-full object-cover" /> : <Avatar name={shownName} color={user.avatarColor} size={72} online={user.online} />}
        </div>
        <div className="flex-1 min-w-[14rem]">
          <h1 className="t-page text-ink-900 flex items-center gap-2 flex-wrap">
            {shownName} <UserStatusBadge userId={user.id} />
          </h1>
          <p className="text-[15px] text-ink-600">{home?.title ?? user.role}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {home && (
              <Link to={`/org/${home.scopeId}`}>
                <Badge tone="neutral" icon={<Building2 size={12} />}>
                  {t.scopeLabel(home.scopeId)}
                </Badge>
              </Link>
            )}
            {userRoles[0] && <Badge tone="brand">{userRoles[0].role.name}</Badge>}
          </div>
          {isMe && !t.readOnly && (
            <label className="inline-block mt-2 text-[13px] text-[var(--color-link)] underline cursor-pointer">
              تغییر تصویر
              <input type="file" accept="image/*" className="sr-only" onChange={photoInput} />
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isMe && inView && t.hasPermission("chat.view") && (
            <Button variant="primary" icon={<MessageCircle size={16} />} onClick={message}>
              ارسال پیام
            </Button>
          )}
          {isMe && (
            <Link to="/" className={buttonClass("outline", "md")}>
              <LogOut size={16} /> خروج از حساب
            </Link>
          )}
        </div>
        {inView && (
          <div className="w-full grid grid-cols-3 sm:grid-cols-5 gap-2 text-center border-t border-[var(--color-border)] pt-4">
            {stats.map((x) => (
              <div key={x.label}>
                <p className="text-lg font-bold text-ink-900">{fa(x.value)}</p>
                <p className="text-[12px] text-ink-500">{x.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="min-w-0">
        {!inView ? (
          <div className="card">
            <EmptyState icon={<Lock size={20} />} title="این فرد در محدوده‌ی دید شما نیست" description="فقط اعضای واحدهایی که در آن‌ها عضو هستید و زیرمجموعه‌های آن‌ها دیده می‌شوند." />
          </div>
        ) : (
          <>
            <Tabs<TabId>
              tabs={[
                { id: "overview", label: isMe ? "نمایه من" : "نمایه" },
                { id: "activity", label: "فعالیت‌ها", count: d.content.length + d.media.length + d.events.length + d.topics.length + d.answers.length },
                { id: "work", label: "پروژه و کارها", count: d.openTasks.length },
                { id: "knowledge", label: "دانش", count: d.docs.length },
                { id: "organization", label: "اطلاعات سازمانی" },
                ...(isMe ? [{ id: "preferences" as TabId, label: "تنظیمات تجربه" }] : []),
                ...(canSecurity ? [{ id: "security" as TabId, label: "امنیت" }] : []),
              ]}
              active={tab}
              onChange={setTab}
            />

            {tab === "overview" && <OverviewTab user={user} isMe={isMe} homeScope={home?.scopeId} title={home?.title ?? user.role} />}
            {tab === "preferences" && isMe && (
              <div className="space-y-4">
                <div className="card p-5">
                  <p className="t-card text-ink-900 mb-3">وضعیت من</p>
                  <UserStatusEditor />
                </div>
                <MyAppearanceTab />
              </div>
            )}
            {tab === "activity" && (
              <div className="space-y-4">
                <ActivityTab d={d} />
                {userPosts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-ink-900">پست‌های شبکه</h3>
                    {userPosts.map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === "work" && <WorkTab d={d} user={user} />}
            {tab === "knowledge" && <KnowledgeTab d={d} />}

            {tab === "organization" && (
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
                    <Briefcase size={15} className="text-brand-600" /> پروفایل سازمانی
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-5">
                    <div>
                      <dt className="text-xs text-ink-400 mb-1">سازمان</dt>
                      <dd className="text-ink-800 font-medium">{user.org}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-400 mb-1">سمت سازمانی</dt>
                      <dd className="text-ink-800 font-medium">{home?.title ?? user.role}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-ink-400 mb-1">نقش‌ها و سطح دسترسی</dt>
                      <dd className="flex flex-wrap gap-1">
                        {userRoles.length ? (
                          userRoles.map((b) => (
                            <Badge key={b.id} tone="navy">
                              {b.role.name} · {b.scope.name}
                              {b.validUntil ? ` (تا ${b.validUntil})` : ""}
                            </Badge>
                          ))
                        ) : (
                          <Badge tone="neutral">بدون نقش</Badge>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <h4 className="text-xs font-bold text-ink-500 mb-2">عضویت‌ها</h4>
                  {memberships.length === 0 ? (
                    <p className="text-xs text-ink-400">عضویتی ثبت نشده.</p>
                  ) : (
                    <ul className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
                      {memberships.map((m) => (
                        <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-[12.5px]">
                          <Link to={`/org/${m.scopeId}`} className="flex-1 min-w-0 truncate text-ink-700 hover:text-brand-700">{t.scopePath(m.scopeId)}</Link>
                          {m.title && <span className="text-ink-400 shrink-0 hidden sm:inline">{m.title}</span>}
                          {m.primary && <Badge tone="brand">اصلی</Badge>}
                          <Badge tone={m.status === "active" ? "success" : m.status === "revoked" ? "danger" : "warning"}>{m.status === "active" ? "فعال" : m.status === "revoked" ? "لغوشده" : "معلق"}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <ReportingChain user={user} />
              </div>
            )}

            {tab === "security" && canSecurity && (
              <div className="space-y-4">
                {isMe && <PasswordAndSessionsCard userId={user.id} />}
                {/* آخرین ورودهای موفق — بالای نشست‌های فعال (F07) */}
                <LoginHistoryCard userId={user.id} />
                <ActiveSessionsCard userId={user.id} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ «نمایه من»

/** ردیف اطلاعات قفل: مقدار + «برای تغییر با … هماهنگ کنید» */
function LockedRow({ label, value, contact }: { label: string; value: string; contact: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-1 sm:gap-4 px-5 py-3.5">
      <dt className="text-[13px] text-ink-500 flex items-center gap-1.5">
        <Lock size={13} className="text-ink-400" /> {label}
      </dt>
      <dd>
        <p className="text-[15px] text-ink-900">{value || "—"}</p>
        <p className="text-[12.5px] text-ink-500">{contact}</p>
      </dd>
    </div>
  );
}

function EditableRow({ label, value, dir, editable, onSave }: { label: string; value: string; dir?: "ltr"; editable: boolean; onSave: (v: string) => string | null }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value);
  const [err, setErr] = useState("");
  const save = () => {
    const e = onSave(v.trim());
    if (e) return setErr(e);
    setEdit(false);
    setErr("");
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr_auto] gap-1 sm:gap-4 px-5 py-3 items-center">
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd className="min-w-0">
        {edit ? (
          <>
            <input className="input-field" dir={dir} value={v} autoFocus onChange={(e) => (setV(e.target.value), setErr(""))} onKeyDown={(e) => (e.key === "Enter" ? save() : e.key === "Escape" && (setEdit(false), setV(value)))} aria-label={label} />
            {err && <p className="text-[12.5px] text-rose-600 mt-1">{err}</p>}
          </>
        ) : (
          <p className="text-[15px] text-ink-900 truncate" dir={dir}>
            {value || "—"}
          </p>
        )}
      </dd>
      {editable && (
        <div className="flex gap-1.5">
          {edit ? (
            <>
              <Button size="sm" variant="primary" icon={<Check size={15} />} onClick={save}>
                ثبت
              </Button>
              <Button size="sm" variant="ghost" iconOnly icon={<X size={15} />} aria-label="انصراف" onClick={() => (setEdit(false), setV(value), setErr(""))} />
            </>
          ) : (
            <Button size="sm" variant="outline" icon={<Pencil size={14} />} onClick={() => (setV(value), setEdit(true))}>
              ویرایش
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function OverviewTab({ user, isMe, homeScope, title }: { user: (typeof users)[number]; isMe: boolean; homeScope?: string; title: string }) {
  const t = useTenancy();
  const { notify } = useToast();
  const self = useSelfProfile(user);
  const { map } = useManagerOverrides();
  const chain = reportingChain(t.iam, user.id, t.today, map);
  const manager = chain[0];
  // مسئول اطلاعات سازمانی = نزدیک‌ترین مدیر اعضای واحد اصلی فرد
  const hr = homeScope ? users.find((u) => u.id !== user.id && t.effectiveOf(u.id, homeScope).has("iam.members.manage")) : undefined;
  const hrNote = hr ? `برای تغییر با ${hr.name} (مدیر اعضای ${t.scopeLabel(homeScope)}) هماهنگ کنید.` : "برای تغییر با مدیر اعضای واحد خود هماهنگ کنید.";
  const canEdit = isMe && !t.readOnly;
  const save = (key: keyof SelfProfilePatch) => (v: string) => {
    if ((key === "first_name" || key === "username") && !v) return "این فیلد خالی نمی‌ماند.";
    if (key === "email" && v && !EMAIL.test(v)) return "رایانامه‌ی معتبر نیست.";
    if (key === "username" && !/^[a-z0-9._-]{3,150}$/i.test(v)) return "فقط حروف لاتین، رقم و . _ - (دست‌کم ۳ نویسه).";
    self.patch({ [key]: v });
    notify("ذخیره شد.", "success");
    return null;
  };
  return (
    <div className="space-y-6">
      <section>
        <h2 className="t-section text-ink-900">اطلاعات سازمانی</h2>
        <p className="text-[13.5px] text-ink-500 mb-3">این اطلاعات از منبع سازمانی می‌آید و از اینجا قابل تغییر نیست؛ مسئول هر مورد زیر آن آمده است.</p>
        <dl className="card divide-y divide-[var(--color-border)]">
          <LockedRow label="سِمت" value={title} contact={hrNote} />
          <LockedRow label="واحد" value={homeScope ? t.scopePath(homeScope) : user.org} contact={hrNote} />
          <LockedRow label="مدیر مستقیم" value={manager ? `${manager.name} (${manager.title})` : ""} contact={hrNote} />
          <LockedRow label="تاریخ شروع همکاری" value={user.joinedAt ?? ""} contact={hrNote} />
          <LockedRow label="شماره همراه" value={user.mobile ?? ""} contact="شماره‌ی ورود است؛ برای تغییر با راهبر سامانه هماهنگ کنید." />
        </dl>
      </section>
      <section>
        <h2 className="t-section text-ink-900">اطلاعات تماس و شخصی</h2>
        <p className="text-[13.5px] text-ink-500 mb-3">{canEdit ? "این‌ها را خودتان می‌توانید تغییر دهید؛ کنار هر مورد «ویرایش» را بزنید." : "اطلاعاتی که خود فرد ثبت کرده است."}</p>
        <dl className="card divide-y divide-[var(--color-border)]">
          {editableFields.map((f) => (
            <EditableRow key={f.key} label={f.label} dir={f.dir} value={self.values[f.key] ?? ""} editable={canEdit} onSave={save(f.key)} />
          ))}
        </dl>
      </section>
      {user.skills.length > 0 && (
        <section>
          <h2 className="t-section text-ink-900 mb-3">مهارت‌ها و تخصص‌ها</h2>
          <div className="card p-5 flex flex-wrap gap-1.5">
            {user.skills.map((x) => (
              <Badge key={x} tone="brand">
                {x}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
