// ---------------------------------------------------------------------------
// بند ۷: جستجوی پیشرفته‌ی یکپارچه — نرمال‌سازی فارسی (ی/ي، ک/ك، نیم‌فاصله، ارقام،
// اعراب)، جستجو در متن مقاله و متن استخراج‌شده‌ی فایل‌ها، برجسته‌سازی، فیلتر با شمارش
// (facet) و جستجوی ذخیره‌شده با اعلان نتیجه‌ی جدید.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Search, Bookmark, BookmarkPlus, Bell, BellOff, X, SlidersHorizontal, FileText, Eye, Lightbulb, IdCard, Workflow, UserRound, BookA, FileSearch } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, accessTone, statusTone } from "../../context/KnowledgeContext";
import { dayNum, fa } from "../../pm/jalali";
import { mdToPlain, matchesAll, pageOfMatch, queryTerms, snippetOf } from "../../km/text";
import type { KDoc, KFile, KSearchFilters } from "../../km/types";
import { Highlight } from "./Markdown";
import FilePreview from "./FilePreview";
import { SectionHead } from "./shared";
import { useKPage } from "./ctx";

type Kind = "doc" | "lesson" | "registry" | "process" | "expert" | "glossary";
const kindMeta: Record<Kind, { label: string; icon: typeof FileText }> = {
  doc: { label: "سند", icon: FileText },
  lesson: { label: "تجربه", icon: Lightbulb },
  registry: { label: "شناسنامه", icon: IdCard },
  process: { label: "فرآیند", icon: Workflow },
  expert: { label: "خبره", icon: UserRound },
  glossary: { label: "واژه", icon: BookA },
};

type Field = { where: string; text: string; weight: number; file?: KFile };
type Hit = { key: string; kind: Kind; title: string; meta: string; fields: Field[]; doc?: KDoc; open: () => void; boost: number };
type Result = Hit & { score: number; snippet?: { where: string; text: string; file?: KFile; page?: number } };

const emptyFilters: KSearchFilters = { kinds: [], types: [], units: [], statuses: [], access: [], tags: [], inContent: true };
type Extra = { code: string; owner: string; from: string; to: string; category: string };
const emptyExtra: Extra = { code: "", owner: "", from: "", to: "", category: "" };

export default function SearchSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { filterScoped } = useTenancy();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [f, setF] = useState<KSearchFilters>(emptyFilters);
  const [extra, setExtra] = useState<Extra>(emptyExtra);
  const [showMore, setShowMore] = useState(false);
  const [tab, setTab] = useState<Kind | "all">("all");
  const [logged, setLogged] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotify, setSaveNotify] = useState(true);
  const [preview, setPreview] = useState<{ doc: KDoc; file: KFile; page: number } | null>(null);
  const terms = queryTerms(q);

  const hits = useMemo((): Hit[] => {
    const docs = filterScoped(km.docs).filter((d) => d.status !== "آرشیو" && km.canSee(d) && (d.status === "منتشرشده" || d.owner === km.me || d.author === km.me || km.isApprover(d)));
    return [
      ...docs.map((d) => ({
        key: d.id,
        kind: "doc" as Kind,
        title: d.title,
        meta: `${d.code} · ${d.type} · ${d.unit}`,
        doc: d,
        boost: d.status === "منتشرشده" ? 1 : 0,
        open: () => page.openDoc(d.id),
        fields: [
          { where: "عنوان", text: `${d.title} ${d.code}`, weight: 3 },
          { where: "برچسب", text: d.tags.join(" "), weight: 2 },
          { where: "توضیحات", text: `${d.description} ${d.owner} ${d.unit}`, weight: 1 },
          ...(f.inContent && d.body ? [{ where: "متن مقاله", text: mdToPlain(d.body), weight: 1 }] : []),
          ...(f.inContent ? d.files.map((x) => ({ where: `فایل «${x.name}»`, text: `${x.name}\n${x.text ?? ""}`, weight: 1, file: x })) : []),
        ],
      })),
      ...km.experiences
        .filter((e) => e.status === "منتشرشده" || e.author === km.me)
        .map((e) => ({
          key: e.id,
          kind: "lesson" as Kind,
          title: e.title,
          meta: `${e.kind} · ${e.author}`,
          boost: 0,
          open: () => page.go(e.projectId ? "projects" : "experience", e.id),
          fields: [
            { where: "عنوان", text: e.title, weight: 3 },
            { where: "برچسب", text: e.tags.join(" "), weight: 2 },
            { where: "متن", text: [e.body, e.problem, e.cause, e.action, e.result, e.future].filter(Boolean).join("\n"), weight: 1 },
          ],
        })),
      ...km.registry.map((r) => ({
        key: r.id,
        kind: "registry" as Kind,
        title: r.title,
        meta: `${km.registryTypes.find((t) => t.id === r.typeId)?.name ?? "شناسنامه"} · ${r.owner}`,
        boost: 0,
        open: () => page.go("registry", r.id),
        fields: [
          { where: "عنوان", text: r.title, weight: 3 },
          { where: "مشخصات", text: `${Object.values(r.values).join(" ")} ${r.description}`, weight: 1 },
        ],
      })),
      ...km.processes.map((p) => ({
        key: p.id,
        kind: "process" as Kind,
        title: p.name,
        meta: `${p.code} · ${p.kind} · ${p.owner}`,
        boost: 0,
        open: () => page.go("processes", p.id),
        fields: [
          { where: "عنوان", text: `${p.name} ${p.code}`, weight: 3 },
          { where: "شرح و گام‌ها", text: `${p.description}\n${p.steps.join("، ")}\n${p.inputs.join("، ")}\n${p.outputs.join("، ")}`, weight: 1 },
        ],
      })),
      ...km.experts.map((x) => ({
        key: x.id,
        kind: "expert" as Kind,
        title: x.name,
        meta: `${x.title} · ${x.unit}`,
        boost: 0,
        open: () => page.go("experts", x.id),
        fields: [
          { where: "نام", text: x.name, weight: 3 },
          { where: "حوزه‌ها", text: [...x.areas, ...x.topics].join("، "), weight: 2 },
          { where: "سوابق", text: x.experience, weight: 1 },
        ],
      })),
      ...km.glossary.map((g) => ({
        key: g.id,
        kind: "glossary" as Kind,
        title: `${g.term}${g.abbr ? ` (${g.abbr})` : ""}`,
        meta: `${g.english ?? ""} · ${g.unit}`,
        boost: 0,
        open: () => page.go("glossary", g.id),
        fields: [
          { where: "اصطلاح", text: `${g.term} ${g.abbr ?? ""} ${g.english ?? ""}`, weight: 3 },
          { where: "تعریف", text: g.definition, weight: 1 },
        ],
      })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [km.docs, km.experiences, km.registry, km.processes, km.experts, km.glossary, f.inContent, km.me]);

  /** تطبیق متن + محاسبه‌ی امتیاز و قطعه‌ی نمونه */
  const matched = useMemo((): Result[] => {
    return hits
      .map((h): Result | null => {
        const all = h.fields.map((x) => x.text).join("\n");
        if (terms.length && !matchesAll(all, terms)) return null;
        let score = h.boost;
        h.fields.forEach((x) => terms.forEach((t) => matchesAll(x.text, [t]) && (score += x.weight)));
        const body = h.fields.find((x) => x.weight === 1 && terms.length && terms.some((t) => matchesAll(x.text, [t])));
        const fallback = h.fields.find((x) => x.weight === 1);
        const src = body ?? fallback;
        return { ...h, score, snippet: src ? { where: src.where, text: snippetOf(src.text, terms), file: src.file, page: src.file?.text ? pageOfMatch(src.file.text, terms) : undefined } : undefined };
      })
      .filter((x): x is Result => !!x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hits, q]);

  // فیلترهای سند (facet) — شمارش هر گزینه با اعمال بقیه‌ی فیلترها
  type FacetKey = "types" | "units" | "statuses" | "access" | "tags";
  const docVal: Record<FacetKey, (d: KDoc) => string[]> = { types: (d) => [d.type], units: (d) => [d.unit], statuses: (d) => [d.status], access: (d) => [d.access], tags: (d) => d.tags };
  const passDoc = (d: KDoc, except?: FacetKey) => {
    for (const k of Object.keys(docVal) as FacetKey[]) {
      if (k === except || !f[k].length) continue;
      if (!docVal[k](d).some((v) => f[k].includes(v))) return false;
    }
    if (extra.code && !d.code.includes(extra.code)) return false;
    if (extra.owner && !matchesAll(`${d.owner} ${d.author}`, queryTerms(extra.owner))) return false;
    if (extra.category && d.categoryId !== extra.category && km.categories.find((c) => c.id === d.categoryId)?.parentId !== extra.category) return false;
    if (extra.from && (dayNum(d.updatedAt) ?? 0) < (dayNum(extra.from) ?? 0)) return false;
    if (extra.to && (dayNum(d.updatedAt) ?? 0) > (dayNum(extra.to) ?? 9e9)) return false;
    return true;
  };
  const docFilterActive = (Object.keys(docVal) as FacetKey[]).some((k) => f[k].length) || Object.values(extra).some(Boolean);
  const filtered = matched.filter((r) => (r.kind === "doc" ? passDoc(r.doc!) : !docFilterActive));
  const byKind = (k: Kind) => filtered.filter((r) => r.kind === k).length;
  const list = filtered.filter((r) => tab === "all" || r.kind === tab).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "fa"));
  const facet = (k: FacetKey) => {
    const m = new Map<string, number>();
    matched.filter((r) => r.kind === "doc" && passDoc(r.doc!, k)).forEach((r) => docVal[k](r.doc!).forEach((v) => m.set(v, (m.get(v) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const toggleFacet = (k: FacetKey, v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  const commit = () => {
    const t = q.trim();
    if (t && t !== logged) {
      km.logSearch(t, filtered.length);
      setLogged(t);
    }
  };
  const mine = km.savedSearches.filter((s) => s.owner === km.me);
  const facetLabels: [FacetKey, string][] = [
    ["types", "نوع سند"],
    ["units", "واحد سازمانی"],
    ["statuses", "وضعیت"],
    ["access", "سطح دسترسی"],
    ["tags", "برچسب"],
  ];
  const activeFacetCount = (Object.keys(docVal) as FacetKey[]).reduce((n, k) => n + f[k].length, 0) + Object.values(extra).filter(Boolean).length;

  return (
    <div>
      <SectionHead
        icon={<FileSearch size={17} className="text-brand-600" />}
        title="جستجوی پیشرفته"
        hint="در همه‌ی دانش‌ها: اسناد (عنوان، توضیح، متن مقاله و متن PDF/Word)، تجربیات، شناسنامه‌ها، فرآیندها، خبرگان و واژه‌ها. ی/ي، ک/ك، نیم‌فاصله، ارقام فارسی و لاتین و اعراب یکسان در نظر گرفته می‌شوند."
      />

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-9 !py-2.5" value={q} onChange={(e) => setQ(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} placeholder="مثلاً: آیین‌نامه معاملات، كاركنان، ماده ۳…" autoFocus />
          {q && (
            <button onClick={() => setQ("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700" aria-label="پاک کردن">
              <X size={14} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
          <Toggle on={f.inContent} onChange={() => setF({ ...f, inContent: !f.inContent })} label="جستجو در متن فایل‌ها" /> در متن فایل و مقاله
        </label>
        <button onClick={() => setShowMore((v) => !v)} className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-1 ${showMore || activeFacetCount ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-ink-200 text-ink-600"}`}>
          <SlidersHorizontal size={13} /> فیلترها{activeFacetCount ? ` (${fa(activeFacetCount)})` : ""}
        </button>
        <Button variant="secondary" icon={<BookmarkPlus size={14} />} disabled={!q.trim() && !activeFacetCount} onClick={() => { setSaveName(q.trim() || "جستجوی من"); setSaveNotify(true); setSaveOpen(true); }}>
          ذخیره
        </Button>
      </div>

      {mine.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <Bookmark size={13} className="text-ink-400" />
          {mine.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 text-[11.5px] border border-ink-200 rounded-full pr-2.5 pl-1 py-0.5 bg-white">
              <button onClick={() => { setQ(s.query); setF(s.filters); setExtra(emptyExtra); }} className="text-ink-700 hover:text-brand-700">
                {s.name}
              </button>
              <button onClick={() => km.toggleSearchNotify(s.id)} title={s.notify ? "اعلان نتیجه‌ی جدید: روشن" : "اعلان نتیجه‌ی جدید: خاموش"} className={s.notify ? "text-brand-600" : "text-ink-300"}>
                {s.notify ? <Bell size={11} /> : <BellOff size={11} />}
              </button>
              <button onClick={() => km.deleteSearch(s.id)} className="text-ink-300 hover:text-rose-600" aria-label={`حذف ${s.name}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {showMore && (
        <div className="card p-3 mb-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          <input className="input-field !py-1.5 !text-xs" value={extra.code} onChange={(e) => setExtra({ ...extra, code: e.target.value })} placeholder="کد سند" />
          <input className="input-field !py-1.5 !text-xs" value={extra.owner} onChange={(e) => setExtra({ ...extra, owner: e.target.value })} placeholder="مالک / نویسنده" />
          <select className="input-field !py-1.5 !text-xs" value={extra.category} onChange={(e) => setExtra({ ...extra, category: e.target.value })}>
            <option value="">همه‌ی دسته‌ها</option>
            {km.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {km.categoryPath(c.id)}
              </option>
            ))}
          </select>
          <input className="input-field !py-1.5 !text-xs" value={extra.from} onChange={(e) => setExtra({ ...extra, from: e.target.value })} placeholder="از تاریخ ۱۴۰۵/۰۱/۰۱" />
          <input className="input-field !py-1.5 !text-xs" value={extra.to} onChange={(e) => setExtra({ ...extra, to: e.target.value })} placeholder="تا تاریخ" />
          {activeFacetCount > 0 && (
            <button onClick={() => { setF({ ...emptyFilters, inContent: f.inContent }); setExtra(emptyExtra); }} className="text-xs text-brand-700 hover:underline flex items-center gap-1 col-span-2 md:col-span-1">
              <X size={12} /> پاک‌کردن فیلترها
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-ink-200 mb-4 overflow-x-auto">
        {(["all", ...(Object.keys(kindMeta) as Kind[])] as const).map((k) => {
          const n = k === "all" ? filtered.length : byKind(k);
          return (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${tab === k ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}>
              {k === "all" ? "همه" : kindMeta[k].label}
              <span className="mr-1 text-[10px] bg-ink-100 rounded-full px-1.5">{fa(n)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
        <aside className={`card p-3 self-start space-y-3 ${showMore ? "" : "hidden lg:block"}`}>
          {facetLabels.map(([k, label]) => {
            const opts = facet(k);
            if (!opts.length) return null;
            return (
              <div key={k}>
                <p className="text-[11px] font-bold text-ink-500 mb-1">{label}</p>
                {opts.slice(0, k === "tags" ? 8 : 10).map(([v, n]) => (
                  <label key={v} className="flex items-center gap-1.5 text-xs py-0.5 cursor-pointer text-ink-700">
                    <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={f[k].includes(v)} onChange={() => toggleFacet(k, v)} />
                    <span className="flex-1 truncate">{k === "tags" ? `#${v}` : v}</span>
                    <span className="text-[10.5px] text-ink-400">{fa(n)}</span>
                  </label>
                ))}
              </div>
            );
          })}
          {f.statuses.length === 0 && f.access.length === 0 && <p className="text-[10.5px] text-ink-400">شمارش‌ها بر اساس نتایج همین جستجوست.</p>}
        </aside>

        <div className="space-y-2 min-w-0">
          {list.map((r) => {
            const M = kindMeta[r.kind];
            return (
              <div key={`${r.kind}-${r.key}`} className="card p-3 hover:border-brand-300 transition-colors">
                <div className="flex items-start gap-2">
                  <M.icon size={15} className="text-ink-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <button onClick={r.open} className="text-sm font-medium text-ink-900 hover:text-brand-700 text-right">
                      <Highlight text={r.title} terms={terms} />
                    </button>
                    <p className="text-[11px] text-ink-400 mt-0.5 truncate">{r.meta}</p>
                  </div>
                  <span className="flex gap-1 shrink-0 flex-wrap justify-end">
                    {r.doc ? (
                      <>
                        <Badge tone={statusTone[r.doc.status]}>{r.doc.status}</Badge>
                        {r.doc.access !== "عمومی" && r.doc.access !== "داخلی" && <Badge tone={accessTone[r.doc.access]}>{r.doc.access}</Badge>}
                      </>
                    ) : (
                      <Badge tone="neutral">{M.label}</Badge>
                    )}
                  </span>
                </div>
                {r.snippet && r.snippet.text && (
                  <div className="mt-2 pr-6">
                    <p className="text-xs text-ink-600 leading-6">
                      <Highlight text={r.snippet.text} terms={terms} />
                    </p>
                    {terms.length > 0 && (
                      <p className="text-[10.5px] text-ink-400 mt-1 flex items-center gap-2 flex-wrap">
                        یافت‌شده در: {r.snippet.where}
                        {r.snippet.page ? ` — صفحه‌ی ${fa(r.snippet.page)}` : ""}
                        {r.snippet.file && r.doc && (
                          <button onClick={() => setPreview({ doc: r.doc!, file: r.snippet!.file!, page: r.snippet!.page ?? 1 })} className="text-brand-700 hover:underline flex items-center gap-0.5">
                            <Eye size={11} /> پیش‌نمایش همین صفحه
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-sm text-ink-500">نتیجه‌ای پیدا نشد.</p>
              <p className="text-[11px] text-ink-400 mt-1">{q.trim() ? "این جستجو برای تحلیل «کمبود دانش» ثبت شد. واژه‌ی کوتاه‌تر یا مترادف را امتحان کنید." : "عبارتی بنویسید."}</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="ذخیره‌ی جستجو" description="جستجوی ذخیره‌شده با یک کلیک دوباره اجرا می‌شود و در صورت تمایل، انتشار سند منطبق جدید به شما اعلان می‌شود.">
        <div className="space-y-3">
          <input className="input-field" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="نام جستجو" autoFocus />
          <p className="text-[11px] text-ink-500">
            عبارت: «{q.trim() || "—"}» · {fa(activeFacetCount)} فیلتر · {f.inContent ? "با" : "بدون"} جستجو در متن فایل‌ها
          </p>
          <label className="flex items-center justify-between text-xs text-ink-700">
            اعلان وقتی سند منطبق جدیدی منتشر شد
            <Toggle on={saveNotify} onChange={() => setSaveNotify((v) => !v)} label="اعلان" />
          </label>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                if (!saveName.trim()) return notify("نام جستجو را بنویسید.", "warning");
                km.saveSearch({ name: saveName.trim(), query: q.trim(), filters: f, notify: saveNotify });
                setSaveOpen(false);
                notify("جستجو ذخیره شد.");
              }}
            >
              ذخیره
            </Button>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>

      <FilePreview doc={preview?.doc ?? null} file={preview?.file ?? null} initialPage={preview?.page} terms={terms} onClose={() => setPreview(null)} />
    </div>
  );
}
