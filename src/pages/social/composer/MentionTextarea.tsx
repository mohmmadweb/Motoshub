// ---------------------------------------------------------------------------
// «پیشنهادی» — F04 پیشنهاد لحظه‌ای افراد هنگام نوشتن (۱.۶.۳)
// جایگزین بی‌دردسر <textarea>: با تایپ @ منوی شناور حداکثر ۸ نفر (آواتار، نام، سمت، واحد) باز می‌شود.
// اولویت: اعضای همان گروه/گفتگو ← همکاران همان واحد ← بقیه؛ فقط افرادی که کاربر مجاز به دیدنشان است
// (useTenancy().visibleUserIds). پیمایش با ↑/↓، انتخاب با Enter یا Tab، بستن با Esc.
// توکن درج‌شده «@نام_خانوادگی» است و شناسه‌ی کاربر با extractMentions ذخیره می‌شود.
// API: GET /identity/iam/tenants/{t}/member-directory/?q=…&chat={id}&limit=8 («پیشنهادی»)
// ---------------------------------------------------------------------------
import { forwardRef, useImperativeHandle, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type TextareaHTMLAttributes } from "react";
import { Users } from "lucide-react";
import Avatar from "../../../components/Avatar";
import { useTenancy } from "../../../context/TenancyContext";
import { users } from "../../../data/mock";
import type { Mention } from "../../../social/types";

export const MENTION_LIMIT = 8;
const mentionToken = (name: string) => `@${name.replace(/\s+/g, "_")}`;

/** منشن‌های متن با شناسه‌ی کاربر و جایگاه (mention { user_id, offset, length }) */
export function extractMentions(text: string): Mention[] {
  const out: Mention[] = [];
  const re = /@[^\s،.,!؟?]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[0].slice(1).replace(/_/g, " ");
    const u = users.find((x) => x.name === name);
    if (u) out.push({ user_id: u.id, offset: m.index, length: m[0].length });
  }
  return out;
}

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  /** اعضای همین گروه/گفتگو — اولویت اول */
  priorityIds?: string[];
  /** «@همه» برای مدیران گروه/کانال */
  allowEveryone?: boolean;
  /** باز شدن منو بالای کادر (نوار نوشتن پایین صفحه) */
  placement?: "top" | "bottom";
};

type Cand = { id: string; name: string; sub: string; unit: string; color?: string; all?: boolean };

const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea({ value, onChange, priorityIds, allowEveryone, placement = "bottom", onKeyDown, onBlur, className, ...rest }, ref) {
  const t = useTenancy();
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);
  const [q, setQ] = useState<string | null>(null);
  const [start, setStart] = useState(0);
  const [idx, setIdx] = useState(0);

  const me = t.actingUser.id;
  // دامنه‌ی دید: همکارانی که کاربر مجاز به دیدنشان است
  const visible = useMemo(() => new Set(t.visibleUserIds()), [t]);
  const myScopes = useMemo(() => new Set(t.membershipsOf(me).map((m) => m.scopeId)), [t, me]);

  const cands: Cand[] = useMemo(() => {
    if (q === null) return [];
    const term = q.replace(/_/g, " ").trim();
    const prio = new Set(priorityIds ?? []);
    const rank = (id: string) => (prio.has(id) ? 0 : t.membershipsOf(id).some((m) => myScopes.has(m.scopeId)) ? 1 : 2);
    const list: Cand[] = users
      .filter((u) => u.id !== me && (visible.has(u.id) || prio.has(u.id)))
      .filter((u) => !term || u.name.includes(term) || u.role.includes(term))
      .sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, "fa"))
      .slice(0, MENTION_LIMIT)
      .map((u) => ({ id: u.id, name: u.name, sub: u.role, unit: u.org, color: u.avatarColor }));
    if (allowEveryone && "همه".startsWith(term)) list.unshift({ id: "*", name: "همه", sub: "همه‌ی اعضای این گفتگو", unit: "", all: true });
    return list.slice(0, MENTION_LIMIT);
  }, [q, priorityIds, allowEveryone, visible, myScopes, me, t]);

  const detect = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = /(^|[\s(«])@([^\s@،.,!؟?]{0,30})$/.exec(before);
    if (m) {
      setQ(m[2]);
      setStart(caret - m[2].length - 1);
      setIdx(0);
    } else setQ(null);
  };

  const pick = (c: Cand) => {
    const el = inner.current;
    const caret = el?.selectionStart ?? value.length;
    const token = c.all ? "@همه" : mentionToken(c.name);
    const next = `${value.slice(0, start)}${token} ${value.slice(caret)}`;
    onChange({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLTextAreaElement>);
    setQ(null);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + token.length + 1;
      el.setSelectionRange(pos, pos);
    });
  };

  const open = q !== null && cands.length > 0;
  const keyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + cands.length) % cands.length);
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && !e.nativeEvent.isComposing) {
        e.preventDefault();
        pick(cands[Math.min(idx, cands.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setQ(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <textarea
        {...rest}
        ref={inner}
        value={value}
        className={`${className ?? ""} w-full`}
        onChange={(e) => {
          onChange(e);
          detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={keyDown}
        onKeyUp={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
        }}
        onClick={(e) => detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
        onBlur={(e) => {
          window.setTimeout(() => setQ(null), 120);
          onBlur?.(e);
        }}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (
        <div role="listbox" aria-label="پیشنهاد افراد" className={`absolute z-50 right-0 w-72 max-w-[calc(100vw-2rem)] bg-white border border-ink-200 rounded-xl shadow-lg py-1 ${placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1"}`}>
          {cands.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === idx}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setIdx(i)}
              onClick={() => pick(c)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-right ${i === idx ? "bg-brand-50" : "hover:bg-ink-50"}`}
            >
              {c.all ? (
                <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <Users size={14} />
                </span>
              ) : (
                <Avatar name={c.name} color={c.color} size={28} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-ink-800 truncate">{c.name}</span>
                <span className="block text-[10.5px] text-ink-400 truncate">{c.unit ? `${c.sub} · ${c.unit}` : c.sub}</span>
              </span>
            </button>
          ))}
          <p className="px-2.5 pt-1 mt-0.5 border-t border-ink-100 text-[10px] text-ink-400">↑↓ پیمایش · Enter یا Tab انتخاب · Esc بستن</p>
        </div>
      )}
    </div>
  );
});

export default MentionTextarea;
