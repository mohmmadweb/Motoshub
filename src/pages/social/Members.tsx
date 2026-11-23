// ---------------------------------------------------------------------------
// «اعضای سازمان» — جدول اعضا مطابق نسخه‌ی اصلی موتوشاب:
//   نام کاربری · شماره موبایل · ایمیل · تاریخ عضویت · فعالیت اخیر · درخواست دوستی
// نوار ابزار: جستجو، فیلتر (همه اعضا / دوستان / درخواست‌های در انتظار)، مرتب‌سازی؛ پایین: شمار + صفحه‌بندی ۱۰تایی.
// افراد = useTenancy().visibleUserIds() (اعضای واحدهای عضویت من و زیرمجموعه‌ها). کلیک ردیف → برگه‌ی کناری همکار.
// زبانه‌ها (MATRIX §4): همه اعضا · واحدها (فقط‌خواندنی، اجتماع زیردرخت عضویت‌ها) · ساختار سازمانی («شما اینجا هستید»)
// · لیست درخواست‌ها · لیست بلاک شده‌ها. API: GET /identity/iam/tenant/member-directory/ ، /identity/iam/tenant/scopes/
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, UserPlus, User, Clock, Check, Users, ChevronLeft, MessageSquare, IdCard, Upload, Network, Ban, ShieldOff } from "lucide-react";
import Avatar from "../../components/Avatar";
import Tabs from "../../components/ui/Tabs";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { users, type UserProfile } from "../../data/mock";
import { endpoints } from "../../social/endpoints";
import type { ScopeNode } from "../../iam/model";
import { ApiChip } from "./kit";

const fa = (n: number) => n.toLocaleString("fa-IR");
const PAGE = 10;

type Filter = "all" | "friends";
type Tab = "all" | "units" | "chart" | "requests" | "blocked";
const tabIds: Tab[] = ["all", "units", "chart", "requests", "blocked"];
/** عضویت (تحمل نام فیلد قدیمی دمو userId/scopeId و نام واقعی principal_id/scope) */
type MLike = { userId?: string; principal_id?: string; scopeId?: string; scope?: unknown; status?: string; title?: string };
const mUser = (m: MLike) => m.userId ?? m.principal_id ?? "";
const mScope = (m: MLike) => m.scopeId ?? (typeof m.scope === "string" ? m.scope : "");
type Sort = "newest" | "oldest" | "name";

/** پایین جدول: «نمایش N آیتم» · «مجموع: N» */
export function TableFooter({ shown, total }: { shown: number; total: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-ink-100 text-[11.5px] text-ink-500">
      <span>نمایش {fa(shown)} آیتم</span>
      <span>مجموع: {fa(total)}</span>
    </div>
  );
}

/** صفحه‌بندی «قبلی ۱ ۲ … بعدی» */
export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => from + i);
  const btn = "h-9 min-w-9 px-3 rounded-lg text-[12.5px] border transition-colors disabled:opacity-40 disabled:cursor-default";
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-4" aria-label="صفحه‌بندی">
      <button type="button" className={`${btn} border-ink-200 bg-white text-ink-700 hover:border-brand-300`} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        قبلی
      </button>
      {nums.map((n) => (
        <button key={n} type="button" aria-current={n === page ? "page" : undefined} className={`${btn} ${n === page ? "border-brand-200 bg-brand-100 text-brand-700 font-semibold" : "border-ink-200 bg-white text-ink-700 hover:border-brand-300"}`} onClick={() => onChange(n)}>
          {fa(n)}
        </button>
      ))}
      <button type="button" className={`${btn} border-ink-200 bg-white text-ink-700 hover:border-brand-300`} disabled={page >= pages} onClick={() => onChange(page + 1)}>
        بعدی
      </button>
    </nav>
  );
}

export default function Members() {
  const s = useSocial();
  const { hasPermission, visibleUserIds, readOnly } = useTenancy();
  const { notify } = useToast();
  const canRelate = hasPermission("relations.use") && !readOnly;
  const [params, setParams] = useSearchParams();
  const tp = params.get("tab") as Tab | null;
  const tab: Tab = tp && tabIds.includes(tp) ? tp : "all";
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === "all") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };
  const [person, setPerson] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);

  const visible = visibleUserIds();
  const people = useMemo(() => users.filter((u) => visible.includes(u.id)), [visible.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return people
      .filter((u) => {
        if (filter === "all") return true;
        return u.id !== s.me && s.relationWith(u.id).state === "friends";
      })
      .filter((u) => !term || [u.name, u.username ?? "", u.email ?? "", u.mobile ?? ""].some((x) => x.toLowerCase().includes(term)))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, "fa");
        const d = (a.joinedAt ?? "").localeCompare(b.joinedAt ?? "");
        return (sort === "newest" ? -d : d) || a.name.localeCompare(b.name, "fa");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, q, filter, sort, s.friendships, s.me]);

  useEffect(() => setPage(1), [q, filter, sort]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages);
  const rows = list.slice((cur - 1) * PAGE, cur * PAGE);

  const request = (u: UserProfile) => {
    const r = s.sendFriendRequest(u.id);
    if (r.ok) notify(`درخواست دوستی برای «${u.name}» ارسال شد.`, "success");
    else notify(r.error, "warning");
  };

  const action = (u: UserProfile): ReactNode => {
    if (u.id === s.me)
      return (
        <span className="inline-flex items-center gap-1 text-[12px] text-ink-500">
          <User size={14} /> شما
        </span>
      );
    const st = s.relationWith(u.id).state;
    if (st === "friends")
      return (
        <span className="inline-flex text-emerald-600" title="دوست هستید" aria-label="دوست هستید">
          <Check size={17} />
        </span>
      );
    if (st === "sent")
      return (
        <span className="inline-flex text-amber-600" title="درخواست ارسال شد — در انتظار پاسخ" aria-label="در انتظار پاسخ">
          <Clock size={17} />
        </span>
      );
    if (st === "received")
      return (
        <Link to="/friends?tab=requests" onClick={(e) => e.stopPropagation()} className="inline-flex text-amber-600 hover:text-amber-700" title="درخواست دریافتی — پاسخ در «ارتباطات من»" aria-label="درخواست دریافتی">
          <Clock size={17} />
        </Link>
      );
    if (st === "blocked" || st === "blocked_me") return <span className="text-ink-400">-</span>;
    return (
      <button
        type="button"
        disabled={!canRelate}
        onClick={(e) => {
          e.stopPropagation();
          request(u);
        }}
        title="ارسال درخواست دوستی"
        aria-label={`ارسال درخواست دوستی به ${u.name}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink-600 hover:text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <UserPlus size={17} />
      </button>
    );
  };

  const pendingRows = people.filter((u) => u.id !== s.me && ["sent", "received"].includes(s.relationWith(u.id).state));
  const blockedRows = s.friendships.filter((f) => f.status === "blocked" && f.blocked_by === s.me);
  const canImport = hasPermission("users.import") || hasPermission("users.create");

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <h1 className="t-page text-ink-900">اعضای سازمان</h1>
        <div className="flex items-center gap-2">
          <ApiChip
            items={[
              { label: "فهرست همکاران", ep: endpoints.memberList() },
              { label: "جزئیات همکار", ep: endpoints.memberGet("{user_id}") },
              { label: "واحدها و ساختار", ep: endpoints.tenantScopes() },
              { label: "عضویت‌های من", ep: endpoints.myMemberships() },
              { label: "درخواست‌های دوستی", ep: endpoints.friendRequests() },
              { label: "بلاک‌شده‌ها", ep: endpoints.friendBlocked() },
              { label: "ورود از اکسل", ep: endpoints.usersImport() },
              { label: "خروجی اکسل", ep: endpoints.usersExport() },
            ]}
          />
          {canImport && (
            <Link to="/members/import-export" className="inline-flex">
              <Button size="sm" variant="outline" icon={<Upload size={14} />}>
                ورود و خروجی اکسل
              </Button>
            </Link>
          )}
        </div>
      </div>
      <Tabs<Tab>
        tabs={[
          { id: "all", label: "همه اعضا", count: people.length },
          { id: "units", label: "واحدها" },
          { id: "chart", label: "ساختار سازمانی" },
          { id: "requests", label: "لیست درخواست‌ها", count: pendingRows.length || undefined },
          { id: "blocked", label: "لیست بلاک شده‌ها", count: blockedRows.length || undefined },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "units" && <UnitsTab />}
      {tab === "chart" && <ChartTab />}
      {tab === "requests" && <PeopleTable rows={pendingRows} onRow={(u) => setPerson(u.id)} action={action} empty="درخواست در انتظاری نیست." />}
      {tab === "blocked" && (
        <div className="card p-0 overflow-hidden">
          {blockedRows.length === 0 ? (
            <div className="py-10">
              <EmptyState icon={<Ban size={22} />} title="کسی را بلاک نکرده‌اید" compact />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {blockedRows.map((f) => {
                const uid = f.sender_id === s.me ? f.receiver_id : f.sender_id;
                const u = users.find((x) => x.id === uid);
                return (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={u?.name ?? "؟"} color={u?.avatarColor} size={36} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-ink-900 truncate">{u?.name ?? "کاربر"}</span>
                      <span className="block text-[11.5px] text-ink-400" dir="ltr" style={{ textAlign: "right" }}>
                        @{u?.username ?? uid}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<ShieldOff size={14} />}
                      onClick={() => {
                        s.unblock(f.id);
                        notify(`«${u?.name ?? "کاربر"}» از فهرست بلاک خارج شد.`, "success");
                      }}
                    >
                      رفع بلاک
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "all" && (
      <>
      {/* نوار ابزار — یک ردیف */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-9 w-full" placeholder="جستجو…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجو" />
        </div>
        <div className="flex items-center gap-2 sm:mr-auto">
          <select className="input-field w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="فیلتر">
            <option value="all">همه اعضا</option>
            <option value="friends">دوستان</option>
          </select>
          <select className="input-field w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="مرتب‌سازی">
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="name">نام</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="bg-brand-800 text-white text-[12px]">
                <th className="text-right font-medium px-4 py-3">نام کاربری</th>
                <th className="text-right font-medium px-4 py-3">شماره موبایل</th>
                <th className="text-right font-medium px-4 py-3">ایمیل</th>
                <th className="text-center font-medium px-4 py-3">تاریخ عضویت</th>
                <th className="text-center font-medium px-4 py-3">فعالیت اخیر</th>
                <th className="text-center font-medium px-4 py-3">درخواست دوستی</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} onClick={() => setPerson(u.id)} className="border-b border-ink-100 last:border-0 cursor-pointer hover:bg-ink-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u.name} color={u.avatarColor} size={36} />
                      <div className="min-w-0">
                        <button type="button" onClick={(e) => (e.stopPropagation(), setPerson(u.id))} className="block text-ink-900 font-medium truncate max-w-[220px] hover:text-brand-700 text-right">
                          {u.name}
                        </button>
                        <span className="block text-[11.5px] text-ink-400 truncate max-w-[220px]" dir="ltr">
                          @{u.username ?? u.id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-ink-700 whitespace-nowrap">{u.mobile || "-"}</td>
                  <td className="px-4 py-2.5 text-ink-700 whitespace-nowrap" dir="ltr" style={{ textAlign: "right" }}>
                    {u.email || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-600 text-center whitespace-nowrap">{u.joinedAt || "-"}</td>
                  <td className="px-4 py-2.5 text-ink-600 text-center whitespace-nowrap">{u.lastActivity || "-"}</td>
                  <td className="px-4 py-2.5 text-center">{action(u)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[12.5px] text-ink-400">
                    عضوی پیدا نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TableFooter shown={rows.length} total={list.length} />
      </div>
      <Pager page={cur} pages={pages} onChange={setPage} />
      </>
      )}

      <PersonSheet id={person} onClose={() => setPerson(null)} />
    </div>
  );
}

/** جدول ساده‌ی افراد (لیست درخواست‌ها) — همان ستون‌های motodev */
function PeopleTable({ rows, onRow, action, empty }: { rows: UserProfile[]; onRow: (u: UserProfile) => void; action: (u: UserProfile) => ReactNode; empty: string }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="bg-brand-800 text-white text-[12px]">
              <th className="text-right font-medium px-4 py-3">نام کاربری</th>
              <th className="text-right font-medium px-4 py-3">ایمیل</th>
              <th className="text-center font-medium px-4 py-3">فعالیت اخیر</th>
              <th className="text-center font-medium px-4 py-3">وضعیت درخواست</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} onClick={() => onRow(u)} className="border-b border-ink-100 last:border-0 cursor-pointer hover:bg-ink-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={u.name} color={u.avatarColor} size={36} />
                    <span className="min-w-0">
                      <span className="block text-ink-900 font-medium truncate max-w-[220px]">{u.name}</span>
                      <span className="block text-[11.5px] text-ink-400 truncate max-w-[220px]" dir="ltr">
                        @{u.username ?? u.id}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-ink-700 whitespace-nowrap" dir="ltr" style={{ textAlign: "right" }}>
                  {u.email || "-"}
                </td>
                <td className="px-4 py-2.5 text-ink-600 text-center whitespace-nowrap">{u.lastActivity || "-"}</td>
                <td className="px-4 py-2.5 text-center">{action(u)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[12.5px] text-ink-400">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TableFooter shown={rows.length} total={rows.length} />
    </div>
  );
}

/** واحدهایی که کاربر می‌بیند: اجتماع زیردرخت هر عضویت فعال (نه کل سامانه، نه والدها) */
function useMyScopes() {
  const { iam, actingUser, membershipsOf } = useTenancy();
  return useMemo(() => {
    const active = membershipsOf(actingUser.id).filter((m) => (m as MLike).status !== "suspended" && (m as MLike).status !== "revoked");
    const rootIds = [...new Set(active.map((m) => mScope(m as MLike)))];
    const childrenOf = (id: string) => iam.scopes.filter((x) => x.parentId === id && x.active);
    const set = new Map<string, ScopeNode>();
    const walk = (id: string) => {
      const n = iam.scopes.find((x) => x.id === id);
      if (!n || set.has(id)) return;
      set.set(id, n);
      childrenOf(id).forEach((c) => walk(c.id));
    };
    rootIds.forEach(walk);
    return { scopes: [...set.values()], rootIds, myIds: new Set(rootIds), titleOf: (sid: string) => (active.find((m) => mScope(m as MLike) === sid) as MLike | undefined)?.title };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iam, actingUser.id]);
}

function UnitsTab() {
  const { membersOf, scopeTypeLabel, scopePath } = useTenancy();
  const { scopes, myIds } = useMyScopes();
  const [q, setQ] = useState("");
  const list = scopes.filter((x) => x.type !== "system" && (!q.trim() || x.name.includes(q.trim())));
  const count = (id: string) => new Set(membersOf(id, false).filter((m) => (m as MLike).status === "active").map((m) => mUser(m as MLike))).size;
  return (
    <div>
      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input-field !pr-9 w-full" placeholder="جستجوی واحد…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجوی واحد" />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="واحدی پیدا نشد" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((u) => (
            <Link key={u.id} to={`/org/${u.id}`} className="card p-4 flex items-center gap-3 hover:border-teal-300 transition-colors min-w-0" title={scopePath(u.id)}>
              <span className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Users size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="block text-[14px] font-bold text-ink-900 truncate">{u.name}</span>
                  {myIds.has(u.id) && <Badge tone="info">واحد من</Badge>}
                </span>
                <span className="block text-[12px] text-ink-500 mt-0.5">
                  {scopeTypeLabel[u.type]} · {fa(count(u.id))} همکار
                </span>
              </span>
              <ChevronLeft size={18} className="text-ink-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
      <p className="text-[11.5px] text-ink-400 mt-3">فقط واحدهای عضویت شما و زیرمجموعه‌هایشان نمایش داده می‌شوند.</p>
    </div>
  );
}

function ChartTab() {
  const { iam, membersOf, scopeTypeLabel, scopePath } = useTenancy();
  const { scopes, rootIds, myIds, titleOf } = useMyScopes();
  const inSet = new Set(scopes.map((x) => x.id));
  // ریشه‌های نمایش: عضویت‌هایی که والدشان در همین مجموعه نیست
  const tops = rootIds.filter((id) => {
    const n = iam.scopes.find((x) => x.id === id);
    return n && !(n.parentId && inSet.has(n.parentId));
  });
  const kids = (id: string) => scopes.filter((x) => x.parentId === id).sort((a, b) => a.name.localeCompare(b.name, "fa"));
  const lead = (id: string) => iam.scopes.find((x) => x.id === id)?.lead;
  const Node = ({ id, depth }: { id: string; depth: number }) => {
    const n = scopes.find((x) => x.id === id);
    if (!n) return null;
    const mine = myIds.has(id);
    const members = new Set(membersOf(id, false).filter((m) => (m as MLike).status === "active").map((m) => mUser(m as MLike))).size;
    return (
      <li>
        <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${mine ? "border-teal-500 bg-teal-50/60" : "border-ink-100 bg-[var(--color-card)]"}`} style={{ marginInlineStart: depth * 20 }}>
          <Network size={16} className={mine ? "text-teal-700" : "text-ink-400"} />
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5 flex-wrap">
              <Link to={`/org/${id}`} className="text-[13.5px] font-bold text-ink-900 hover:text-teal-700">
                {n.name}
              </Link>
              <span className="text-[11px] text-ink-400">{scopeTypeLabel[n.type]}</span>
              {mine && <Badge tone="solid">شما اینجا هستید</Badge>}
            </span>
            <span className="block text-[11.5px] text-ink-500 mt-0.5">
              {lead(id) ? `${lead(id)} · ` : ""}
              {fa(members)} همکار{mine && titleOf(id) ? ` · سِمت شما: ${titleOf(id)}` : ""}
            </span>
          </span>
        </div>
        {kids(id).length > 0 && (
          <ul className="mt-2 space-y-2">
            {kids(id).map((k) => (
              <Node key={k.id} id={k.id} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  };
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-[14px] font-bold text-ink-900 mb-1">جایگاه شما در سازمان</p>
        <ul className="space-y-1">
          {rootIds.map((id) => (
            <li key={id} className="text-[12.5px] text-ink-600">
              {scopePath(id)}
              {titleOf(id) ? ` · ${titleOf(id)}` : ""}
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-4">
        <ul className="space-y-2">
          {tops.map((id) => (
            <Node key={id} id={id} depth={0} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** برگه‌ی کناری همکار — فقط فیلدهای واقعی member-directory + سِمت عضویت دمو؛ مهارت «پیشنهادی» */
function PersonSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const s = useSocial();
  const { membershipsOf, scopePath } = useTenancy();
  const navigate = useNavigate();
  const u = id ? users.find((x) => x.id === id) : undefined;
  if (!u) return null;
  const mems = membershipsOf(u.id).filter((m) => (m as MLike).status !== "revoked");
  const row = (label: string, value: ReactNode) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-[13px] text-ink-500 shrink-0">{label}</span>
      <span className="text-[13px] text-ink-900 text-left min-w-0 break-words">{value}</span>
    </div>
  );
  const message = () => {
    const cid = s.openDirect(u.id);
    onClose();
    navigate(`/conversations/${cid}`);
  };
  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow="نمایه همکار"
      title={u.name}
      footer={
        u.id !== s.me ? (
          <>
            <Button variant="primary" icon={<MessageSquare size={16} />} onClick={message}>
              ارسال پیام
            </Button>
            <Link to={`/profile/${u.id}`} className="inline-flex" onClick={onClose}>
              <Button variant="outline" icon={<IdCard size={16} />}>
                نمایه
              </Button>
            </Link>
          </>
        ) : undefined
      }
    >
      <div className="flex items-center gap-4 mb-4">
        <Avatar name={u.name} color={u.avatarColor} size={64} />
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-ink-900">{(mems[0] as MLike | undefined)?.title || u.role}</p>
          <p className="text-[13px] text-ink-500">{mems[0] ? mems[0].scope.name : u.org}</p>
        </div>
      </div>
      {row("نام کاربری", <span dir="ltr">@{u.username ?? u.id}</span>)}
      {row("ایمیل", u.email ? <span dir="ltr">{u.email}</span> : "—")}
      {row("شماره موبایل", u.mobile || "—")}
      {row("تاریخ عضویت", u.joinedAt || "—")}
      {row("فعالیت اخیر", u.lastActivity || "—")}
      {mems.length > 0 &&
        row(
          "واحد و سِمت",
          <span className="space-y-0.5 block">
            {mems.map((m) => (
              <span key={m.id} className="block">
                {scopePath(m.scope.id)}
                {(m as MLike).title ? ` · ${(m as MLike).title}` : ""}
              </span>
            ))}
          </span>
        )}
      {u.skills.length > 0 && (
        <div className="mt-4">
          <p className="text-[14px] font-bold text-ink-900 mb-2 flex items-center gap-1.5">
            مهارت‌ها <span className="text-[10px] rounded px-1 py-px bg-amber-50 text-amber-700 border border-amber-200 font-normal">پیشنهادی</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {u.skills.map((k) => (
              <Badge key={k} tone="info">
                {k}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
