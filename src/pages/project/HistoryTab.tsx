import { useMemo, useState } from "react";
import { Bot, ChevronDown, Download, FileJson, History, Search, BookOpen, User } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useProjectsPM } from "../../context/ProjectsContext";
import { EVENT_CATALOG, apiStateLabel, categoryLabel, channelLabel, eventByCode, recipientLabel, type EventCategory } from "../../pm/events";
import { SYSTEM_ACTOR } from "../../pm/seed";
import { dayNum, fa } from "../../pm/jalali";
import { downloadText, tabForCategory, toCsv, useProjectPage } from "./shared";

const catTone: Record<EventCategory, BadgeTone> = {
  project: "navy",
  member: "brand",
  task: "brand",
  dependency: "brand",
  board: "neutral",
  expense: "warning",
  budget: "warning",
  risk: "danger",
  issue: "danger",
  milestone: "success",
  meeting: "neutral",
  document: "neutral",
  communication: "neutral",
  time: "neutral",
  playbook: "success",
  automation: "neutral",
};
const apiTone = { implemented: "success", requested: "brand", proposed: "warning" } as const;

export default function HistoryTab() {
  const { p, openTask, goTab } = useProjectPage();
  const { store } = useProjectsPM();
  const [view, setView] = useState<"log" | "catalog">("log");
  const [cat, setCat] = useState<EventCategory | "">("");
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [source, setSource] = useState<"" | "user" | "system">("");
  const [from, setFrom] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const logs = useMemo(() => {
    let ls = [...p.logs].sort((a, b) => b.seq - a.seq);
    if (cat) ls = ls.filter((l) => eventByCode[l.event]?.category === cat);
    if (actor) ls = ls.filter((l) => l.actor === actor);
    if (source === "system") ls = ls.filter((l) => l.actor === SYSTEM_ACTOR);
    if (source === "user") ls = ls.filter((l) => l.actor !== SYSTEM_ACTOR);
    if (q) ls = ls.filter((l) => l.description.includes(q) || l.event.includes(q.toUpperCase()));
    if (from) {
      const f = dayNum(from);
      if (f !== null) ls = ls.filter((l) => (dayNum(l.date) ?? 0) >= f);
    }
    return ls;
  }, [p.logs, cat, actor, q, source, from]);

  const byDate = useMemo(() => {
    const m = new Map<string, typeof logs>();
    logs.forEach((l) => m.set(l.date, [...(m.get(l.date) ?? []), l]));
    return [...m.entries()];
  }, [logs]);

  const catCounts = useMemo(() => {
    const m = new Map<EventCategory, number>();
    p.logs.forEach((l) => {
      const c = eventByCode[l.event]?.category;
      if (c) m.set(c, (m.get(c) ?? 0) + 1);
    });
    return m;
  }, [p.logs]);

  const actors = [...new Set(p.logs.map((l) => l.actor))];

  const apiShape = (l: (typeof logs)[number]) => ({
    id: l.seq,
    user_id: l.actor === SYSTEM_ACTOR ? null : l.actor,
    event_category: l.event,
    description: l.description,
    metadata: { ...l.metadata, ...(l.entity ? { entity_type: l.entity.type, entity_id: l.entity.id } : {}) },
    created_at: `${l.date} ${l.time}`,
  });

  const exportCsv = () =>
    downloadText(
      `history-${p.meta.id}.csv`,
      toCsv([["تاریخ", "ساعت", "کد رویداد", "دسته", "انجام‌دهنده", "شرح", "متادیتا"], ...logs.map((l) => [l.date, l.time, l.event, categoryLabel[eventByCode[l.event]?.category ?? "project"], l.actor, l.description, JSON.stringify(l.metadata)])])
    );
  const exportJson = () => downloadText(`history-${p.meta.id}.json`, JSON.stringify(logs.map(apiShape), null, 2), "application/json");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden">
          <button onClick={() => setView("log")} className={`px-3 py-1.5 text-xs flex items-center gap-1 ${view === "log" ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
            <History size={13} /> تاریخچه‌ی رویدادها ({fa(p.logs.length)})
          </button>
          <button onClick={() => setView("catalog")} className={`px-3 py-1.5 text-xs flex items-center gap-1 ${view === "catalog" ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
            <BookOpen size={13} /> کاتالوگ رویدادها ({fa(EVENT_CATALOG.length)})
          </button>
        </div>
        {view === "log" && (
          <>
            <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={exportCsv} className="mr-auto">
              خروجی CSV
            </Button>
            <Button size="sm" variant="secondary" icon={<FileJson size={13} />} onClick={exportJson}>
              خروجی JSON (شکل API)
            </Button>
          </>
        )}
      </div>

      {view === "log" ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCat("")} className={`text-xs px-2.5 py-1 rounded-md border ${!cat ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
              همه ({fa(p.logs.length)})
            </button>
            {[...catCounts.entries()].map(([c, n]) => (
              <button key={c} onClick={() => setCat(c)} className={`text-xs px-2.5 py-1 rounded-md border ${cat === c ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
                {categoryLabel[c]} ({fa(n)})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در شرح یا کد رویداد…" className="input-field !py-1.5 !pr-8 !text-xs w-56" />
            </div>
            <select value={actor} onChange={(e) => setActor(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
              <option value="">همه‌ی افراد</option>
              {actors.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value as "" | "user" | "system")} className="input-field !py-1.5 !text-xs !w-auto">
              <option value="">کاربر و سامانه</option>
              <option value="user">فقط اقدامات کاربران</option>
              <option value="system">فقط رویدادهای خودکار سامانه</option>
            </select>
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="از تاریخ ۱۴۰۵/۰۳/۰۱" className="input-field !py-1.5 !text-xs w-40" />
            <span className="text-xs text-ink-400">{fa(logs.length)} رویداد</span>
          </div>

          <div className="card p-4">
            {byDate.map(([date, items]) => (
              <div key={date} className="mb-5 last:mb-0">
                <p className="text-xs font-bold text-ink-600 mb-2 sticky top-16 bg-white py-1 z-[1]">{date}</p>
                <div className="border-r-2 border-ink-100 pr-4 space-y-3">
                  {items.map((l) => {
                    const def = eventByCode[l.event];
                    const sys = l.actor === SYSTEM_ACTOR;
                    const isOpen = open === l.id;
                    const sent = store.notifications.filter((n) => n.projectId === p.meta.id && n.event === l.event && n.text === l.description && n.date === l.date);
                    return (
                      <div key={l.id} className="relative">
                        <span className={`absolute -right-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${sys ? "bg-amber-500" : "bg-brand-500"}`} />
                        <div className="flex items-start gap-2">
                          <span className="w-7 h-7 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">{sys ? <Bot size={13} /> : <User size={13} />}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-ink-900 leading-6">{l.description}</p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span dir="ltr" className="font-mono text-[10.5px] bg-ink-100 text-ink-700 rounded px-1.5 py-0.5">
                                {l.event}
                              </span>
                              {def && <Badge tone={catTone[def.category]}>{categoryLabel[def.category]}</Badge>}
                              <span className="text-[11px] text-ink-400">
                                {l.actor} · ساعت {l.time}
                              </span>
                              {sent.length > 0 && <span className="text-[11px] text-brand-700">· {fa(sent.length)} اعلان ارسال شد</span>}
                              <button onClick={() => setOpen(isOpen ? null : l.id)} className="text-[11px] text-ink-400 hover:text-brand-700 flex items-center gap-0.5">
                                جزئیات <ChevronDown size={11} className={isOpen ? "rotate-180" : ""} />
                              </button>
                            </div>
                            {isOpen && (
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="bg-ink-50 rounded-lg p-2.5 text-[11px] space-y-1">
                                  <p className="font-bold text-ink-700 mb-1">متادیتا</p>
                                  {Object.entries(l.metadata).map(([k, v]) => (
                                    <p key={k} className="flex justify-between gap-2">
                                      <span dir="ltr" className="font-mono text-ink-500">
                                        {k}
                                      </span>
                                      <span className="text-ink-800">{String(v)}</span>
                                    </p>
                                  ))}
                                  {Object.keys(l.metadata).length === 0 && <p className="text-ink-400">—</p>}
                                  {l.entity && (
                                    <button
                                      className="text-brand-700 hover:underline mt-1"
                                      onClick={() => (l.entity!.type === "task" && p.tasks.some((t) => t.id === l.entity!.id) ? openTask(l.entity!.id) : goTab(tabForCategory[def?.category ?? "project"] ?? "overview", l.entity!.id))}
                                    >
                                      رفتن به {l.entity.type}
                                    </button>
                                  )}
                                  {sent.length > 0 && (
                                    <div className="pt-1.5 mt-1.5 border-t border-ink-200">
                                      <p className="font-bold text-ink-700 mb-1">گیرندگان اعلان</p>
                                      {sent.map((n) => (
                                        <p key={n.id} className="text-ink-600">
                                          {n.recipient} <span className="text-ink-400">({n.reason} · {n.channels.map((c) => channelLabel[c]).join("، ")})</span>
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <pre dir="ltr" className="bg-navy-900 text-emerald-200 rounded-lg p-2.5 text-[10.5px] overflow-x-auto leading-5">
                                  {JSON.stringify(apiShape(l), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-center text-xs text-ink-400 py-8">رویدادی با این فیلترها پیدا نشد.</p>}
          </div>
        </>
      ) : (
        <Catalog />
      )}
    </div>
  );
}

function Catalog() {
  const [cat, setCat] = useState<EventCategory | "">("");
  const [api, setApi] = useState("");
  const list = EVENT_CATALOG.filter((e) => (!cat || e.category === cat) && (!api || e.api === api));
  return (
    <div className="space-y-3">
      <div className="card p-4 text-xs text-ink-600 leading-6">
        هر تغییر در پروژه یک <b>رویداد</b> با کد ثابت تولید می‌کند (همان <span dir="ltr" className="font-mono">event_category</span> در API <span dir="ltr" className="font-mono">/projects/{"{id}"}/activity_logs/</span>). سامانه آن را خودکار در تاریخچه ثبت می‌کند و بر اساس ستون «اعلان» تصمیم می‌گیرد به چه کسی، از چه کانالی و با چه اولویتی خبر بدهد. انجام‌دهنده‌ی کار هرگز برای کار خودش اعلان نمی‌گیرد.
        <div className="flex gap-3 mt-2 flex-wrap">
          <Badge tone="success">{apiStateLabel.implemented}</Badge>
          <Badge tone="brand">{apiStateLabel.requested} (باید پیاده شود)</Badge>
          <Badge tone="warning">{apiStateLabel.proposed} (پیشنهاد این نسخه)</Badge>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <select value={cat} onChange={(e) => setCat(e.target.value as EventCategory)} className="input-field !py-1.5 !text-xs !w-auto">
          <option value="">همه‌ی دسته‌ها</option>
          {(Object.keys(categoryLabel) as EventCategory[]).map((c) => (
            <option key={c} value={c}>
              {categoryLabel[c]}
            </option>
          ))}
        </select>
        <select value={api} onChange={(e) => setApi(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
          <option value="">همه‌ی وضعیت‌ها</option>
          {Object.entries(apiStateLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-400 self-center">{fa(list.length)} رویداد</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-xs min-w-[980px]">
          <thead>
            <tr className="text-ink-400 border-b border-ink-100 text-right">
              <th className="p-2.5 font-medium">کد رویداد</th>
              <th className="p-2.5 font-medium">شرح / نمونه‌ی متن فارسی لاگ</th>
              <th className="p-2.5 font-medium">منشأ</th>
              <th className="p-2.5 font-medium">API</th>
              <th className="p-2.5 font-medium">گیرندگان اعلان</th>
              <th className="p-2.5 font-medium">کانال / اولویت</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.code} className="border-b border-ink-100 align-top">
                <td className="p-2.5">
                  <span dir="ltr" className="font-mono text-[11px] text-ink-800">
                    {e.code}
                  </span>
                  <p className="text-[10.5px] text-ink-400 mt-0.5">{categoryLabel[e.category]}</p>
                </td>
                <td className="p-2.5 leading-5">
                  <p className="text-ink-900 font-medium">{e.label}</p>
                  <p className="text-ink-500">«{e.sample}»</p>
                  {"en" in e && e.en && (
                    <p dir="ltr" className="text-[10.5px] text-ink-400 text-left">
                      {e.en}
                    </p>
                  )}
                  {"why" in e && e.why && <p className="text-[10.5px] text-brand-700 mt-0.5">چرا: {e.why}</p>}
                </td>
                <td className="p-2.5 text-ink-600 whitespace-nowrap">{e.trigger === "system" ? "خودکار (سامانه)" : "اقدام کاربر"}</td>
                <td className="p-2.5">
                  <Badge tone={apiTone[e.api]}>{apiStateLabel[e.api]}</Badge>
                </td>
                <td className="p-2.5 text-ink-700 leading-5">{e.notify ? e.notify.recipients.map((r) => recipientLabel[r]).join("، ") : <span className="text-ink-400">فقط ثبت در تاریخچه</span>}</td>
                <td className="p-2.5 text-ink-600 leading-5">
                  {e.notify ? (
                    <>
                      {e.notify.channels.map((c) => channelLabel[c]).join("، ")}
                      <br />
                      <Badge tone={e.notify.priority === "فوری" ? "danger" : e.notify.priority === "مهم" ? "warning" : "neutral"}>{e.notify.priority}</Badge>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
