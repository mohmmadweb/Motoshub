import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Bell, BellOff, Send, Pencil, Trash2, Check } from "lucide-react";
import { users, currentUser } from "../data/mock";
import { useContent } from "../context/ContentContext";
import { useTenancy } from "../context/TenancyContext";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import RowActions from "../components/ui/RowActions";
import EmptyState from "../components/ui/EmptyState";
import { VisibilityBadge, VisibilityToggle } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";

type Reply = { id: string; author: string; avatarColor: string; body: string; accepted: boolean; when: string; mine: boolean };

export default function ForumTopic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { forumTopics, setForumTopics } = useContent();
  const { notify } = useToast();
  const { hasPermission, canManageItem } = useTenancy();
  const confirm = useConfirm();
  const topic = forumTopics.find((t) => t.id === id);
  const [following, setFollowing] = useState(false);
  // پاسخ‌های نمونه‌ی واقع‌نما — دو دیدگاهِ متمایز و منسجم برای هر موضوع
  const seedReplies = [
    "در واحد ما دقیقاً همین رویه اجرا شد؛ کلیدی‌ترین نکته، تعیین «معیار پذیرش» پیش از شروع کار بود. صورت‌جلسه و چک‌لیست اجرایی را در «مدیریت دانش» بارگذاری کردم تا برای واحدهای دیگر هم قابل استناد باشد.",
    "تجربه‌ی ما نشان داد اگر گزارش پیشرفت ماهانه ثبت نشود، جمع‌بندی نهایی و مقایسه‌ی نتایج سخت می‌شود. پیشنهادم این است که شاخص‌های کلیدی (KPI) از همان ابتدا در سامانه تعریف و به مسئول هر بخش تخصیص داده شود.",
  ];
  const [replies, setReplies] = useState<Reply[]>(() =>
    users.slice(1, 3).map((u, i) => ({
      id: `r-${u.id}`,
      author: u.name,
      avatarColor: u.avatarColor,
      body: seedReplies[i] ?? seedReplies[0],
      accepted: i === 0,
      when: "۲ روز پیش",
      mine: false,
    }))
  );
  const [draft, setDraft] = useState("");
  const [editingReply, setEditingReply] = useState<Reply | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [topicEditOpen, setTopicEditOpen] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: "", category: "" });

  if (!topic) return <p>موضوع پیدا نشد.</p>;

  const author = users.find((u) => u.name === topic.author) ?? users[0];

  const toggleVisibility = () => {
    const next = topic.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setForumTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, visibility: next } : t)));
    notify(`موضوع «${topic.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  const toggleSolved = () => {
    const next = !topic.solved;
    setForumTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, solved: next } : t)));
    notify(next ? "موضوع «حل‌شده» علامت خورد." : "علامت «حل‌شده» برداشته شد.", next ? "success" : "info");
  };

  const openTopicEdit = () => {
    setTopicForm({ title: topic.title, category: topic.category });
    setTopicEditOpen(true);
  };

  const saveTopicEdit = () => {
    if (!topicForm.title.trim()) {
      notify("عنوان موضوع الزامی است.", "warning");
      return;
    }
    setForumTopics((prev) =>
      prev.map((t) => (t.id === topic.id ? { ...t, title: topicForm.title.trim(), category: topicForm.category.trim() || "عمومی" } : t))
    );
    notify("موضوع ویرایش شد.");
    setTopicEditOpen(false);
  };

  const removeTopic = () =>
    confirm({
      title: `حذف موضوع «${topic.title}»؟`,
      message: `${replies.length.toLocaleString("fa-IR")} پاسخ ذیل این موضوع نیز حذف می‌شود.`,
      onConfirm: () => {
        setForumTopics((prev) => prev.filter((t) => t.id !== topic.id));
        notify(`موضوع «${topic.title}» حذف شد.`, "info");
        navigate("/dashboard/forum");
      },
    });

  const sendReply = () => {
    if (!draft.trim()) {
      notify("متن پاسخ خالی است.", "warning");
      return;
    }
    const r: Reply = {
      id: `r-${Date.now()}`,
      author: currentUser.name,
      avatarColor: currentUser.avatarColor,
      body: draft.trim(),
      accepted: false,
      when: "هم‌اکنون",
      mine: true,
    };
    setReplies((prev) => [...prev, r]);
    setForumTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, replies: t.replies + 1, lastActivity: "اکنون" } : t)));
    setDraft("");
    notify("پاسخ شما ثبت شد.");
  };

  const saveReplyEdit = () => {
    if (!editingReply || !replyDraft.trim()) return;
    setReplies((prev) => prev.map((r) => (r.id === editingReply.id ? { ...r, body: replyDraft.trim() } : r)));
    notify("پاسخ ویرایش شد.");
    setEditingReply(null);
    setReplyDraft("");
  };

  const removeReply = (r: Reply) =>
    confirm({
      title: "حذف این پاسخ؟",
      message: "پاسخ حذف‌شده قابل بازیابی نیست.",
      onConfirm: () => {
        setReplies((prev) => prev.filter((x) => x.id !== r.id));
        setForumTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, replies: Math.max(0, t.replies - 1) } : t)));
        notify("پاسخ حذف شد.", "info");
      },
    });

  const acceptReply = (r: Reply) => {
    setReplies((prev) => prev.map((x) => ({ ...x, accepted: x.id === r.id ? !x.accepted : false })));
    notify(r.accepted ? "پذیرش پاسخ لغو شد." : `پاسخ «${r.author}» به‌عنوان پاسخ پذیرفته‌شده ثبت شد.`, "success");
  };

  return (
    <div>
      <PageHeader
        title={topic.title}
        breadcrumb={[{ label: "انجمن", to: "/dashboard/forum" }, { label: topic.category }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canManageItem(topic, "forum.edit")
              ? <VisibilityToggle visibility={topic.visibility} onChange={toggleVisibility} size="sm" />
              : <VisibilityBadge visibility={topic.visibility} />}
            {canManageItem(topic, "forum.solve") && (
              <Button variant={topic.solved ? "primary" : "secondary"} size="sm" icon={<CheckCircle2 size={13} />} onClick={toggleSolved}>
                {topic.solved ? "حل‌شده" : "علامت حل‌شده"}
              </Button>
            )}
            <Button variant={following ? "primary" : "secondary"} size="sm" icon={following ? <Bell size={13} /> : <BellOff size={13} />} onClick={() => setFollowing((v) => !v)}>
              {following ? "دنبال‌می‌کنید" : "دنبال کردن موضوع"}
            </Button>
            {canManageItem(topic, "forum.edit") && <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={openTopicEdit}>ویرایش</Button>}
            {canManageItem(topic, "forum.delete") && <Button variant="secondary" size="sm" icon={<Trash2 size={13} />} onClick={removeTopic}>حذف</Button>}
          </div>
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={author.name} color={author.avatarColor} />
          <div>
            <p className="text-sm font-medium">{author.name}</p>
            <p className="text-xs text-ink-400">{topic.lastActivity}</p>
          </div>
          {topic.solved && (
            <Badge tone="success" icon={<CheckCircle2 size={11} />}>
              حل‌شده
            </Badge>
          )}
          <VisibilityBadge visibility={topic.visibility} />
        </div>
        <p className="text-sm leading-7 text-ink-800">
          در موضوع «{topic.title}» به‌دنبال جمع‌بندی تجربه‌ها و رسیدن به یک رویه‌ی قابل‌تکرار هستیم.
          اگر در حوزه‌ی «{topic.category}» تجربه‌ی مرتبط دارید، لطفاً نکات کلیدی، ریسک‌های احتمالی و اسناد مرجع
          (صورت‌جلسه، چک‌لیست یا گزارش) را اضافه کنید تا برای واحدهای دیگرِ بنیاد هم قابل استفاده باشد.
        </p>
      </div>

      <h3 className="text-sm font-bold mb-3 text-ink-700">{replies.length.toLocaleString("fa-IR")} پاسخ</h3>
      <div className="space-y-3 mb-4">
        {replies.length === 0 ? (
          <EmptyState title="هنوز پاسخی ثبت نشده" description="اولین پاسخ را شما بنویسید." />
        ) : (
          replies.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <Avatar name={r.author} color={r.avatarColor} size={32} />
                <p className="text-xs font-medium">{r.author}</p>
                <span className="text-[11px] text-ink-400">{r.when}</span>
                {r.accepted && <Badge tone="success">پاسخ پذیرفته‌شده</Badge>}
                <span className="flex-1" />
                {canManageItem(topic, "forum.solve") && (
                  <button
                    onClick={() => acceptReply(r)}
                    className={`p-1.5 rounded-md hover:bg-emerald-50 ${r.accepted ? "text-emerald-600" : "text-ink-400 hover:text-emerald-600"}`}
                    title={r.accepted ? "لغو پذیرش پاسخ" : "پذیرش به‌عنوان پاسخ"}
                  >
                    <Check size={14} />
                  </button>
                )}
                <RowActions
                  onEdit={(r.mine || canManageItem(topic, "forum.edit")) ? () => { setEditingReply(r); setReplyDraft(r.body); } : undefined}
                  onDelete={(r.mine || canManageItem(topic, "forum.delete")) ? () => removeReply(r) : undefined}
                />
              </div>
              <p className="text-sm text-ink-700 leading-7 whitespace-pre-wrap">{r.body}</p>
            </div>
          ))
        )}
      </div>

      {hasPermission("forum.reply") ? (
        <div className="card p-3 flex items-center gap-2">
          <input
            className="input-field"
            placeholder="پاسخ خود را بنویسید…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
          />
          <Button variant="primary" icon={<Send size={14} />} onClick={sendReply}>
            ارسال
          </Button>
        </div>
      ) : (
        <div className="card p-3 text-center text-xs text-ink-400">
          برای پاسخ‌دادن به این موضوع، دسترسی «پاسخ به مباحث» لازم است.
        </div>
      )}

      <Modal open={!!editingReply} onClose={() => setEditingReply(null)} title="ویرایش پاسخ">
        <div className="space-y-3">
          <textarea value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} className="input-field min-h-28" />
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={saveReplyEdit}>ذخیره تغییرات</Button>
            <Button variant="secondary" onClick={() => setEditingReply(null)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Modal open={topicEditOpen} onClose={() => setTopicEditOpen(false)} title="ویرایش موضوع">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان موضوع</label>
            <input value={topicForm.title} onChange={(e) => setTopicForm((f) => ({ ...f, title: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
            <input value={topicForm.category} onChange={(e) => setTopicForm((f) => ({ ...f, category: e.target.value }))} className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={saveTopicEdit}>ذخیره تغییرات</Button>
            <Button variant="secondary" onClick={() => setTopicEditOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
