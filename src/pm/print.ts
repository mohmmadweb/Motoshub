// ---------------------------------------------------------------------------
// چاپ یک بخش از صفحه بدون پوسته‌ی برنامه (منو، سرآیند): گره در یک iframe پنهان با همان
// استایل‌های صفحه رونویسی و چاپ می‌شود (گانت، فهرست فیلترشده‌ی وظایف، صورتجلسه با محل امضا).
// ---------------------------------------------------------------------------

export function printNode(node: HTMLElement | null, title: string, opts: { landscape?: boolean } = {}) {
  if (!node) return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", width: "0", height: "0", border: "0", left: "-10000px", top: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) return frame.remove();
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((el) => el.outerHTML).join("\n");
  const theme = document.documentElement.getAttribute("data-theme");
  doc.open();
  doc.write(`<!doctype html><html lang="fa" dir="rtl"${theme ? ` data-theme="light"` : ""}><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title>${styles}
<style>
@page { size: A4 ${opts.landscape ? "landscape" : "portrait"}; margin: 12mm; }
html, body { background: #fff !important; }
body { padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.no-print, [data-no-print] { display: none !important; }
.print-only { display: block !important; }
.overflow-x-auto, .overflow-auto, .overflow-y-auto { overflow: visible !important; max-height: none !important; }
</style></head><body><div style="padding:4px">${node.outerHTML}</div></body></html>`);
  doc.close();
  const go = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => frame.remove(), 1500);
    }
  };
  // تا بارگذاری فونت/استایل صبر می‌کنیم
  if (doc.readyState === "complete") setTimeout(go, 250);
  else frame.onload = () => setTimeout(go, 250);
}
