// «تاریخچه تغییرات» — گزارش تغییرناپذیرِ همه‌ی رویدادهای هویت و دسترسی.
import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Download, FileClock, Filter, Lock, ScrollText } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge, { type BadgeTone } from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import JalaliDatePicker from "../../../components/ui/JalaliDatePicker";
import { useToast } from "../../../components/ui/ToastProvider";
import { useTenancy } from "../../../context/TenancyContext";
import { auditLabel, descendantsOrSelf, type Audit, type AuditEvent } from "../../../iam/model";
import { Callout, ScopeName, ScopeSelect, SearchBox, SectionHead, UserCell, downloadCsv, fmtN, userName, useSubtree } from "./shared";

const eventTone = (e: AuditEvent): BadgeTone =>
  e.endsWith("deleted") || e.endsWith("revoked") || e.endsWith("removed") || e.endsWith("deactivated") || e.endsWith("suspended") ? "danger" : e.endsWith("created") ? "success" : e === "review.completed" ? "navy" : "brand";

const PAGE = 40;

export function AuditSection() {
  const t = useTenancy();
  const { iam } = t;
  const sub = useSubtree();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [eventF, setEventF] = useState<AuditEvent | "">("");
  const [scopeF, setScopeF] = useState("");
  const [actorF, setActorF] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  const allowed = t.canAdmin(t.contextId, "iam.audit.view");
  const inScope = useMemo(() => iam.audits.filter((a) => sub.ids.has(a.scopeId)), [iam, sub]);
  const actors = useMemo(() => [...new Set(inScope.map((a) => a.actorId))], [inScope]);

  const rows = useMemo(() => {
    const scopeSet = scopeF ? new Set(descendantsOrSelf(iam, scopeF).map((n) => n.id)) : null;
    const term = q.trim();
    return inScope
      .filter((a) => !eventF || a.event === eventF)
      .filter((a) => !scopeSet || scopeSet.has(a.scopeId))
      .filter((a) => !actorF || a.actorId === actorF)
      .filter((a) => {
        const d = a.at.split(" ")[0];
        return (!from || d >= from) && (!to || d <= to);
      })
      .filter((a) => !term || a.summary.includes(term) || userName(a.actorId).includes(term) || userName(a.affectedUserId).includes(term) || t.scopeLabel(a.scopeId).includes(term))
      .sort((a, b) => b.seq - a.seq);
  }, [inScope, eventF, scopeF, actorF, from, to, q, iam, t]);

  const exportCsv = () => {
    downloadCsv(
      `iam-audit-${t.today.replace(/\//g, "-")}.csv`,
      ["زمان", "انجام‌دهنده", "رویداد", "واحد", "مسیر", "کاربر متأثر", "شرح", "قبل", "بعد"],
      rows.map((a) => [a.at, userName(a.actorId), auditLabel[a.event], t.scopeLabel(a.scopeId), t.scopePath(a.scopeId), a.affectedUserId ? userName(a.affectedUserId) : "", a.summary, a.before ? JSON.stringify(a.before) : "", a.after ? JSON.stringify(a.after) : ""])
    );
    notify(`${fmtN(rows.length)} رویداد در فایل CSV ذخیره شد.`);
  };

  const activeFilters = [eventF, scopeF, actorF, from, to].filter(Boolean).length;
  const clear = () => {
    setEventF("");
    setScopeF("");
    setActorF("");
    setFrom("");
    setTo("");
  };

  if (!allowed)
    return (
      <div>
        <SectionHead icon={<ScrollText size={18} />} title="تاریخچه تغییرات" />
        <div className="card">
          <EmptyState icon={<Lock size={22} />} title="به تاریخچه دسترسی ندارید" description="مشاهده‌ی تاریخچه‌ی تغییرات دسترسی نیازمند مجوز «iam.audit.view» در واحد فعلی است." />
        </div>
      </div>
    );

  return (
    <div>
      <SectionHead
        icon={<ScrollText size={18} />}
        title="تاریخچه تغییرات"
        description={`هر تغییر در ساختار، نقش‌ها، تخصیص‌ها و عضویت‌های «${sub.root.name}» و زیرمجموعه‌هایش — ثبت‌شده و غیرقابل ویرایش.`}
        actions={
          <Button icon={<Download size={14} />} onClick={exportCsv} disabled={!rows.length} className="disabled:opacity-45">
            خروجی CSV
          </Button>
        }
      />

      <div className="card p-3 mb-3">
        <div className="flex gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="جستجو در شرح، افراد و واحدها…" className="flex-1" />
          <Button icon={<Filter size={14} />} onClick={() => setShowFilters((v) => !v)} variant={showFilters || activeFilters ? "primary" : "secondary"}>
            فیلتر{activeFilters ? ` (${fmtN(activeFilters)})` : ""}
          </Button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-2 pt-2 border-t border-ink-100">
            <select className="input-field" value={eventF} onChange={(e) => setEventF(e.target.value as AuditEvent | "")} aria-label="نوع رویداد">
              <option value="">همه‌ی رویدادها</option>
              {(Object.keys(auditLabel) as AuditEvent[]).map((e) => (
                <option key={e} value={e}>
                  {auditLabel[e]}
                </option>
              ))}
            </select>
            <ScopeSelect value={scopeF} onChange={setScopeF} nodes={sub.nodes} allLabel="همه‌ی واحدها" />
            <select className="input-field" value={actorF} onChange={(e) => setActorF(e.target.value)} aria-label="انجام‌دهنده">
              <option value="">همه‌ی انجام‌دهندگان</option>
              {actors.map((id) => (
                <option key={id} value={id}>
                  {userName(id)}
                </option>
              ))}
            </select>
            <JalaliDatePicker value={from} onChange={setFrom} placeholder="از تاریخ" />
            <JalaliDatePicker value={to} onChange={setTo} placeholder="تا تاریخ" />
            {activeFilters > 0 && (
              <button type="button" onClick={clear} className="text-[12px] text-ink-500 hover:text-ink-800 justify-self-start">
                پاک کردن فیلترها
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="hidden lg:grid grid-cols-[24px_120px_minmax(0,1.1fr)_120px_minmax(0,1.1fr)_minmax(0,2.4fr)] gap-3 px-4 py-2 bg-ink-50 border-b border-ink-100 text-[11px] font-bold text-ink-500">
          <span />
          <span>زمان</span>
          <span>انجام‌دهنده</span>
          <span>رویداد</span>
          <span>واحد</span>
          <span>شرح</span>
        </div>
        {rows.length === 0 && <EmptyState icon={<FileClock size={22} />} title="رویدادی پیدا نشد" description="فیلترها را تغییر دهید." />}
        <ul className="divide-y divide-ink-100">
          {rows.slice(0, limit).map((a) => (
            <AuditRow key={a.id} a={a} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />
          ))}
        </ul>
        {rows.length > limit && (
          <div className="p-3 text-center border-t border-ink-100">
            <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
              نمایش بیشتر ({fmtN(rows.length - limit)} رویداد دیگر)
            </Button>
          </div>
        )}
      </div>
      <div className="mt-3">
        <Callout icon={<Lock size={13} />} tone="neutral">
          تاریخچه فقط افزودنی است: هیچ‌کس — حتی مدیر سامانه — نمی‌تواند رویدادی را ویرایش یا حذف کند. هر مدیر فقط رویدادهای محدوده‌ی خودش را می‌بیند.
        </Callout>
      </div>
    </div>
  );
}

function AuditRow({ a, open, onToggle }: { a: Audit; open: boolean; onToggle: () => void }) {
  const hasDiff = !!(a.before || a.after);
  return (
    <li>
      <button type="button" onClick={onToggle} className="w-full text-right grid grid-cols-[24px_minmax(0,1fr)] lg:grid-cols-[24px_120px_minmax(0,1.1fr)_120px_minmax(0,1.1fr)_minmax(0,2.4fr)] gap-x-3 gap-y-1 px-4 py-2.5 items-center hover:bg-ink-50">
        <span className="text-ink-400 row-span-4 lg:row-span-1 self-start lg:self-center mt-1 lg:mt-0">{open ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}</span>
        <span className="text-[11px] text-ink-500 flex items-center gap-2 lg:block">
          {a.at}
          <span className="lg:hidden">
            <Badge tone={eventTone(a.event)}>{auditLabel[a.event]}</Badge>
          </span>
        </span>
        <span className="min-w-0">
          <UserCell userId={a.actorId} size={24} sub={a.affectedUserId ? `برای: ${userName(a.affectedUserId)}` : undefined} />
        </span>
        <span className="hidden lg:block">
          <Badge tone={eventTone(a.event)}>{auditLabel[a.event]}</Badge>
        </span>
        <span className="min-w-0">
          <ScopeName id={a.scopeId} showPath />
        </span>
        <span className="text-[12px] text-ink-700 leading-5 min-w-0">{a.summary}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 lg:pr-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(["before", "after"] as const).map((k) => (
              <div key={k} className="rounded-lg border border-ink-100 bg-ink-50 p-2.5 min-w-0">
                <p className="text-[11px] font-bold text-ink-500 mb-1">{k === "before" ? "قبل" : "بعد"}</p>
                {a[k] ? (
                  <pre dir="ltr" className="text-[11px] text-ink-700 font-mono whitespace-pre-wrap break-all text-left">
                    {JSON.stringify(a[k], null, 2)}
                  </pre>
                ) : (
                  <p className="text-[11px] text-ink-400">—</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10.5px] text-ink-400 mt-2 font-mono" dir="ltr">
            #{a.seq} · {a.targetType}:{a.targetId} · {a.event}
          </p>
          {!hasDiff && <p className="text-[11px] text-ink-400 mt-1">این رویداد جزئیات قبل/بعد ندارد؛ شرح بالا کامل است.</p>}
        </div>
      )}
    </li>
  );
}
