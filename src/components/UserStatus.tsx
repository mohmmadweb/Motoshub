// ---------------------------------------------------------------------------
// «وضعیت من» (میزیتو: تعیین وضعیت برای کاربر) — «پیشنهادی» `PUT identity/me/status/`.
// - <UserStatusMenu />  بخش فشرده‌ی منوی آواتار (نوار بالا): انتخاب وضعیت + متن دلخواه + «تا»
// - <UserStatusBadge userId />  نمایش وضعیت کنار نام (نمایه، فهرست اعضا)
// - <UserStatusEditor />  همان انتخابگر در قالب کارت برای نمایه‌ی خود کاربر
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useTenancy } from "../context/TenancyContext";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { setUserStatus, statusDot, statusLabel, statusText, useUserStatus, type UserStatusCode } from "../iam/userStatus";

const CODES: UserStatusCode[] = ["available", "busy", "in_meeting", "on_leave", "custom"];
const dotBg: Record<(typeof statusDot)[UserStatusCode], string> = { success: "bg-emerald-600", danger: "bg-rose-600", warning: "bg-amber-500", neutral: "bg-ink-400", info: "bg-info" };

function Picker({ compact = false, onDone }: { compact?: boolean; onDone?: () => void }) {
  const { actingUser, readOnly } = useTenancy();
  const cur = useUserStatus(actingUser.id);
  const [text, setText] = useState(cur.text);
  const [until, setUntil] = useState(cur.until ?? "");
  const pick = (code: UserStatusCode) => {
    if (readOnly) return;
    setUserStatus(actingUser.id, { code, text: code === "available" ? "" : text.trim(), until: code === "available" ? null : until.trim() || null });
    if (code !== "custom") onDone?.();
  };
  const save = () => {
    if (readOnly) return;
    setUserStatus(actingUser.id, { code: cur.code === "available" && text.trim() ? "custom" : cur.code, text: text.trim(), until: until.trim() || null });
    onDone?.();
  };
  return (
    <div className={compact ? "px-2.5 pb-2 space-y-1.5" : "space-y-3"}>
      <div className={compact ? "grid grid-cols-2 gap-1" : "flex flex-wrap gap-2"} role="radiogroup" aria-label="وضعیت من">
        {CODES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={cur.code === c}
            disabled={readOnly}
            onClick={() => pick(c)}
            className={`flex items-center gap-1.5 rounded-lg text-right ${compact ? "px-2 py-1.5 text-[12px]" : "h-8 px-3 rounded-full border text-[13px]"} ${
              cur.code === c ? "bg-teal-50 font-bold text-teal-700 border-teal-500" : "text-ink-600 hover:bg-ink-50 border-[var(--color-border)]"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotBg[statusDot[c]]}`} />
            {statusLabel[c]}
          </button>
        ))}
      </div>
      {cur.code !== "available" && (
        <div className={compact ? "space-y-1" : "grid grid-cols-1 sm:grid-cols-[1fr_10rem_auto] gap-2 items-end"}>
          <label className="block">
            <span className="text-[11.5px] text-ink-500">{cur.code === "custom" ? "متن وضعیت" : "توضیح (اختیاری)"}</span>
            <input className="input-field !py-1.5 !text-[12.5px]" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} placeholder="مثلاً: تا ظهر در بازدید کارگاه" disabled={readOnly} />
          </label>
          <label className="block">
            <span className="text-[11.5px] text-ink-500">تا</span>
            <input className="input-field !py-1.5 !text-[12.5px]" value={until} onChange={(e) => setUntil(e.target.value)} placeholder="۱۴۰۵/۰۳/۱۰ یا ۱۶:۰۰" disabled={readOnly} />
          </label>
          <Button size="sm" variant="tonal" onClick={save} disabled={readOnly}>
            ثبت وضعیت
          </Button>
        </div>
      )}
    </div>
  );
}

/** بخش «وضعیت من» برای منوی آواتار نوار بالا (جایگزین بلوک فعلی Topbar) */
export function UserStatusMenu({ onDone }: { onDone?: () => void }) {
  return (
    <div>
      <p className="px-3.5 pt-2 pb-1 text-[11.5px] font-bold text-ink-500">وضعیت من</p>
      <Picker compact onDone={onDone} />
    </div>
  );
}

/** کارت انتخاب وضعیت در نمایه‌ی خود کاربر */
export function UserStatusEditor() {
  return <Picker />;
}

/** نشان وضعیت کاربر (برای «در دسترس» چیزی نمایش نمی‌دهد مگر `showAvailable`) */
export function UserStatusBadge({ userId, showAvailable = false }: { userId: string; showAvailable?: boolean }) {
  const st = useUserStatus(userId);
  if (st.code === "available" && !showAvailable) return null;
  const tone = statusDot[st.code] === "success" ? "success" : statusDot[st.code] === "danger" ? "danger" : statusDot[st.code] === "warning" ? "warning" : statusDot[st.code] === "info" ? "info" : "neutral";
  return (
    <Badge tone={tone} dot>
      {statusText(st)}
      {st.until ? ` · تا ${st.until}` : ""}
    </Badge>
  );
}

export default UserStatusMenu;
