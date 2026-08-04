import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Flag, UserPlus, FileText, MessagesSquare, Pencil, Trash2, UserMinus } from "lucide-react";
import { posts, users } from "../data/mock";
import { useContent } from "../context/ContentContext";
import { useTenancy } from "../context/TenancyContext";
import PostCard from "../components/PostCard";
import Badge from "../components/ui/Badge";
import Avatar from "../components/Avatar";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { VisibilityBadge, VisibilityToggle, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";

type TabId = "posts" | "forum" | "members" | "docs";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { groups, setGroups } = useContent();
  const { notify } = useToast();
  const confirm = useConfirm();
  const group = groups.find((g) => g.id === id);
  const { canModerateGroup } = useTenancy();
  const canModerate = group ? canModerateGroup(group) : false;
  const [tab, setTab] = useState<TabId>("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "", privacy: "خصوصی" as "عمومی" | "خصوصی" });
  const [removedMembers, setRemovedMembers] = useState<string[]>([]);

  if (!group) return <p>گروه پیدا نشد.</p>;

  const groupPosts = posts.filter((p) => p.groupId === group.id);
  const members = users
    .slice(0, group.members > 4 ? 4 : group.members)
    .filter((m) => !removedMembers.includes(m.id));

  const openEdit = () => {
    setForm({ name: group.name, description: group.description, category: group.category, privacy: group.privacy });
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!form.name.trim() || !form.category.trim()) {
      notify("نام گروه و دسته‌بندی الزامی است.", "warning");
      return;
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.id === group.id
          ? { ...g, name: form.name.trim(), description: form.description.trim() || "بدون توضیحات", category: form.category.trim(), privacy: form.privacy }
          : g
      )
    );
    notify(`گروه «${form.name.trim()}» ویرایش شد.`);
    setEditOpen(false);
  };

  const removeGroup = () =>
    confirm({
      title: `حذف گروه «${group.name}»؟`,
      message: `${group.members.toLocaleString("fa-IR")} عضو از این گروه خارج می‌شوند و گفتگوها و اسناد گروه در دسترس نخواهد بود.`,
      onConfirm: () => {
        setGroups((prev) => prev.filter((g) => g.id !== group.id));
        notify(`گروه «${group.name}» حذف شد.`, "info");
        navigate("/dashboard/groups");
      },
    });

  const removeMember = (memberId: string, memberName: string) =>
    confirm({
      title: `حذف «${memberName}» از گروه؟`,
      message: "این کاربر دیگر به پست‌ها و اسناد این گروه دسترسی نخواهد داشت.",
      onConfirm: () => {
        setRemovedMembers((prev) => [...prev, memberId]);
        setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, members: Math.max(0, g.members - 1) } : g)));
        notify(`«${memberName}» از گروه حذف شد.`, "info");
      },
    });

  const togglePrivacy = () => {
    const next = group.privacy === "عمومی" ? "خصوصی" : "عمومی";
    setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, privacy: next } : g)));
    notify(`گروه «${group.name}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <div className="rounded-lg border border-ink-200 bg-navy-900 p-6 mb-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ backgroundColor: group.color }}>
            {group.name.slice(0, 1)}
          </span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-white">{group.name}</h1>
              <VisibilityBadge visibility={group.privacy} />
            </div>
            <p className="text-sm text-navy-200">{group.description}</p>
            <p className="text-xs text-navy-300 mt-2">{group.members.toLocaleString("fa-IR")} عضو · دسته‌بندی: {group.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canModerate && <VisibilityToggle visibility={group.privacy} onChange={togglePrivacy} size="sm" />}
          {canModerate && (
            <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={openEdit}>
              ویرایش گروه
            </Button>
          )}
          {canModerate && (
            <Button variant="secondary" size="sm" icon={<Trash2 size={13} />} onClick={removeGroup}>
              حذف گروه
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={<Flag size={13} />}>
            گزارش تخلف
          </Button>
          <Button variant="primary" size="sm" icon={<UserPlus size={13} />}>
            عضو شده‌اید
          </Button>
        </div>
      </div>

      <Tabs<TabId>
        tabs={[
          { id: "posts", label: "پست‌ها", count: groupPosts.length },
          { id: "forum", label: "انجمن گروه" },
          { id: "members", label: "اعضا و ناظمان", count: group.members },
          { id: "docs", label: "اسناد گروه" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "posts" && (
        <div className="space-y-4">
          {groupPosts.length === 0 ? (
            <EmptyState title="هنوز پستی در این گروه ثبت نشده" />
          ) : (
            groupPosts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      )}

      {tab === "forum" && (
        <EmptyState icon={<MessagesSquare size={20} />} title="تالار گفتگوی این گروه" description="موضوعات این گروه از ماژول انجمن سراسری فیلتر و این‌جا نمایش داده می‌شود." />
      )}

      {tab === "members" && (
        members.length === 0 ? (
          <EmptyState title="عضوی در این گروه باقی نمانده" />
        ) : (
          <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 p-2">
                <Avatar name={m.name} color={m.avatarColor} online={m.online} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-ink-400 truncate">{m.role}</p>
                </div>
                {i === 0 ? (
                  <Badge tone="navy">ناظم گروه</Badge>
                ) : canModerate ? (
                  <button
                    onClick={() => removeMember(m.id, m.name)}
                    className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                    title="حذف از گروه"
                  >
                    <UserMinus size={14} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "docs" && (
        <EmptyState icon={<FileText size={20} />} title="اسناد گروه" description="اسناد بارگذاری‌شده در این گروه، از ماژول مدیریت دانش با دسته‌بندی این گروه نمایش داده می‌شود." />
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="ویرایش گروه" description="تغییرات برای همه‌ی اعضای گروه اعمال می‌شود.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام گروه</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">توضیحات</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field min-h-20" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-field" />
          </div>
          <VisibilityPicker value={form.privacy} onChange={(v) => setForm((f) => ({ ...f, privacy: v }))} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={saveEdit}>ذخیره تغییرات</Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
