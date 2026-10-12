// ---------------------------------------------------------------------------
// «اعضای سازمان» — جدول اعضا مطابق نسخه‌ی اصلی موتوشاب:
//   نام کاربری · شماره موبایل · ایمیل · تاریخ عضویت · فعالیت اخیر · درخواست دوستی
// نوار ابزار: جستجو، فیلتر (همه اعضا / دوستان / درخواست‌های در انتظار)، مرتب‌سازی؛ پایین: شمار + صفحه‌بندی ۱۰تایی.
// افراد = useTenancy().visibleUserIds() (اعضای واحدهای عضویت من و زیرمجموعه‌ها). کلیک ردیف → پروفایل.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, UserPlus, User, Clock, Check } from "lucide-react";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { users, type UserProfile } from "../../data/mock";

const fa = (n: number) => n.toLocaleString("fa-IR");
const PAGE = 10;

type Filter = "all" | "friends" | "pending";
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
  const navigate = useNavigate();
  const canRelate = hasPermission("relations.use") && !readOnly;

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
        const st = u.id === s.me ? "self" : s.relationWith(u.id).state;
        return filter === "friends" ? st === "friends" : st === "sent" || st === "received";
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
        <Link to="/dashboard/connections?tab=requests" onClick={(e) => e.stopPropagation()} className="inline-flex text-amber-600 hover:text-amber-700" title="درخواست دریافتی — پاسخ در «ارتباطات من»" aria-label="درخواست دریافتی">
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

  return (
    <div>
      {/* نوار ابزار — یک ردیف */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-ink-900 shrink-0">اعضای سازمان</h1>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-9 w-full" placeholder="جستجو…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجو" />
        </div>
        <div className="flex items-center gap-2 sm:mr-auto">
          <select className="input-field w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="فیلتر">
            <option value="all">همه اعضا</option>
            <option value="friends">دوستان</option>
            <option value="pending">درخواست‌های در انتظار</option>
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
                <tr key={u.id} onClick={() => navigate(`/dashboard/profile/${u.id}`)} className="border-b border-ink-100 last:border-0 cursor-pointer hover:bg-ink-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u.name} color={u.avatarColor} size={36} />
                      <div className="min-w-0">
                        <Link to={`/dashboard/profile/${u.id}`} onClick={(e) => e.stopPropagation()} className="block text-ink-900 font-medium truncate max-w-[220px] hover:text-brand-700">
                          {u.name}
                        </Link>
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
    </div>
  );
}
