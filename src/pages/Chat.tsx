import { useState } from "react";
import { Search, Paperclip, Send, Check, CheckCheck, Phone, MoreVertical, MessageCircle } from "lucide-react";
import { chatThreads } from "../data/mock";
import Avatar from "../components/Avatar";
import EmptyState from "../components/ui/EmptyState";

export default function Chat() {
  const [activeId, setActiveId] = useState(chatThreads[0]?.id);
  const [draft, setDraft] = useState("");
  const active = chatThreads.find((c) => c.id === activeId);

  return (
    <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] h-[calc(100vh-7.5rem)]">
      <div className="border-l border-ink-100 overflow-y-auto flex flex-col">
        <div className="p-3 border-b border-ink-100">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input placeholder="جستجوی مخاطب یا گروه…" className="input-field !pr-8" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatThreads.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full flex items-center gap-2.5 p-3 text-right border-b border-ink-50 ${
                activeId === c.id ? "bg-brand-50" : "hover:bg-ink-50"
              }`}
            >
              <Avatar name={c.with} color={c.avatarColor} online={c.online} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-[13px] truncate ${c.unread > 0 ? "font-bold text-ink-900" : "font-medium text-ink-700"}`}>{c.with}</p>
                  <span className="text-[10px] text-ink-400 shrink-0">{c.time}</span>
                </div>
                <p className={`text-xs truncate ${c.unread > 0 ? "text-ink-700" : "text-ink-400"}`}>{c.lastMessage}</p>
              </div>
              {c.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center shrink-0">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col bg-[#f0f2f5]">
        {active ? (
          <>
            <div className="flex items-center gap-2.5 p-3 border-b border-ink-100 bg-white">
              <Avatar name={active.with} color={active.avatarColor} online={active.online} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink-900">{active.with}</p>
                <p className="text-[11px] text-ink-400">{active.online ? "آنلاین" : "آخرین بازدید: امروز ۰۹:۲۰"}</p>
              </div>
              <button className="w-8 h-8 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-500">
                <Phone size={15} />
              </button>
              <button className="w-8 h-8 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-500">
                <MoreVertical size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex justify-center">
                <span className="text-[10px] bg-white/80 text-ink-400 rounded-full px-3 py-1 shadow-sm">امروز</span>
              </div>
              {active.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[68%] px-3 py-2 text-[13px] leading-6 shadow-sm ${
                      m.from === "me"
                        ? "bg-brand-600 text-white rounded-2xl rounded-tl-sm"
                        : "bg-white text-ink-800 rounded-2xl rounded-tr-sm"
                    }`}
                  >
                    <p>{m.text}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${m.from === "me" ? "text-white/70" : "text-ink-400"}`}>
                      <span>{m.time}</span>
                      {m.from === "me" && (m.read ? <CheckCheck size={13} /> : <Check size={13} />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white border-t border-ink-100 flex items-center gap-2">
              <button className="w-9 h-9 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-500 shrink-0">
                <Paperclip size={16} />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="پیام خود را بنویسید…"
                className="flex-1 bg-ink-100 rounded-full px-4 py-2.5 text-sm outline-none"
              />
              <button className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 hover:bg-brand-700">
                <Send size={15} />
              </button>
            </div>
          </>
        ) : (
          <EmptyState icon={<MessageCircle size={20} />} title="یک گفتگو را انتخاب کنید" />
        )}
      </div>
    </div>
  );
}
