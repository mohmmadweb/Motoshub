import { useMemo, useState } from "react";
import { Newspaper, Pin, MessageCircle, Plus, Building2, Eye, Globe2, Network } from "lucide-react";
import { Link } from "react-router-dom";
import { type NewsItem, type Visibility } from "../data/mock";
import {
  holdings,
  allCompanies,
  scopedNews as initialScopedNews,
  type ScopedNews,
  type ContentScope,
} from "../data/mockDaneshmand";
import { useContent } from "../context/ContentContext";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import { VisibilityPicker, VisibilityToggle } from "../components/ui/VisibilityControl";

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

export default function News() {
  const { newsItems, setNewsItems } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [pinned, setPinned] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
  const { notify } = useToast();

  const submit = () => {
    if (!title.trim() || !summary.trim()) {
      notify("عنوان و متن خبر الزامی است.", "warning");
      return;
    }
    const newItem: NewsItem = {
      id: `nw-${Date.now()}`,
      title: title.trim(),
      summary: summary.trim(),
      date: jalaliToday,
      comments: 0,
      pinned,
      visibility,
    };
    setNewsItems((prev) => [newItem, ...prev]);
    notify(`اطلاعیه «${newItem.title}» ${visibility === "عمومی" ? "برای همه‌ی اعضا" : "به‌صورت خصوصی"} منتشر شد.`);
    setOpen(false);
    setTitle(""); setSummary(""); setPinned(false); setVisibility("خصوصی");
  };

  const toggleVisibility = (id: string) => {
    const item = newsItems.find((n) => n.id === id);
    if (!item) return;
    const next = item.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setNewsItems((prev) => prev.map((n) => n.id === id ? { ...n, visibility: next } : n));
    notify(`«${item.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <PageHeader
        title="اخبار سازمان"
        description="اطلاع‌رسانی عمومی شبکه و اطلاعیه‌های رسمی به همه‌ی کاربران"
        icon={<Newspaper size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            خبر جدید
          </Button>
        }
      />

      <div className="card divide-y divide-ink-100">
        {/* table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-ink-50 text-[11px] font-semibold text-ink-400 uppercase tracking-wide">
          <span>عنوان خبر</span>
          <span className="text-center">تاریخ</span>
          <span className="text-center">وضعیت</span>
          <span className="text-center">نظرات</span>
          <span className="text-center">دسترسی</span>
        </div>

        {newsItems.map((n) => (
          <div
            key={n.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-ink-50/60 transition-colors"
          >
            {/* Title — clickable */}
            <div className="min-w-0">
              <Link
                to={`/dashboard/news/${n.id}`}
                className="font-medium text-sm text-ink-900 hover:text-brand-700 transition-colors truncate block"
              >
                {n.title}
              </Link>
              <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">{n.summary}</p>
            </div>
            {/* Date */}
            <span className="text-xs text-ink-400 whitespace-nowrap">{n.date}</span>
            {/* Pinned badge */}
            <span>
              {n.pinned
                ? <Badge tone="brand" icon={<Pin size={10} />}>مهم</Badge>
                : <span className="text-xs text-ink-300">—</span>}
            </span>
            {/* Comments */}
            <span className="flex items-center gap-1 text-xs text-ink-400">
              <MessageCircle size={12} /> {n.comments}
            </span>
            {/* Visibility toggle */}
            <VisibilityToggle
              visibility={n.visibility}
              onChange={() => toggleVisibility(n.id)}
              size="xs"
            />
          </div>
        ))}

        {newsItems.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-400">هنوز خبری ثبت نشده</div>
        )}
      </div>

      <ScopedNewsSection />

      <Modal open={open} onClose={() => setOpen(false)} title="انتشار اطلاعیه‌ی رسمی جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان خبر</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: به‌روزرسانی سیاست امنیتی ورود دومرحله‌ای" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">متن خبر</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="input-field min-h-24" />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-600 cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-brand-600" />
            سنجاق‌کردن به‌عنوان خبر مهم
          </label>
          <VisibilityPicker value={visibility} onChange={setVisibility} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// تفکیک محتوای هلدینگ / شرکت‌های زیرمجموعه: هر شرکت فقط اخبار سراسری، اخبار
// هلدینگ خودش و اخبار داخلی خودش را می‌بیند — همه تحت همین سامانه واحد.
// ---------------------------------------------------------------------------
const scopeIcon: Record<ContentScope, typeof Globe2> = { سراسری: Globe2, هلدینگ: Network, شرکت: Building2 };
const scopeTone = { سراسری: "brand", هلدینگ: "navy", شرکت: "warning" } as const;

function ScopedNewsSection() {
  const [items, setItems] = useState<ScopedNews[]>(initialScopedNews);
  const [viewer, setViewer] = useState<string>("hq"); // hq = ستاد دانشمند
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ownerCompany, setOwnerCompany] = useState(allCompanies[0].id);
  const [scope, setScope] = useState<ContentScope>("شرکت");
  const { notify } = useToast();

  const viewerCompany = allCompanies.find((c) => c.id === viewer);

  const visible = useMemo(() => {
    if (viewer === "hq") return items;
    if (!viewerCompany) return items;
    return items.filter((n) => {
      if (n.scope === "سراسری") return true;
      if (n.scope === "هلدینگ") return n.holdingId === viewerCompany.holdingId;
      return n.companyId === viewerCompany.id;
    });
  }, [items, viewer, viewerCompany]);

  const hiddenCount = items.length - visible.length;

  const submit = () => {
    if (!title.trim() || !summary.trim()) {
      notify("عنوان و متن خبر الزامی است.", "warning");
      return;
    }
    const owner = allCompanies.find((c) => c.id === ownerCompany)!;
    const item: ScopedNews = {
      id: `sn-${Date.now()}`,
      title: title.trim(),
      summary: summary.trim(),
      date: jalaliToday,
      scope,
      holdingId: owner.holdingId,
      companyId: owner.id,
    };
    setItems((prev) => [item, ...prev]);
    notify(
      scope === "سراسری"
        ? `خبر «${item.title}» برای کل مجموعه منتشر شد.`
        : scope === "هلدینگ"
          ? `خبر «${item.title}» فقط برای شرکت‌های «${owner.holdingName}» منتشر شد.`
          : `خبر «${item.title}» فقط برای اعضای «${owner.name}» منتشر شد.`
    );
    setOpen(false);
    setTitle("");
    setSummary("");
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
          <Network size={15} className="text-brand-600" /> اخبار هلدینگ‌ها و شرکت‌های زیرمجموعه
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-400 flex items-center gap-1"><Eye size={12} /> مشاهده به‌عنوان:</span>
          <select value={viewer} onChange={(e) => setViewer(e.target.value)} className="text-xs border border-ink-200 rounded-md px-2 py-1.5 outline-none focus:border-brand-400 bg-white">
            <option value="hq">ستاد دانشمند (همه محتوا)</option>
            {holdings.map((h) => (
              <optgroup key={h.id} label={h.name}>
                {h.companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setOpen(true)}>خبر شرکتی</Button>
        </div>
      </div>
      <p className="text-xs text-ink-400 mb-3 leading-6">
        هر کاربر فقط اخبار «سراسری»، اخبار هلدینگ خودش و اخبار داخلی شرکت خودش را می‌بیند — بدون جدا شدن از سامانه واحد.
        {viewer !== "hq" && hiddenCount > 0 && (
          <span className="text-amber-700"> در این نما {hiddenCount.toLocaleString("fa-IR")} خبرِ مربوط به سایر شرکت‌ها اصلاً نمایش داده نمی‌شود.</span>
        )}
      </p>
      <div className="card divide-y divide-ink-100">
        {visible.map((n) => {
          const Icon = scopeIcon[n.scope];
          const ownerName =
            n.scope === "سراسری"
              ? "کل مجموعه"
              : n.scope === "هلدینگ"
                ? holdings.find((h) => h.id === n.holdingId)?.name ?? ""
                : allCompanies.find((c) => c.id === n.companyId)?.name ?? "";
          return (
            <div key={n.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm text-ink-900 truncate">{n.title}</p>
                <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">{n.summary}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={scopeTone[n.scope]} icon={<Icon size={10} />}>
                  {n.scope === "سراسری" ? "سراسری" : ownerName}
                </Badge>
                <span className="text-xs text-ink-400 whitespace-nowrap hidden sm:block">{n.date}</span>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <div className="p-8 text-center text-sm text-ink-400">خبری برای این نما وجود ندارد</div>}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="انتشار خبر شرکتی"
        description="مالک محتوا و دامنه‌ی انتشار را انتخاب کنید؛ فقط مخاطبان همان دامنه خبر را خواهند دید."
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان خبر</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: برنامه تعمیرات دوره‌ای خط ۲" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">متن خبر</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="input-field min-h-20" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">شرکت مالک محتوا</label>
            <select value={ownerCompany} onChange={(e) => setOwnerCompany(e.target.value)} className="input-field">
              {holdings.map((h) => (
                <optgroup key={h.id} label={h.name}>
                  {h.companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دامنه‌ی انتشار</label>
            <div className="grid grid-cols-3 gap-2">
              {(["شرکت", "هلدینگ", "سراسری"] as ContentScope[]).map((s) => {
                const Icon = scopeIcon[s];
                return (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium ${
                      scope === s ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"
                    }`}
                  >
                    <Icon size={15} />
                    {s === "شرکت" ? "فقط شرکت خودم" : s === "هلدینگ" ? "کل هلدینگ" : "کل مجموعه"}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار خبر</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
