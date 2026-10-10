// ---------------------------------------------------------------------------
// «پیشنهادی» — F01 کارت نظرسنجی در گفتگو و «نظرسنجی‌های من»
// نوار درصد هر گزینه، تعداد کل آرا، تیک گزینه‌ی کاربر، برچسب «پایان‌یافته» (۱.۳.۲ / ۱.۳.۳)
// نمایش لحظه‌ای (۱.۳.۵): درصدها با هر رأی بدون بارگذاری صفحه به‌روز می‌شوند (رأی دیگران با تایمر شبیه‌سازی می‌شود)
// مدیریت پاسخ‌ها (۱.۳.۴): منوی «…» سازنده/مدیر — بستن زودهنگام، بازگشایی، رأی‌دهندگان، خروجی اکسل، حذف
// امکان ایجاد نظر (۱.۳.۶): واکنش (ReactionBar) و نظر تودرتو (CommentsPanel) زیر هر نظرسنجی
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Check, Clock, Download, EyeOff, Lock, LockOpen, MessageSquare, MoreHorizontal, Trash2, Users, Image as ImageIcon, Film, Repeat } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useSocial } from "../../../context/SocialContext";
import { CommentsPanel, ReactionBar, UserLine, fa, stamp } from "../kit";
import { RichText, chatTitle } from "../messenger/shared";
import type { Poll } from "../../../social/types";

/** خروجی اکسل (CSV با BOM تا Excel فارسی را درست باز کند) — GET /core/polls/{id}/export/ */
export function exportPollCsv(poll: Poll, counts: Record<string, number>, voters: { user_id: string; option_ids: string[]; voted_at: string }[], userName: (id: string) => string) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const esc = (x: string | number) => `"${String(x).replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [["پرسش", poll.question], [], ["گزینه", "تعداد رأی", "درصد"], ...poll.options.map((o) => [o.text, counts[o.id] ?? 0, total ? Math.round(((counts[o.id] ?? 0) / total) * 100) : 0])];
  if (!poll.anonymous && voters.length) rows.push([], ["رأی‌دهنده", "گزینه‌ها", "زمان"], ...voters.map((v) => [userName(v.user_id), v.option_ids.map((id) => poll.options.find((o) => o.id === id)?.text ?? "").join(" | "), v.voted_at]));
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `poll-${poll.id}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function PollCard({ pollId, showSource = false }: { pollId: string; /** پیوند به گروه/کانال (در «نظرسنجی‌های من») */ showSource?: boolean }) {
  const s = useSocial();
  const { notify } = useToast();
  const confirm = useConfirm();
  const v = s.pollView(pollId);
  const [sel, setSel] = useState<string[] | null>(null);
  const [menu, setMenu] = useState(false);
  const [votersOpen, setVotersOpen] = useState(false);
  const [discuss, setDiscuss] = useState(false);
  const closed = v?.closed ?? true;

  // نمایش لحظه‌ای: تا وقتی کارت باز است و نظرسنجی بسته نشده، رأی اعضای دیگر از راه می‌رسد
  useEffect(() => {
    if (closed) return;
    const h = window.setInterval(() => {
      if (Math.random() < 0.45) s.simulatePollVote(pollId);
    }, 7000);
    return () => window.clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId, closed]);

  if (!v) return <p className="text-xs text-ink-400">این نظرسنجی حذف شده است.</p>;
  const { poll, counts, total, mine, showResults, canManage, canVote, chat } = v;
  const editing = sel !== null;
  // تک‌گزینه‌ای با «امکان تغییر رأی»: کلیک روی گزینه‌ی دیگر رأی را عوض می‌کند
  const choosing = canVote && (mine.length === 0 || editing || !poll.multiple);
  const picked = sel ?? mine;
  const comments = s.commentsFor("poll", poll.id).length;

  const vote = (ids: string[]) => {
    const r = s.votePoll(poll.id, ids);
    if (!r.ok) return notify(r.error, "warning");
    setSel(null);
    if (!ids.length) notify("رأی شما پس گرفته شد.", "info");
  };
  const toggle = (id: string) => {
    if (!poll.multiple) return vote([id]);
    const cur = sel ?? [...mine];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (next.length > poll.max_choices) return notify(`حداکثر ${fa(poll.max_choices)} گزینه.`, "warning");
    setSel(next);
  };
  const run = (k: "close" | "reopen" | "delete" | "voters" | "export") => {
    setMenu(false);
    if (k === "close") {
      const r = s.closePoll(poll.id);
      return r.ok ? notify("نظرسنجی بسته شد.", "success") : notify(r.error, "warning");
    }
    if (k === "reopen") {
      const r = s.reopenPoll(poll.id);
      return r.ok ? notify("نظرسنجی بازگشایی شد.", "success") : notify(r.error, "warning");
    }
    if (k === "voters") return setVotersOpen(true);
    if (k === "export") {
      exportPollCsv(poll, counts, s.pollVoters(poll.id), s.userName);
      return notify("خروجی اکسل نتایج دریافت شد.", "success");
    }
    confirm({
      title: "این نظرسنجی حذف شود؟",
      message: "نظرسنجی، آرا و نظرهای آن برای همه حذف می‌شود.",
      confirmLabel: "حذف نظرسنجی",
      onConfirm: () => {
        const r = s.deletePoll(poll.id);
        if (r.ok) notify("نظرسنجی حذف شد.", "success");
        else notify(r.error, "warning");
      },
    });
  };
  const items = [
    canManage && !closed && { k: "close" as const, label: "بستن زودهنگام", icon: Lock },
    canManage && closed && { k: "reopen" as const, label: "بازگشایی", icon: LockOpen },
    canManage && !poll.anonymous && { k: "voters" as const, label: "رأی‌دهندگان", icon: Users },
    canManage && { k: "export" as const, label: "خروجی اکسل", icon: Download },
    canManage && { k: "delete" as const, label: "حذف نظرسنجی", icon: Trash2, danger: true },
  ].filter(Boolean) as { k: "close" | "reopen" | "voters" | "export" | "delete"; label: string; icon: typeof Lock; danger?: boolean }[];

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3 min-w-[230px] sm:min-w-[300px] max-w-md text-right" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-2">
        <BarChart3 size={15} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1 text-[10.5px] text-ink-500">
            <span className="font-medium text-ink-600">نظرسنجی</span>
            <span>· {poll.multiple ? `چندگزینه‌ای (تا ${fa(poll.max_choices)})` : "تک‌گزینه‌ای"}</span>
            {poll.anonymous && <span>· ناشناس</span>}
            {closed ? (
              <Badge tone="neutral">پایان‌یافته</Badge>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600" title="نتایج زنده به‌روز می‌شوند">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> زنده
              </span>
            )}
          </div>
          {showSource && chat && (
            <Link to={`/dashboard/${chat.chat_type === "channel" ? "channels" : "groups"}/${chat.parent ?? chat.id}`} className="block text-[10.5px] text-brand-700 hover:underline truncate">
              در «{chatTitle(chat, s.me)}» · {s.userName(poll.owner)}
            </Link>
          )}
          <p className="text-[13px] font-bold text-ink-900 leading-6 mt-0.5 break-words">
            <RichText text={poll.question} />
          </p>
        </div>
        {items.length > 0 && (
          <span className="relative shrink-0">
            <button type="button" onClick={() => setMenu((x) => !x)} className="p-1 rounded-md text-ink-400 hover:text-ink-700 hover:bg-ink-50" aria-label="مدیریت نظرسنجی">
              <MoreHorizontal size={15} />
            </button>
            {menu && (
              <>
                <span className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <div className="absolute z-40 top-7 left-0 w-44 bg-white border border-ink-200 rounded-xl shadow-lg py-1">
                  {items.map((it) => (
                    <button key={it.k} type="button" onClick={() => run(it.k)} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-right hover:bg-ink-50 ${it.danger ? "text-rose-600" : "text-ink-700"}`}>
                      <it.icon size={13} /> {it.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </span>
        )}
      </div>

      {poll.media.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {poll.media.map((m) => {
            const I = m.mime.startsWith("video/") ? Film : ImageIcon;
            return (
              <span key={m.id} className="flex items-center gap-1.5 text-[11px] text-white rounded-lg px-2 py-3 min-w-[120px] max-w-full" style={{ background: "linear-gradient(135deg, #334155, #0f172a)" }} title={m.name}>
                <I size={14} className="shrink-0" />
                <span className="truncate">{m.name}</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-2.5 space-y-1.5">
        {poll.options.map((o) => {
          const n = counts[o.id] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          const on = picked.includes(o.id);
          const body = (
            <>
              {o.image && <span className="w-7 h-7 rounded-md shrink-0" style={{ background: o.image }} aria-hidden />}
              <span className="relative flex-1 min-w-0 flex items-center gap-1.5">
                {(choosing || on) && (
                  <span className={`w-4 h-4 shrink-0 flex items-center justify-center border ${poll.multiple ? "rounded" : "rounded-full"} ${on ? "bg-brand-600 border-brand-600 text-white" : "border-ink-300"}`}>{on && <Check size={11} />}</span>
                )}
                <span className={`text-[12.5px] truncate ${on ? "font-medium text-ink-900" : "text-ink-700"}`}>{o.text}</span>
              </span>
              {showResults && <span className="relative text-[11px] tabular-nums text-ink-600 shrink-0">{fa(pct)}٪</span>}
            </>
          );
          return (
            <div key={o.id} className="relative">
              {showResults && <span className={`absolute inset-y-0 right-0 rounded-lg transition-all duration-500 ${on ? "bg-brand-100" : "bg-ink-100"}`} style={{ width: `${pct}%` }} aria-hidden />}
              {choosing ? (
                <button type="button" onClick={() => toggle(o.id)} className={`relative w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-right ${on ? "border-brand-300" : "border-ink-200 hover:border-brand-300"}`}>
                  {body}
                </button>
              ) : (
                <div className={`relative flex items-center gap-2 rounded-lg border px-2 py-1.5 ${on ? "border-brand-300" : "border-transparent"}`} title={showResults ? `${fa(n)} رأی` : undefined}>
                  {body}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {choosing && poll.multiple && (
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" variant="primary" disabled={!(sel ?? []).length} onClick={() => vote(sel ?? [])}>
            ثبت رأی
          </Button>
          {editing && (
            <Button size="sm" variant="ghost" onClick={() => setSel(null)}>
              انصراف
            </Button>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-400">
        <span>{fa(total)} رأی</span>
        {poll.closes_at && (
          <span className="flex items-center gap-0.5">
            <Clock size={10} /> {closed ? "پایان" : "تا"} {stamp(poll.closes_at)}
          </span>
        )}
        {!showResults && mine.length > 0 && (
          <span className="flex items-center gap-0.5">
            <EyeOff size={10} /> رأی شما ثبت شد؛ نتیجه پس از پایان
          </span>
        )}
        {!closed && poll.show_results === "after_close" && canManage && <span className="text-amber-600">نتایج فقط برای شما (مدیر) دیده می‌شود</span>}
        {canVote && mine.length > 0 && !editing && (
          <span className="flex items-center gap-2">
            {poll.multiple && (
              <button type="button" onClick={() => setSel([...mine])} className="text-brand-700 hover:underline flex items-center gap-0.5">
                <Repeat size={10} /> تغییر رأی
              </button>
            )}
            <button type="button" onClick={() => vote([])} className="text-ink-500 hover:text-rose-600">
              پس‌گرفتن رأی
            </button>
          </span>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-ink-100 flex flex-wrap items-center gap-2">
        <ReactionBar entity="poll" id={poll.id} compact />
        <button type="button" onClick={() => setDiscuss((x) => !x)} className="mr-auto text-[11px] text-brand-700 flex items-center gap-1">
          <MessageSquare size={12} /> نظرها {comments ? `(${fa(comments)})` : ""}
        </button>
      </div>
      {discuss && (
        <div className="mt-2">
          <CommentsPanel entity="poll" id={poll.id} ownerId={poll.owner} />
        </div>
      )}

      <Modal open={votersOpen} onClose={() => setVotersOpen(false)} title="رأی‌دهندگان" description={`GET /core/polls/${poll.id}/voters/?option={id} («پیشنهادی»)`}>
        <VotersList pollId={poll.id} />
      </Modal>
    </div>
  );
}

function VotersList({ pollId }: { pollId: string }) {
  const s = useSocial();
  const v = s.pollView(pollId);
  const voters = s.pollVoters(pollId);
  if (!v) return null;
  return (
    <div className="space-y-3">
      {v.poll.options.map((o) => {
        const list = voters.filter((x) => x.option_ids.includes(o.id));
        return (
          <div key={o.id}>
            <p className="text-xs font-bold text-ink-800 mb-1">
              {o.text} <span className="font-normal text-ink-400">({fa(list.length)})</span>
            </p>
            {list.length ? (
              <div className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
                {list.map((x) => (
                  <div key={x.user_id} className="px-2.5 py-1.5">
                    <UserLine id={x.user_id} size={24} sub={stamp(x.voted_at)} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-ink-400">رأیی ندارد.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
