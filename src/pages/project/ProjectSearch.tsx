import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search, ListTodo, Users, MessageSquare, FileText, Video, ScrollText, ShieldAlert, Bug, Gavel, Flag, X, CornerDownLeft } from "lucide-react";
import { fa } from "../../pm/jalali";
import { findTask } from "../../pm/selectors";
import { useProjectPage, type TabId } from "./shared";
import { TaskKey, TypeIcon } from "./taskTypes";
import type { PMTask } from "../../pm/types";

type Hit = { id: string; title: string; sub?: string; tab: TabId; entity?: string; task?: PMTask };
type Group = { id: string; label: string; icon: ReactNode; hits: Hit[] };

const norm = (s: string) => s.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ");

/** جستجوی یکپارچه‌ی درون‌پروژه (بند ۴۰ سند): تسک، عضو، پیام، فایل، جلسه، صورت‌جلسه، ریسک، مشکل، تصمیم */
export default function ProjectSearch() {
  const { p, goTab, openTask } = useProjectPage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // میانبر «/» برای باز کردن جستجوی پروژه
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && !open && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else setQ("");
  }, [open]);

  const groups: Group[] = useMemo(() => {
    const term = norm(q.trim());
    if (term.length < 2) return [];
    const has = (...xs: (string | undefined)[]) => xs.some((x) => x && norm(x).includes(term));
    const exact = findTask(p, q.trim());
    const tasks = p.tasks.filter((t) => has(t.title, t.key, t.description, t.labels.join(" "), t.assignee)).sort((a, b) => Number(b.id === exact?.id) - Number(a.id === exact?.id));
    const msgs = p.channels.flatMap((c) => c.messages.filter((m) => has(m.text, m.fileName, m.author)).map((m) => ({ c, m })));
    const out: Group[] = [
      { id: "tasks", label: "تسک‌ها", icon: <ListTodo size={13} />, hits: tasks.map((t) => ({ id: t.id, title: t.title, sub: `${t.assignee} · ${t.due}${t.archived ? " · بایگانی" : ""}`, tab: "board", task: t })) },
      { id: "members", label: "اعضا", icon: <Users size={13} />, hits: p.members.filter((m) => has(m.name, m.title, m.role)).map((m) => ({ id: m.id, title: m.name, sub: `${m.title} · ${m.role}`, tab: "team", entity: m.id })) },
      { id: "messages", label: "پیام‌ها", icon: <MessageSquare size={13} />, hits: msgs.map(({ c, m }) => ({ id: m.id, title: m.text.length > 80 ? `${m.text.slice(0, 80)}…` : m.text, sub: `#${c.name} · ${m.author} · ${m.at}`, tab: "communication", entity: m.id })) },
      { id: "files", label: "فایل‌ها و اسناد", icon: <FileText size={13} />, hits: p.documents.filter((d) => has(d.name, d.type, d.uploadedBy)).map((d) => ({ id: d.id, title: d.name, sub: `${d.type} · نسخه‌ی ${fa(d.version)} · ${d.date}`, tab: "documents", entity: d.id })) },
      { id: "meetings", label: "جلسات", icon: <Video size={13} />, hits: p.meetings.filter((m) => has(m.title, m.description, m.participants.join(" "))).map((m) => ({ id: m.id, title: m.title, sub: `${m.date} ساعت ${m.time} · ${m.mode} · ${m.status}`, tab: "minutes", entity: m.id })) },
      { id: "minutes", label: "صورت‌جلسات و مصوبات", icon: <ScrollText size={13} />, hits: p.minutes.filter((m) => has(m.title, (m.topics ?? []).join(" "), (m.decisionList ?? []).join(" "), (m.actions ?? []).map((a) => a.text).join(" "))).map((m) => ({ id: m.id, title: m.title, sub: `${m.date} · ${fa(m.decisions)} مصوبه`, tab: "minutes", entity: m.id })) },
      { id: "decisions", label: "دفتر تصمیمات", icon: <Gavel size={13} />, hits: (p.decisions ?? []).filter((d) => has(d.title, d.reason, d.owner)).map((d) => ({ id: d.id, title: d.title, sub: `${d.owner} · ${d.date}`, tab: "decisions", entity: d.id })) },
      { id: "risks", label: "ریسک‌ها", icon: <ShieldAlert size={13} />, hits: p.risks.filter((r) => has(r.title, r.mitigation, r.owner)).map((r) => ({ id: r.id, title: r.title, sub: `${r.severity} · ${r.status} · ${r.owner}`, tab: "risks", entity: r.id })) },
      { id: "issues", label: "مشکلات", icon: <Bug size={13} />, hits: p.issues.filter((i) => has(i.title, i.description)).map((i) => ({ id: i.id, title: i.title, sub: `${i.status} · ${i.assignee}`, tab: "issues", entity: i.id })) },
      { id: "milestones", label: "مایل‌ستون‌ها", icon: <Flag size={13} />, hits: p.milestones.filter((m) => has(m.title, m.owner)).map((m) => ({ id: m.id, title: m.title, sub: `${m.due} · ${m.status}`, tab: "milestones", entity: m.id })) },
    ];
    return out.filter((g) => g.hits.length);
  }, [q, p]);

  const flat = groups.flatMap((g) => g.hits.slice(0, 6));
  const total = groups.reduce((s, g) => s + g.hits.length, 0);
  const go = (h: Hit) => {
    setOpen(false);
    if (h.task) {
      goTab("board");
      setTimeout(() => openTask(h.task!.id), 0);
    } else goTab(h.tab, h.entity);
  };

  const mark = (text: string) => {
    const t = q.trim();
    const i = t.length >= 2 ? norm(text).indexOf(norm(t)) : -1;
    if (i < 0) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="bg-amber-500/20 text-inherit rounded px-0.5">{text.slice(i, i + t.length)}</mark>
        {text.slice(i + t.length)}
      </>
    );
  };

  let idx = -1;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="جستجو در همین پروژه (میانبر: /)"
        aria-label="جستجو در پروژه"
        className="h-9 rounded-lg border border-ink-200 bg-white text-ink-500 hover:text-ink-800 flex items-center gap-2 px-2.5 md:w-52"
      >
        <Search size={15} />
        <span className="hidden md:inline text-xs text-ink-400 flex-1 text-right">جستجو در پروژه…</span>
        <kbd className="hidden md:inline text-[10px] font-mono bg-ink-100 rounded px-1 text-ink-500">/</kbd>
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]" dir="rtl">
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-ink-200 flex flex-col max-h-[75vh]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100">
                <Search size={16} className="text-ink-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setCursor(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setCursor((c) => Math.min(flat.length - 1, c + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setCursor((c) => Math.max(0, c - 1));
                    } else if (e.key === "Enter" && flat[cursor]) go(flat[cursor]);
                  }}
                  placeholder={`جستجو در «${p.meta.name}» — تسک، کلید (${p.meta.key ?? "QGJ"}-۳)، عضو، پیام، فایل، جلسه…`}
                  className="flex-1 bg-transparent outline-none text-sm text-ink-900 placeholder:text-ink-400 min-w-0"
                />
                <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg hover:bg-ink-100 flex items-center justify-center shrink-0" aria-label="بستن">
                  <X size={15} />
                </button>
              </div>
              <div className="overflow-y-auto p-2">
                {q.trim().length < 2 ? (
                  <p className="text-xs text-ink-400 p-4 text-center leading-6">حداقل دو حرف بنویسید. همه‌ی تسک‌ها، اعضا، پیام‌های کانال‌ها، فایل‌ها، جلسات، صورت‌جلسات، تصمیمات، ریسک‌ها و مشکلات همین پروژه جستجو می‌شوند.</p>
                ) : groups.length === 0 ? (
                  <p className="text-xs text-ink-400 p-4 text-center">نتیجه‌ای برای «{q}» پیدا نشد.</p>
                ) : (
                  groups.map((g) => (
                    <div key={g.id} className="mb-1">
                      <p className="text-[11px] font-bold text-ink-500 px-2 pt-2 pb-1 flex items-center gap-1.5">
                        {g.icon} {g.label} <span className="font-normal text-ink-400">({fa(g.hits.length)})</span>
                      </p>
                      {g.hits.slice(0, 6).map((h) => {
                        idx += 1;
                        const me = idx;
                        return (
                          <button
                            key={h.id}
                            onMouseEnter={() => setCursor(me)}
                            onClick={() => go(h)}
                            className={`w-full text-right rounded-lg px-2.5 py-2 flex items-center gap-2 ${cursor === me ? "bg-brand-50" : "hover:bg-ink-50"}`}
                          >
                            {h.task && <TypeIcon type={h.task.type} />}
                            {h.task && <TaskKey t={h.task} />}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] text-ink-900 truncate">{mark(h.title)}</span>
                              {h.sub && <span className="block text-[11px] text-ink-400 truncate">{h.sub}</span>}
                            </span>
                            {cursor === me && <CornerDownLeft size={13} className="text-ink-400 shrink-0" />}
                          </button>
                        );
                      })}
                      {g.hits.length > 6 && <p className="text-[10.5px] text-ink-400 px-2.5">و {fa(g.hits.length - 6)} مورد دیگر…</p>}
                    </div>
                  ))
                )}
              </div>
              {total > 0 && <p className="text-[10.5px] text-ink-400 border-t border-ink-100 px-4 py-2">{fa(total)} نتیجه · ↑↓ برای حرکت، Enter برای باز کردن</p>}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
