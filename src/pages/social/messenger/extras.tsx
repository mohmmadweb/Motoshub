// ---------------------------------------------------------------------------
// قابلیت‌های تکمیلی پیام‌رسان (الگوی Slack/Teams) — همه «پیشنهادی»اند:
// واکنش اموجی روی پیام، پاسخ در رشته (thread)، سنجاق پیام و جستجو داخل گفتگو.
// endpointها: messages/{id}/reactions ، messages/{id}/thread ، messages/{id}/pin ، …/messages/?q=
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Pin, ChevronUp, ChevronDown, X, Search, SendHorizontal, MessagesSquare } from "lucide-react";
import Drawer from "../../../components/ui/Drawer";
import Avatar from "../../../components/Avatar";
import { useSocial } from "../../../context/SocialContext";
import { useToast } from "../../../components/ui/ToastProvider";
import type { Chat, Message } from "../../../social/types";
import { AttachmentList, fa } from "../kit";
import { RichText, tagsIn, timeOf } from "./shared";

/** متن کوتاه یک پیام برای پیش‌نمایش */
export const msgPreview = (m: Message | undefined) => (!m ? "این پیام حذف شده است." : m.type === "sticker" ? `برچسب ${m.content}` : m.content || (m.attachments.length ? "📎 پیوست" : ""));

// ---------------------------------------------------------------- واکنش‌ها
/** نوار کوچک واکنش‌ها زیر حباب پیام */
export function ReactionChips({ m, align = "start" }: { m: Message; align?: "start" | "end" }) {
  const s = useSocial();
  const entries = Object.entries(m.reactions ?? {}).filter(([, us]) => us.length);
  if (!entries.length) return null;
  const emojiOf = (code: string) => s.allowedReactions.find((r) => r.code === code)?.emoji ?? code;
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${align === "end" ? "justify-end" : ""}`}>
      {entries.map(([code, us]) => {
        const mine = us.includes(s.me);
        const who = us.map((u) => s.userName(u)).join("، ");
        return (
          <button
            key={code}
            onClick={() => s.toggleMessageReaction(m.id, code)}
            title={who}
            aria-label={`${emojiOf(code)} ${fa(us.length)} — ${who}`}
            aria-pressed={mine}
            className={`text-[11px] leading-none px-1.5 py-1 rounded-full border flex items-center gap-1 ${mine ? "border-brand-300 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`}
          >
            <span>{emojiOf(code)}</span>
            <span className="tabular-nums">{fa(us.length)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** ردیف انتخاب واکنش (بالای منوی اقدام‌های پیام) */
export function ReactionPicker({ m, onDone }: { m: Message; onDone: () => void }) {
  const s = useSocial();
  const active = s.allowedReactions.filter((r) => r.is_active);
  return (
    <div className="flex items-center gap-0.5 px-2 pb-1 mb-1 border-b border-ink-100">
      {active.map((r) => {
        const mine = (m.reactions?.[r.code] ?? []).includes(s.me);
        return (
          <button
            key={r.code}
            onClick={() => {
              s.toggleMessageReaction(m.id, r.code);
              onDone();
            }}
            className={`text-lg leading-none p-1 rounded-lg ${mine ? "bg-brand-50" : "hover:bg-ink-100"}`}
            title={r.code}
            aria-label={`واکنش ${r.emoji}`}
          >
            {r.emoji}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- سنجاق‌ها
/** نوار سنجاق بالای گفتگو؛ هر کلیک به سنجاق بعدی می‌پرد */
export function PinnedBar({ chat, onJump, canUnpin }: { chat: Chat; onJump: (id: string) => void; canUnpin: boolean }) {
  const s = useSocial();
  const ids = (chat.pinned_message_ids ?? []).filter((id) => s.messages.some((m) => m.id === id));
  const [i, setI] = useState(0);
  if (!ids.length) return null;
  const idx = Math.min(i, ids.length - 1);
  const m = s.messages.find((x) => x.id === ids[idx]);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ink-100 bg-white">
      <Pin size={14} className="text-brand-600 shrink-0 rotate-45" />
      <button
        onClick={() => {
          onJump(ids[idx]);
          setI((idx + 1) % ids.length);
        }}
        className="flex-1 min-w-0 text-right"
        title="پرش به پیام سنجاق‌شده"
      >
        <span className="block text-[10.5px] font-medium text-brand-700">
          پیام سنجاق‌شده{ids.length > 1 ? ` ${fa(idx + 1)} از ${fa(ids.length)}` : ""}
        </span>
        <span className="block text-[11.5px] text-ink-600 truncate">
          {m ? `${s.userName(m.user_id)}: ` : ""}
          {msgPreview(m)}
        </span>
      </button>
      {canUnpin && (
        <button onClick={() => s.togglePinMessage(chat.id, ids[idx])} className="p-1 rounded-md text-ink-400 hover:text-rose-600 hover:bg-ink-100 shrink-0" title="برداشتن سنجاق" aria-label="برداشتن سنجاق">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- جستجو
export function ChatSearchBar({ q, onQ, count, index, onPrev, onNext, onClose }: { q: string; onQ: (v: string) => void; count: number; index: number; onPrev: () => void; onNext: () => void; onClose: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") (e.shiftKey ? onPrev : onNext)();
    if (e.key === "Escape") onClose();
  };
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-ink-100 bg-white">
      <div className="relative flex-1 min-w-0">
        <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input ref={ref} value={q} onChange={(e) => onQ(e.target.value)} onKeyDown={onKey} placeholder="جستجو در پیام‌های این گفتگو…" className="w-full bg-ink-50 border border-transparent focus:border-brand-300 focus:bg-white rounded-full pr-8 pl-3 py-1.5 text-[12.5px] outline-none" />
      </div>
      <span className="text-[11px] text-ink-500 tabular-nums shrink-0 min-w-[44px] text-center" aria-live="polite">
        {q.trim() ? (count ? `${fa(index + 1)} از ${fa(count)}` : "۰ نتیجه") : ""}
      </span>
      <button onClick={onPrev} disabled={!count} className="p-1 rounded-md text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label="نتیجه‌ی قبلی" title="قبلی (Shift+Enter)">
        <ChevronUp size={16} />
      </button>
      <button onClick={onNext} disabled={!count} className="p-1 rounded-md text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label="نتیجه‌ی بعدی" title="بعدی (Enter)">
        <ChevronDown size={16} />
      </button>
      <button onClick={onClose} className="p-1 rounded-md text-ink-400 hover:bg-ink-100" aria-label="بستن جستجو">
        <X size={15} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- رشته‌ی گفتگو
export function ThreadDrawer({ chat, rootId, canPost, onClose }: { chat: Chat; rootId: string | null; canPost: boolean; onClose: () => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const root = rootId ? s.messages.find((m) => m.id === rootId) : undefined;
  const replies = rootId ? s.messages.filter((m) => m.in_thread && m.parent_message_id === rootId).sort((a, b) => a.seq - b.seq) : [];
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [replies.length, rootId]);
  const send = () => {
    const content = text.trim();
    if (!content || !rootId) return;
    const r = s.sendMessage(chat.id, { content, type: "text", parent_message_id: rootId, in_thread: true, tags: tagsIn(content) });
    if (!r.ok) return notify(r.error, "warning");
    setText("");
    s.markRead(chat.id);
  };
  const Row = ({ m, big = false }: { m: Message; big?: boolean }) => {
    const u = s.userById(m.user_id);
    return (
      <div className="flex gap-2.5">
        <Avatar name={u?.name ?? "؟"} color={u?.avatarColor} size={big ? 32 : 28} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-ink-900">
            {u?.name ?? "کاربر"} <span className="font-normal text-[10.5px] text-ink-400 mr-1">{m.created_at.split(" ")[0] === s.today ? timeOf(m.created_at) : `${m.created_at.split(" ")[0].slice(5)} ${timeOf(m.created_at)}`}</span>
          </p>
          {m.type === "sticker" ? (
            <p className="text-4xl leading-none py-1">{m.content}</p>
          ) : (
            m.content && (
              <p className="text-[13px] text-ink-800 leading-6 whitespace-pre-wrap break-words">
                <RichText text={m.content} />
              </p>
            )
          )}
          {m.attachments.length > 0 && (
            <div className="mt-1">
              <AttachmentList items={m.attachments} />
            </div>
          )}
          <ReactionChips m={m} />
        </div>
      </div>
    );
  };
  return (
    <Drawer open={!!rootId} onClose={onClose} title={`رشته‌ی گفتگو — ${chat.title}`}>
      {!root ? (
        <p className="text-xs text-ink-400">پیام ریشه حذف شده است.</p>
      ) : (
        <div className="flex flex-col min-h-full">
          <Row m={root} big />
          <div className="flex items-center gap-2 my-3 text-[11px] text-ink-400">
            <span className="h-px flex-1 bg-ink-100" />
            {replies.length ? `${fa(replies.length)} پاسخ` : "هنوز پاسخی نیست"}
            <span className="h-px flex-1 bg-ink-100" />
          </div>
          <div className="space-y-3 flex-1">
            {replies.map((m) => (
              <Row key={m.id} m={m} />
            ))}
            {!replies.length && (
              <p className="text-xs text-ink-400 flex items-center gap-1.5">
                <MessagesSquare size={14} /> بحث را اینجا ادامه دهید تا جریان اصلی گفتگو شلوغ نشود.
              </p>
            )}
            <div ref={endRef} />
          </div>
          {canPost ? (
            <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 p-3 bg-white border-t border-ink-100 flex items-end gap-1.5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={Math.min(4, Math.max(1, text.split("\n").length))}
                placeholder="پاسخ در رشته…"
                className="flex-1 min-w-0 resize-none bg-ink-50 border border-transparent focus:border-brand-300 focus:bg-white rounded-xl px-3 py-2 text-[13px] leading-6 outline-none"
                autoFocus
              />
              <button onClick={send} disabled={!text.trim()} className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40" aria-label="ارسال پاسخ در رشته">
                <SendHorizontal size={17} className="-scale-x-100" />
              </button>
            </div>
          ) : (
            <p className="mt-4 text-[11.5px] text-ink-400 text-center">اجازه‌ی ارسال پیام در این گفتگو را ندارید.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}
