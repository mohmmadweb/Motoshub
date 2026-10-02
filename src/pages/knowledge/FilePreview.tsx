// ---------------------------------------------------------------------------
// پیش‌نمایش فایل در مرورگر (بند ۲۷) با حالت «فقط مشاهده» و واترمارک (بند ۸).
// در پروتوتایپ محتوای فایل از «متن استخراج‌شده» ساخته می‌شود؛ در نسخه‌ی عملیاتی
// سرور تصویر صفحه‌ها را با واترمارک می‌سازد (docs/KM_DATA_MODEL.md).
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Download, EyeOff, Play, FileText, ShieldAlert } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useKnowledge } from "../../context/KnowledgeContext";
import { fa, nowClock } from "../../pm/jalali";
import type { KDoc, KFile } from "../../km/types";
import { Highlight } from "./Markdown";

const kindOf = (ext: string) => {
  const e = ext.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(e)) return "image";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(e)) return "video";
  if (["xlsx", "xls", "csv"].includes(e)) return "sheet";
  if (["pptx", "ppt"].includes(e)) return "slides";
  return "doc";
};

/** دانلود نمونه (پروتوتایپ) + ثبت در لاگ */
export function useMockDownload() {
  const km = useKnowledge();
  return (d: KDoc, files?: KFile[]) => {
    const list = files ?? d.files;
    list.forEach((file) => {
      km.downloadDoc(d.id, file.name);
      const blob = new Blob([`${d.title}\nکد: ${d.code}\nنسخه: ${d.version}\nفایل: ${file.name}\n\n${file.text ?? "(نمونه‌ی نمایشی پروتوتایپ)"}`], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = `${file.name}.txt`;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 800);
    });
  };
}

/** لایه‌ی واترمارک مورب: نام بیننده، تاریخ و ساعت، کد سند */
export function Watermark({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-10" aria-hidden>
      <div className="absolute -inset-1/2 flex flex-wrap content-start gap-x-16 gap-y-14 rotate-[-28deg] opacity-[0.13]">
        {Array.from({ length: 60 }, (_, i) => (
          <span key={i} className="text-[13px] font-bold text-ink-900 whitespace-nowrap">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FilePreview({ doc, file, onClose, terms = [], initialPage = 1 }: { doc: KDoc | null; file: KFile | null; onClose: () => void; terms?: string[]; initialPage?: number }) {
  const km = useKnowledge();
  const download = useMockDownload();
  const [page, setPage] = useState(1);
  const canDl = doc ? km.canDownload(doc) : false;
  const watermark = doc ? km.policy[doc.access]?.watermark || !canDl : false;

  useEffect(() => {
    if (!doc || !file) return;
    setPage(initialPage);
    km.previewDoc(doc.id, file.name, !canDl);
    // فقط هنگام باز شدن فایل
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, file?.id]);

  if (!doc || !file) return null;
  const kind = kindOf(file.ext);
  const pages = (file.text ?? "").split("\f").filter((p) => p.trim());
  const total = Math.max(1, pages.length || file.pages || (kind === "image" ? 1 : 3));
  const cur = Math.min(page, total);
  const pageText = pages[cur - 1];
  const wm = `${km.me} · ${km.today} ${nowClock()} · ${doc.code}`;
  const guard = canDl ? {} : { onContextMenu: (e: React.MouseEvent) => e.preventDefault(), onCopy: (e: React.ClipboardEvent) => e.preventDefault() };

  return (
    <Modal open onClose={onClose} title={file.name} description={`${doc.title} · ${doc.code} · نسخه‌ی ${fa(doc.version)}`} width="max-w-5xl">
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {canDl ? <Badge tone="success">مشاهده و دانلود</Badge> : <Badge tone="warning" icon={<EyeOff size={11} />}>فقط مشاهده</Badge>}
          {watermark && <Badge tone="neutral">واترمارک فعال</Badge>}
          <span className="text-[11px] text-ink-400">{file.size}</span>
          <span className="mr-auto flex items-center gap-1.5">
            <Button size="sm" variant="ghost" icon={<ChevronRight size={14} />} disabled={cur <= 1} onClick={() => setPage(cur - 1)} aria-label="صفحه‌ی قبل" />
            <select className="input-field !py-1 !text-xs !w-auto" value={cur} onChange={(e) => setPage(Number(e.target.value))} aria-label="انتخاب صفحه">
              {Array.from({ length: total }, (_, i) => (
                <option key={i} value={i + 1}>
                  {kind === "video" ? "بخش" : kind === "slides" ? "اسلاید" : kind === "sheet" ? "برگه" : "صفحه"} {fa(i + 1)} از {fa(total)}
                </option>
              ))}
            </select>
            <Button size="sm" variant="ghost" icon={<ChevronLeft size={14} />} disabled={cur >= total} onClick={() => setPage(cur + 1)} aria-label="صفحه‌ی بعد" />
            <Button size="sm" variant="secondary" icon={<Download size={13} />} disabled={!canDl} onClick={() => download(doc, [file])} title={canDl ? "دانلود فایل" : "این سند فقط قابل مشاهده است"}>
              دانلود
            </Button>
          </span>
        </div>

        <div className={`relative rounded-xl bg-ink-100 p-3 sm:p-6 overflow-hidden ${canDl ? "" : "select-none"}`} {...guard}>
          {watermark && <Watermark text={wm} />}
          {kind === "doc" && (
            <div className="mx-auto max-w-[620px] bg-white rounded-md shadow-sm border border-ink-200 min-h-[420px] p-5 sm:p-8">
              <div className="flex items-center justify-between text-[10.5px] text-ink-400 border-b border-ink-100 pb-2 mb-4">
                <span>{doc.code}</span>
                <span>
                  صفحه‌ی {fa(cur)} از {fa(total)}
                </span>
              </div>
              {pageText ? (
                <div className="text-[13px] text-ink-800 leading-7 whitespace-pre-wrap">
                  <Highlight text={pageText} terms={terms} />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-ink-400 flex items-center gap-1.5 mb-4">
                    <FileText size={13} /> متن این فایل هنوز نمایه نشده است؛ نمای نمونه‌ی صفحه:
                  </p>
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="h-2.5 rounded bg-ink-100" style={{ width: `${60 + ((i * 37) % 40)}%` }} />
                  ))}
                </div>
              )}
            </div>
          )}
          {kind === "image" && (
            <div className="mx-auto max-w-[640px] aspect-[4/3] rounded-md overflow-hidden border border-ink-200 bg-white">
              <svg viewBox="0 0 400 300" className="w-full h-full" role="img" aria-label={file.name}>
                <defs>
                  <linearGradient id="kmimg" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#c7d7f0" />
                    <stop offset="1" stopColor="#e8eef8" />
                  </linearGradient>
                </defs>
                <rect width="400" height="300" fill="url(#kmimg)" />
                <circle cx="300" cy="80" r="34" fill="#f6c453" opacity=".85" />
                <path d="M0 240 L110 140 L190 210 L260 150 L400 260 L400 300 L0 300 Z" fill="#1f4f99" opacity=".55" />
                <path d="M0 270 L140 190 L240 250 L320 210 L400 270 L400 300 L0 300 Z" fill="#14315f" opacity=".7" />
              </svg>
            </div>
          )}
          {kind === "video" && (
            <div className="mx-auto max-w-[680px] aspect-video rounded-lg bg-navy-900 relative flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                <Play size={22} className="text-navy-900 mr-[-3px]" fill="currentColor" />
              </span>
              <div className="absolute bottom-0 inset-x-0 p-3">
                <div className="h-1 rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-brand-400" style={{ width: `${(cur / total) * 100}%` }} />
                </div>
                <p className="text-[11px] text-white/80 mt-1.5">
                  بخش {fa(cur)} از {fa(total)}
                  {pageText ? ` — ${pageText.split("\n")[0]}` : ""}
                </p>
              </div>
            </div>
          )}
          {kind === "sheet" && (
            <div className="mx-auto max-w-[680px] bg-white rounded-md border border-ink-200 overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="bg-ink-50 text-ink-500">
                    {["", "الف", "ب", "پ", "ت", "ث"].map((h) => (
                      <th key={h} className="border border-ink-200 px-2 py-1 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }, (_, r) => (
                    <tr key={r}>
                      <td className="border border-ink-200 px-2 py-1 bg-ink-50 text-ink-400 text-center">{fa(r + 1)}</td>
                      {Array.from({ length: 5 }, (_, c) => (
                        <td key={c} className="border border-ink-200 px-2 py-1 text-ink-700">
                          {r === 0 ? ["شرح", "واحد", "مقدار", "مبلغ", "توضیح"][c] : c === 0 ? `ردیف ${fa(r + (cur - 1) * 9)}` : c === 2 || c === 3 ? fa(((r * 37 + c * 11 + cur * 7) % 90) + 10) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {kind === "slides" && (
            <div className="mx-auto max-w-[680px] aspect-video bg-white rounded-md border border-ink-200 p-8 flex flex-col justify-center">
              <p className="text-lg font-bold text-ink-900">{pageText?.split("\n")[0] ?? doc.title}</p>
              <p className="text-xs text-ink-500 mt-2 whitespace-pre-wrap leading-6">{pageText?.split("\n").slice(1).join("\n") ?? `اسلاید ${fa(cur)}`}</p>
            </div>
          )}
        </div>

        {!canDl && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
            <ShieldAlert size={13} className="shrink-0 mt-0.5" />
            این سند «{doc.access}» است و برای شما فقط قابل مشاهده است؛ دانلود، کپی و چاپ بسته است و این مشاهده با نام شما در لاگ ممیزی ثبت شد.
          </p>
        )}
      </div>
    </Modal>
  );
}
