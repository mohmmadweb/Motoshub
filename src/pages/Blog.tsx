import { useState } from "react";
import { NotebookPen, Star, Plus, Hash, BookMarked } from "lucide-react";
import { Link } from "react-router-dom";
import { currentUser, type BlogPost, type Visibility } from "../data/mock";
import { publicationIssues, type PublicationIssue } from "../data/mockDaneshmand";
import Tabs from "../components/ui/Tabs";
import RowActions from "../components/ui/RowActions";
import DataTable from "../components/ui/DataTable";
import { useConfirm } from "../components/ui/ConfirmProvider";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { VisibilityToggle, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useContent } from "../context/ContentContext";
import { useTabParam } from "../lib/useTabParam";

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

const pubStageTone = {
  "گردآوری محتوا": "neutral",
  ویراستاری: "warning",
  "صفحه‌آرایی": "brand",
  "چاپ و توزیع": "navy",
  "منتشر شده": "success",
} as const;

function PublicationsTab() {
  const { notify } = useToast();
  const grouped: PublicationIssue["magazine"][] = ["ماهنامه بنیاد", "نشریه بنیادتک"];
  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-500 leading-6">
        روند انتشار: گردآوری محتوا (معاونت ترویج نوآوری) ← ویراستاری ← صفحه‌آرایی ← چاپ و توزیع. نسخه دیجیتال
        هر شماره پس از انتشار در بانک دانش بارگذاری می‌شود.
      </p>
      {grouped.map((mag) => (
        <div key={mag}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
              <BookMarked size={14} className="text-brand-600" /> {mag}
            </h3>
            <button
              onClick={() => notify(`فرم برنامه‌ریزی شماره جدید «${mag}» باز شد.`, "info")}
              className="text-[11px] text-brand-600 font-medium hover:text-brand-700"
            >
              + شماره جدید
            </button>
          </div>
          <div className="card divide-y divide-ink-100">
            {publicationIssues.filter((p) => p.magazine === mag).map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink-900">شماره {p.issueNo.toLocaleString("fa-IR")} — {p.title}</p>
                  <p className="text-[11px] text-ink-400 mt-0.5">{p.season} · {p.articles.toLocaleString("fa-IR")} مقاله</p>
                </div>
                <Badge tone={pubStageTone[p.stage]}>{p.stage}</Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Blog() {
  const [tab, setTab] = useTabParam<"blog" | "pubs">("blog", ["blog", "pubs"]);
  const { blogPosts: posts, setBlogPosts: setPosts } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: boolean; excerpt?: boolean }>({});
  const { notify } = useToast();

  const startEdit = (b: BlogPost) => {
    setEditingId(b.id);
    setTitle(b.title);
    setExcerpt(b.excerpt);
    setTags(b.tags.join("، "));
    setVisibility(b.visibility);
    setOpen(true);
  };

  const confirm = useConfirm();
  const remove = (b: BlogPost) =>
    confirm({
      title: `حذف یادداشت «${b.title}»؟`,
      onConfirm: () => {
        setPosts((prev) => prev.filter((p) => p.id !== b.id));
        notify(`یادداشت «${b.title}» حذف شد.`, "info");
      },
    });

  const submit = () => {
    const errs = { title: !title.trim(), excerpt: !excerpt.trim() };
    setErrors(errs);
    if (errs.title || errs.excerpt) return;
    const tagList = tags.split("،").map((t) => t.trim()).filter(Boolean);
    if (editingId) {
      setPosts((prev) => prev.map((p) => (p.id === editingId ? { ...p, title: title.trim(), excerpt: excerpt.trim(), tags: tagList, visibility } : p)));
      notify(`یادداشت «${title.trim()}» ویرایش شد.`);
    } else {
      const newPost: BlogPost = {
        id: `b-${Date.now()}`,
        title: title.trim(),
        author: currentUser.name,
        excerpt: excerpt.trim(),
        date: jalaliToday,
        rating: 0,
        tags: tagList,
        visibility,
      };
      setPosts((prev) => [newPost, ...prev]);
      notify(`یادداشت «${newPost.title}» در بلاگ منتشر شد (${visibility}).`);
    }
    setOpen(false);
    setEditingId(null);
    setTitle(""); setExcerpt(""); setTags(""); setVisibility("عمومی");
  };

  const toggleVisibility = (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const next = post.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, visibility: next } : p));
    notify(`«${post.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <PageHeader
        title="بلاگ"
        description="یادداشت‌های منتشرشده توسط کاربران شبکه با امکان برچسب‌گذاری و امتیازدهی"
        icon={<NotebookPen size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            یادداشت جدید
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: "blog", label: "یادداشت‌های بلاگ", count: posts.length },
          { id: "pubs", label: "نشریات (بنیاد / بنیادتک)", count: publicationIssues.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "pubs" && <PublicationsTab />}

      {tab === "blog" && (
      <DataTable
        columns={[
          {
            key: "title",
            label: "عنوان یادداشت",
            render: (b) => (
              <span className="min-w-0 block">
                <Link to={`/dashboard/blog/${b.id}`} className="font-medium text-sm text-ink-900 hover:text-brand-700 transition-colors block">
                  {b.title}
                </Link>
                <span className="text-xs text-ink-400 mt-0.5 line-clamp-1 block">{b.excerpt}</span>
              </span>
            ),
          },
          {
            key: "tags",
            label: "برچسب‌ها",
            render: (b) => (
              <span className="flex items-center gap-1 flex-wrap">
                {b.tags.slice(0, 2).map((t) => (
                  <Badge key={t} tone="neutral" icon={<Hash size={9} />}>{t}</Badge>
                ))}
              </span>
            ),
          },
          { key: "author", label: "نویسنده", render: (b) => <span className="text-xs text-ink-400 whitespace-nowrap">{b.author}</span> },
          {
            key: "rating",
            label: "امتیاز",
            render: (b) => (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium whitespace-nowrap">
                <Star size={12} className="fill-amber-500 text-amber-500" /> {b.rating.toLocaleString("fa-IR")}
              </span>
            ),
          },
          { key: "visibility", label: "دسترسی", render: (b) => <VisibilityToggle visibility={b.visibility} onChange={() => toggleVisibility(b.id)} size="xs" /> },
          { key: "actions", label: "", render: (b) => <RowActions onEdit={() => startEdit(b)} onDelete={() => remove(b)} /> },
        ]}
        rows={posts}
        searchKeys={["title", "excerpt", "author"]}
        searchPlaceholder="جستجو در عنوان، متن یا نویسنده…"
        emptyTitle="هنوز یادداشتی ثبت نشده"
      />
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(null); }} title={editingId ? "ویرایش یادداشت" : "انتشار یادداشت جدید در بلاگ"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان <span className="text-rose-500">*</span></label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: false })); }} placeholder="مثلاً: تجربه‌ی یک‌ساله از مهاجرت به معماری چندمستأجری" className={`input-field ${errors.title ? "input-error" : ""}`} />
            {errors.title && <p className="field-error">عنوان الزامی است.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">متن یادداشت <span className="text-rose-500">*</span></label>
            <textarea value={excerpt} onChange={(e) => { setExcerpt(e.target.value); setErrors((p) => ({ ...p, excerpt: false })); }} className={`input-field min-h-24 ${errors.excerpt ? "input-error" : ""}`} />
            {errors.excerpt && <p className="field-error">متن یادداشت الزامی است.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">برچسب‌ها (با «،» جدا کنید)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="معماری، چندمستأجری" className="input-field" />
          </div>
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
