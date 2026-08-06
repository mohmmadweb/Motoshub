import { useState } from "react";
import { Trophy, Plus, Image as ImageIcon, ThumbsUp, Flag, Swords, Users2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";
import Modal from "../components/ui/Modal";
import RowActions from "../components/ui/RowActions";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useTabParam } from "../lib/useTabParam";
import { useTenancy } from "../context/TenancyContext";
import { ScopeBadge, ScopePicker } from "../components/ui/ScopeControl";
import { withDemoScopes, type Scoped } from "../data/tenancy";

// مسابقات (iiscompetition) + چالش‌ها (iischallenge)
type Competition = {
  id: string;
  title: string;
  category: string;
  deadline: string;
  participants: number;
  status: "ثبت‌نام باز" | "در حال داوری" | "اعلام نتایج";
  prize: string;
  entries: { id: string; by: string; title: string; votes: number; color: string; myVote?: boolean }[];
} & Scoped;

const initialCompetitions: Competition[] = [
  {
    id: "cp1",
    title: "مسابقه عکاسی «صنعت در قاب» — خطوط تولید شرکت‌های بنیاد",
    category: "عکاسی",
    deadline: "۱۴۰۵/۰۵/۲۰",
    participants: 63,
    status: "ثبت‌نام باز",
    prize: "۳ کمک‌هزینه سفر نمایشگاهی",
    entries: [
      { id: "e1", by: "دکتر آرین صدرا", title: "ربات جوشکار خط بدنه", votes: 41, color: "#5e7191" },
      { id: "e2", by: "مهندس پارسا یگانه", title: "برداشت شبانه دشت ناز", votes: 38, color: "#0d9488" },
      { id: "e3", by: "دکتر مهسا نیک‌اندیش", title: "آزمایشگاه کیت تشخیص", votes: 27, color: "#b45309" },
    ],
  },
  {
    id: "cp2",
    title: "مسابقه ایده «یک دقیقه برای بهره‌وری»",
    category: "ویدیوی کوتاه",
    deadline: "۱۴۰۵/۰۴/۲۵",
    participants: 29,
    status: "در حال داوری",
    prize: "اعتبار آموزش تخصصی",
    entries: [],
  },
];

type Challenge = {
  id: string;
  title: string;
  kind: "فردی" | "همگانی";
  category: string;
  joined: number;
  progress?: number;
  status: "فعال" | "پایان‌یافته";
} & Scoped;

const initialChallenges: Challenge[] = [
  { id: "ch1", title: "چالش ۳۰ روز مستندسازی — هر روز یک درس‌آموخته در بانک دانش", kind: "همگانی", category: "مدیریت دانش", joined: 84, progress: 40, status: "فعال" },
  { id: "ch2", title: "چالش کاهش ۱۰٪ مصرف انرژی واحدها", kind: "همگانی", category: "انرژی", joined: 12, progress: 65, status: "فعال" },
  { id: "ch3", title: "چالش فردی: تکمیل پروفایل و مهارت‌ها", kind: "فردی", category: "عمومی", joined: 412, progress: 100, status: "پایان‌یافته" },
];

const compTone: Record<Competition["status"], BadgeTone> = { "ثبت‌نام باز": "success", "در حال داوری": "warning", "اعلام نتایج": "navy" };

export default function Competitions() {
  const [tab, setTab] = useTabParam<"comp" | "challenge">("comp", ["comp", "challenge"]);
  const [comps, setComps] = useState<Competition[]>(() => withDemoScopes(initialCompetitions, 13));
  const [challenges, setChallenges] = useState<Challenge[]>(() => withDemoScopes(initialChallenges, 14));
  const [joined, setJoined] = useState<string[]>(["ch1"]);
  const { notify } = useToast();
  const confirm = useConfirm();
  const { filterScoped, defaultScopeForNew, canAccessAdmin, canManageItem, actingUser } = useTenancy();
  const [itemScope, setItemScope] = useState<Scoped>({ scope: "سراسری" });

  const [compOpen, setCompOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [compForm, setCompForm] = useState({ title: "", category: "", deadline: "", prize: "" });

  const [chOpen, setChOpen] = useState(false);
  const [editingChId, setEditingChId] = useState<string | null>(null);
  const [chForm, setChForm] = useState({ title: "", category: "", kind: "همگانی" as Challenge["kind"] });

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryComp, setEntryComp] = useState<Competition | null>(null);
  const [entryTitle, setEntryTitle] = useState("");

  const entryPalette = ["#5e7191", "#0d9488", "#b45309", "#1f4f99", "#7c3aed"];

  const openCompModal = (c?: Competition) => {
    if (c) {
      setEditingCompId(c.id);
      setItemScope({ scope: c.scope, holdingId: c.holdingId, companyId: c.companyId });
      setCompForm({ title: c.title, category: c.category, deadline: c.deadline, prize: c.prize });
    } else {
      setEditingCompId(null);
      setItemScope(defaultScopeForNew());
      setCompForm({ title: "", category: "", deadline: "", prize: "" });
    }
    setCompOpen(true);
  };

  const submitComp = () => {
    if (!compForm.title.trim()) {
      notify("عنوان مسابقه الزامی است.", "warning");
      return;
    }
    const payload = {
      title: compForm.title.trim(),
      category: compForm.category.trim() || "عمومی",
      deadline: compForm.deadline.trim() || "—",
      prize: compForm.prize.trim() || "—",
    };
    if (editingCompId) {
      setComps((prev) => prev.map((c) => (c.id === editingCompId ? { ...c, ...payload, ...itemScope } : c)));
      notify("مسابقه ویرایش شد.");
    } else {
      setComps((prev) => [{ id: `cp-${Date.now()}`, participants: 0, status: "ثبت‌نام باز", entries: [], ...payload, ...itemScope, authorId: actingUser.id }, ...prev]);
      notify("مسابقه ایجاد شد.");
    }
    setCompOpen(false);
    setEditingCompId(null);
  };

  const removeComp = (c: Competition) =>
    confirm({
      title: `حذف مسابقه «${c.title}»؟`,
      message: `${c.entries.length.toLocaleString("fa-IR")} اثر ارسال‌شده و آرای آن نیز حذف می‌شود.`,
      onConfirm: () => {
        setComps((prev) => prev.filter((x) => x.id !== c.id));
        notify("مسابقه حذف شد.", "info");
      },
    });

  const openEntryModal = (c: Competition) => {
    setEntryComp(c);
    setEntryTitle("");
    setEntryOpen(true);
  };

  const submitEntry = () => {
    if (!entryComp || !entryTitle.trim()) {
      notify("عنوان اثر الزامی است.", "warning");
      return;
    }
    setComps((prev) =>
      prev.map((c) =>
        c.id === entryComp.id
          ? {
              ...c,
              participants: c.participants + 1,
              entries: [
                ...c.entries,
                { id: `e-${Date.now()}`, by: "شما", title: entryTitle.trim(), votes: 0, color: entryPalette[c.entries.length % entryPalette.length] },
              ],
            }
          : c
      )
    );
    notify(`اثر «${entryTitle.trim()}» ارسال شد.`);
    setEntryOpen(false);
  };

  const removeEntry = (cid: string, e: Competition["entries"][number]) =>
    confirm({
      title: `حذف اثر «${e.title}»؟`,
      message: "آرای ثبت‌شده روی این اثر نیز حذف می‌شود.",
      onConfirm: () => {
        setComps((prev) =>
          prev.map((c) =>
            c.id === cid ? { ...c, entries: c.entries.filter((x) => x.id !== e.id), participants: Math.max(0, c.participants - 1) } : c
          )
        );
        notify("اثر حذف شد.", "info");
      },
    });

  const openChModal = (c?: Challenge) => {
    if (c) {
      setEditingChId(c.id);
      setItemScope({ scope: c.scope, holdingId: c.holdingId, companyId: c.companyId });
      setChForm({ title: c.title, category: c.category, kind: c.kind });
    } else {
      setEditingChId(null);
      setItemScope(defaultScopeForNew());
      setChForm({ title: "", category: "", kind: "همگانی" });
    }
    setChOpen(true);
  };

  const submitCh = () => {
    if (!chForm.title.trim()) {
      notify("عنوان چالش الزامی است.", "warning");
      return;
    }
    const payload = { title: chForm.title.trim(), category: chForm.category.trim() || "عمومی", kind: chForm.kind };
    if (editingChId) {
      setChallenges((prev) => prev.map((c) => (c.id === editingChId ? { ...c, ...payload, ...itemScope } : c)));
      notify("چالش ویرایش شد.");
    } else {
      setChallenges((prev) => [{ id: `ch-${Date.now()}`, joined: 0, progress: 0, status: "فعال", ...payload, ...itemScope, authorId: actingUser.id }, ...prev]);
      notify("چالش ایجاد شد.");
    }
    setChOpen(false);
    setEditingChId(null);
  };

  const removeCh = (c: Challenge) =>
    confirm({
      title: `حذف چالش «${c.title}»؟`,
      message: "پیشرفت ثبت‌شده‌ی شرکت‌کنندگان نیز حذف می‌شود.",
      onConfirm: () => {
        setChallenges((prev) => prev.filter((x) => x.id !== c.id));
        setJoined((prev) => prev.filter((x) => x !== c.id));
        notify("چالش حذف شد.", "info");
      },
    });

  const voteEntry = (cid: string, eid: string) => {
    setComps((prev) =>
      prev.map((c) =>
        c.id === cid
          ? {
              ...c,
              entries: c.entries.map((e) =>
                e.id === eid ? { ...e, votes: e.votes + (e.myVote ? -1 : 1), myVote: !e.myVote } : e
              ),
            }
          : c
      )
    );
  };

  return (
    <div>
      <PageHeader
        title="مسابقات و چالش‌ها"
        description="مسابقات سازمانی با ارسال اثر و رأی‌گیری، و چالش‌های فردی/همگانی با پایش پیشرفت"
        icon={<Trophy size={18} />}
        actions={
          canAccessAdmin ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => (tab === "comp" ? openCompModal() : openChModal())}>
              {tab === "comp" ? "مسابقه جدید" : "چالش جدید"}
            </Button>
          ) : null
        }
      />
      <Tabs
        tabs={[
          { id: "comp", label: "مسابقات", count: filterScoped(comps).length },
          { id: "challenge", label: "چالش‌ها", count: filterScoped(challenges).length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "comp" && filterScoped(comps).length === 0 && <EmptyState icon={<Trophy size={20} />} title="هنوز مسابقه‌ای تعریف نشده" />}

      {tab === "comp" && (
        <div className="space-y-4">
          {filterScoped(comps).map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <p className="text-sm font-bold text-ink-900">{c.title}</p>
                <span className="flex items-center gap-1">
                  <ScopeBadge item={c} />
                  <Badge tone={compTone[c.status]}>{c.status}</Badge>
                  {canManageItem(c) && <RowActions onEdit={() => openCompModal(c)} onDelete={() => removeComp(c)} />}
                </span>
              </div>
              <p className="text-[11.5px] text-ink-400 mb-3 flex items-center gap-2 flex-wrap">
                <Badge tone="neutral">{c.category}</Badge>
                <span className="flex items-center gap-1"><Users2 size={11} /> {c.participants.toLocaleString("fa-IR")} شرکت‌کننده</span>
                · مهلت ارسال {c.deadline} · جایزه: {c.prize}
              </p>
              {c.entries.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {c.entries.map((e) => (
                    <div key={e.id} className="rounded-lg border border-ink-100 overflow-hidden">
                      <div
                        className="h-24 flex items-center justify-center relative"
                        style={{ backgroundImage: `linear-gradient(135deg, ${e.color}, ${e.color}cc)` }}
                        role="img"
                        aria-label={e.title}
                      >
                        <span className="text-white/90 text-lg font-black">{e.title.trim().charAt(0)}</span>
                        <ImageIcon size={14} className="text-white/60 absolute bottom-1.5 left-1.5" />
                      </div>
                      <div className="p-2.5">
                        <p className="text-[12px] font-medium text-ink-900 truncate">{e.title}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10.5px] text-ink-400 truncate flex items-center gap-0.5">
                            {e.by}
                            {canAccessAdmin && <RowActions onDelete={() => removeEntry(c.id, e)} size={12} />}
                          </span>
                          <button
                            onClick={() => voteEntry(c.id, e.id)}
                            className={`flex items-center gap-1 text-[11px] rounded-full border px-2 py-0.5 transition-colors ${
                              e.myVote ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500 hover:border-brand-300"
                            }`}
                          >
                            <ThumbsUp size={11} /> {e.votes.toLocaleString("fa-IR")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {c.status === "ثبت‌نام باز" && (
                <Button variant="secondary" size="sm" onClick={() => openEntryModal(c)}>
                  ارسال اثر
                </Button>
              )}
            </div>
          ))}
          <p className="text-[11px] text-ink-400 leading-5">
            روند: تعریف مسابقه و دسته‌ها ← ثبت‌نام و ارسال اثر ← رأی مردمی و/یا داوری کمیته ← اعلام برگزیدگان.
          </p>
        </div>
      )}

      {tab === "challenge" && (
        <div className="card divide-y divide-ink-100">
          {filterScoped(challenges).length === 0 && <p className="p-6 text-center text-sm text-ink-400">هنوز چالشی تعریف نشده است.</p>}
          {filterScoped(challenges).map((c) => {
            const isJoined = joined.includes(c.id);
            return (
              <div key={c.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                    {c.kind === "فردی" ? <Flag size={14} className="text-brand-600" /> : <Swords size={14} className="text-brand-600" />}
                    {c.title}
                  </p>
                  <p className="text-[11.5px] text-ink-400 mt-1">
                    {c.kind} · {c.category} · {c.joined.toLocaleString("fa-IR")} شرکت‌کننده
                  </p>
                  {c.progress !== undefined && (
                    <div className="flex items-center gap-2 mt-2 max-w-xs">
                      <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                        <div className={`h-full rounded-full ${c.progress === 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${c.progress}%` }} />
                      </div>
                      <span className="text-[10.5px] text-ink-400">{c.progress.toLocaleString("fa-IR")}٪</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ScopeBadge item={c} />
                  <Badge tone={c.status === "فعال" ? "success" : "neutral"}>{c.status}</Badge>
                  {c.status === "فعال" && (
                    <Button
                      variant={isJoined ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => {
                        setJoined((prev) => (isJoined ? prev.filter((x) => x !== c.id) : [...prev, c.id]));
                        notify(isJoined ? "از چالش خارج شدید." : `به چالش «${c.title}» پیوستید!`, "info");
                      }}
                    >
                      {isJoined ? "عضو هستید" : "پیوستن"}
                    </Button>
                  )}
                  {canManageItem(c) && <RowActions onEdit={() => openChModal(c)} onDelete={() => removeCh(c)} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={compOpen} onClose={() => setCompOpen(false)} title={editingCompId ? "ویرایش مسابقه" : "تعریف مسابقه جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان مسابقه <span className="text-rose-500">*</span></label>
            <input value={compForm.title} onChange={(e) => setCompForm((f) => ({ ...f, title: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
              <input value={compForm.category} onChange={(e) => setCompForm((f) => ({ ...f, category: e.target.value }))} className="input-field" placeholder="عکاسی" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">مهلت ارسال</label>
              <input value={compForm.deadline} onChange={(e) => setCompForm((f) => ({ ...f, deadline: e.target.value }))} className="input-field" placeholder="۱۴۰۵/۰۵/۲۰" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">جایزه</label>
            <input value={compForm.prize} onChange={(e) => setCompForm((f) => ({ ...f, prize: e.target.value }))} className="input-field" />
          </div>
          <ScopePicker value={itemScope} onChange={setItemScope} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitComp}>{editingCompId ? "ذخیره تغییرات" : "ایجاد مسابقه"}</Button>
            <Button variant="secondary" onClick={() => setCompOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Modal open={chOpen} onClose={() => setChOpen(false)} title={editingChId ? "ویرایش چالش" : "تعریف چالش جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان چالش <span className="text-rose-500">*</span></label>
            <input value={chForm.title} onChange={(e) => setChForm((f) => ({ ...f, title: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
              <input value={chForm.category} onChange={(e) => setChForm((f) => ({ ...f, category: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">نوع</label>
              <select value={chForm.kind} onChange={(e) => setChForm((f) => ({ ...f, kind: e.target.value as Challenge["kind"] }))} className="input-field">
                <option value="همگانی">همگانی</option>
                <option value="فردی">فردی</option>
              </select>
            </div>
          </div>
          <ScopePicker value={itemScope} onChange={setItemScope} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitCh}>{editingChId ? "ذخیره تغییرات" : "ایجاد چالش"}</Button>
            <Button variant="secondary" onClick={() => setChOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Modal open={entryOpen} onClose={() => setEntryOpen(false)} title={`ارسال اثر${entryComp ? ` — ${entryComp.title}` : ""}`}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان اثر <span className="text-rose-500">*</span></label>
            <input value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} className="input-field" placeholder="مثلاً: ربات جوشکار خط بدنه" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">فایل اثر</label>
            <input type="file" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitEntry}>ارسال اثر</Button>
            <Button variant="secondary" onClick={() => setEntryOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
