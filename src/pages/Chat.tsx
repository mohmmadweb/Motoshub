import { useState } from "react";
import { chatThreads } from "../data/mock";
import Avatar from "../components/Avatar";

export default function Chat() {
  const [activeId, setActiveId] = useState(chatThreads[0]?.id);
  const active = chatThreads.find((c) => c.id === activeId);

  return (
    <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] h-[70vh]">
      <div className="border-l border-ink-100 overflow-y-auto">
        <div className="p-3 border-b border-ink-100">
          <input placeholder="جستجوی مخاطب…" className="w-full bg-ink-50 rounded-xl px-3 py-2 text-xs outline-none" />
        </div>
        {chatThreads.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`w-full flex items-center gap-2.5 p-3 text-right hover:bg-ink-50 ${
              activeId === c.id ? "bg-brand-50" : ""
            }`}
          >
            <Avatar name={c.with} color={c.avatarColor} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium truncate">{c.with}</p>
                <span className="text-[10px] text-ink-400">{c.time}</span>
              </div>
              <p className="text-[11px] text-ink-400 truncate">{c.lastMessage}</p>
            </div>
            {c.unread > 0 && (
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center">
                {c.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {active ? (
          <>
            <div className="flex items-center gap-2.5 p-3 border-b border-ink-100">
              <Avatar name={active.with} color={active.avatarColor} online />
              <p className="text-sm font-medium">{active.with}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ink-50/40">
              {active.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.from === "me" ? "bg-brand-600 text-white" : "bg-white border border-ink-100"
                    }`}
                  >
                    <p>{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.from === "me" ? "text-white/70" : "text-ink-400"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-ink-100 flex items-center gap-2">
              <input placeholder="پیام خود را بنویسید…" className="flex-1 bg-ink-50 rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              <button className="bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl">ارسال</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-ink-400">یک گفتگو را انتخاب کنید</div>
        )}
      </div>
    </div>
  );
}
