import { useMemo, useRef, useState } from "react";
import { Hash, Lock, Megaphone, Pin, Plus, Reply, Search, Send, ThumbsUp, Check, Heart, Paperclip, Link2, X } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import { Field, SectionTitle, useProjectPage } from "./shared";

const reactions = [
  { id: "like", icon: ThumbsUp, label: "موافقم" },
  { id: "done", icon: Check, label: "انجام شد" },
  { id: "love", icon: Heart, label: "عالی" },
];

function renderText(text: string) {
  return text.split(/(@[^\s،.,!؟?]+|https?:\/\/\S+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-brand-700 font-medium bg-brand-50 rounded px-0.5">
        {part.replace(/_/g, " ")}
      </span>
    ) : part.startsWith("http") ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="text-brand-700 underline" dir="ltr">
        {part}
      </a>
    ) : (
      part
    )
  );
}

export default function CommunicationTab() {
  const { p, pid, canEdit } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [chId, setChId] = useState(p.channels[0]?.id ?? "");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [newCh, setNewCh] = useState(false);
  const [chName, setChName] = useState("");
  const [chDesc, setChDesc] = useState("");
  const [chMembers, setChMembers] = useState<string[] | "all">("all");
  const [annOpen, setAnnOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annPin, setAnnPin] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ch = p.channels.find((c) => c.id === chId) ?? p.channels[0];
  const msgs = useMemo(() => {
    if (!ch) return [];
    let ms = ch.messages;
    if (pinnedOnly) ms = ms.filter((m) => m.pinned);
    if (q) ms = ms.filter((m) => m.text.includes(q) || m.author.includes(q));
    return ms;
  }, [ch, q, pinnedOnly]);
  const allHits = q ? p.channels.flatMap((c) => c.messages.filter((m) => m.text.includes(q)).map((m) => ({ c, m }))) : [];

  const send = (fileName?: string) => {
    if (!ch || (!text.trim() && !fileName)) return;
    pm.postMessage(pid, ch.id, text.trim() || `فایل «${fileName}» ارسال شد.`, { replyTo: replyTo ?? undefined, fileName });
    setText("");
    setReplyTo(null);
  };

  const insertMention = (name: string) => setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@${name.replace(/ /g, "_")} `);

  return (
    <div className="space-y-5">
      {p.announcements.length > 0 && (
        <div className="card p-4">
          <SectionTitle
            icon={<Megaphone size={15} className="text-amber-600" />}
            title="اطلاعیه‌های پروژه"
            action={
              canEdit && (
                <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setAnnOpen(true)}>
                  اطلاعیه‌ی جدید
                </Button>
              )
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...p.announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned)).map((a) => (
              <div key={a.id} className={`rounded-lg border p-3 ${a.pinned ? "border-amber-200 bg-amber-50/60" : "border-ink-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900 flex items-center gap-1">
                    {a.pinned && <Pin size={12} className="text-amber-600" />}
                    {a.title}
                  </p>
                  {canEdit && (
                    <button onClick={() => confirm({ title: "حذف اطلاعیه؟", onConfirm: () => pm.removeAnnouncement(pid, a.id) })} className="text-ink-300 hover:text-rose-600" aria-label="حذف اطلاعیه">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-ink-600 mt-1 leading-6">{a.body}</p>
                <p className="text-[11px] text-ink-400 mt-1">
                  {a.author} · {a.at}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-[230px_1fr] min-h-[520px]">
        <aside className="border-l border-ink-100 bg-ink-50/50 p-3 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-ink-600">کانال‌های پروژه</p>
            {canEdit && (
              <button onClick={() => setNewCh(true)} className="p-1 text-ink-400 hover:text-brand-600" aria-label="کانال جدید" title="کانال جدید">
                <Plus size={14} />
              </button>
            )}
          </div>
          {p.channels.map((c) => (
            <button key={c.id} onClick={() => setChId(c.id)} className={`w-full text-right px-2 py-1.5 rounded-md text-[13px] flex items-center gap-1.5 ${ch?.id === c.id ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-600 hover:bg-ink-100"}`}>
              {c.members === "all" ? <Hash size={13} /> : <Lock size={13} />}
              <span className="flex-1 truncate">{c.name}</span>
              {c.messages.length > 0 && <span className="text-[10px] text-ink-400">{fa(c.messages.length)}</span>}
            </button>
          ))}
          {canEdit && !p.announcements.length && (
            <Button size="sm" variant="ghost" icon={<Megaphone size={13} />} className="w-full justify-center mt-3" onClick={() => setAnnOpen(true)}>
              انتشار اطلاعیه
            </Button>
          )}
        </aside>

        {ch && (
          <section className="flex flex-col min-w-0">
            <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900 flex items-center gap-1">
                  {ch.members === "all" ? <Hash size={14} /> : <Lock size={14} />}
                  {ch.name}
                </p>
                <p className="text-[11px] text-ink-400 truncate">
                  {ch.description} · {ch.members === "all" ? "همه‌ی اعضا" : `${fa(ch.members.length)} عضو: ${ch.members.join("، ")}`}
                </p>
              </div>
              <div className="mr-auto flex items-center gap-2">
                <button onClick={() => setPinnedOnly((v) => !v)} className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 ${pinnedOnly ? "bg-amber-50 border-amber-200 text-amber-700" : "border-ink-200 text-ink-500"}`}>
                  <Pin size={12} /> سنجاق‌شده‌ها
                </button>
                <div className="relative">
                  <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی پیام‌ها" className="input-field !py-1 !pr-7 !text-xs w-40" />
                </div>
              </div>
            </div>
            {q && allHits.length > 0 && (
              <div className="px-4 py-2 bg-ink-50 text-[11px] text-ink-500 border-b border-ink-100">
                {fa(allHits.length)} نتیجه در همه‌ی کانال‌ها:{" "}
                {[...new Set(allHits.map((h) => h.c.name))].map((n) => (
                  <button key={n} onClick={() => setChId(p.channels.find((c) => c.name === n)!.id)} className="text-brand-700 mx-1 hover:underline">
                    #{n}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-surface">
              {msgs.map((m) => {
                const parent = m.replyTo ? ch.messages.find((x) => x.id === m.replyTo) : undefined;
                return (
                  <div key={m.id} className="group bg-white rounded-lg p-3 border border-ink-100 shadow-sm max-w-2xl">
                    <div className="flex items-center justify-between text-[11px] text-ink-400 mb-1">
                      <span className="font-medium text-ink-800 text-xs">{m.author}</span>
                      <span className="flex items-center gap-1.5">
                        {m.pinned && <Pin size={11} className="text-amber-600" />}
                        {m.at}
                      </span>
                    </div>
                    {parent && <p className="text-[11px] text-ink-400 border-r-2 border-ink-200 pr-2 mb-1.5 truncate">در پاسخ به {parent.author}: {parent.text}</p>}
                    <p className="text-sm text-ink-800 leading-6 whitespace-pre-wrap">{renderText(m.text)}</p>
                    {m.fileName && (
                      <span className="inline-flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded-md bg-ink-50 border border-ink-200 text-ink-700">
                        <Paperclip size={12} /> {m.fileName}
                      </span>
                    )}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {reactions.map((r) => {
                        const who = m.reactions?.[r.id] ?? [];
                        const Icon = r.icon;
                        return (
                          <button key={r.id} onClick={() => pm.react(pid, ch.id, m.id, r.id)} title={who.length ? who.join("، ") : r.label} className={`text-[11px] px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${who.includes(pm.actor) ? "border-brand-300 bg-brand-50 text-brand-700" : who.length ? "border-ink-200 text-ink-600" : "border-transparent text-ink-300 opacity-0 group-hover:opacity-100 focus:opacity-100"}`}>
                            <Icon size={11} /> {who.length ? fa(who.length) : ""}
                          </button>
                        );
                      })}
                      <span className="mr-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <button onClick={() => setReplyTo(m.id)} className="p-1 text-ink-400 hover:text-brand-600" title="پاسخ" aria-label="پاسخ">
                          <Reply size={13} />
                        </button>
                        <button onClick={() => pm.togglePin(pid, ch.id, m.id)} className="p-1 text-ink-400 hover:text-amber-600" title={m.pinned ? "برداشتن سنجاق" : "سنجاق کردن"} aria-label="سنجاق">
                          <Pin size={13} />
                        </button>
                      </span>
                    </div>
                  </div>
                );
              })}
              {msgs.length === 0 && <p className="text-center text-xs text-ink-400 py-10">{q || pinnedOnly ? "پیامی پیدا نشد." : "هنوز پیامی در این کانال نیست — گفتگو را شروع کنید."}</p>}
            </div>
            <div className="border-t border-ink-100 p-3">
              {replyTo && (
                <div className="flex items-center justify-between text-[11px] text-ink-500 bg-ink-50 rounded-md px-2 py-1 mb-2">
                  <span>پاسخ به: {ch.messages.find((x) => x.id === replyTo)?.text.slice(0, 60)}</span>
                  <button onClick={() => setReplyTo(null)} aria-label="لغو پاسخ">
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 flex-wrap mb-2">
                {p.members.slice(0, 7).map((m) => (
                  <button key={m.id} onClick={() => insertMention(m.name)} className="text-[10.5px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700">
                    @{m.name}
                  </button>
                ))}
              </div>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  className="input-field flex-1 resize-none"
                  placeholder={`پیام در #${ch.name} — منشن با @نام، لینک با https://`}
                />
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { send(f.name); notify(`فایل «${f.name}» ارسال و در اسناد پروژه ذخیره شد.`); } e.target.value = ""; }} />
                <button type="button" onClick={() => fileRef.current?.click()} className="p-2.5 rounded-lg border border-ink-200 text-ink-500 hover:text-brand-600" title="ارسال فایل" aria-label="ارسال فایل">
                  <Paperclip size={16} />
                </button>
                <button type="button" onClick={() => setText((t) => `${t} https://`)} className="p-2.5 rounded-lg border border-ink-200 text-ink-500 hover:text-brand-600" title="درج لینک" aria-label="درج لینک">
                  <Link2 size={16} />
                </button>
                <Button variant="primary" type="submit" icon={<Send size={14} />}>
                  ارسال
                </Button>
              </form>
            </div>
          </section>
        )}
      </div>

      <Modal open={newCh} onClose={() => setNewCh(false)} title="کانال جدید" description="هر کانال می‌تواند اعضای مشخص خودش را داشته باشد (مثلاً طراحی، توسعه، مالی).">
        <div className="space-y-3">
          <Field label="نام کانال">
            <input className="input-field" value={chName} onChange={(e) => setChName(e.target.value)} placeholder="مثلاً: طراحی" />
          </Field>
          <Field label="توضیح">
            <input className="input-field" value={chDesc} onChange={(e) => setChDesc(e.target.value)} />
          </Field>
          <Field label="اعضا">
            <label className="flex items-center gap-2 text-xs mb-2">
              <input type="checkbox" checked={chMembers === "all"} onChange={(e) => setChMembers(e.target.checked ? "all" : [])} className="accent-[var(--color-brand-600)]" /> همه‌ی اعضای پروژه (کانال عمومی)
            </label>
            {chMembers !== "all" && (
              <div className="flex flex-wrap gap-1.5">
                {p.members.map((m) => (
                  <button key={m.id} onClick={() => setChMembers(chMembers.includes(m.name) ? chMembers.filter((x) => x !== m.name) : [...chMembers, m.name])} className={`text-[11px] px-2 py-1 rounded-md border ${chMembers.includes(m.name) ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500"}`}>
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={() => {
              if (!chName.trim()) return notify("نام کانال الزامی است.", "warning");
              pm.createChannel(pid, { name: chName.trim(), description: chDesc.trim(), members: chMembers });
              setNewCh(false);
              setChName("");
              setChDesc("");
              setChMembers("all");
              notify("کانال ایجاد شد.");
            }}
          >
            ایجاد کانال
          </Button>
        </div>
      </Modal>

      <Modal open={annOpen} onClose={() => setAnnOpen(false)} title="انتشار اطلاعیه" description="اطلاعیه برای همه‌ی اعضا از همه‌ی کانال‌ها (درون‌برنامه، رایانامه، پوش) ارسال و در کانال «اطلاع‌رسانی» ثبت می‌شود.">
        <div className="space-y-3">
          <Field label="عنوان">
            <input className="input-field" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="مثلاً: جلسه‌ی پروژه فردا ساعت ۱۰" />
          </Field>
          <Field label="متن">
            <textarea className="input-field min-h-[80px]" value={annBody} onChange={(e) => setAnnBody(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={annPin} onChange={(e) => setAnnPin(e.target.checked)} className="accent-[var(--color-brand-600)]" /> سنجاق در بالای بخش اطلاعیه‌ها
          </label>
          <Button
            variant="primary"
            className="w-full justify-center"
            icon={<Megaphone size={14} />}
            onClick={() => {
              if (!annTitle.trim()) return notify("عنوان اطلاعیه الزامی است.", "warning");
              pm.postAnnouncement(pid, { title: annTitle.trim(), body: annBody.trim(), pinned: annPin });
              setAnnOpen(false);
              setAnnTitle("");
              setAnnBody("");
              setAnnPin(false);
              notify("اطلاعیه منتشر شد.");
            }}
          >
            انتشار
          </Button>
        </div>
      </Modal>
    </div>
  );
}
