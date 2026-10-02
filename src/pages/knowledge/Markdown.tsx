// ---------------------------------------------------------------------------
// ویرایشگر و نمایشگر مقاله (Markdown ساده و امن، بدون HTML خام)، برجسته‌سازی نتایج
// جستجو و نمای مقایسه‌ی متنی نسخه‌ها.
// ---------------------------------------------------------------------------
import { Fragment, useRef, useState, type ReactNode } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Table, Code, Quote, Eye, PenLine, Columns2 } from "lucide-react";
import { diffLines, matchRanges } from "../../km/text";
import { fa } from "../../pm/jalali";

// ------------------------------------------------------------------ برجسته‌سازی
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const ranges = matchRanges(text, terms);
  if (!ranges.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([s, e], i) => {
    if (s > pos) out.push(text.slice(pos, s));
    out.push(
      <mark key={i} className="bg-amber-400/40 text-inherit rounded px-0.5">
        {text.slice(s, e)}
      </mark>
    );
    pos = e;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
}

// ------------------------------------------------------------------ inline
const safeHref = (u: string) => (/^(https?:\/\/|#|\/)/.test(u.trim()) ? u.trim() : undefined);

function inline(text: string, terms: string[], key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Highlight key={`${key}t${n++}`} text={text.slice(last, m.index)} terms={terms} />);
    if (m[2]) out.push(<strong key={`${key}b${n++}`} className="font-bold text-ink-900"><Highlight text={m[2]} terms={terms} /></strong>);
    else if (m[3]) out.push(<em key={`${key}e${n++}`}><Highlight text={m[3]} terms={terms} /></em>);
    else if (m[4]) out.push(<code key={`${key}c${n++}`} className="text-[0.85em] bg-ink-100 text-ink-800 rounded px-1 py-0.5" dir="ltr">{m[4]}</code>);
    else if (m[5]) {
      const href = safeHref(m[6]);
      out.push(
        href ? (
          <a key={`${key}a${n++}`} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-brand-700 underline underline-offset-2 hover:text-brand-600">
            <Highlight text={m[5]} terms={terms} />
          </a>
        ) : (
          <span key={`${key}a${n++}`}>{m[5]}</span>
        )
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Highlight key={`${key}t${n++}`} text={text.slice(last)} terms={terms} />);
  return out;
}

// ------------------------------------------------------------------ blocks
type Block =
  | { t: "h"; level: 2 | 3 | 4; text: string; id: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "code"; text: string }
  | { t: "quote"; text: string }
  | { t: "hr" };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

export function parseMd(md: string): Block[] {
  const lines = md.replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  let i = 0;
  let h = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push({ t: "code", text: buf.join("\n") });
      continue;
    }
    const hm = /^(#{1,4})\s+(.*)$/.exec(line);
    if (hm) {
      const level = Math.min(4, Math.max(2, hm[1].length)) as 2 | 3 | 4;
      out.push({ t: "h", level, text: hm[2], id: `h-${++h}` });
      i++;
      continue;
    }
    if (/^\s*-{3,}\s*$/.test(line)) {
      out.push({ t: "hr" });
      i++;
      continue;
    }
    if (line.trim().startsWith("|") && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      out.push({ t: "table", head, rows });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      out.push({ t: "ul", items });
      continue;
    }
    if (/^\s*[\d۰-۹]+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[\d۰-۹]+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[\d۰-۹]+[.)]\s+/, ""));
      out.push({ t: "ol", items });
      continue;
    }
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push({ t: "quote", text: buf.join(" ") });
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*[-*]\s|\s*[\d۰-۹]+[.)]\s|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) buf.push(lines[i++]);
    out.push({ t: "p", text: buf.join(" ") });
  }
  return out;
}

export const mdHeadings = (md: string) => parseMd(md).filter((b): b is Extract<Block, { t: "h" }> => b.t === "h");

/** نمایش امن مقاله */
export function MarkdownView({ md, terms = [], className = "" }: { md: string; terms?: string[]; className?: string }) {
  const blocks = parseMd(md);
  if (!blocks.length) return <p className="text-xs text-ink-400">متنی نوشته نشده است.</p>;
  return (
    <div className={`space-y-3 text-sm text-ink-700 leading-7 ${className}`}>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.t) {
          case "h":
            return b.level === 2 ? (
              <h3 key={k} id={b.id} className="text-[15px] font-bold text-ink-900 pt-2 scroll-mt-4">{inline(b.text, terms, k)}</h3>
            ) : (
              <h4 key={k} id={b.id} className="text-sm font-bold text-ink-800 pt-1 scroll-mt-4">{inline(b.text, terms, k)}</h4>
            );
          case "p":
            return <p key={k}>{inline(b.text, terms, k)}</p>;
          case "ul":
            return (
              <ul key={k} className="list-disc pr-5 space-y-1">
                {b.items.map((it, j) => <li key={j}>{inline(it, terms, `${k}-${j}`)}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={k} className="list-decimal pr-5 space-y-1">
                {b.items.map((it, j) => <li key={j}>{inline(it, terms, `${k}-${j}`)}</li>)}
              </ol>
            );
          case "table":
            return (
              <div key={k} className="overflow-x-auto">
                <table className="w-full text-xs border border-ink-200 rounded-lg">
                  <thead className="bg-ink-50">
                    <tr>{b.head.map((c, j) => <th key={j} className="p-2 text-right font-bold text-ink-700 border-b border-ink-200">{inline(c, terms, `${k}h${j}`)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-b border-ink-100 last:border-0">
                        {r.map((c, x) => <td key={x} className="p-2">{inline(c, terms, `${k}r${j}${x}`)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return (
              <pre key={k} dir="ltr" className="text-xs bg-ink-900 text-ink-50 rounded-lg p-3 overflow-x-auto text-left">
                <code>{b.text}</code>
              </pre>
            );
          case "quote":
            return <blockquote key={k} className="border-r-4 border-brand-300 bg-brand-50/50 rounded-l-lg px-3 py-2 text-ink-700">{inline(b.text, terms, k)}</blockquote>;
          case "hr":
            return <hr key={k} className="border-ink-200" />;
        }
        return <Fragment key={k} />;
      })}
    </div>
  );
}

// ------------------------------------------------------------------ ویرایشگر
type Tool = { icon: typeof Bold; label: string; run: (sel: string) => { text: string; block?: boolean } };
const tools: Tool[] = [
  { icon: Heading2, label: "عنوان", run: (s) => ({ text: `## ${s || "عنوان بخش"}`, block: true }) },
  { icon: Heading3, label: "زیرعنوان", run: (s) => ({ text: `### ${s || "زیرعنوان"}`, block: true }) },
  { icon: Bold, label: "پررنگ", run: (s) => ({ text: `**${s || "متن پررنگ"}**` }) },
  { icon: Italic, label: "مورب", run: (s) => ({ text: `*${s || "متن مورب"}*` }) },
  { icon: List, label: "فهرست", run: (s) => ({ text: (s || "مورد اول\nمورد دوم").split("\n").map((l) => `- ${l}`).join("\n"), block: true }) },
  { icon: ListOrdered, label: "فهرست شماره‌دار", run: (s) => ({ text: (s || "گام اول\nگام دوم").split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n"), block: true }) },
  { icon: Link2, label: "پیوند", run: (s) => ({ text: `[${s || "متن پیوند"}](https://)` }) },
  { icon: Table, label: "جدول", run: () => ({ text: "| ستون ۱ | ستون ۲ |\n|---|---|\n| مقدار | مقدار |", block: true }) },
  { icon: Code, label: "کد", run: (s) => (s.includes("\n") || !s ? { text: `\`\`\`\n${s || "کد"}\n\`\`\``, block: true } : { text: `\`${s}\`` }) },
  { icon: Quote, label: "نقل‌قول / نکته", run: (s) => ({ text: `> ${s || "نکته‌ی مهم"}`, block: true }) },
];

/** ویرایشگر مقاله با نوار ابزار و پیش‌نمایش زنده */
export function MarkdownEditor({ value, onChange, minHeight = 260 }: { value: string; onChange: (v: string) => void; minHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview" | "split">("write");
  const apply = (tool: Tool) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const { text, block } = tool.run(value.slice(start, end));
    const before = value.slice(0, start);
    const pre = block && before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const post = block ? "\n" : "";
    const next = `${before}${pre}${text}${post}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = before.length + pre.length + text.length;
      el.setSelectionRange(pos, pos);
    });
    if (mode === "preview") setMode("write");
  };
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="border border-ink-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-ink-200 bg-ink-50 overflow-x-auto">
        {tools.map((t) => (
          <button key={t.label} type="button" onClick={() => apply(t)} title={t.label} aria-label={t.label} className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-ink-600 hover:bg-white hover:text-ink-900">
            <t.icon size={14} />
          </button>
        ))}
        <span className="mr-auto flex items-center gap-0.5 shrink-0 pr-2">
          {(
            [
              ["write", PenLine, "نوشتن"],
              ["split", Columns2, "دوستونه"],
              ["preview", Eye, "پیش‌نمایش"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)} className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 ${mode === id ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-800"} ${id === "split" ? "hidden md:flex" : ""}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </span>
      </div>
      <div className={mode === "split" ? "grid grid-cols-2 divide-x divide-x-reverse divide-ink-200" : ""}>
        {mode !== "preview" && (
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 text-sm leading-7 outline-none resize-y bg-transparent text-ink-800"
            style={{ minHeight }}
            placeholder={"## عنوان بخش\nمتن مقاله را بنویسید… برای فهرست «-»، برای پررنگ **متن** و برای جدول از دکمه‌ی جدول استفاده کنید."}
          />
        )}
        {mode !== "write" && (
          <div className="p-3 overflow-y-auto" style={{ minHeight, maxHeight: 480 }}>
            <MarkdownView md={value} />
          </div>
        )}
      </div>
      <p className="text-[10.5px] text-ink-400 px-3 py-1 border-t border-ink-100 bg-ink-50/60">{fa(words)} واژه · Markdown ساده (عنوان، فهرست، پررنگ، پیوند، جدول، کد)</p>
    </div>
  );
}

// ------------------------------------------------------------------ مقایسه‌ی متنی
export function DiffView({ a, b, labelA, labelB }: { a: string; b: string; labelA: string; labelB: string }) {
  const [onlyChanges, setOnlyChanges] = useState(true);
  const lines = diffLines(a, b);
  const added = lines.filter((l) => l.type === "add").length;
  const removed = lines.filter((l) => l.type === "del").length;
  // در حالت «فقط تغییرات»، سطرهای یکسان دور از تغییر جمع می‌شوند
  const near = new Set<number>();
  lines.forEach((l, i) => {
    if (l.type !== "same") for (let k = i - 2; k <= i + 2; k++) near.add(k);
  });
  const shown = onlyChanges ? lines.map((l, i) => ({ l, i, show: l.type !== "same" || near.has(i) })) : lines.map((l, i) => ({ l, i, show: true }));
  return (
    <div className="border border-ink-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2 bg-ink-50 border-b border-ink-200 text-[11px] flex-wrap">
        <span className="text-ink-500">
          {labelA} ← {labelB}
        </span>
        <span className="text-emerald-700 font-medium">+{fa(added)} سطر</span>
        <span className="text-rose-600 font-medium">−{fa(removed)} سطر</span>
        <label className="mr-auto flex items-center gap-1 text-ink-500 cursor-pointer">
          <input type="checkbox" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} className="accent-[var(--color-brand-600)]" /> فقط تغییرات
        </label>
      </div>
      {added + removed === 0 ? (
        <p className="p-4 text-xs text-ink-400 text-center">متن دو نسخه یکسان است.</p>
      ) : (
        <div className="max-h-[360px] overflow-y-auto text-xs leading-6 font-[inherit]">
          {shown.map(({ l, i, show }, k) =>
            show ? (
              <div key={i} className={`flex gap-2 px-3 ${l.type === "add" ? "bg-emerald-50 text-emerald-700" : l.type === "del" ? "bg-rose-50 text-rose-600 line-through decoration-rose-400/70" : "text-ink-600"}`}>
                <span className="w-4 shrink-0 text-center select-none opacity-70">{l.type === "add" ? "+" : l.type === "del" ? "−" : ""}</span>
                <span className="whitespace-pre-wrap break-words min-w-0">{l.text || " "}</span>
              </div>
            ) : shown[k - 1]?.show ? (
              <div key={i} className="px-3 text-center text-ink-300 select-none">⋯</div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
