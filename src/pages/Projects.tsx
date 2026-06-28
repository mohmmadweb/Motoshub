import { useState } from "react";
import { Link } from "react-router-dom";
import { KanbanSquare, Plus, Wallet, ListChecks, ClipboardList, PlayCircle } from "lucide-react";
import { projects as initialProjects, playbookTemplates as initialPlaybooks, type Project, type PlaybookTemplate } from "../data/mock";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

const healthTone: Record<string, BadgeTone> = {
  سبز: "success",
  زرد: "warning",
  قرمز: "danger",
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [playbooks, setPlaybooks] = useState<PlaybookTemplate[]>(initialPlaybooks);
  const [projectOpen, setProjectOpen] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [deadline, setDeadline] = useState("");
  const [pbName, setPbName] = useState("");
  const [pbCategory, setPbCategory] = useState("");
  const [pbSteps, setPbSteps] = useState("");
  const { notify } = useToast();

  const submitProject = () => {
    if (!name.trim() || !client.trim()) {
      notify("نام پروژه و کارفرما الزامی است.", "warning");
      return;
    }
    const newProject: Project = {
      id: `pr-${Date.now()}`,
      name: name.trim(),
      client: client.trim(),
      health: "سبز",
      progress: 0,
      budgetUsed: 0,
      deadline: deadline.trim() || "نامشخص",
      tasks: [],
    };
    setProjects((prev) => [newProject, ...prev]);
    notify(`پروژه «${newProject.name}» ایجاد شد.`);
    setProjectOpen(false);
    setName("");
    setClient("");
    setDeadline("");
  };

  const submitPlaybook = () => {
    if (!pbName.trim() || !pbCategory.trim()) {
      notify("نام و دسته‌بندی قالب الزامی است.", "warning");
      return;
    }
    const newPb: PlaybookTemplate = {
      id: `pb-${Date.now()}`,
      name: pbName.trim(),
      category: pbCategory.trim(),
      steps: Number(pbSteps) || 3,
      usedCount: 0,
    };
    setPlaybooks((prev) => [newPb, ...prev]);
    notify(`قالب فرآیند «${newPb.name}» ایجاد شد.`);
    setPlaybookOpen(false);
    setPbName("");
    setPbCategory("");
    setPbSteps("");
  };

  const runPlaybook = (pb: PlaybookTemplate) => {
    setPlaybooks((prev) => prev.map((p) => (p.id === pb.id ? { ...p, usedCount: p.usedCount + 1 } : p)));
    notify(`اجرای قالب «${pb.name}» آغاز شد — یک چک‌لیست ${pb.steps} مرحله‌ای برای تیم ایجاد شد.`, "info");
  };

  return (
    <div>
      <PageHeader
        title="مدیریت پروژه"
        description="پروژه‌های پژوهشی، فناورانه و آموزشی با بودجه، تسک و گانت چارت"
        icon={<KanbanSquare size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setProjectOpen(true)}>
            پروژه جدید
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {projects.map((p) => (
          <Link key={p.id} to={`/app/projects/${p.id}`} className="card p-4 hover:border-brand-300 transition-colors flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge tone={healthTone[p.health]}>وضعیت: {p.health}</Badge>
              <span className="text-xs text-ink-400">مهلت {p.deadline}</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-ink-900">{p.name}</h3>
              <p className="text-xs text-ink-400 mt-1">کارفرما: {p.client}</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                <span>پیشرفت</span>
                <span>{p.progress}٪</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-100">
              <span className="flex items-center gap-1">
                <Wallet size={12} /> مصرف بودجه: {p.budgetUsed}٪
              </span>
              <span className="flex items-center gap-1">
                <ListChecks size={12} /> {p.tasks.length} تسک
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <ClipboardList size={15} className="text-brand-600" /> قالب‌های فرآیند عملیاتی (Playbooks)
          </h2>
          <p className="text-xs text-ink-400 mt-0.5">رویه‌های تکرارشونده (مثل تحویل پروژه یا واکنش به حادثه) را به یک گردش‌کار چک‌لیستی تبدیل کنید.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setPlaybookOpen(true)}>قالب جدید</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {playbooks.map((pb) => (
          <div key={pb.id} className="card p-4">
            <p className="text-sm font-semibold text-ink-900">{pb.name}</p>
            <p className="text-xs text-ink-400 mt-1">{pb.category} · {pb.steps} مرحله</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100">
              <span className="text-[11px] text-ink-400">{pb.usedCount} بار اجراشده</span>
              <Button variant="ghost" size="sm" icon={<PlayCircle size={13} />} onClick={() => runPlaybook(pb)}>اجرا</Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={projectOpen} onClose={() => setProjectOpen(false)} title="ایجاد پروژه جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام پروژه</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: پایلوت ماژول دانش برای واحد منابع انسانی" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">کارفرما</label>
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="مثلاً: هلدینگ دانشمند" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">مهلت تحویل</label>
            <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="۱۴۰۵/۰۸/۰۱" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitProject}>ایجاد پروژه</Button>
            <Button variant="secondary" onClick={() => setProjectOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Modal open={playbookOpen} onClose={() => setPlaybookOpen(false)} title="ایجاد قالب فرآیند جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام قالب</label>
            <input value={pbName} onChange={(e) => setPbName(e.target.value)} placeholder="مثلاً: فرآیند آنبوردینگ سازمان جدید" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
              <input value={pbCategory} onChange={(e) => setPbCategory(e.target.value)} placeholder="مدیریت پروژه" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">تعداد مرحله</label>
              <input value={pbSteps} onChange={(e) => setPbSteps(e.target.value)} placeholder="۵" className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitPlaybook}>ایجاد قالب</Button>
            <Button variant="secondary" onClick={() => setPlaybookOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
