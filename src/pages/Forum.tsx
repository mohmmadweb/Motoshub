import { useState } from "react";
import { Plus, MessagesSquare, CheckCircle2, Eye, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { currentUser, type ForumTopic, type Visibility } from "../data/mock";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import RowActions from "../components/ui/RowActions";
import EmptyState from "../components/ui/EmptyState";
import { VisibilityToggle, VisibilityPicker, VisibilityBadge } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useContent } from "../context/ContentContext";
import { useTenancy } from "../context/TenancyContext";
import { ScopeBadge, ScopePicker } from "../components/ui/ScopeControl";
import type { Scoped } from "../data/tenancy";

export default function Forum() {
  const { forumTopics: topics, setForumTopics: setTopics } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { filterScoped, defaultScopeForNew, hasPermission } = useTenancy();
  const [itemScope, setItemScope] = useState<Scoped>({ scope: "سراسری" });
  const { notify } = useToast();
  const confirm = useConfirm();

  const startEdit = (t: ForumTopic) => {
    setEditingId(t.id);
    setTitle(t.title);
    setCategory(t.category);
    setVisibility(t.visibility);
    setItemScope({ scope: t.scope, holdingId: t.holdingId, companyId: t.companyId });
    setOpen(true);
  };

  const remove = (t: ForumTopic) =>
    confirm({
      title: `حذف موضوع «${t.title}»؟`,
      message: `${t.replies.toLocaleString("fa-IR")} پاسخ ذیل این موضوع نیز حذف می‌شود.`,
      onConfirm: () => {
        setTopics((prev) => prev.filter((x) => x.id !== t.id));
        notify(`موضوع «${t.title}» حذف شد.`, "info");
      },
    });

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setTitle("");
    setCategory("");
    setVisibility("عمومی");
    setItemScope(defaultScopeForNew());
  };

  const submit = () => {
    if (!title.trim()) {
      notify("عنوان موضوع الزامی است.", "warning");
      return;
    }
    if (editingId) {
      setTopics((prev) =>
        prev.map((t) =>
          t.id === editingId ? { ...t, title: title.trim(), category: category.trim() || "عمومی", visibility, ...itemScope } : t
        )
      );
      notify(`موضوع «${title.trim()}» ویرایش شد.`);
      closeModal();
      return;
    }
    const newTopic: ForumTopic = {
      id: `f-${Date.now()}`,
      title: title.trim(),
      author: currentUser.name,
      replies: 0,
      views: 1,
      lastActivity: "اکنون",
      category: category.trim() || "عمومی",
      visibility,
      ...(editingId ? {} : defaultScopeForNew()),
      ...itemScope,
    };
    setTopics((prev) => [newTopic, ...prev]);
    notify(`موضوع «${newTopic.title}» در انجمن منتشر شد (${visibility}).`);
    closeModal();
  };

  const toggleVisibility = (id: string) =>
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, visibility: t.visibility === "عمومی" ? "خصوصی" : "عمومی" } : t)));

  return (
    <div>
      <PageHeader
        title="انجمن"
        description="تبادل اطلاعات، پرسش‌و‌پاسخ و دسته‌بندی موضوعات در تالارهای گفتگو"
        icon={<MessagesSquare size={18} />}
        actions={
          hasPermission("forum.create") ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setItemScope(defaultScopeForNew()); setOpen(true); }}>
              موضوع جدید
            </Button>
          ) : null
        }
      />

      {filterScoped(topics).length === 0 && <EmptyState icon={<MessagesSquare size={20} />} title="در این دامنه موضوعی وجود ندارد" />}

      <div className="card divide-y divide-ink-100">
        {filterScoped(topics).map((t) => (
          <Link key={t.id} to={`/dashboard/forum/${t.id}`} className="p-4 flex items-center justify-between gap-3 hover:bg-ink-50/60 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate text-ink-900">{t.title}</h3>
                {t.solved && (
                  <Badge tone="success" icon={<CheckCircle2 size={11} />}>
                    حل‌شده
                  </Badge>
                )}
              </div>
              <p className="text-xs text-ink-400 mt-1">
                توسط {t.author} · دسته: {t.category} · آخرین فعالیت {t.lastActivity}
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-ink-500 flex-wrap">
              <span className="flex items-center gap-1">
                <MessageCircle size={13} /> {t.replies}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={13} /> {t.views}
              </span>
              <ScopeBadge item={t} />
              {hasPermission("forum.edit")
                ? <VisibilityToggle visibility={t.visibility} onChange={() => toggleVisibility(t.id)} size="xs" />
                : <VisibilityBadge visibility={t.visibility} />}
              <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <RowActions onEdit={hasPermission("forum.edit") ? () => startEdit(t) : undefined} onDelete={hasPermission("forum.delete") ? () => remove(t) : undefined} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Modal open={open} onClose={closeModal} title={editingId ? "ویرایش موضوع انجمن" : "ایجاد موضوع جدید در انجمن"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان موضوع</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: بهترین روش احراز هویت چندعاملی برای پنل راهبری" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً: امنیت" className="input-field" />
          </div>
          <VisibilityPicker value={visibility} onChange={setVisibility} />
          <ScopePicker value={itemScope} onChange={setItemScope} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>
              {editingId ? "ذخیره تغییرات" : "انتشار موضوع"}
            </Button>
            <Button variant="secondary" onClick={closeModal}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
