// ---------------------------------------------------------------------------
// پروفایل فرد — روی داده‌ی زنده: مطالب و پاسخ‌های منتشرشده، پروژه‌ها و کارهای باز،
// اسناد دانشی، گواهی‌ها، عضویت‌ها و نقش‌ها و «زنجیره‌ی گزارش‌دهی». همه‌چیز با دید بیننده
// فیلتر می‌شود (کسی که در کانتکست فعلی دیده نمی‌شود فقط کارت پایه دارد).
// پارامتر: ?tab=activity|work|knowledge|certs|organization|security
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Briefcase, ShieldCheck, MessageCircle, Laptop, Smartphone, MapPin, LogOut, Lock, Building2 } from "lucide-react";
import { users, posts, activeSessions } from "../data/mock";
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
import { ActivityTab, CertificatesTab, KnowledgeTab, ReportingChain, WorkTab, useProfileData } from "./profile/ProfileTabs";

type TabId = "activity" | "work" | "knowledge" | "certs" | "organization" | "security";
const TAB_IDS: TabId[] = ["activity", "work", "knowledge", "certs", "organization", "security"];
const fa = (n: number) => n.toLocaleString("fa-IR");

export default function Profile() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabId | null;
  const [tabState, setTabState] = useState<TabId>(raw && TAB_IDS.includes(raw) ? raw : "activity");
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
  const tab: TabId = !canSecurity && tabState === "security" ? "activity" : tabState;
  const setTab = (x: TabId) => {
    setTabState(x);
    const next = new URLSearchParams(params);
    if (x === "activity") next.delete("tab");
    else next.set("tab", x);
    setParams(next, { replace: true });
  };

  const userRoles = t.rolesOf(user.id).filter((b) => b.live);
  const memberships = t.membershipsOf(user.id);
  const home = memberships.find((m) => m.primary && m.status === "active") ?? memberships.find((m) => m.status === "active");
  const userPosts = posts.filter((p) => p.authorId === user.id);

  const message = () => {
    const chatId = s.openDirect(user.id);
    if (chatId) navigate(`/dashboard/chat/${chatId}`);
    else notify("گفتگو باز نشد.", "warning");
  };

  const stats = [
    { label: "مطلب", value: d.content.length + d.media.length + d.events.length },
    { label: "پاسخ", value: d.answers.length },
    { label: "پاسخ پذیرفته", value: d.accepted.length },
    { label: "سند دانش", value: d.docs.length },
    { label: "کار باز", value: d.openTasks.length },
    { label: "گواهی", value: d.trainingCerts.length + d.awardCerts.length },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-4 min-w-0">
        <div className="card p-5 text-center">
          <Avatar name={user.name} color={user.avatarColor} size={72} online={user.online} />
          <h1 className="font-bold mt-3 text-ink-900">{user.name}</h1>
          <p className="text-sm text-ink-500">{home?.title ?? user.role}</p>
          <p className="text-xs text-ink-400 mt-1 flex items-center justify-center gap-1">
            <Building2 size={11} /> {home ? t.scopePath(home.scopeId) : user.org}
          </p>
          {!isMe && inView && t.hasPermission("chat.view") && (
            <Button variant="primary" icon={<MessageCircle size={14} />} className="w-full justify-center mt-4" onClick={message}>
              ارسال پیام
            </Button>
          )}
        </div>

        {inView && (
          <div className="card p-4 grid grid-cols-3 gap-2 text-center">
            {stats.map((x) => (
              <div key={x.label} className="rounded-lg bg-ink-50 py-2">
                <p className="text-base font-bold text-ink-900">{fa(x.value)}</p>
                <p className="text-[11px] text-ink-500">{x.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="card p-5">
          <h3 className="text-sm font-bold mb-3 text-ink-900">مهارت‌ها و تخصص‌ها</h3>
          <div className="flex flex-wrap gap-1.5">
            {user.skills.map((x) => (
              <Badge key={x} tone="brand">
                {x}
              </Badge>
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {!inView ? (
          <div className="card">
            <EmptyState icon={<Lock size={20} />} title="این فرد در محدوده‌ی دید شما نیست" description={`در کانتکست «${t.contextNode.name}» فقط اعضای همین واحد، زیرمجموعه‌ها و لایه‌های بالاتر دیده می‌شوند. برای دیدن جزئیات، سازمان یا نقش خود را از سربرگ تغییر دهید.`} />
          </div>
        ) : (
          <>
            <Tabs<TabId>
              tabs={[
                { id: "activity", label: "فعالیت‌ها", count: d.content.length + d.media.length + d.events.length + d.topics.length + d.answers.length },
                { id: "work", label: "پروژه و کارها", count: d.openTasks.length },
                { id: "knowledge", label: "دانش", count: d.docs.length },
                { id: "certs", label: "گواهی‌ها", count: d.trainingCerts.length + d.awardCerts.length },
                { id: "organization", label: "اطلاعات سازمانی" },
                ...(canSecurity ? [{ id: "security" as TabId, label: "امنیت و نشست‌ها" }] : []),
              ]}
              active={tab}
              onChange={setTab}
            />

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
            {tab === "certs" && <CertificatesTab d={d} />}

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
                          <span className="flex-1 min-w-0 truncate text-ink-700">{t.scopePath(m.scopeId)}</span>
                          {m.title && <span className="text-ink-400 shrink-0 hidden sm:inline">{m.title}</span>}
                          {m.primary && <Badge tone="brand">اصلی</Badge>}
                          <Badge tone={m.status === "active" ? "success" : "warning"}>{m.status === "active" ? "فعال" : "معلق"}</Badge>
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
                <div className="card p-5">
                  <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-brand-600" /> نشست‌های فعال
                  </h3>
                  <div className="space-y-3">
                    {activeSessions.map((x) => (
                      <div key={x.id} className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                          {x.device.includes("Android") || x.device.includes("iPhone") ? <Smartphone size={15} /> : <Laptop size={15} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-800">
                            {x.device} {x.current && <Badge tone="success">نشست فعلی</Badge>}
                          </p>
                          <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5 flex-wrap">
                            <MapPin size={11} /> {x.location} · {x.ip} · {x.lastActive}
                          </p>
                        </div>
                        {!x.current && (
                          <Button variant="secondary" size="sm" icon={<LogOut size={12} />} onClick={() => notify("نشست پایان یافت (نمایشی).", "info")}>
                            پایان نشست
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
