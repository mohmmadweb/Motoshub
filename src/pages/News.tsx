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
import RowActions from "../components/ui/RowActions";
import DataTable from "../components/ui/DataTable";
import { useConfirm } from "../components/ui/ConfirmProvider";

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

export default function News() {
  const { newsItems, setNewsItems } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [pinned, setPinned] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: boolean; summary?: boolean }>({});
  const [month, setMonth] = useState<number | null>(null);
  const { notify } = useToast();
  const confirm = useConfirm();

  const startEdit = (n: NewsItem) => {
    setEditingId(n.id);
    setTitle(n.title);
    setSummary(n.summary);
    setPinned(Boolean(n.pinned));
    setVisibility(n.visibility);
    setOpen(true);
  };

  const remove = (n: NewsItem) =>
    confirm({
      title: `حذف خبر «${n.title}»؟`,
      message: "این خبر برای همه‌ی مخاطبان حذف می‌شود.",
      onConfirm: () => {
        setNewsItems((prev) => prev.filter((x) => x.id !== n.id));
        notify(`خبر «${n.title}» حذف شد.`, "info");
      },
    });

  const submit = () => {
    const errs = { title: !title.trim(), summary: !summary.trim() };
    setErrors(errs);
    if (errs.title || errs.summary) return;
    if (editingId) {
      setNewsItems((prev) => prev.map((n) => (n.id === editingId ? { ...n, title: title.trim(), summary: summary.trim(), pinned, visibility } : n)));
      notify(`خبر «${title.trim()}» ویرایش شد.`);
    } else {
      const newItem: NewsItem = {
        id: `nw-${Date.now()}`,
        title: title.trim(),
        summary: summary.trim(),
        date: jalaliToday,
        comments: 0,
        views: 0,
        pinned,
        visibility,
      };
      setNewsItems((prev) => [newItem, ...prev]);
      notify(`اطلاعیه «${newItem.title}» ${visibility === "عمومی" ? "برای همه‌ی اعضا" : "به‌صورت خصوصی"} منتشر شد.`);
    }
    setOpen(false);
    setEditingId(null);
    setTitle(""); setSummary(""); setPinned(false); setVisibility("خصوصی");
  };

  const toggleVisibility = (id: string) => {
    const item = newsItems.find((n) => n.id === id);
    if (!item) return;
    const next = item.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setNewsItems((prev) => prev.map((n) => n.id === id ? { ...n, visibility: next } : n));
    notify(`«${item.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  const jMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  const faToNum = (s: string) => Number(s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  const monthOf = (d: string) => faToNum(d.split("/")[1] ?? "0");
  const sortedNews = [...newsItems].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sortedNews[0];
  const mostViewed = [...newsItems].sort((a, b) => b.views - a.views)[0];
  const mostDiscussed = [...newsItems].sort((a, b) => b.comments - a.comments)[0];
  const shownNews = month === null ? newsItems : newsItems.filter((n) => monthOf(n.date) === month);

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

      {/* برجسته‌ها */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { tag: "تازه‌ترین", n: latest, cls: "from-brand-600 to-brand-800" },
            { tag: "پربازدیدترین", n: mostViewed, cls: "from-emerald-600 to-emerald-800" },
            { tag: "داغ‌ترین گفتگو", n: mostDiscussed, cls: "from-amber-500 to-orange-700" },
          ].map(({ tag, n, cls }) => (
            <Link key={tag} to={`/dashboard/news/${n.id}`} className={`group rounded-xl bg-gradient-to-l ${cls} p-3.5 text-white shadow-sm hover:shadow-md transition-shadow`}>
              <span className="inline-block text-[10px] font-bold bg-white/20 rounded-full px-2 py-0.5 mb-1.5">{tag}</span>
              <p className="text-[12.5px] font-bold leading-6 line-clamp-2 group-hover:underline">{n.title}</p>
              <p className="text-[10px] text-white/70 mt-1.5">{n.date} · {n.views.toLocaleString("fa-IR")} بازدید · {n.comments.toLocaleString("fa-IR")} نظر</p>
            </Link>
          ))}
        </div>
      )}

      {/* آرشیو ماهانه */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <button
          onClick={() => setMonth(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${month === null ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-500 border-ink-200 hover:bg-ink-50"}`}
        >
          همه‌ی سال
        </button>
        {jMonths.map((m, i) => {
          const count = newsItems.filter((n) => monthOf(n.date) === i + 1).length;
          if (count === 0) return null;
          return (
            <button
              key={m}
              onClick={() => setMonth(month === i + 1 ? null : i + 1)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                month === i + 1 ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"
              }`}
            >
              {m} <span className="text-[10px] opacity-70">({count.toLocaleString("fa-IR")})</span>
            </button>
          );
        })}
      </div>

      <DataTable
        columns={[
          {
            key: "title",
            label: "عنوان خبر",
            render: (n) => (
              <span className="min-w-0 block">
                <Link to={`/dashboard/news/${n.id}`} className="font-medium text-sm text-ink-900 hover:text-brand-700 transition-colors block">
                  {n.title}
                </Link>
                <span className="text-xs text-ink-400 mt-0.5 line-clamp-1 block">{n.summary}</span>
              </span>
            ),
          },
          { key: "date", label: "تاریخ", render: (n) => <span className="text-xs text-ink-400 whitespace-nowrap">{n.date}</span> },
          {
            key: "pinned",
            label: "وضعیت",
            render: (n) => (n.pinned ? <Badge tone="brand" icon={<Pin size={10} />}>مهم</Badge> : <span className="text-xs text-ink-300">—</span>),
          },
          { key: "views", label: "بازدید", render: (n) => <span className="flex items-center gap-1 text-xs text-ink-400"><Eye size={12} /> {n.views.toLocaleString("fa-IR")}</span> },
          { key: "comments", label: "نظرات", render: (n) => <span className="flex items-center gap-1 text-xs text-ink-400"><MessageCircle size={12} /> {n.comments.toLocaleString("fa-IR")}</span> },
          {
            key: "visibility",
            label: "دسترسی",
            render: (n) => <VisibilityToggle visibility={n.visibility} onChange={() => toggleVisibility(n.id)} size="xs" />,
          },
          { key: "actions", label: "", render: (n) => <RowActions onEdit={() => startEdit(n)} onDelete={() => remove(n)} /> },
        ]}
        rows={shownNews}
        searchKeys={["title", "summary"]}
        searchPlaceholder="جستجو در عنوان یا متن خبر…"
        emptyTitle="هنوز خبری ثبت نشده"
      />

      <ScopedNewsSection />

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(null); }} title={editingId ? "ویرایش خبر" : "انتشار اطلاعیه‌ی رسمی جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان خبر <span className="text-rose-500">*</span></label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: false })); }} placeholder="مثلاً: به‌روزرسانی سیاست امنیتی ورود دومرحله‌ای" className={`input-field ${errors.title ? "input-error" : ""}`} />
            {errors.title && <p className="field-error">عنوان خبر الزامی است.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">متن خبر <span className="text-rose-500">*</span></label>
            <textarea value={summary} onChange={(e) => { setSummary(e.target.value); setErrors((p) => ({ ...p, summary: false })); }} className={`input-field min-h-24 ${errors.summary ? "input-error" : ""}`} />
            {errors.summary && <p className="field-error">متن خبر الزامی است.</p>}
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
  const [viewer, setViewer] = useState<string>("hq"); // hq = ستاد بنیاد
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ownerCompany, setOwnerCompany] = useState(allCompanies[0].id);
  const [scope, setScope] = useState<ContentScope>("شرکت");
  const { notify } = useToast();
  const confirmDialog = useConfirm();

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
            <option value="hq">ستاد بنیاد (همه محتوا)</option>
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
                <RowActions
                  onDelete={() =>
                    confirmDialog({
                      title: `حذف خبر شرکتی «${n.title}»؟`,
                      onConfirm: () => {
                        setItems((prev) => prev.filter((x) => x.id !== n.id));
                        notify(`خبر شرکتی «${n.title}» حذف شد.`, "info");
                      },
                    })
                  }
                />
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
