// «مدیریت سامانه» (منوی «تنظیمات سامانه») — همه‌ی تنظیمات در یک جا، به تفکیک ماژول: گروه ← بخش ← زبانه‌ی داخلی
// (ساختار در settingsConfig.tsx). هر بخش و زبانه مجوز جداگانه دارد؛ هر مدیر فقط بخش‌هایی را می‌بیند
// که در کانتکست فعلی اختیارش را دارد. نشانی: ?section=<بخش>&tab=<زبانه>؛ شناسه‌های قدیمی نگاشت می‌شوند.
import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, Eye, Search, Settings as SettingsIcon, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import { useTenancy } from "../../context/TenancyContext";
import { usePendingAccessRequests } from "../../iam/hooks";
import { ScopeSelect } from "./iam/shared";
import { ADMIN_PERMS, ROOT_ID, descendantsOrSelf } from "../../iam/model";
import { legacySectionMap, settingsGroups, type CountCtx, type SettingsGroupDef, type SettingsSectionDef, type SettingsTabDef } from "./settingsConfig";

/** مجوزهایی که «مدیریت تنظیمات» در یک واحد را ممکن می‌کنند (برای انتخابگر واحد تحت مدیریت) */
const SETTINGS_PERMS = [...ADMIN_PERMS, "settings.branding", "settings.security", "settings.pages", "iam.audit.view", "iam.review.manage"];
const NAV_KEY = "motoshub.settingsNav.v1";

/** یکسان‌سازی برای جستجو: ی/ک عربی، نیم‌فاصله و فاصله‌های اضافه */
const norm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

type Hit = { section: SettingsSectionDef; tab?: SettingsTabDef; group: string };

function loadCollapsed(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(NAV_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function Settings() {
  const t = useTenancy();
  const { hasPermission, contextNode, scopePath, contextId, readOnly } = t;
  const pending = usePendingAccessRequests().count;
  const counts: CountCtx = { pendingRequests: pending };
  // واحدهایی که کاربر می‌تواند تنظیماتشان را مدیریت کند (انتخاب = ایستادن در آن واحد)
  const adminNodes = useMemo(() => {
    const ids = new Set(t.reachable.filter((n) => SETTINGS_PERMS.some((p) => t.canAdmin(n.id, p))).map((n) => n.id));
    return descendantsOrSelf(t.iam, ROOT_ID).filter((n) => ids.has(n.id));
  }, [t]);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>(loadCollapsed);

  const allowed = (perms?: string[]) => !perms?.length || perms.some((p) => hasPermission(p));
  const visible: SettingsGroupDef[] = settingsGroups
    .map((g) => ({
      ...g,
      sections: g.sections
        .filter((s) => allowed(s.perms))
        .map((s) => (s.tabs ? { ...s, tabs: s.tabs.filter((tb) => allowed(tb.perms)) } : s))
        .filter((s) => !s.tabs || s.tabs.length > 0),
    }))
    .filter((g) => g.sections.length);
  const all = visible.flatMap((g) => g.sections);

  // نگاشت شناسه‌ی قدیمی → بخش/زبانه‌ی جدید
  const rawSection = params.get("section");
  const legacy = rawSection && !all.some((s) => s.id === rawSection) ? legacySectionMap[rawSection] : undefined;
  const current = all.find((s) => s.id === (legacy?.section ?? rawSection)) ?? all[0];
  const rawTab = params.get("tab");
  const tabs = current?.tabs;
  const currentTab = tabs ? (tabs.find((x) => x.id === rawTab) ?? tabs.find((x) => x.id === legacy?.tab) ?? tabs[0]) : undefined;
  // برای بخش‌های بی‌زبانه، tab به خود بخش داده می‌شود (مثلاً پیش‌تنظیم لاگ ممیزی)
  const passTab = tabs ? currentTab?.id ?? null : rawTab ?? legacy?.tab ?? null;
  const currentGroup = visible.find((g) => g.sections.some((s) => s.id === current?.id))?.id;

  useEffect(() => {
    if (!legacy || !current) return;
    const next = new URLSearchParams(params);
    next.set("section", current.id);
    const tb = tabs ? currentTab?.id : legacy.tab;
    if (tb) next.set("tab", tb);
    else next.delete("tab");
    setParams(next, { replace: true });
  }, [rawSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // گروه بخش فعلی هنگام ورود/جابه‌جایی باز می‌شود (بعد از آن کاربر می‌تواند ببندد)
  useEffect(() => {
    if (currentGroup && collapsed.includes(currentGroup)) setCollapsed((prev) => prev.filter((x) => x !== currentGroup));
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id: string, tab?: string) => {
    const next = new URLSearchParams(params);
    next.set("section", id);
    if (tab) next.set("tab", tab);
    else next.delete("tab");
    if (id !== current?.id) next.delete("social_tab");
    setParams(next, { replace: true });
  };
  const toggleGroup = (id: string) =>
    setCollapsed((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(NAV_KEY, JSON.stringify(next));
      } catch {
        /* نادیده */
      }
      return next;
    });

  // جستجو در برچسب بخش‌ها، زبانه‌ها و فیلدهای داخلی
  const hits: Hit[] = useMemo(() => {
    const term = norm(q);
    if (!term) return [];
    const has = (xs: (string | undefined)[]) => xs.some((x) => x && norm(x).includes(term));
    const out: Hit[] = [];
    visible.forEach((g) =>
      g.sections.forEach((s) => {
        if (has([s.label, g.title, ...(s.keywords ?? [])])) out.push({ section: s, group: g.title });
        (s.tabs ?? []).filter((tb) => has([tb.label, ...(tb.keywords ?? [])])).forEach((tb) => out.push({ section: s, tab: tb, group: g.title }));
      })
    );
    return out;
  }, [q, visible]);

  const badge = (n?: number, active?: boolean) =>
    n ? <span className={`mr-auto text-[10px] rounded-full px-1.5 ${active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>{n.toLocaleString("fa-IR")}</span> : null;

  const searchBox = (
    <div className="relative">
      <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در تنظیمات" aria-label="جستجو در تنظیمات" className="input-field pr-8 pl-8" />
      {q && (
        <button type="button" onClick={() => setQ("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700" aria-label="پاک کردن جستجو">
          <X size={14} />
        </button>
      )}
    </div>
  );
  const hitList = (
    <div className="space-y-0.5">
      {hits.length === 0 && <p className="text-[12px] text-ink-400 px-2.5 py-2">موردی پیدا نشد.</p>}
      {hits.map((h) => {
        const active = current?.id === h.section.id && (!h.tab || currentTab?.id === h.tab.id);
        return (
          <button
            key={`${h.section.id}-${h.tab?.id ?? ""}`}
            onClick={() => go(h.section.id, h.tab?.id)}
            className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md text-right ${active ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50"}`}
          >
            <h.section.icon size={15} className="shrink-0 mt-0.5" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium truncate">{h.tab ? `${h.section.label} › ${h.tab.label}` : h.section.label}</span>
              <span className={`block text-[10.5px] ${active ? "text-white/70" : "text-ink-400"}`}>{h.group}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  // «تنظیمات پروژه» از ۱۴۰۵/۰۷ صفحه‌ی مستقل در منوی «پروژه و فعالیت‌ها» است
  if (rawSection === "projects") return <Navigate to="/dashboard/project-settings" replace />;

  return (
    <div>
      <PageHeader
        title="مدیریت سامانه"
        description={`در حال مدیریت: ${scopePath(contextId)} — هر بخش فقط برای کسانی دیده می‌شود که در این واحد اختیارش را دارند.`}
        icon={<SettingsIcon size={18} />}
        actions={
          adminNodes.length > 1 ? (
            <ScopeSelect value={adminNodes.some((n) => n.id === contextId) ? contextId : ""} onChange={(id) => id && t.setContext(id)} nodes={adminNodes} allLabel={adminNodes.some((n) => n.id === contextId) ? undefined : "واحد تحت مدیریت…"} className="w-full sm:w-72" ariaLabel="واحد تحت مدیریت" />
          ) : undefined
        }
      />
      {readOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          <Eye size={14} className="shrink-0" /> حالت فقط‌خواندنی (مشاهده به‌عنوان کاربر) — هیچ تنظیمی قابل تغییر نیست.
        </div>
      )}
      {/* موبایل */}
      <div className="lg:hidden mb-4 space-y-2">
        {searchBox}
        {q ? (
          <div className="card p-1.5">{hitList}</div>
        ) : (
          <select className="input-field" value={current?.id} onChange={(e) => go(e.target.value)} aria-label="بخش تنظیمات">
            {visible.map((g) => (
              <optgroup key={g.id} label={g.title}>
                {g.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {s.count?.(counts) ? ` (${s.count(counts)!.toLocaleString("fa-IR")})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
        <nav className="hidden lg:block card p-2 h-fit sticky top-20 space-y-1 max-h-[calc(100vh-6rem)] overflow-y-auto" aria-label="بخش‌های تنظیمات">
          <div className="p-1 pb-2">{searchBox}</div>
          {q
            ? hitList
            : visible.map((g) => {
                const open = !collapsed.includes(g.id);
                const single = g.sections.length === 1 && g.sections[0].label === g.title;
                if (single) {
                  const s = g.sections[0];
                  const active = current?.id === s.id;
                  return (
                    <button key={g.id} onClick={() => go(s.id)} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-right ${active ? "bg-navy-900 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
                      <s.icon size={15} className="shrink-0" />
                      <span className="truncate">{s.label}</span>
                      {badge(s.count?.(counts), active)}
                    </button>
                  );
                }
                return (
                  <div key={g.id}>
                    <button type="button" onClick={() => toggleGroup(g.id)} aria-expanded={open} className="w-full flex items-center gap-1 px-2.5 pt-2 pb-1 text-[10.5px] font-bold text-ink-400 hover:text-ink-600">
                      {open ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
                      {g.title}
                      {!open && <span className="mr-auto font-normal">{g.sections.length.toLocaleString("fa-IR")}</span>}
                    </button>
                    {open &&
                      g.sections.map((s) => {
                        const active = current?.id === s.id;
                        return (
                          <button key={s.id} onClick={() => go(s.id)} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-right ${active ? "bg-navy-900 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
                            <s.icon size={15} className="shrink-0" />
                            <span className="truncate">{s.label}</span>
                            {badge(s.count?.(counts), active)}
                          </button>
                        );
                      })}
                  </div>
                );
              })}
        </nav>
        <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
          {!current && <p className="text-sm text-ink-500">در «{contextNode.name}» به هیچ بخشی از تنظیمات دسترسی ندارید.</p>}
          {current && tabs && tabs.length > 1 && (
            <Tabs tabs={tabs.map((tb) => ({ id: tb.id, label: tb.label, count: tb.count?.(counts) || undefined }))} active={currentTab?.id ?? tabs[0].id} onChange={(id) => go(current.id, id)} />
          )}
          {current && (
            <div key={`${current.id}:${currentTab?.id ?? ""}`}>
              {currentTab ? currentTab.render({ tab: passTab }) : current.render?.({ tab: passTab })}
            </div>
          )}
        </fieldset>
      </div>
    </div>
  );
}
