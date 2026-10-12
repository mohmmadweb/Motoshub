// ---------------------------------------------------------------------------
// F18 «پروفایل سازمانی» (۲.۱.۵) — /dashboard/org/:id برای هر لایه‌ی IAM (سیستم/هلدینگ/شرکت/واحد):
// سربرگ (کاور، لوگو، نام، نوع لایه، سازمان بالادست، شعار، راه‌های تماس)، «پیام به روابط عمومی»،
// تب‌های معرفی (متن، حوزه‌ها، آمار، مدیران، اکوسیستم نوآوری)، اعضا (قابل جستجو)، واحدهای زیرمجموعه (درخت)،
// پروژه‌ها، محتوا (خبر، رویداد، رسانه) و اسناد عمومی.
// ویرایش فقط برای مدیر همان لایه (یا لایه‌های بالاتر)؛ لایه‌های بالادست برای مدیران پایین‌دست فقط‌خواندنی‌اند.
// ---------------------------------------------------------------------------
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, ChevronLeft, FileText, FolderKanban, Globe, Mail, MapPin, MessageCircle, Network, Pencil, Phone, Search, Users } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useInnovation } from "../../context/InnovationContext";
import { useEffectiveBranding } from "../../iam/hooks";
import { BrandMark } from "../../iam/BrandMark";
import { useLocalStore } from "../../iam/store";
import { bindingLive, descendantsOrSelf, type ScopeNode } from "../../iam/model";
import { emitSettingsChange } from "../../iam/settingsAudit";
import { users } from "../../data/mock";
import { contentKindLabel } from "../../social/types";
import { platformEndpoints } from "../../lib/platformEndpoints";
import { entityHref } from "../innovation/shared";
import { ApiChip, Field } from "../social/kit";
import { emptyProfile, orgFieldLabel, orgStore, type OrgField, type OrgProfile as Profile } from "./store";

type TabId = "about" | "members" | "units" | "projects" | "content" | "docs";
const fa = (n: number) => n.toLocaleString("fa-IR");
type ScopedLike = { holdingId?: string; companyId?: string; scope?: string; scopeId?: string };

export default function OrgProfile() {
  const { id = "" } = useParams();
  const t = useTenancy();
  const node = t.iam.scopes.find((n) => n.id === id);
  if (!node) return <EmptyState icon={<Building2 size={22} />} title="سازمان پیدا نشد" description="این لایه در ساختار سازمانی وجود ندارد یا حذف شده است." />;
  return <OrgPage key={node.id} node={node} />;
}

function OrgPage({ node }: { node: ScopeNode }) {
  const t = useTenancy();
  const s = useSocial();
  const pm = useProjectsPM();
  const km = useKnowledge();
  const inn = useInnovation();
  const brand = useEffectiveBranding(node.id);
  const st = useLocalStore(orgStore);
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("about");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(false);
  const profile: Profile = st.profiles[node.id] ?? emptyProfile(node.id);

  const subtree = useMemo(() => descendantsOrSelf(t.iam, node.id), [t.iam, node.id]);
  const subIds = useMemo(() => new Set(subtree.map((n) => n.id)), [subtree]);
  const parent = node.parentId ? t.iam.scopes.find((n) => n.id === node.parentId) : undefined;
  // ویرایش: مدیر همین لایه یا لایه‌های بالاتر (canAdmin ارث‌بری پیازی دارد) — مجوز پیشنهادی org.profile.edit
  const canEdit = !t.readOnly && (t.canAdmin(node.id, "org.profile.edit") || t.canAdmin(node.id, "iam.structure.manage") || t.canAdmin(node.id, "settings.branding"));
  const insider = subIds.has(t.contextId) || t.membershipsOf(t.actingUser.id).some((m) => subIds.has(m.scopeId));
  const showField = (f: OrgField) => !!profile[f] && (insider || canEdit || (st.allowed_public.includes(f) && profile.public_fields.includes(f)));

  /** آیا یک آیتم دامنه‌دار متعلق به این لایه (و زیرمجموعه‌هایش) است؟ */
  const belongs = (x: ScopedLike) => {
    if (x.scopeId) return subIds.has(x.scopeId);
    if (node.type === "system") return !x.holdingId && !x.companyId;
    if (node.type === "holding") return x.holdingId === node.id || (!!x.companyId && subIds.has(x.companyId));
    if (node.type === "company") return x.companyId === node.id;
    return false;
  };

  // ---------------------------------------------------------------- داده‌ها
  const visible = new Set(t.visibleUserIds());
  const memberships = t.membersOf(node.id, true).filter((m) => m.status === "active" && visible.has(m.userId));
  const memberIds = [...new Set(memberships.map((m) => m.userId))];
  const managers = t.iam.bindings
    .filter((b) => b.scopeId === node.id && b.active && bindingLive(b, t.today) && t.isAdminRole(t.iam.roles.find((r) => r.id === b.roleId)))
    .map((b) => ({ userId: b.userId, role: t.iam.roles.find((r) => r.id === b.roleId)?.name ?? "" }))
    .filter((m, i, a) => a.findIndex((x) => x.userId === m.userId) === i);
  const projects = t.hasPermission("projects.list")
    ? t
        .filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p })))
        .map((x) => x._p)
        .filter((p) => !p.meta.archived && belongs(p.meta) && (p.meta.visibility !== "خصوصی" || p.members.some((m) => m.name === t.actingUser.name)))
    : [];
  const pub = <T extends { is_public: boolean; is_draft: boolean; deleted_at: string | null }>(x: T) => x.is_public && !x.is_draft && !x.deleted_at;
  const content = [
    ...s.content.filter((c) => pub(c) && s.canView(c) && belongs(c)).map((c) => ({ id: c.id, title: c.title, kind: contentKindLabel[c.kind], to: `/dashboard/${c.kind === "blogs" ? "blog" : c.kind}/${c.id}`, at: c.published_at ?? c.created_at })),
    ...s.events.filter((e) => pub(e) && s.canView(e) && belongs(e)).map((e) => ({ id: e.id, title: e.title, kind: "رویداد", to: `/dashboard/events/${e.id}`, at: e.start_date })),
    ...s.media.filter((m) => pub(m) && s.canView(m) && belongs(m)).map((m) => ({ id: m.id, title: m.caption || "رسانه", kind: "رسانه", to: `/dashboard/media/${m.id}`, at: m.published_at ?? m.created_at })),
  ].sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
  const docs = km.docs.filter((d) => d.status === "منتشرشده" && d.access === "عمومی" && km.canSee(d) && belongs(d));
  const eco = inn.entities.filter((e) => (node.type === "holding" && e.holdingId === node.id) || (node.type === "company" && e.companyId === node.id));
  const children = (pid: string) => t.iam.scopes.filter((n) => n.parentId === pid && n.active);
  const units = subtree.filter((n) => n.id !== node.id && n.active);

  const pr = managers[0]?.userId;
  const messagePr = () => {
    if (!pr) return;
    const cid = s.openDirect(pr, `سلام؛ از صفحه‌ی سازمانی «${node.name}» پیام می‌دهم.`);
    navigate(`/dashboard/chat/${cid}`);
  };

  const filteredMembers = memberIds
    .map((uid) => ({ u: users.find((x) => x.id === uid), m: memberships.find((x) => x.userId === uid)! }))
    .filter((x) => x.u && (!q.trim() || x.u.name.includes(q.trim()) || (x.m.title ?? "").includes(q.trim())));

  const crumbs = t.iam.scopes.length ? pathOf(t.iam.scopes, node).map((n) => ({ label: n.name, to: n.id === node.id ? undefined : `/dashboard/org/${n.id}` })) : [];

  return (
    <div>
      <PageHeader
        title={node.name}
        breadcrumb={crumbs}
        actions={
          <>
            <ApiChip items={[{ label: "پروفایل سازمان", ep: platformEndpoints.orgProfile(node.id) }, ...(canEdit ? [{ label: "ویرایش پروفایل", ep: platformEndpoints.orgProfileUpdate(node.id) }] : [])]} />
            {canEdit && (
              <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>
                ویرایش صفحه
              </Button>
            )}
          </>
        }
      />

      {/* سربرگ */}
      <div className="card overflow-hidden mb-4">
        <div className="h-28 sm:h-40 relative" style={profile.cover ? { backgroundImage: `url(${profile.cover})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: `linear-gradient(135deg, ${brand.color}, color-mix(in srgb, ${brand.color} 45%, #0b1730))` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="px-4 sm:px-5 pb-4 -mt-8 relative">
          <div className="flex items-end gap-3 flex-wrap">
            <span className="rounded-xl ring-4 ring-white bg-white shrink-0">
              {profile.logo ? <img src={profile.logo} alt="" className="w-16 h-16 rounded-xl object-contain" /> : <BrandMark logo={brand.logo} initials={brand.initials} color={node.color ?? brand.color} size={64} />}
            </span>
            <div className="min-w-0 flex-1 pt-9">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-[16px] font-extrabold text-ink-900">{node.name}</h2>
                <Badge tone="navy">{t.scopeTypeLabel[node.type]}</Badge>
                {!node.active && <Badge tone="danger">غیرفعال</Badge>}
              </div>
              {profile.tagline && <p className="text-[12.5px] text-ink-500 mt-0.5">{profile.tagline}</p>}
              {parent && (
                <p className="text-[11.5px] text-ink-400 mt-0.5">
                  زیرمجموعه‌ی{" "}
                  <Link to={`/dashboard/org/${parent.id}`} className="text-brand-700 hover:underline">
                    {parent.name}
                  </Link>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {t.hasPermission("chat.view") && pr && pr !== t.actingUser.id && (
                <Button size="sm" icon={<MessageCircle size={13} />} onClick={messagePr} title={`گفتگو با ${users.find((u) => u.id === pr)?.name}`}>
                  پیام به روابط عمومی
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-3 text-[12px] text-ink-600">
            {showField("website") && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-700" dir="ltr">
                <Globe size={13} /> {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {showField("email") && (
              <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-brand-700" dir="ltr">
                <Mail size={13} /> {profile.email}
              </a>
            )}
            {showField("phone") && (
              <span className="flex items-center gap-1">
                <Phone size={13} /> {profile.phone}
              </span>
            )}
            {showField("address") && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {profile.address}
              </span>
            )}
          </div>
        </div>
      </div>

      <Tabs<TabId>
        tabs={[
          { id: "about", label: "معرفی" },
          { id: "members", label: "اعضا", count: memberIds.length },
          { id: "units", label: "واحدهای زیرمجموعه", count: units.length },
          { id: "projects", label: "پروژه‌ها", count: projects.length },
          { id: "content", label: "محتوا", count: content.length },
          { id: "docs", label: "اسناد عمومی", count: docs.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "about" && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
          <div className="space-y-4 min-w-0">
            <div className="card p-4">
              <p className="text-[13px] font-bold text-ink-900 mb-2">درباره‌ی {node.name}</p>
              <p className="text-[13px] text-ink-700 leading-7 whitespace-pre-line">{profile.about || (node.field ? `${t.scopeTypeLabel[node.type]} فعال در حوزه‌ی ${node.field}.` : "هنوز معرفی‌ای ثبت نشده است.")}</p>
              {(profile.domains.length > 0 || node.field) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[...new Set([node.field, ...profile.domains].filter(Boolean) as string[])].map((d) => (
                    <span key={d} className="text-[11.5px] rounded-full bg-brand-50 text-brand-700 border border-brand-100 px-2.5 py-0.5">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { l: "عضو", v: memberIds.length, icon: Users },
                { l: "واحد زیرمجموعه", v: units.length, icon: Network },
                { l: "پروژه", v: projects.length, icon: FolderKanban },
                { l: "محتوای منتشرشده", v: content.length, icon: FileText },
              ].map((x) => (
                <div key={x.l} className="card px-3 py-2.5 flex items-center gap-2.5">
                  <x.icon size={16} className="text-brand-600 shrink-0" />
                  <div>
                    <p className="text-[15px] font-black text-ink-900 leading-5">{fa(x.v)}</p>
                    <p className="text-[10.5px] text-ink-500">{x.l}</p>
                  </div>
                </div>
              ))}
            </div>
            {eco.length > 0 && (
              <div className="card p-4">
                <p className="text-[13px] font-bold text-ink-900 mb-2">اکوسیستم نوآوری مرتبط</p>
                <ul className="divide-y divide-ink-100">
                  {eco.map((e) => (
                    <li key={e.id}>
                      <Link to={entityHref(e.id)} className="flex items-center justify-between gap-2 py-2 text-[12.5px] text-ink-700 hover:text-brand-700">
                        <span className="truncate">{e.name}</span>
                        <span className="text-[11px] text-ink-400 shrink-0">{e.field}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="card p-4 h-fit">
            <p className="text-[13px] font-bold text-ink-900 mb-2">مدیران</p>
            {managers.length ? (
              <ul className="space-y-2">
                {managers.map((m) => {
                  const u = users.find((x) => x.id === m.userId);
                  return u ? (
                    <li key={m.userId}>
                      <Link to={`/dashboard/profile/${u.id}`} className="flex items-center gap-2.5 hover:bg-ink-50 rounded-lg p-1 -m-1">
                        <Avatar name={u.name} color={u.avatarColor} size={32} />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-medium text-ink-800 truncate">{u.name}</span>
                          <span className="block text-[11px] text-ink-500 truncate">{m.role}</span>
                        </span>
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-400">{node.lead ? `سرپرست: ${node.lead}` : "مدیری در همین لایه تعیین نشده است."}</p>
            )}
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-ink-100">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
              <input className="input-field ps-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام یا سمت…" aria-label="جستجوی اعضا" />
            </div>
          </div>
          {filteredMembers.length === 0 ? (
            <p className="text-xs text-ink-400 p-4">{memberIds.length ? "عضوی با این مشخصات نیست." : "عضو قابل‌مشاهده‌ای در این لایه نیست."}</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-100">
              {filteredMembers.map(({ u, m }) => (
                <li key={u!.id} className="bg-white">
                  <Link to={`/dashboard/profile/${u!.id}`} className="flex items-center gap-2.5 p-3 hover:bg-ink-50">
                    <Avatar name={u!.name} color={u!.avatarColor} size={34} />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-medium text-ink-800 truncate">{u!.name}</span>
                      <span className="block text-[11px] text-ink-500 truncate">
                        {m.title || t.primaryRoleOf(u!.id)?.name || u!.role}
                        {m.scopeId !== node.id && ` · ${t.scopeLabel(m.scopeId)}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "units" && (
        <div className="card p-2">
          {children(node.id).length === 0 ? <p className="text-xs text-ink-400 p-3">زیرمجموعه‌ای ندارد.</p> : <UnitTree nodes={children(node.id)} childrenOf={children} typeLabel={(n) => t.scopeTypeLabel[n.type]} />}
        </div>
      )}

      {tab === "projects" && (
        <ListCard empty="پروژه‌ی قابل‌مشاهده‌ای برای این سازمان نیست.">
          {projects.map((p) => (
            <Row key={p.meta.id} to={`/dashboard/projects/${p.meta.id}`} title={p.meta.name} meta={`${p.meta.phase} · سلامت ${p.meta.health} · ${p.meta.manager}`} />
          ))}
        </ListCard>
      )}
      {tab === "content" && (
        <ListCard empty="محتوای منتشرشده‌ای از این سازمان نیست.">
          {content.slice(0, 50).map((c) => (
            <Row key={c.id} to={c.to} title={c.title} meta={`${c.kind}${c.at ? ` · ${String(c.at).split(" ")[0]}` : ""}`} />
          ))}
        </ListCard>
      )}
      {tab === "docs" && (
        <ListCard empty="سند عمومیِ منتشرشده‌ای برای این سازمان نیست.">
          {docs.map((d) => (
            <Row key={d.id} to={`/dashboard/knowledge?doc=${d.id}`} title={d.title} meta={`${d.type} · ${d.code}`} />
          ))}
        </ListCard>
      )}

      {editing && <EditProfile node={node} profile={profile} allowed={st.allowed_public} onClose={() => setEditing(false)} />}
    </div>
  );
}

function pathOf(all: ScopeNode[], node: ScopeNode): ScopeNode[] {
  const out: ScopeNode[] = [];
  let cur: ScopeNode | undefined = node;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift(cur);
    cur = cur.parentId ? all.find((n) => n.id === cur!.parentId) : undefined;
  }
  return out;
}

function UnitTree({ nodes, childrenOf, typeLabel, depth = 0 }: { nodes: ScopeNode[]; childrenOf: (id: string) => ScopeNode[]; typeLabel: (n: ScopeNode) => string; depth?: number }) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.id}>
          <Link to={`/dashboard/org/${n.id}`} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-ink-50" style={{ paddingInlineStart: 8 + depth * 18 }}>
            {depth > 0 && <ChevronLeft size={12} className="text-ink-300 shrink-0" />}
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: n.color ?? "var(--color-brand-500)" }} />
            <span className="text-[13px] text-ink-800 truncate flex-1">{n.name}</span>
            <span className="text-[10.5px] text-ink-400 shrink-0">{typeLabel(n)}</span>
          </Link>
          {childrenOf(n.id).length > 0 && <UnitTree nodes={childrenOf(n.id)} childrenOf={childrenOf} typeLabel={typeLabel} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

function ListCard({ empty, children }: { empty: string; children: ReactNode[] }) {
  return <div className="card overflow-hidden">{children.length ? <ul className="divide-y divide-ink-100">{children}</ul> : <p className="text-xs text-ink-400 p-4">{empty}</p>}</div>;
}
function Row({ to, title, meta }: { to: string; title: string; meta: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink-50">
        <span className="text-[13px] text-ink-800 truncate">{title}</span>
        <span className="text-[11px] text-ink-400 shrink-0">{meta}</span>
      </Link>
    </li>
  );
}

const COVERS = ["", "/img/meeting.jpg", "/img/energy.jpg", "/img/factory.jpg", "/img/lab.jpg", "/img/agri-drone.jpg", "/img/rail.jpg", "/img/datacenter.jpg", "/img/dairy.jpg", "/img/construction.jpg"];

function EditProfile({ node, profile, allowed, onClose }: { node: ScopeNode; profile: Profile; allowed: OrgField[]; onClose: () => void }) {
  const t = useTenancy();
  const { notify } = useToast();
  const [d, setD] = useState<Profile>(profile);
  const [domains, setDomains] = useState(profile.domains.join("، "));
  const set = (p: Partial<Profile>) => setD((x) => ({ ...x, ...p }));
  const upload = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 512 * 1024) return notify("لوگو باید تصویر و حداکثر ۵۱۲ کیلوبایت باشد.", "warning");
    const r = new FileReader();
    r.onload = () => set({ logo: String(r.result) });
    r.readAsDataURL(f);
  };
  const save = () => {
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) return notify("ایمیل معتبر نیست.", "warning");
    if (d.website && !/^https?:\/\//.test(d.website)) return notify("وب‌سایت باید با http:// یا https:// شروع شود.", "warning");
    const next: Profile = { ...d, domains: domains.split(/[،,]/).map((x) => x.trim()).filter(Boolean), updated_at: `${t.today}`, updated_by: t.actingUser.id };
    orgStore.set((x) => ({ ...x, profiles: { ...x.profiles, [node.id]: next } }));
    const short = (p: Profile) => ({ tagline: p.tagline, about: p.about.slice(0, 60), website: p.website, address: p.address, phone: p.phone, email: p.email, domains: p.domains.join("، "), public_fields: p.public_fields.join(","), logo: p.logo ? "[تصویر]" : "", cover: p.cover });
    emitSettingsChange({ area: "پروفایل سازمانی", summary: `ویرایش صفحه‌ی «${node.name}»`, before: short(profile), after: short(next), scopeId: node.id });
    notify("صفحه‌ی سازمان ذخیره شد.", "success");
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`ویرایش صفحه‌ی «${node.name}»`} description={`PATCH /identity/iam/scopes/${node.id}/profile/`} width="max-w-2xl">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="شعار (tagline)">
            <input className="input-field" value={d.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </Field>
          <Field label="حوزه‌ها و تخصص‌ها (domains)" hint="با ویرگول جدا کنید">
            <input className="input-field" value={domains} onChange={(e) => setDomains(e.target.value)} />
          </Field>
        </div>
        <Field label="معرفی (about)">
          <textarea className="input-field min-h-28" value={d.about} onChange={(e) => set({ about: e.target.value })} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(orgFieldLabel) as OrgField[]).map((f) => (
            <div key={f}>
              <Field label={`${orgFieldLabel[f]} (${f})`}>
                <input className="input-field" dir={f === "address" ? undefined : "ltr"} value={d[f]} onChange={(e) => set({ [f]: e.target.value } as Partial<Profile>)} />
              </Field>
              <label className={`flex items-center gap-1.5 text-[11px] mt-1 ${allowed.includes(f) ? "text-ink-500" : "text-ink-300"}`} title={allowed.includes(f) ? undefined : "راهبر سامانه نمایش عمومی این فیلد را مجاز نکرده است"}>
                <input type="checkbox" disabled={!allowed.includes(f)} checked={d.public_fields.includes(f)} onChange={(e) => set({ public_fields: e.target.checked ? [...d.public_fields, f] : d.public_fields.filter((x) => x !== f) })} />
                نمایش برای کاربران بیرون از این سازمان
              </label>
            </div>
          ))}
        </div>
        <div>
          <span className="block text-[12px] font-semibold text-ink-700 mb-1">تصویر کاور (cover)</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {COVERS.map((c) => (
              <button key={c || "none"} type="button" onClick={() => set({ cover: c })} className={`shrink-0 w-16 h-10 rounded-md border-2 overflow-hidden text-[10px] text-ink-500 ${d.cover === c ? "border-brand-500" : "border-ink-200"}`}>
                {c ? <img src={c} alt="" className="w-full h-full object-cover" /> : "رنگ برند"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-ink-700">لوگو (logo)</span>
          {d.logo && <img src={d.logo} alt="" className="w-9 h-9 rounded-md object-contain border border-ink-200" />}
          <label className="text-[12px] text-brand-700 hover:underline cursor-pointer">
            بارگذاری
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {d.logo && (
            <button type="button" className="text-[12px] text-ink-500 hover:text-rose-600" onClick={() => set({ logo: "" })}>
              برداشتن (استفاده از لوگوی برند)
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" onClick={save}>
            ذخیره
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** راهبر: کدام راه‌های تماس می‌توانند عمومی باشند (تنظیمات سامانه) */
export function OrgPublicFieldsCard() {
  const st = useLocalStore(orgStore);
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const can = hasPermission("settings.system");
  const toggle = (f: OrgField) => {
    const next = st.allowed_public.includes(f) ? st.allowed_public.filter((x) => x !== f) : [...st.allowed_public, f];
    orgStore.set((x) => ({ ...x, allowed_public: next }));
    emitSettingsChange({ area: "پروفایل سازمانی", summary: "فیلدهای قابل نمایش عمومی پروفایل سازمانی", before: { allowed_public: st.allowed_public.join(",") }, after: { allowed_public: next.join(",") } });
    notify("ذخیره شد.", "success");
  };
  return (
    <div className="card p-4 space-y-2.5">
      <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
        <Building2 size={15} className="text-brand-600" /> پروفایل سازمانی — فیلدهای عمومی
      </p>
      <p className="text-[11.5px] text-ink-500">راه‌های تماسی که مدیر هر سازمان مجاز است برای کاربران بیرون از همان سازمان نمایش دهد.</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(orgFieldLabel) as OrgField[]).map((f) => (
          <label key={f} className={`flex items-center gap-1.5 text-[12.5px] rounded-lg border px-2.5 py-1.5 ${st.allowed_public.includes(f) ? "border-brand-300 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-600"}`}>
            <input type="checkbox" disabled={!can} checked={st.allowed_public.includes(f)} onChange={() => toggle(f)} />
            {orgFieldLabel[f]}
          </label>
        ))}
      </div>
    </div>
  );
}
