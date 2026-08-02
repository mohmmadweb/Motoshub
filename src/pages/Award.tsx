import { useState } from "react";
import { Trophy, ShieldQuestion, Plus } from "lucide-react";
import { awardTracks as initialTracks, awardEntries as initialEntries, type AwardEntry, type AwardTrack } from "../data/mockDaneshmand";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import RowActions from "../components/ui/RowActions";
import EmptyState from "../components/ui/EmptyState";
import StatCard from "../components/ui/StatCard";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";

// ---------------------------------------------------------------------------
// رویداد جایزه نوآوری و فناوری بنیاد — سه محور، ثبت‌نام سامانه‌ای، صحت‌سنجی
// هلدینگ، داوری و امتیازدهی (مطابق کتاب فرآیندهای معاونت ترویج نوآوری)
// ---------------------------------------------------------------------------
const entryStatusTone = {
  "ثبت‌شده": "neutral",
  "صحت‌سنجی هلدینگ": "warning",
  "در حال داوری": "brand",
  "امتیازدهی شده": "success",
  "منتخب مرحله نهایی": "navy",
} as const;

const entryStatuses: AwardEntry["status"][] = ["ثبت‌شده", "صحت‌سنجی هلدینگ", "در حال داوری", "امتیازدهی شده", "منتخب مرحله نهایی"];

export default function Award() {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [tracks, setTracks] = useState<AwardTrack[]>(initialTracks);
  const [entries, setEntries] = useState<AwardEntry[]>(initialEntries);
  const totalSubmissions = tracks.reduce((s, t) => s + t.submissions, 0);
  const totalJudged = tracks.reduce((s, t) => s + t.judged, 0);

  const [trackOpen, setTrackOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [trackForm, setTrackForm] = useState({ title: "", categories: "" });

  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState({ title: "", track: "", company: "", status: "ثبت‌شده" as AwardEntry["status"], score: "" });

  const openTrackModal = (tr?: AwardTrack) => {
    if (tr) {
      setEditingTrackId(tr.id);
      setTrackForm({ title: tr.title, categories: tr.categories.join("، ") });
    } else {
      setEditingTrackId(null);
      setTrackForm({ title: "", categories: "" });
    }
    setTrackOpen(true);
  };

  const submitTrack = () => {
    if (!trackForm.title.trim()) {
      notify("عنوان محور الزامی است.", "warning");
      return;
    }
    const categories = trackForm.categories.split("،").map((s) => s.trim()).filter(Boolean);
    if (editingTrackId) {
      setTracks((prev) => prev.map((tr) => (tr.id === editingTrackId ? { ...tr, title: trackForm.title.trim(), categories } : tr)));
      notify("محور رویداد ویرایش شد.");
    } else {
      setTracks((prev) => [...prev, { id: `aw-${Date.now()}`, title: trackForm.title.trim(), categories, submissions: 0, judged: 0 }]);
      notify("محور رویداد ایجاد شد.");
    }
    setTrackOpen(false);
    setEditingTrackId(null);
  };

  const removeTrack = (tr: AwardTrack) =>
    confirm({
      title: `حذف محور «${tr.title}»؟`,
      message: `${tr.submissions.toLocaleString("fa-IR")} اثر ثبت‌شده در این محور نیز حذف می‌شود.`,
      onConfirm: () => {
        setTracks((prev) => prev.filter((x) => x.id !== tr.id));
        setEntries((prev) => prev.filter((e) => e.track !== tr.title));
        notify(`محور «${tr.title}» حذف شد.`, "info");
      },
    });

  const openEntryModal = (e?: AwardEntry) => {
    if (e) {
      if (e.editUsed) {
        notify(`اثر «${e.title}» قبلاً یک بار ویرایش شده — طبق آیین‌نامه، امکان ویرایش مجدد وجود ندارد.`, "warning");
        return;
      }
      setEditingEntryId(e.id);
      setEntryForm({ title: e.title, track: e.track, company: e.company, status: e.status, score: e.score !== undefined ? String(e.score) : "" });
    } else {
      setEditingEntryId(null);
      setEntryForm({ title: "", track: tracks[0]?.title ?? "", company: "", status: "ثبت‌شده", score: "" });
    }
    setEntryOpen(true);
  };

  const submitEntry = () => {
    if (!entryForm.title.trim() || !entryForm.company.trim()) {
      notify("عنوان اثر و شرکت الزامی است.", "warning");
      return;
    }
    const score = entryForm.score.trim() ? Number(entryForm.score) : undefined;
    if (editingEntryId) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingEntryId
            ? { ...e, title: entryForm.title.trim(), track: entryForm.track, company: entryForm.company.trim(), status: entryForm.status, score, editUsed: true }
            : e
        )
      );
      notify("اثر ویرایش شد — سهمیه‌ی ویرایش این اثر مصرف شد.", "warning");
    } else {
      setEntries((prev) => [
        ...prev,
        { id: `ae-${Date.now()}`, title: entryForm.title.trim(), track: entryForm.track || "—", company: entryForm.company.trim(), status: entryForm.status, score, editUsed: false },
      ]);
      setTracks((prev) => prev.map((tr) => (tr.title === entryForm.track ? { ...tr, submissions: tr.submissions + 1 } : tr)));
      notify("اثر ثبت شد.");
    }
    setEntryOpen(false);
    setEditingEntryId(null);
  };

  const removeEntry = (e: AwardEntry) =>
    confirm({
      title: `حذف اثر «${e.title}»؟`,
      message: "سوابق داوری و امتیاز این اثر نیز حذف می‌شود.",
      onConfirm: () => {
        setEntries((prev) => prev.filter((x) => x.id !== e.id));
        setTracks((prev) => prev.map((tr) => (tr.title === e.track ? { ...tr, submissions: Math.max(0, tr.submissions - 1) } : tr)));
        notify(`اثر «${e.title}» حذف شد.`, "info");
      },
    });

  return (
    <div>
      <PageHeader
        title="جایزه نوآوری و فناوری بنیاد"
        description="رویداد سالانه در سه محور: ثبت‌نام سامانه‌ای، صحت‌سنجی هلدینگ، داوری و امتیازدهی"
        icon={<Trophy size={18} />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => openTrackModal()}>محور جدید</Button>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => openEntryModal()}>ثبت اثر</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="آثار ثبت‌شده" value={totalSubmissions.toLocaleString("fa-IR")} tone="brand" icon={<Trophy size={16} />} />
        <StatCard label="داوری‌شده" value={totalJudged.toLocaleString("fa-IR")} tone="success" />
        <StatCard label="محورهای رویداد" value={tracks.length.toLocaleString("fa-IR")} />
        <StatCard label="در صحت‌سنجی هلدینگ" value={entries.filter((e) => e.status === "صحت‌سنجی هلدینگ").length.toLocaleString("fa-IR")} tone="warning" icon={<ShieldQuestion size={16} />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {tracks.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500" /> {t.title}
              </p>
              <RowActions onEdit={() => openTrackModal(t)} onDelete={() => removeTrack(t)} size={13} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {t.categories.map((c) => (
                <Badge key={c} tone="neutral">{c}</Badge>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-ink-100">
              <span>{t.submissions.toLocaleString("fa-IR")} اثر ثبت‌شده</span>
              <span>{t.judged.toLocaleString("fa-IR")} داوری‌شده</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-2">آثار در جریان (نمونه)</h3>
        <div className="card divide-y divide-ink-100">
          {entries.length === 0 && <EmptyState title="هنوز اثری ثبت نشده" />}
          {entries.map((e) => (
            <div key={e.id} className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{e.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{e.track} · {e.company}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.score !== undefined && <Badge tone="success">امتیاز {e.score.toLocaleString("fa-IR")}</Badge>}
                <Badge tone={entryStatusTone[e.status]}>{e.status}</Badge>
                {e.editUsed && <Badge tone="neutral">سهمیه ویرایش مصرف شد</Badge>}
                <RowActions onEdit={() => openEntryModal(e)} onDelete={() => removeEntry(e)} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-400 mt-2 leading-5">
          روند رویداد: ثبت‌نام از طریق سامانه ← صحت‌سنجی توسط هلدینگ همکار ← (یک بار امکان ویرایش) ← کمیته داوری و
          امتیازدهی ← انتخاب برگزیدگان سه محور.
        </p>
      </div>

      <Modal open={trackOpen} onClose={() => setTrackOpen(false)} title={editingTrackId ? "ویرایش محور رویداد" : "تعریف محور جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان محور <span className="text-rose-500">*</span></label>
            <input value={trackForm.title} onChange={(e) => setTrackForm((f) => ({ ...f, title: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌ها (با «،» جدا کنید)</label>
            <input value={trackForm.categories} onChange={(e) => setTrackForm((f) => ({ ...f, categories: e.target.value }))} className="input-field" placeholder="دسته یک، دسته دو" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitTrack}>{editingTrackId ? "ذخیره تغییرات" : "ایجاد محور"}</Button>
            <Button variant="secondary" onClick={() => setTrackOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        title={editingEntryId ? "ویرایش اثر" : "ثبت اثر جدید"}
        description={editingEntryId ? "طبق آیین‌نامه، هر اثر فقط یک بار قابل ویرایش است." : undefined}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان اثر <span className="text-rose-500">*</span></label>
            <input value={entryForm.title} onChange={(e) => setEntryForm((f) => ({ ...f, title: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">محور</label>
              <select value={entryForm.track} onChange={(e) => setEntryForm((f) => ({ ...f, track: e.target.value }))} className="input-field">
                {tracks.map((tr) => <option key={tr.id}>{tr.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">شرکت <span className="text-rose-500">*</span></label>
              <input value={entryForm.company} onChange={(e) => setEntryForm((f) => ({ ...f, company: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">وضعیت</label>
              <select value={entryForm.status} onChange={(e) => setEntryForm((f) => ({ ...f, status: e.target.value as AwardEntry["status"] }))} className="input-field">
                {entryStatuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">امتیاز داوری</label>
              <input value={entryForm.score} onChange={(e) => setEntryForm((f) => ({ ...f, score: e.target.value }))} className="input-field" placeholder="—" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitEntry}>{editingEntryId ? "ذخیره تغییرات" : "ثبت اثر"}</Button>
            <Button variant="secondary" onClick={() => setEntryOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
