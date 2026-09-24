// ---------------------------------------------------------------------------
// «تیم‌ها و مستندات پروژه» — نمای شبکه‌ای پروژه‌هایی که کاربر در آن‌ها عضو است:
// هم‌تیمی‌ها (با پیام مستقیم از طریق messaging)، آخرین اسناد و صورت‌جلسات منتشرشده.
// داده‌ی پروژه از ماژول مدیریت پروژه (ProjectsContext) خوانده می‌شود.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UsersRound, Search, MessageSquare, FileText, ScrollText, ChevronLeft, ChevronDown, ChevronUp, Crown, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/Avatar";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { useToast } from "../../components/ui/ToastProvider";
import { users } from "../../data/mock";
import { endpoints } from "../../social/endpoints";
import type { PMMember, ProjectRole, ProjectState } from "../../pm/types";
import { ProjectIcon } from "../project/projectIcons";
import { ApiChip, fa } from "./kit";

const roleTone: Record<ProjectRole, BadgeTone> = { مالک: "navy", "مدیر پروژه": "brand", "مدیر سیستم": "warning", عضو: "neutral", مشاهده‌گر: "neutral" };
const MEMBERS_SHOWN = 6;
const DOCS_SHOWN = 4;
const MINUTES_SHOWN = 3;

export default function ProjectTeams() {
  const pm = useProjectsPM();
  const { actingUser, hasPermission } = useTenancy();
  const social = useSocial();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [all, setAll] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const canAll = hasPermission("projects.list");

  const isMine = (m: PMMember) => m.name === actingUser.name || m.userId === actingUser.id;
  const involved = (p: ProjectState) => p.meta.manager === actingUser.name || p.members.some(isMine);
  const term = q.trim();
  const matches = (p: ProjectState) => !term || p.meta.name.includes(term) || p.members.some((m) => m.name.includes(term)) || p.documents.some((d) => d.name.includes(term));

  const list = pm.projects.filter((p) => !p.meta.archived && (all && canAll ? true : involved(p))).filter(matches);

  const message = (m: PMMember) => {
    const uid = m.userId ?? users.find((u) => u.name === m.name)?.id;
    if (!uid) return notify(`«${m.name}» حساب کاربری در شبکه ندارد.`, "warning");
    const chatId = social.openDirect(uid);
    navigate(`/dashboard/chat/${chatId}`);
  };

  const myRole = (p: ProjectState) => {
    const m = p.members.find(isMine);
    if (m) return m.role;
    if (p.meta.manager === actingUser.name) return "مدیر پروژه" as ProjectRole;
    return null;
  };

  return (
    <div>
      <PageHeader
        title="تیم‌ها و مستندات پروژه"
        description="هم‌تیمی‌ها، آخرین اسناد و صورت‌جلسات پروژه‌هایی که در آن‌ها نقش دارید."
        icon={<UsersRound size={20} />}
        breadcrumb={[{ label: "پروژه‌ها و فعالیت‌ها" }, { label: "تیم‌ها و مستندات پروژه" }]}
        actions={
          <ApiChip
            items={[
              { label: "شروع پیام مستقیم با هم‌تیمی", ep: endpoints.chatCreate("direct-messages") },
              { label: "گفتگوهای من", ep: endpoints.chatsMy() },
            ]}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی پروژه، هم‌تیمی یا نام سند…" />
          {q && (
            <button onClick={() => setQ("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-400" aria-label="پاک کردن جستجو">
              <X size={12} />
            </button>
          )}
        </div>
        {canAll && <Toggle on={all} onChange={() => setAll((v) => !v)} label="همه‌ی پروژه‌ها" />}
        <span className="text-[11.5px] text-ink-400 mr-auto">{fa(list.length)} پروژه</span>
      </div>

      {list.length === 0 ? (
        <div className="card py-10">
          <EmptyState icon={<UsersRound size={22} />} title={term ? "موردی پیدا نشد" : "در هیچ پروژه‌ای عضو نیستید"} description={term ? undefined : "وقتی مدیر پروژه شما را به تیم اضافه کند، این‌جا نمایش داده می‌شود."} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {list.map((p) => {
            const id = p.meta.id;
            const expanded = !!open[id];
            const role = myRole(p);
            const members = [...p.members].sort((a, b) => (isMine(a) ? -1 : isMine(b) ? 1 : 0));
            const docs = [...p.documents].filter((d) => !term || d.name.includes(term) || p.meta.name.includes(term) || p.members.some((m) => m.name.includes(term))).reverse();
            const minutes = p.minutes.filter((m) => m.published !== false).slice().reverse();
            const shownMembers = expanded ? members : members.slice(0, MEMBERS_SHOWN);
            const shownDocs = expanded ? docs.slice(0, 10) : docs.slice(0, DOCS_SHOWN);
            const shownMinutes = expanded ? minutes.slice(0, 6) : minutes.slice(0, MINUTES_SHOWN);
            const more = members.length > MEMBERS_SHOWN || docs.length > DOCS_SHOWN || minutes.length > MINUTES_SHOWN;
            return (
              <section key={id} className="card p-4 min-w-0 flex flex-col gap-4">
                {/* سربرگ پروژه */}
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ background: p.meta.color }}>
                    <ProjectIcon name={p.meta.icon} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/dashboard/projects/${id}`} className="text-[14px] font-bold text-ink-900 hover:text-brand-700 line-clamp-1">
                      {p.meta.name}
                    </Link>
                    <p className="text-[11px] text-ink-400 truncate">
                      مدیر پروژه: {p.meta.manager} · {fa(p.members.length)} عضو
                    </p>
                  </div>
                  {role ? <Badge tone={roleTone[role]}>نقش من: {role}</Badge> : <Badge tone="neutral">ناظر</Badge>}
                </div>

                {/* تیم */}
                <div>
                  <p className="text-[11.5px] font-medium text-ink-500 mb-2">تیم پروژه</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {shownMembers.map((m) => {
                      const u = users.find((x) => x.id === m.userId) ?? users.find((x) => x.name === m.name);
                      const self = isMine(m);
                      return (
                        <li key={m.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${self ? "bg-brand-50/60" : "bg-ink-50"}`}>
                          <Avatar name={m.name} color={u?.avatarColor} size={26} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1 text-[12px] font-medium text-ink-800 truncate">
                              {u ? (
                                <Link to={`/dashboard/profile/${u.id}`} className="truncate hover:text-brand-700">
                                  {m.name}
                                </Link>
                              ) : (
                                <span className="truncate">{m.name}</span>
                              )}
                              {p.meta.manager === m.name && <Crown size={11} className="text-amber-500 shrink-0" />}
                            </span>
                            <span className="flex items-center gap-1 min-w-0">
                              <Badge tone={roleTone[m.role]}>{m.role}</Badge>
                              <span className="text-[10.5px] text-ink-400 truncate">{m.title}</span>
                            </span>
                          </span>
                          {!self && u && (
                            <button onClick={() => message(m)} className="p-1.5 rounded-md text-ink-400 hover:text-brand-600 hover:bg-white shrink-0" title={`پیام به ${m.name}`} aria-label={`پیام به ${m.name}`}>
                              <MessageSquare size={14} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!expanded && members.length > MEMBERS_SHOWN && <p className="text-[11px] text-ink-400 mt-1.5">و {fa(members.length - MEMBERS_SHOWN)} نفر دیگر</p>}
                </div>

                {/* اسناد */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11.5px] font-medium text-ink-500">آخرین اسناد ({fa(p.documents.length)})</p>
                    <Link to={`/dashboard/projects/${id}?tab=documents`} className="text-[11.5px] text-brand-700 hover:underline flex items-center gap-0.5">
                      همه‌ی اسناد <ChevronLeft size={12} />
                    </Link>
                  </div>
                  {shownDocs.length === 0 ? (
                    <p className="text-[11.5px] text-ink-400">سندی ثبت نشده است.</p>
                  ) : (
                    <ul className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
                      {shownDocs.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 px-2.5 py-1.5">
                          <FileText size={14} className="text-brand-600 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] text-ink-800 truncate">{d.name}</span>
                            <span className="block text-[10.5px] text-ink-400 truncate">
                              {d.uploadedBy} · {d.date} · {d.size}
                            </span>
                          </span>
                          <span className="hidden sm:inline">
                            <Badge tone="neutral">{d.type}</Badge>
                          </span>
                          <span className="text-[10.5px] text-ink-500 tabular-nums shrink-0">نسخه {fa(d.version)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* صورت‌جلسات */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11.5px] font-medium text-ink-500">صورت‌جلسات منتشرشده ({fa(minutes.length)})</p>
                    <Link to={`/dashboard/projects/${id}?tab=minutes`} className="text-[11.5px] text-brand-700 hover:underline flex items-center gap-0.5">
                      همه <ChevronLeft size={12} />
                    </Link>
                  </div>
                  {shownMinutes.length === 0 ? (
                    <p className="text-[11.5px] text-ink-400">صورت‌جلسه‌ای منتشر نشده است.</p>
                  ) : (
                    <ul className="space-y-1">
                      {shownMinutes.map((m) => (
                        <li key={m.id}>
                          <Link to={`/dashboard/projects/${id}?tab=minutes`} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700">
                            <ScrollText size={13} className="text-ink-400 shrink-0" />
                            <span className="flex-1 truncate">{m.title}</span>
                            <span className="text-[10.5px] text-ink-400 shrink-0">{m.date}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {more && (
                  <button onClick={() => setOpen((o) => ({ ...o, [id]: !expanded }))} className="text-[11.5px] text-ink-500 hover:text-brand-700 flex items-center gap-1 self-center mt-auto">
                    {expanded ? (
                      <>
                        نمایش کمتر <ChevronUp size={13} />
                      </>
                    ) : (
                      <>
                        نمایش بیشتر <ChevronDown size={13} />
                      </>
                    )}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
