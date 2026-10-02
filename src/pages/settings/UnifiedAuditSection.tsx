// ---------------------------------------------------------------------------
// «لاگ ممیزی یکپارچه» — همه‌ی رویدادهای ثبت‌شده در ماژول‌ها در یک جدول:
// هویت و دسترسی (IAM) · مدیریت دانش · تاریخچه‌ی پروژه‌ها · دانش و نوآوری · تیکت پشتیبانی ·
// نظارت شبکه‌ی اجتماعی (تأیید نظر و حذف محتوا).
// فقط رویدادهای واحد فعلی و زیرمجموعه‌هایش دیده می‌شوند و مجوز iam.audit.view لازم است.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Download, FileClock, Filter, Layers, Lock } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import StatCard from "../../components/ui/StatCard";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useInnovation } from "../../context/InnovationContext";
import { useTicketsMaybe } from "../../context/TicketsContext";
import { useSocial } from "../../context/SocialContext";
import { auditLabel, descendantsOrSelf, ROOT_ID } from "../../iam/model";
import { logCodeLabel } from "../../km/types";
import { eventByCode } from "../../pm/events";
import { dayNum, toEnDigits } from "../../pm/jalali";
import { moduleTitle } from "../../innovation/types";
import { fmtTs, statusLabel, type TicketStatus } from "../tickets/model";
import { users } from "../../data/mock";
import { contentKindLabel, moderationActionLabel } from "../../social/types";
import { ownerScopeOf } from "../search/liveData";
import { ScopeSelect, SearchBox, SectionHead, downloadCsv, useSubtree } from "./iam/shared";

type ModuleId = "iam" | "settings" | "knowledge" | "projects" | "innovation" | "tickets" | "social";
const MODULES: { id: ModuleId; label: string; tone: BadgeTone }[] = [
  { id: "iam", label: "هویت و دسترسی", tone: "navy" },
  { id: "settings", label: "تغییر تنظیمات", tone: "warning" },
  { id: "knowledge", label: "مدیریت دانش", tone: "brand" },
  { id: "projects", label: "پروژه‌ها", tone: "success" },
  { id: "innovation", label: "دانش و نوآوری", tone: "warning" },
  { id: "tickets", label: "تیکت پشتیبانی", tone: "neutral" },
  { id: "social", label: "نظارت شبکه‌ی اجتماعی", tone: "danger" },
];
const modMeta = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<ModuleId, (typeof MODULES)[number]>;

type Entry = { id: string; module: ModuleId; at: string; sort: number; day: number; actor: string; action: string; target: string; scopeId: string; detail?: string };

const userName = (id?: string | null) => users.find((u) => u.id === id)?.name ?? id ?? "—";
/** «۱۴۰۵/۰۳/۰۸ ۱۰:۲۲» → کلید مرتب‌سازی (دقیقه) */
function sortKey(at: string): { day: number; sort: number } {
  const [d, tm] = at.split(" ");
  const day = dayNum(d) ?? 0;
  const [h, m] = toEnDigits(tm ?? "0:0").split(":").map((x) => parseInt(x, 10) || 0);
  return { day, sort: day * 1440 + h * 60 + m };
}
const PAGE = 50;

const ticketKindLabel: Record<string, string> = { affected: "«من هم» — کاربر آسیب‌دیده", severity: "تغییر شدت", attachment: "پیوست", labels: "برچسب‌ها", link: "پیوند تیکت", release: "نسخه‌ی رفع" };

export default function UnifiedAuditSection() {
  const t = useTenancy();
  const sub = useSubtree();
  const km = useKnowledge();
  const pm = useProjectsPM();
  const inn = useInnovation();
  const tk = useTicketsMaybe();
  const s = useSocial();
  const { notify } = useToast();

  const [q, setQ] = useState("");
  const [modF, setModF] = useState<ModuleId | "">("");
  const [actorF, setActorF] = useState("");
  const [scopeF, setScopeF] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const allowed = t.canAdmin(t.contextId, "iam.audit.view");

  const all: Entry[] = useMemo(() => {
    const out: Entry[] = [];
    const push = (e: Omit<Entry, "sort" | "day">) => out.push({ ...e, ...sortKey(e.at) });

    // ۱) هویت و دسترسی
    // (رویداد settings.changed — از SettingsContext، کانال‌ها، طبقه‌بندی، سیاست ورود و تنظیمات لایه‌ای — ماژول جدا دارد)
    t.iam.audits.forEach((a) => push({ id: `iam-${a.id}`, module: a.event === "settings.changed" ? "settings" : "iam", at: a.at, actor: userName(a.actorId), action: auditLabel[a.event], target: a.summary, scopeId: a.scopeId, detail: a.before || a.after ? `قبل: ${JSON.stringify(a.before ?? {})}\nبعد: ${JSON.stringify(a.after ?? {})}` : undefined }));

    // ۲) مدیریت دانش
    const docById = new Map(km.docs.map((d) => [d.id, d]));
    km.logs.forEach((l) => {
      const doc = l.entity.type === "doc" ? docById.get(l.entity.id) : undefined;
      push({ id: `km-${l.id}`, module: "knowledge", at: l.at, actor: l.actor, action: l.code ? `${logCodeLabel[l.code]} — ${l.action}` : l.action, target: l.entity.title, scopeId: doc ? ownerScopeOf(doc) : ROOT_ID, detail: [l.detail, l.access ? `سطح: ${l.access}` : ""].filter(Boolean).join("\n") || undefined });
    });

    // ۳) تاریخچه‌ی پروژه‌ها
    pm.projects.forEach((p) => {
      const sc = ownerScopeOf(p.meta);
      p.logs.forEach((l) => push({ id: `pm-${p.meta.id}-${l.id}`, module: "projects", at: `${l.date} ${l.time}`, actor: l.actor, action: eventByCode[l.event]?.label ?? l.event, target: `${p.meta.name} — ${l.description}`, scopeId: sc }));
    });

    // ۴) دانش و نوآوری
    const innScope = new Map<string, string>();
    [...inn.calls, ...inn.contracts, ...inn.employment, ...inn.nfProjects, ...inn.courses, ...inn.rfps, ...inn.sabbaticals].forEach((x) => innScope.set(x.id, ownerScopeOf(x)));
    inn.logs.forEach((l) => push({ id: `inn-${l.id}`, module: "innovation", at: l.at, actor: l.actor, action: `${moduleTitle[l.module]} — ${l.action}`, target: l.subject?.title ?? "—", scopeId: (l.subject && innScope.get(l.subject.id)) || ROOT_ID }));

    // ۵) تیکت‌ها (یادداشت داخلی فقط برای تیم سازنده)
    tk?.tickets.forEach((tic) =>
      tic.events
        .filter((e) => !e.internal || tk.isVendor)
        .forEach((e) => {
          const at = fmtTs(e.at).replace(" — ", " ");
          const label = e.kind === "status" ? `تغییر وضعیت${e.to ? ` به «${statusLabel[e.to as TicketStatus] ?? e.to}»` : ""}` : e.kind === "created" ? "ثبت تیکت" : e.kind === "comment" ? "پیام" : e.kind === "note" ? "یادداشت داخلی" : e.kind === "assign" ? "ارجاع" : e.kind === "priority" ? "تغییر اولویت" : e.kind === "rating" ? "امتیاز رضایت" : (ticketKindLabel[e.kind] ?? e.kind);
          out.push({ id: `tk-${tic.id}-${e.id}`, module: "tickets", at, sort: e.at, day: Math.floor(e.at / 1440), actor: e.actor, action: label, target: `${tic.id} — ${tic.title}`, scopeId: tic.reporterScopeId, detail: e.text });
        })
    );

    // ۶) نظارت شبکه‌ی اجتماعی: تأیید نظرها و حذف محتوا
    const contentById = new Map(s.content.map((c) => [c.id, c]));
    s.comments
      .filter((c) => c.approved && c.approved_by && c.approved_at)
      .forEach((c) => {
        const item = contentById.get(c.entity_id);
        push({ id: `so-c-${c.id}`, module: "social", at: c.approved_at!, actor: userName(c.approved_by), action: "تأیید نظر", target: item ? `${contentKindLabel[item.kind]}: ${item.title}` : `${c.entity_name} ${c.entity_id}`, scopeId: item ? ownerScopeOf(item) : ROOT_ID, detail: c.content });
      });
    [...s.content.map((c) => ({ x: c, label: `${contentKindLabel[c.kind]}: ${c.title}` })), ...s.topics.map((x) => ({ x, label: `پرسش: ${x.title}` })), ...s.events.map((x) => ({ x, label: `رویداد: ${x.title}` }))]
      .filter(({ x }) => x.deleted_at)
      .forEach(({ x, label }) => push({ id: `so-d-${x.id}`, module: "social", at: x.deleted_at!, actor: userName(x.user_id), action: "حذف محتوا", target: label, scopeId: ownerScopeOf(x) }));

    return out;
    // نظارت محتوا: گزارش تخلف، پنهان‌سازی، بازبینی پیش از انتشار
    s.moderationLog.forEach((e) => push({ id: `so-m-${e.id}`, module: "social", at: e.at, actor: userName(e.actor_id), action: moderationActionLabel[e.action], target: e.target_title, scopeId: ROOT_ID, detail: e.note }));
  }, [t.iam, km.logs, km.docs, pm.projects, inn, tk, s.content, s.comments, s.topics, s.events, s.moderationLog]);

  // دامنه‌ی بیننده: فقط واحد فعلی و زیرمجموعه‌ها
  const inScope = useMemo(() => all.filter((e) => sub.ids.has(e.scopeId)), [all, sub]);
  const actors = useMemo(() => [...new Set(inScope.map((e) => e.actor))].sort((a, b) => a.localeCompare(b, "fa")), [inScope]);
  const rows = useMemo(() => {
    const scopeSet = scopeF ? new Set(descendantsOrSelf(t.iam, scopeF).map((n) => n.id)) : null;
    const fromN = from ? dayNum(from) ?? 0 : 0;
    const toN = to ? dayNum(to) ?? 9e9 : 9e9;
    const term = q.trim();
    return inScope
      .filter((e) => !modF || e.module === modF)
      .filter((e) => !actorF || e.actor === actorF)
      .filter((e) => !scopeSet || scopeSet.has(e.scopeId))
      .filter((e) => e.day >= fromN && e.day <= toN)
      .filter((e) => !term || e.action.includes(term) || e.target.includes(term) || e.actor.includes(term))
      .sort((a, b) => b.sort - a.sort);
  }, [inScope, modF, actorF, scopeF, from, to, q, t.iam]);

  const perModule = useMemo(() => Object.fromEntries(MODULES.map((m) => [m.id, inScope.filter((e) => e.module === m.id).length])) as Record<ModuleId, number>, [inScope]);
  const activeFilters = [modF, actorF, scopeF, from, to].filter(Boolean).length;

  const exportCsv = () => {
    downloadCsv(
      `audit-all-${t.today.replace(/\//g, "-")}.csv`,
      ["زمان", "ماژول", "انجام‌دهنده", "اقدام", "موضوع", "واحد", "جزئیات"],
      rows.map((e) => [e.at, modMeta[e.module].label, e.actor, e.action, e.target, t.scopePath(e.scopeId), e.detail ?? ""])
    );
    notify(`${rows.length.toLocaleString("fa-IR")} رویداد در فایل CSV ذخیره شد.`, "success");
  };

  if (!allowed)
    return (
      <div>
        <SectionHead icon={<Layers size={18} />} title="لاگ ممیزی یکپارچه" />
        <div className="card">
          <EmptyState icon={<Lock size={22} />} title="به لاگ ممیزی دسترسی ندارید" description="مشاهده‌ی لاگ ممیزی نیازمند مجوز «iam.audit.view» در واحد فعلی است." />
        </div>
      </div>
    );

  return (
    <div>
      <SectionHead
        icon={<Layers size={18} />}
        title="لاگ ممیزی یکپارچه"
        description={`رویدادهای همه‌ی ماژول‌ها در «${sub.root.name}» و زیرمجموعه‌هایش — ثبت‌شده و غیرقابل ویرایش.`}
        actions={
          <Button icon={<Download size={14} />} onClick={exportCsv} disabled={!rows.length} className="disabled:opacity-45">
            خروجی CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 mb-3">
        {MODULES.map((m) => (
          <button key={m.id} onClick={() => setModF(modF === m.id ? "" : m.id)} className={`text-right rounded-xl ${modF === m.id ? "ring-2 ring-brand-500" : ""}`} aria-pressed={modF === m.id}>
            <StatCard label={m.label} value={perModule[m.id].toLocaleString("fa-IR")} />
          </button>
        ))}
      </div>

      <div className="card p-3 mb-3">
        <div className="flex gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="جستجو در اقدام، موضوع و افراد…" className="flex-1 min-w-0" />
          <Button icon={<Filter size={14} />} onClick={() => setShowFilters((x) => !x)} variant={showFilters || activeFilters ? "primary" : "secondary"}>
            فیلتر{activeFilters ? ` (${activeFilters.toLocaleString("fa-IR")})` : ""}
          </Button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-2 pt-2 border-t border-ink-100">
            <select className="input-field" value={modF} onChange={(e) => setModF(e.target.value as ModuleId | "")} aria-label="ماژول">
              <option value="">همه‌ی ماژول‌ها</option>
              {MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <select className="input-field" value={actorF} onChange={(e) => setActorF(e.target.value)} aria-label="انجام‌دهنده">
              <option value="">همه‌ی انجام‌دهندگان</option>
              {actors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <ScopeSelect value={scopeF} onChange={setScopeF} nodes={sub.nodes} allLabel="همه‌ی واحدها" />
            <JalaliDatePicker value={from} onChange={setFrom} placeholder="از تاریخ" />
            <JalaliDatePicker value={to} onChange={setTo} placeholder="تا تاریخ" />
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setModF("");
                  setActorF("");
                  setScopeF("");
                  setFrom("");
                  setTo("");
                }}
                className="text-[12px] text-ink-500 hover:text-ink-800 justify-self-start"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="hidden lg:grid grid-cols-[20px_130px_120px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,2fr)] gap-3 px-4 py-2 bg-ink-50 border-b border-ink-100 text-[11px] font-bold text-ink-500">
          <span />
          <span>زمان</span>
          <span>ماژول</span>
          <span>انجام‌دهنده</span>
          <span>اقدام</span>
          <span>موضوع</span>
        </div>
        {rows.length === 0 && <EmptyState icon={<FileClock size={22} />} title="رویدادی پیدا نشد" description="فیلترها را تغییر دهید." />}
        <ul className="divide-y divide-ink-100">
          {rows.slice(0, limit).map((e) => {
            const isOpen = open === e.id;
            return (
              <li key={e.id}>
                <button onClick={() => setOpen(isOpen ? null : e.id)} className="w-full text-right px-4 py-2.5 hover:bg-ink-50/60 grid grid-cols-1 lg:grid-cols-[20px_130px_120px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,2fr)] gap-x-3 gap-y-1 items-start">
                  <span className="hidden lg:block text-ink-400 pt-0.5">{isOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}</span>
                  <span className="text-[11.5px] text-ink-500 tabular-nums">{e.at}</span>
                  <span>
                    <Badge tone={modMeta[e.module].tone}>{modMeta[e.module].label}</Badge>
                  </span>
                  <span className="text-[12.5px] text-ink-800 truncate">{e.actor}</span>
                  <span className="text-[12.5px] font-medium text-ink-800 break-words">{e.action}</span>
                  <span className="text-[12px] text-ink-600 break-words line-clamp-2">{e.target}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 lg:pr-[46px] text-[12px] text-ink-600 space-y-1">
                    <p>
                      <span className="text-ink-400">واحد: </span>
                      {t.scopePath(e.scopeId)}
                    </p>
                    {e.detail && <pre className="whitespace-pre-wrap break-words font-sans bg-ink-50 rounded-md p-2 text-[11.5px] text-ink-600">{e.detail}</pre>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {rows.length > limit && (
          <div className="p-3 text-center border-t border-ink-100">
            <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
              نمایش بیشتر ({(rows.length - limit).toLocaleString("fa-IR")} رویداد دیگر)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
