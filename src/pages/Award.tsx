import { Trophy, PencilLine, ShieldQuestion } from "lucide-react";
import { awardTracks, awardEntries, type AwardEntry } from "../data/mockDaneshmand";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import { useToast } from "../components/ui/ToastProvider";

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

export default function Award() {
  const { notify } = useToast();
  const totalSubmissions = awardTracks.reduce((s, t) => s + t.submissions, 0);
  const totalJudged = awardTracks.reduce((s, t) => s + t.judged, 0);

  const requestEdit = (e: AwardEntry) =>
    notify(
      e.editUsed
        ? `اثر «${e.title}» قبلاً یک بار ویرایش شده — طبق آیین‌نامه، امکان ویرایش مجدد وجود ندارد.`
        : `فرم ویرایش اثر «${e.title}» باز شد. توجه: فقط یک بار امکان ویرایش وجود دارد.`,
      e.editUsed ? "warning" : "info"
    );

  return (
    <div>
      <PageHeader
        title="جایزه نوآوری و فناوری بنیاد"
        description="رویداد سالانه در سه محور: ثبت‌نام سامانه‌ای، صحت‌سنجی هلدینگ، داوری و امتیازدهی"
        icon={<Trophy size={18} />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="آثار ثبت‌شده" value={totalSubmissions.toLocaleString("fa-IR")} tone="brand" icon={<Trophy size={16} />} />
        <StatCard label="داوری‌شده" value={totalJudged.toLocaleString("fa-IR")} tone="success" />
        <StatCard label="محورهای رویداد" value={awardTracks.length.toLocaleString("fa-IR")} />
        <StatCard label="در صحت‌سنجی هلدینگ" value={awardEntries.filter((e) => e.status === "صحت‌سنجی هلدینگ").length.toLocaleString("fa-IR")} tone="warning" icon={<ShieldQuestion size={16} />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {awardTracks.map((t) => (
          <div key={t.id} className="card p-4">
            <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5 mb-2">
              <Trophy size={14} className="text-amber-500" /> {t.title}
            </p>
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
          {awardEntries.map((e) => (
            <div key={e.id} className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{e.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{e.track} · {e.company}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.score !== undefined && <Badge tone="success">امتیاز {e.score.toLocaleString("fa-IR")}</Badge>}
                <Badge tone={entryStatusTone[e.status]}>{e.status}</Badge>
                <button onClick={() => requestEdit(e)} className="text-ink-400 hover:text-brand-600 p-1" title="ویرایش (یک بار مجاز)">
                  <PencilLine size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-400 mt-2 leading-5">
          روند رویداد: ثبت‌نام از طریق سامانه ← صحت‌سنجی توسط هلدینگ همکار ← (یک بار امکان ویرایش) ← کمیته داوری و
          امتیازدهی ← انتخاب برگزیدگان سه محور.
        </p>
      </div>
    </div>
  );
}
