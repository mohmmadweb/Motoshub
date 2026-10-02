// ---------------------------------------------------------------------------
// نگهداشت و امحا: اسناد آرشیوی که دوره‌ی نگهداشتشان (جدول «تنظیمات») سر آمده در صف
// «آماده‌ی امحا» می‌آیند؛ امحا با تأیید و ثبت دلیل انجام و در لاگ ممیزی ثبت می‌شود.
// نگهداشت قانونی (legal hold) مانع حذف و امحاست.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Hourglass, Gavel, Trash2, ShieldAlert, FileX, ShieldOff } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import StatCard from "../../components/ui/StatCard";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { fa } from "../../pm/jalali";
import { retentionInfo } from "../../km/templates";
import { SectionHead } from "./shared";
import { useKPage } from "./ctx";

export default function RetentionSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canAct = hasPermission("knowledge.archive");
  const [tab, setTab] = useState<"queue" | "hold" | "log">("queue");
  const [disposeId, setDisposeId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const archived = km.docs.filter((d) => d.status === "آرشیو" && km.canSee(d));
  const withInfo = archived.map((d) => ({ d, i: retentionInfo(d, km.settings.retention, km.today) }));
  const ready = withInfo.filter((x) => x.i.eligible).sort((a, b) => b.i.overdue - a.i.overdue);
  const ready90 = withInfo.filter((x) => x.i.due && !x.i.eligible && x.i.overdue >= -90);
  const holds = km.docs.filter((d) => d.legalHold && km.canSee(d));
  const blocked = ready.filter((x) => x.d.legalHold);
  const target = disposeId ? km.docs.find((d) => d.id === disposeId) : undefined;

  const dispose = () => {
    if (!target) return;
    if (!note.trim()) return notify("شرح تصمیم امحا (مثلاً شماره‌ی صورت‌جلسه‌ی کمیته) الزامی است.", "warning");
    if (km.disposeDoc(target.id, note)) {
      notify("سند امحا شد و گواهی امحا در لاگ ممیزی ثبت شد.");
      setDisposeId(null);
      setNote("");
    } else notify("امحا ممکن نیست (نگهداشت قانونی، نبودِ مجوز یا پایان‌نیافتن دوره‌ی نگهداشت).", "warning");
  };

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<Hourglass size={17} className="text-brand-600" />}
        title="نگهداشت و امحا"
        hint="دوره‌ی نگهداشت هر نوع سند در «تنظیمات و دسترسی‌ها» تعیین می‌شود و از تاریخ آرشیو محاسبه می‌شود. اسناد دارای نگهداشت قانونی حذف یا امحا نمی‌شوند."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="آماده‌ی امحا" value={fa(ready.length - blocked.length)} tone="danger" icon={<FileX size={16} />} />
        <StatCard label="سررسید تا ۹۰ روز" value={fa(ready90.length)} tone="warning" icon={<Hourglass size={16} />} />
        <StatCard label="نگهداشت قانونی" value={fa(holds.length)} tone="brand" icon={<Gavel size={16} />} />
        <StatCard label="امحاشده" value={fa(km.disposals.length)} tone="neutral" icon={<Trash2 size={16} />} />
      </div>

      <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50 w-fit max-w-full overflow-x-auto">
        {(
          [
            ["queue", `آماده‌ی امحا (${fa(ready.length)})`],
            ["hold", `نگهداشت قانونی (${fa(holds.length)})`],
            ["log", "گواهی‌های امحا"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap ${tab === id ? "bg-white text-brand-700 font-medium shadow-sm" : "text-ink-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "queue" &&
        (ready.length ? (
          <div className="card divide-y divide-ink-100">
            {ready.map(({ d, i }) => (
              <div key={d.id} className="p-3 flex items-center gap-3 flex-wrap">
                <button onClick={() => page.openDoc(d.id)} className="flex-1 min-w-[200px] text-right">
                  <p className="text-sm text-ink-900 hover:text-brand-700">{d.title}</p>
                  <p className="text-[11px] text-ink-400">
                    {d.code} · {d.type} · آرشیو {i.basis} · نگهداشت {fa(i.years)} سال · سررسید {i.due} ({fa(i.overdue)} روز گذشته)
                  </p>
                </button>
                {d.legalHold ? (
                  <Badge tone="brand" icon={<Gavel size={11} />}>
                    نگهداشت قانونی
                  </Badge>
                ) : canAct ? (
                  <Button size="sm" variant="danger" icon={<Trash2 size={13} />} onClick={() => (setDisposeId(d.id), setNote(""))}>
                    تأیید امحا
                  </Button>
                ) : (
                  <span className="text-[10.5px] text-ink-400">امحا با مجوز «آرشیو و بازیابی اسناد»</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<FileX size={20} />} title="سندی آماده‌ی امحا نیست" description="اسناد آرشیوی پس از پایان دوره‌ی نگهداشت اینجا می‌آیند." />
        ))}

      {tab === "hold" &&
        (holds.length ? (
          <div className="card divide-y divide-ink-100">
            {holds.map((d) => (
              <div key={d.id} className="p-3 flex items-center gap-3 flex-wrap">
                <button onClick={() => page.openDoc(d.id)} className="flex-1 min-w-[200px] text-right">
                  <p className="text-sm text-ink-900 hover:text-brand-700">{d.title}</p>
                  <p className="text-[11px] text-ink-400">
                    {d.code} · {d.legalHold!.by} · {d.legalHold!.at} — «{d.legalHold!.reason}»
                  </p>
                </button>
                {canAct && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<ShieldOff size={13} />}
                    onClick={() =>
                      confirm({
                        title: `برداشتن نگهداشت قانونی «${d.title}»؟`,
                        message: "پس از برداشتن، سند طبق جدول نگهداشت قابل امحا خواهد بود. این اقدام ممیزی می‌شود.",
                        confirmLabel: "برداشتن",
                        onConfirm: () => {
                          km.setLegalHold(d.id, null);
                          notify("نگهداشت قانونی برداشته شد.", "info");
                        },
                      })
                    }
                  >
                    برداشتن
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Gavel size={20} />} title="سندی در نگهداشت قانونی نیست" description="از صفحه‌ی هر سند (زبانه‌ی مشخصات) می‌توانید نگهداشت قانونی بگذارید." />
        ))}

      {tab === "log" &&
        (km.disposals.length ? (
          <div className="card overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead className="bg-ink-50 text-ink-500">
                <tr>
                  {["کد", "عنوان", "نوع", "نگهداشت", "امحا", "شرح"].map((h) => (
                    <th key={h} className="p-2 text-right font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {km.disposals.map((x) => (
                  <tr key={x.id} className="border-t border-ink-100">
                    <td className="p-2 text-ink-500" dir="ltr">
                      {x.code}
                    </td>
                    <td className="p-2 text-ink-800">{x.title}</td>
                    <td className="p-2">{x.type}</td>
                    <td className="p-2">
                      {fa(x.retentionYears)} سال از {x.basis}
                    </td>
                    <td className="p-2">
                      {x.by} · {x.at}
                    </td>
                    <td className="p-2 text-ink-600">{x.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Trash2 size={20} />} title="هنوز سندی امحا نشده" />
        ))}

      <Modal open={!!target} onClose={() => setDisposeId(null)} title="تأیید امحای سند" description={target ? `${target.code} · ${target.title}` : undefined}>
        <div className="space-y-3">
          <p className="text-xs text-ink-600 leading-6 flex gap-2">
            <ShieldAlert size={16} className="text-rose-600 shrink-0" />
            سند و همه‌ی نسخه‌ها و فایل‌هایش برای همیشه حذف می‌شود؛ فقط گواهی امحا (کد، عنوان، دوره‌ی نگهداشت، تأییدکننده و شرح) در لاگ ممیزی باقی می‌ماند.
          </p>
          <textarea className="input-field min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="شرح تصمیم (الزامی) — مثلاً: مصوبه‌ی کمیته‌ی اسناد، جلسه‌ی ۱۲" autoFocus />
          <div className="flex gap-2">
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={dispose}>
              امحا
            </Button>
            <Button variant="ghost" onClick={() => setDisposeId(null)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
