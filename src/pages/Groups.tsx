import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { groups as initialGroups, type Group } from "../data/mock";
import GroupCard from "../components/GroupCard";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

const palette = ["#1f4f99", "#2a66bd", "#0d9488", "#7c3aed", "#b45309"];

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [active, setActive] = useState("همه");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState<Group["privacy"]>("عمومی");
  const { notify } = useToast();

  const categories = ["همه", ...Array.from(new Set(initialGroups.map((g) => g.category)))];
  const filtered = active === "همه" ? groups : groups.filter((g) => g.category === active);

  const submit = () => {
    if (!name.trim() || !category.trim()) {
      notify("نام گروه و دسته‌بندی الزامی است.", "warning");
      return;
    }
    const newGroup: Group = {
      id: `g-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || "بدون توضیحات",
      members: 1,
      privacy,
      color: palette[groups.length % palette.length],
      unread: 0,
      category: category.trim(),
    };
    setGroups((prev) => [newGroup, ...prev]);
    notify(`گروه «${newGroup.name}» با موفقیت ایجاد شد.`);
    setOpen(false);
    setName("");
    setDescription("");
    setCategory("");
    setPrivacy("عمومی");
  };

  return (
    <div>
      <PageHeader
        title="گروه‌های تعاملی"
        description="ایجاد، مدیریت و عضویت در گروه‌های خصوصی و عمومی سازمان"
        icon={<Users size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            گروه جدید
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              active === c ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="ایجاد گروه جدید" description="شما به‌صورت خودکار مدیر این گروه خواهید بود.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام گروه</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: کمیته فناوری اطلاعات" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">توضیحات</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="هدف و موضوع فعالیت گروه را بنویسید…" className="input-field min-h-20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً: فنی" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">سطح دسترسی</label>
              <select value={privacy} onChange={(e) => setPrivacy(e.target.value as Group["privacy"])} className="input-field">
                <option value="عمومی">عمومی</option>
                <option value="خصوصی">خصوصی</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ایجاد گروه</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
