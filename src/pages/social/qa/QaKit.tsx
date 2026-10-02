// ---------------------------------------------------------------------------
// اجزای «پرسش و پاسخ استاندارد» (الگوی Stack Overflow for Teams):
// رأی بالا/پایین، منوی اقدام‌های بیشتر، پرسش‌های مشابه هنگام نوشتن و انتخاب پرسش مقصدِ تکراری.
// همه «پیشنهادی»اند — API فعلی social.shub.ir این‌ها را ندارد (نگاه کنید به endpoints.ts).
// ---------------------------------------------------------------------------
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronUp, ChevronDown, MoreHorizontal, Lightbulb, Search, CheckCircle2, Copy } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { voteScore } from "../../../context/SocialContext";
import type { Topic, Vote } from "../../../social/types";
import { fa } from "../kit";

// ---------------------------------------------------------------- رأی
export function VoteBox({ votes, me, onVote, size = "md" }: { votes?: Record<string, Vote>; me: string; onVote: (v: Vote) => void; size?: "sm" | "md" }) {
  const score = voteScore(votes);
  const mine = votes?.[me];
  const icon = size === "sm" ? 16 : 20;
  const btn = (v: Vote, label: string, I: typeof ChevronUp) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onVote(v);
      }}
      aria-label={label}
      title={label}
      aria-pressed={mine === v}
      className={`rounded-md p-0.5 transition-colors ${mine === v ? (v === 1 ? "text-brand-600 bg-brand-50" : "text-rose-600 bg-rose-50") : "text-ink-400 hover:text-ink-700 hover:bg-ink-100"}`}
    >
      <I size={icon} />
    </button>
  );
  return (
    <div className="flex flex-col items-center shrink-0 select-none" aria-label={`امتیاز ${fa(score)}`}>
      {btn(1, "رأی مثبت", ChevronUp)}
      <span className={`tabular-nums font-bold ${size === "sm" ? "text-[12px]" : "text-[14px]"} ${score > 0 ? "text-ink-900" : score < 0 ? "text-rose-600" : "text-ink-400"}`}>{fa(score)}</span>
      {btn(-1, "رأی منفی", ChevronDown)}
    </div>
  );
}

/** نشان «حل‌شده» */
export function SolvedBadge() {
  return (
    <Badge tone="success" icon={<CheckCircle2 size={10} />}>
      حل‌شده
    </Badge>
  );
}
/** نشان «تکراری» */
export function DuplicateBadge() {
  return (
    <Badge tone="neutral" icon={<Copy size={10} />}>
      تکراری
    </Badge>
  );
}

// ---------------------------------------------------------------- منوی «بیشتر»
export type MenuItem = { label: string; icon: ReactNode; onClick: () => void; danger?: boolean };
export function MoreMenu({ items, label = "اقدام‌های بیشتر" }: { items: (MenuItem | false | null | undefined)[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const list = items.filter(Boolean) as MenuItem[];
  if (!list.length) return null;
  return (
    <span className="relative inline-block">
      <Button size="sm" variant="secondary" icon={<MoreHorizontal size={14} />} onClick={() => setOpen((v) => !v)} aria-label={label} title={label}>
        <span className="hidden sm:inline">بیشتر</span>
      </Button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute z-40 top-full mt-1 left-0 w-52 bg-white border border-ink-200 rounded-xl shadow-lg py-1 block">
            {list.map((i) => (
              <button
                key={i.label}
                onClick={() => {
                  setOpen(false);
                  i.onClick();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-right hover:bg-ink-50 ${i.danger ? "text-rose-600" : "text-ink-700"}`}
              >
                {i.icon} {i.label}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- پرسش‌های مشابه
const STOP = new Set(["از", "به", "در", "با", "که", "را", "برای", "این", "آن", "و", "یا", "چه", "چطور", "چگونه", "چرا", "کنیم", "کرد", "است", "هست", "می", "ما", "شما", "یک", "تا", "هم", "بر", "های", "ها", "؟", "—"]);
const norm = (s: string) =>
  s
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[‌‌]/g, " ")
    .replace(/[.,،؛:!؟?«»()\-—]/g, " ")
    .toLowerCase();
const words = (s: string) => norm(s).split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
/** پایه‌ی واژه برای تطبیق ساده‌ی فارسی (حذف پسوندهای رایج جمع/نسبت) */
const stem = (w: string) => w.replace(/(ها|های|ان|ات|ی|ه)$/u, "") || w;

/** تا ۳ پرسش منتشرشده‌ی مشابه — تطبیق واژه‌های عنوان با عنوان و برچسب‌ها */
export function similarTopics(title: string, pool: Topic[], excludeId?: string, limit = 3): Topic[] {
  const q = [...new Set(words(title).map(stem))];
  if (q.length === 0) return [];
  return pool
    .filter((t) => t.id !== excludeId && t.is_public && !t.is_draft && !t.deleted_at)
    .map((t) => {
      const bag = new Set([...words(t.title), ...t.tags.flatMap(words)].map(stem));
      const hits = q.filter((w) => bag.has(w) || [...bag].some((b) => b.length > 3 && (b.includes(w) || w.includes(b)))).length;
      return { t, score: hits / Math.max(3, q.length) + (t.accepted_post_id ? 0.05 : 0) };
    })
    .filter((x) => x.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
}

/** هنگام نوشتن عنوان (با تأخیر ۳۰۰ میلی‌ثانیه) پرسش‌های مشابه را پیشنهاد می‌دهد */
export function SimilarQuestions({ title, pool, excludeId, onOpen }: { title: string; pool: Topic[]; excludeId?: string; onOpen?: () => void }) {
  const [debounced, setDebounced] = useState(title);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(title), 300);
    return () => window.clearTimeout(t);
  }, [title]);
  const list = debounced.trim().length >= 6 ? similarTopics(debounced, pool, excludeId) : [];
  if (!list.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3" role="status" aria-live="polite">
      <p className="text-[12px] font-bold text-amber-800 flex items-center gap-1.5 mb-1.5">
        <Lightbulb size={14} /> شاید پاسخ شما اینجاست
      </p>
      <ul className="space-y-1">
        {list.map((t) => (
          <li key={t.id} className="flex items-center gap-2 min-w-0">
            <Link to={`/dashboard/forum/${t.id}`} onClick={onOpen} className="text-[12px] text-brand-700 hover:underline truncate flex-1 min-w-0">
              {t.title}
            </Link>
            {t.accepted_post_id && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" aria-label="حل‌شده" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- انتخاب پرسش مقصد (تکراری)
export function DuplicatePicker({ open, onClose, topic, pool, onPick }: { open: boolean; onClose: () => void; topic: Topic; pool: Topic[]; onPick: (targetId: string) => void }) {
  const [q, setQ] = useState("");
  const [pick, setPick] = useState("");
  const suggested = similarTopics(topic.title, pool, topic.id, 5).filter((t) => !t.duplicate_of);
  const needle = q.trim();
  const list = (needle ? pool.filter((t) => t.title.includes(needle)) : suggested.length ? suggested : pool).filter((t) => t.id !== topic.id && !t.duplicate_of && t.is_public && !t.is_draft).slice(0, 30);
  return (
    <Modal open={open} onClose={onClose} title="علامت‌گذاری تکراری" description="پرسش اصلی را انتخاب کنید؛ این پرسش قفل می‌شود و به آن پیوند می‌خورد.">
      <div className="space-y-3">
        <div className="relative">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی عنوان پرسش…" autoFocus />
        </div>
        {!needle && suggested.length > 0 && <p className="text-[11px] text-ink-400">پیشنهادها بر اساس شباهت عنوان:</p>}
        <div className="max-h-64 overflow-y-auto border border-ink-200 rounded-lg divide-y divide-ink-100">
          {list.map((t) => (
            <label key={t.id} className={`flex items-center gap-2 px-3 py-2 text-[12.5px] cursor-pointer ${pick === t.id ? "bg-brand-50/60" : "hover:bg-ink-50"}`}>
              <input type="radio" name="dup-target" checked={pick === t.id} onChange={() => setPick(t.id)} className="accent-[var(--color-brand-600)] shrink-0" />
              <span className="flex-1 min-w-0 truncate text-ink-800">{t.title}</span>
              {t.accepted_post_id && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
            </label>
          ))}
          {list.length === 0 && <p className="text-xs text-ink-400 p-3">پرسشی پیدا نشد.</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button variant="primary" disabled={!pick} onClick={() => pick && onPick(pick)}>
            علامت‌گذاری تکراری
          </Button>
        </div>
      </div>
    </Modal>
  );
}
