// ---------------------------------------------------------------------------
// پیش‌نمایش فایل + تاریخچه‌ی نسخه‌ها + لینک اشتراک با انقضا («پیشنهادی» — در API فعلی نیست).
// در پروتوتایپ محتوای واقعی فایل وجود ندارد؛ پیش‌نمایش با جای‌نگهدار متناسب با نوع فایل رسم می‌شود.
// ---------------------------------------------------------------------------
import { useRef, useState } from "react";
import { Download, Star, History, Link2, Eye, Copy, Upload, RotateCcw, Image as ImageIcon, FileText, FileSpreadsheet, Ban, Clock } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useSocial } from "../../../context/SocialContext";
import { dayNum } from "../../../pm/jalali";
import { endpoints, fmtEndpoint } from "../../../social/endpoints";
import type { FileItem } from "../../../social/types";
import { UserLine, fa, stamp, toAttachments } from "../kit";

type Tab = "preview" | "versions" | "share";
export const kindOf = (f: Pick<FileItem, "mime" | "name">): "image" | "pdf" | "text" | "sheet" | "doc" | "other" => {
  const n = f.name.toLowerCase();
  if (f.mime.startsWith("image/")) return "image";
  if (f.mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (f.mime.startsWith("text/") || /\.(txt|md|csv|json|log)$/.test(n)) return "text";
  if (f.mime.includes("excel") || f.mime.includes("sheet") || /\.(xlsx?|ods)$/.test(n)) return "sheet";
  if (f.mime.includes("word") || /\.(docx?|odt|rtf)$/.test(n)) return "doc";
  return "other";
};
/** رنگ پایدار از روی نام (برای جای‌نگهدار تصویر) */
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

/** آیا لینک اشتراک هنوز معتبر است؟ */
export const shareAlive = (f: FileItem, today: string) => !!f.share && (dayNum(f.share.expires_on) ?? 0) >= (dayNum(today) ?? 0);

export default function FilePreview({ fileId, canWrite, onClose }: { fileId: string | null; canWrite: boolean; onClose: () => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("preview");
  const [days, setDays] = useState(7);
  const [allowDl, setAllowDl] = useState(true);
  const verInput = useRef<HTMLInputElement>(null);
  const f = fileId ? s.files.find((x) => x.id === fileId) : undefined;
  if (!f) return null;
  const k = kindOf(f);
  const versions = f.versions ?? [];
  const starred = (f.starred_by ?? []).includes(s.me);
  const alive = shareAlive(f, s.today);
  const shareUrl = f.share ? `https://shub.ir/s/${f.share.token}` : "";
  const daysLeft = f.share ? (dayNum(f.share.expires_on) ?? 0) - (dayNum(s.today) ?? 0) : 0;

  const download = () => notify(`دریافت «${f.name}» — ${fmtEndpoint(endpoints.fileDownload(f.owner_type, f.owner_id, f.id))}`, "info");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("لینک کپی شد.", "success");
    } catch {
      notify(`لینک: ${shareUrl}`, "info");
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Eye }[] = [
    { id: "preview", label: "پیش‌نمایش", icon: Eye },
    { id: "versions", label: `نسخه‌ها (${fa(versions.length + 1)})`, icon: History },
    { id: "share", label: "اشتراک لینک", icon: Link2 },
  ];

  return (
    <Modal open onClose={onClose} title={f.name} description={`${f.size} · نسخه‌ی ${fa(f.version ?? 1)} · ${s.userName(f.created_by_user_id)} · ${stamp(f.created_at)}`} width="max-w-3xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50 max-w-full overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap flex items-center gap-1 ${tab === t.id ? "bg-white shadow-sm text-brand-700 font-medium" : "text-ink-500 hover:text-ink-800"}`}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1.5 mr-auto">
            <Button size="sm" variant="ghost" icon={<Star size={14} className={starred ? "fill-amber-400 text-amber-500" : ""} />} onClick={() => s.toggleStar(f.id)} aria-label={starred ? "برداشتن ستاره" : "ستاره‌دار کردن"}>
              <span className="hidden sm:inline">{starred ? "ستاره‌دار" : "ستاره"}</span>
            </Button>
            <Button size="sm" icon={<Download size={14} />} onClick={download}>
              دریافت
            </Button>
          </span>
        </div>

        {/* ---------------------------------------------------- پیش‌نمایش */}
        {tab === "preview" && (
          <div className="rounded-xl bg-ink-100 p-3 sm:p-5 max-h-[60vh] overflow-y-auto">
            {k === "image" && (
              <div className="rounded-lg overflow-hidden aspect-video flex flex-col items-center justify-center gap-2 text-white" style={{ background: `linear-gradient(135deg, hsl(${hue(f.name)} 55% 45%), hsl(${(hue(f.name) + 60) % 360} 60% 30%))` }}>
                <svg viewBox="0 0 120 60" className="w-40 opacity-70" aria-hidden>
                  <circle cx="92" cy="16" r="8" fill="currentColor" />
                  <path d="M0 60 L35 22 L60 46 L78 32 L120 60 Z" fill="currentColor" />
                </svg>
                <span className="text-xs opacity-90 flex items-center gap-1">
                  <ImageIcon size={13} /> {f.name}
                </span>
              </div>
            )}
            {(k === "pdf" || k === "doc") &&
              [1, 2].map((pg) => (
                <div key={pg} className="bg-white rounded-md shadow-sm mx-auto max-w-md p-5 sm:p-7 mb-3 last:mb-0 space-y-2" aria-label={`صفحه‌ی ${fa(pg)}`}>
                  {pg === 1 && <p className="text-sm font-bold text-ink-900 mb-3">{f.name.replace(/\.[^.]+$/, "").replace(/-/g, " ")}</p>}
                  {Array.from({ length: pg === 1 ? 9 : 12 }, (_, i) => (
                    <span key={i} className="block h-2 rounded bg-ink-100" style={{ width: `${60 + ((i * 37 + pg * 11) % 40)}%` }} />
                  ))}
                  <p className="text-[10px] text-ink-400 text-center pt-3">
                    صفحه‌ی {fa(pg)} از {fa(2)}
                  </p>
                </div>
              ))}
            {k === "text" && (
              <pre dir="rtl" className="bg-white rounded-md p-4 text-[12px] leading-6 text-ink-800 whitespace-pre-wrap font-mono">
                {`${f.name}\n${"—".repeat(18)}\n۱. مرور اقدام‌های هفته‌ی گذشته و وضعیت کارگاه‌ها\n۲. هماهنگی بازدید میدانی با ستاد استان\n۳. تعیین مسئول تهیه‌ی گزارش ماهانه\n\nمصوبات:\n- گزارش پیشرفت تا پنجشنبه بارگذاری شود.\n- جلسه‌ی بعدی: شنبه ساعت ۱۰.`}
              </pre>
            )}
            {k === "sheet" && (
              <div className="bg-white rounded-md p-2 overflow-x-auto">
                <table className="w-full text-[11px] min-w-[360px]">
                  <thead>
                    <tr className="bg-ink-50 text-ink-500">
                      {["", "الف", "ب", "پ", "ت"].map((h) => (
                        <th key={h} className="border border-ink-100 px-2 py-1 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }, (_, r) => (
                      <tr key={r}>
                        <td className="border border-ink-100 px-2 py-1 text-ink-400 bg-ink-50 text-center">{fa(r + 1)}</td>
                        {[0, 1, 2, 3].map((c) => (
                          <td key={c} className="border border-ink-100 px-2 py-1 text-ink-700 tabular-nums">
                            {r === 0 ? ["عنوان", "واحد", "مقدار", "درصد"][c] : c === 0 ? `ردیف ${fa(r)}` : fa(((r * 7 + c * 13) % 90) + 10)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {k === "other" && (
              <div className="py-10 text-center text-ink-500 space-y-2">
                <FileText size={30} className="mx-auto text-ink-300" />
                <p className="text-sm">پیش‌نمایش برای این نوع فایل در دسترس نیست.</p>
                <Button size="sm" icon={<Download size={13} />} onClick={download}>
                  دریافت فایل
                </Button>
              </div>
            )}
            {k !== "other" && (
              <p className="text-[10.5px] text-ink-400 text-center mt-3 flex items-center justify-center gap-1">
                {k === "sheet" ? <FileSpreadsheet size={11} /> : <Eye size={11} />} پیش‌نمایش نمایشی — در نسخه‌ی متصل از {fmtEndpoint(endpoints.filePreview(f.owner_type, f.owner_id, f.id))} بارگذاری می‌شود.
              </p>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- نسخه‌ها */}
        {tab === "versions" && (
          <div className="space-y-3">
            <div className="border border-ink-100 rounded-lg divide-y divide-ink-100">
              <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-50/40">
                <span className="text-xs font-bold text-ink-900 w-12 shrink-0">نسخه‌ی {fa(f.version ?? 1)}</span>
                <span className="flex-1 min-w-0">
                  <UserLine id={f.created_by_user_id} size={22} sub={`${stamp(f.created_at)} · ${f.size}`} />
                </span>
                <Badge tone="brand">نسخه‌ی فعلی</Badge>
              </div>
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-xs text-ink-600 w-12 shrink-0">نسخه‌ی {fa(v.version)}</span>
                  <span className="flex-1 min-w-0">
                    <UserLine id={v.created_by_user_id} size={22} sub={`${stamp(v.created_at)} · ${v.size}`} />
                  </span>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<RotateCcw size={13} />}
                      onClick={() =>
                        confirm({
                          title: `بازگردانی نسخه‌ی ${fa(v.version)}؟`,
                          message: "محتوای این نسخه به‌عنوان نسخه‌ی تازه ثبت می‌شود و نسخه‌ی فعلی در تاریخچه می‌ماند.",
                          confirmLabel: "بازگردانی",
                          onConfirm: () => {
                            s.restoreVersion(f.id, v.id);
                            notify(`نسخه‌ی ${fa(v.version)} بازگردانده شد.`, "success");
                          },
                        })
                      }
                    >
                      بازگردانی
                    </Button>
                  )}
                </div>
              ))}
              {!versions.length && <p className="text-xs text-ink-400 px-3 py-3">نسخه‌ی قبلی ندارد.</p>}
            </div>
            {canWrite && (
              <>
                <input
                  ref={verInput}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const a = e.target.files ? toAttachments(e.target.files)[0] : undefined;
                    e.target.value = "";
                    if (!a) return;
                    s.uploadVersion(f.id, a);
                    notify(`نسخه‌ی ${fa((f.version ?? 1) + 1)} بارگذاری شد.`, "success");
                  }}
                />
                <Button size="sm" icon={<Upload size={13} />} onClick={() => verInput.current?.click()}>
                  بارگذاری نسخه‌ی جدید
                </Button>
              </>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- اشتراک لینک */}
        {tab === "share" && (
          <div className="space-y-3">
            {f.share && alive ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input readOnly dir="ltr" value={shareUrl} className="input-field !py-1.5 flex-1 min-w-0 text-[12px]" onFocus={(e) => e.target.select()} aria-label="لینک اشتراک" />
                  <Button size="sm" icon={<Copy size={13} />} onClick={copy}>
                    کپی
                  </Button>
                </div>
                <p className="text-[11.5px] text-ink-600 flex items-center gap-1 flex-wrap">
                  <Clock size={12} /> معتبر تا {f.share.expires_on} ({daysLeft > 0 ? `${fa(daysLeft)} روز مانده` : "امروز منقضی می‌شود"}) · {f.share.allow_download ? "مشاهده و دریافت" : "فقط مشاهده"}
                </p>
                {(canWrite || f.share.created_by === s.me) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Ban size={13} />}
                    className="!text-rose-600"
                    onClick={() => {
                      s.revokeShare(f.id);
                      notify("لینک اشتراک لغو شد.", "info");
                    }}
                  >
                    لغو لینک
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {f.share && !alive && <p className="text-[11.5px] text-amber-700">لینک قبلی در {f.share.expires_on} منقضی شده است.</p>}
                <p className="text-xs text-ink-500">هرکس لینک را داشته باشد تا تاریخ انقضا می‌تواند فایل را ببیند (نمایشی).</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-ink-600">اعتبار:</span>
                  {[1, 7, 30].map((d) => (
                    <button key={d} onClick={() => setDays(d)} className={`text-xs px-2.5 py-1 rounded-md border ${days === d ? "border-brand-400 bg-brand-50 text-brand-700 font-medium" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
                      {fa(d)} روز
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-700">
                  <input type="checkbox" checked={allowDl} onChange={(e) => setAllowDl(e.target.checked)} className="accent-[var(--color-brand-600)]" /> اجازه‌ی دریافت فایل
                </label>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Link2 size={13} />}
                  onClick={() => {
                    const sh = s.createShare(f.id, days, allowDl);
                    if (sh) notify(`لینک تا ${sh.expires_on} ساخته شد.`, "success");
                  }}
                >
                  ساخت لینک اشتراک
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
