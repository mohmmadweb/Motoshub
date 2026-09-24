import { useMemo, useState } from "react";
import { FileText, Upload, FolderTree, Search, SlidersHorizontal, Paperclip, Eye, Star, X, Bell, BellOff } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, accessTone, statusTone } from "../../context/KnowledgeContext";
import { dayNum, fa } from "../../pm/jalali";
import { accessLevels, docStatuses } from "../../km/types";
import { SectionHead, avg } from "./shared";
import { useKPage } from "./ctx";

type Filters = { q: string; code: string; type: string; category: string; unit: string; author: string; owner: string; from: string; to: string; tag: string; version: string; status: string; access: string; content: boolean };
const empty: Filters = { q: "", code: "", type: "", category: "", unit: "", author: "", owner: "", from: "", to: "", tag: "", version: "", status: "", access: "", content: false };

/** مخزن اسناد و دانش (بند ۲) + جستجوی پیشرفته (بند ۷) */
export default function BankSection({ advanced = false }: { advanced?: boolean }) {
  const km = useKnowledge();
  const { hasPermission, filterScoped } = useTenancy();
  const page = useKPage();
  const [f, setF] = useState<Filters>(empty);
  const [showAdv, setShowAdv] = useState(advanced);
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<"recent" | "views" | "title" | "rating">("recent");
  const [logged, setLogged] = useState("");

  const visible = filterScoped(km.docs).filter((d) => d.status !== "آرشیو" && km.canSee(d) && (d.status === "منتشرشده" || d.owner === km.me || d.author === km.me || km.isApprover(d)));

  const list = useMemo(() => {
    const catIds = cat ? [cat, ...km.categories.filter((c) => c.parentId === cat).map((c) => c.id)] : [];
    const q = f.q.trim();
    let ds = visible.filter((d) => {
      if (catIds.length && !catIds.includes(d.categoryId)) return false;
      if (q) {
        const hay = [d.title, d.code, d.description, d.tags.join(" "), d.owner, d.unit, ...(f.content ? d.files.map((x) => x.name) : [])].join(" ");
        if (!hay.includes(q)) return false;
      }
      if (f.code && !d.code.includes(f.code)) return false;
      if (f.type && d.type !== f.type) return false;
      if (f.category && d.categoryId !== f.category && km.categories.find((c) => c.id === d.categoryId)?.parentId !== f.category) return false;
      if (f.unit && d.unit !== f.unit) return false;
      if (f.author && !d.author.includes(f.author)) return false;
      if (f.owner && !d.owner.includes(f.owner)) return false;
      if (f.tag && !d.tags.some((t) => t.includes(f.tag))) return false;
      if (f.version && String(d.version) !== f.version.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))) return false;
      if (f.status && d.status !== f.status) return false;
      if (f.access && d.access !== f.access) return false;
      if (f.from && (dayNum(d.updatedAt) ?? 0) < (dayNum(f.from) ?? 0)) return false;
      if (f.to && (dayNum(d.updatedAt) ?? 0) > (dayNum(f.to) ?? 9e9)) return false;
      return true;
    });
    if (sort === "views") ds = [...ds].sort((a, b) => b.views - a.views);
    if (sort === "title") ds = [...ds].sort((a, b) => a.title.localeCompare(b.title, "fa"));
    if (sort === "rating") ds = [...ds].sort((a, b) => avg(b.ratings.map((r) => r.score)) - avg(a.ratings.map((r) => r.score)));
    if (sort === "recent") ds = [...ds].sort((a, b) => (dayNum(b.updatedAt) ?? 0) - (dayNum(a.updatedAt) ?? 0));
    return ds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, f, cat, sort]);

  const activeCount = Object.entries(f).filter(([k, v]) => k !== "q" && k !== "content" && v).length;
  const roots = km.categories.filter((c) => !c.parentId);
  const myInterests = km.settings.interests[km.me] ?? [];

  const commitSearch = () => {
    const t = f.q.trim();
    if (t && t !== logged) {
      km.logSearch(t, list.length);
      setLogged(t);
    }
  };

  return (
    <div>
      <SectionHead
        icon={<FileText size={17} className="text-brand-600" />}
        title={advanced ? "جستجوی پیشرفته" : "مخزن اسناد و دانش"}
        hint={advanced ? "جستجو بر اساس عنوان و کد، نوع، دسته، واحد، نویسنده، مالک، تاریخ، برچسب، نسخه، وضعیت و سطح دسترسی — و در صورت امکان در محتوای فایل‌ها." : "دستورالعمل‌ها، آیین‌نامه‌ها، بخشنامه‌ها، روش‌های اجرایی، مستندات فنی، گزارش‌ها و فرم‌های سازمان با چرخه‌ی عمر کامل."}
        action={
          <div className="flex gap-2">
            {hasPermission("knowledge.categories") && (
              <Button variant="secondary" icon={<FolderTree size={14} />} onClick={page.openTaxonomy}>
                دسته‌بندی و نوع
              </Button>
            )}
            {hasPermission("knowledge.upload") && (
              <Button variant="primary" icon={<Upload size={14} />} onClick={() => page.newDoc(cat || undefined)}>
                افزودن سند
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-xl">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-9" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} onBlur={commitSearch} onKeyDown={(e) => e.key === "Enter" && commitSearch()} placeholder="جستجو در عنوان، کد، توضیحات، برچسب و مالک…" />
        </div>
        <button onClick={() => setShowAdv((v) => !v)} className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-1 ${showAdv || activeCount ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-ink-200 text-ink-600"}`}>
          <SlidersHorizontal size={13} /> جستجوی پیشرفته{activeCount ? ` (${fa(activeCount)})` : ""}
        </button>
        <select className="input-field !py-2 !text-xs !w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="مرتب‌سازی">
          <option value="recent">جدیدترین</option>
          <option value="views">پربازدیدترین</option>
          <option value="rating">بیشترین امتیاز</option>
          <option value="title">عنوان</option>
        </select>
        <span className="text-xs text-ink-400">{fa(list.length)} سند</span>
      </div>

      {showAdv && (
        <div className="card p-3 mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <input className="input-field !py-1.5 !text-xs" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="کد سند" />
          <select className="input-field !py-1.5 !text-xs" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="">همه‌ی انواع</option>
            {km.docTypes.map((t) => (
              <option key={t.id}>{t.name}</option>
            ))}
          </select>
          <select className="input-field !py-1.5 !text-xs" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">همه‌ی دسته‌ها</option>
            {km.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {km.categoryPath(c.id)}
              </option>
            ))}
          </select>
          <select className="input-field !py-1.5 !text-xs" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
            <option value="">همه‌ی واحدها</option>
            {km.settings.units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <input className="input-field !py-1.5 !text-xs" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} placeholder="نویسنده / ثبت‌کننده" />
          <input className="input-field !py-1.5 !text-xs" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="مالک سند" />
          <input className="input-field !py-1.5 !text-xs" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} placeholder="از تاریخ ۱۴۰۵/۰۱/۰۱" />
          <input className="input-field !py-1.5 !text-xs" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder="تا تاریخ" />
          <input className="input-field !py-1.5 !text-xs" list="bank-tags" value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })} placeholder="برچسب" />
          <datalist id="bank-tags">
            {km.settings.tags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <input className="input-field !py-1.5 !text-xs" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} placeholder="شماره‌ی نسخه" />
          <select className="input-field !py-1.5 !text-xs" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">همه‌ی وضعیت‌ها</option>
            {docStatuses.filter((s) => s !== "آرشیو").map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="input-field !py-1.5 !text-xs" value={f.access} onChange={(e) => setF({ ...f, access: e.target.value })}>
            <option value="">همه‌ی سطوح دسترسی</option>
            {accessLevels.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-ink-600 col-span-2">
            <input type="checkbox" checked={f.content} onChange={(e) => setF({ ...f, content: e.target.checked })} className="accent-[var(--color-brand-600)]" /> جستجو در محتوای PDF و Word (نمایه‌ی متن فایل‌ها)
          </label>
          {activeCount > 0 && (
            <button onClick={() => setF({ ...empty, q: f.q })} className="text-xs text-brand-700 hover:underline flex items-center gap-1">
              <X size={12} /> پاک‌کردن فیلترها
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <aside className="card p-3 self-start">
          <p className="text-xs font-bold text-ink-600 mb-2">دسته‌بندی‌ها</p>
          <button onClick={() => setCat("")} className={`w-full text-right text-xs px-2 py-1.5 rounded-md ${!cat ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-600 hover:bg-ink-50"}`}>
            همه ({fa(visible.length)})
          </button>
          {roots.map((r) => (
            <div key={r.id}>
              <div className="group flex items-center">
                <button onClick={() => setCat(r.id)} className={`flex-1 text-right text-xs px-2 py-1.5 rounded-md ${cat === r.id ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-700 hover:bg-ink-50"}`}>
                  {r.name}
                </button>
                <button onClick={() => km.toggleInterest(r.id)} title={myInterests.includes(r.id) ? "اعلان دانش جدید این حوزه: روشن" : "دنبال‌کردن این حوزه (اعلان دانش جدید)"} aria-label="دنبال‌کردن حوزه" className={`p-1 ${myInterests.includes(r.id) ? "text-brand-600" : "text-ink-300 opacity-0 group-hover:opacity-100"}`}>
                  {myInterests.includes(r.id) ? <Bell size={11} /> : <BellOff size={11} />}
                </button>
              </div>
              {km.categories.filter((c) => c.parentId === r.id).map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)} className={`w-full text-right text-[11.5px] pr-5 pl-2 py-1 rounded-md ${cat === c.id ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-500 hover:bg-ink-50"}`}>
                  {c.name} <span className="text-ink-300">({fa(visible.filter((d) => d.categoryId === c.id).length)})</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="card overflow-x-auto">
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="text-ink-400 border-b border-ink-100 text-right bg-ink-50/60">
                <th className="p-3 font-medium">عنوان سند</th>
                <th className="p-3 font-medium">نوع</th>
                <th className="p-3 font-medium">واحد / مالک</th>
                <th className="p-3 font-medium">نسخه</th>
                <th className="p-3 font-medium">وضعیت</th>
                <th className="p-3 font-medium">دسترسی</th>
                <th className="p-3 font-medium">بروزرسانی</th>
                <th className="p-3 font-medium">بازدید</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const t = km.docTypes.find((x) => x.name === d.type);
                return (
                  <tr key={d.id} className="border-b border-ink-100 hover:bg-ink-50 cursor-pointer" onClick={() => page.openDoc(d.id)}>
                    <td className="p-3">
                      <p className="font-medium text-ink-900 flex items-center gap-1.5">
                        <FileText size={13} className="text-ink-400 shrink-0" /> {d.title}
                        {d.importance === "حیاتی" && <Star size={11} className="text-rose-500 shrink-0" fill="currentColor" />}
                      </p>
                      <p className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-2">
                        <span dir="ltr">{d.code}</span> · {km.categoryPath(d.categoryId)}
                        {d.files.length > 1 && (
                          <span className="flex items-center gap-0.5">
                            <Paperclip size={10} /> {fa(d.files.length)}
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: t?.color ?? "#94a3b8" }} /> {d.type}
                      </span>
                    </td>
                    <td className="p-3 text-ink-600">
                      {d.unit}
                      <p className="text-[11px] text-ink-400">{d.owner}</p>
                    </td>
                    <td className="p-3 text-ink-600">{fa(d.version)}</td>
                    <td className="p-3">
                      <Badge tone={statusTone[d.status]}>{d.status}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge tone={accessTone[d.access]}>{d.access}</Badge>
                    </td>
                    <td className="p-3 text-ink-500">{d.updatedAt}</td>
                    <td className="p-3 text-ink-500">
                      <span className="flex items-center gap-1">
                        <Eye size={11} /> {fa(d.views)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <p className="text-center text-xs text-ink-400 py-10">سندی با این شرایط پیدا نشد{f.q ? " — این جستجو برای تحلیل «کمبود دانش» ثبت شد" : ""}.</p>}
        </div>
      </div>
    </div>
  );
}
