// مسدودسازی دستی (F12): نوع (فقط‌خواندنی / تعلیق ورود / دائم)، مدت و دلیل الزامی؛ اعلان به کاربر
// با دلیل و زمان پایان و ثبت در لاگ ممیزی. از کارت عضو، جزئیات عضو در تنظیمات و صف گزارش تخلف.
import { useState } from "react";
import { Ban, ShieldOff } from "lucide-react";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useTenancy } from "../context/TenancyContext";
import { useInbox } from "../context/InboxContext";
import { users } from "../data/mock";
import { DURATION_OPTIONS, activeBlockOf, blockKindLabel, blockKindShort, blockUser, blocksStore, liftBlock, type BlockKind } from "./blocks";
import { minutesLabel } from "./securityClock";
import { useLocalStore } from "./store";

/** مجوز مسدودسازی: users.block (یا ناظر محتوا در صف گزارش تخلف) */
export function useCanBlock(extraPerm?: string) {
  const t = useTenancy();
  return !t.readOnly && (t.hasPermission("users.block") || (!!extraPerm && t.hasPermission(extraPerm)));
}

export function BlockUserModal({ userId, defaultReason = "", onClose }: { userId: string | null; defaultReason?: string; onClose: () => void }) {
  const t = useTenancy();
  const inbox = useInbox();
  const { notify } = useToast();
  const [kind, setKind] = useState<BlockKind>("read_only");
  const [dur, setDur] = useState<number | null>(1440);
  const [reason, setReason] = useState(defaultReason);
  const [err, setErr] = useState("");
  const u = users.find((x) => x.id === userId);
  if (!userId || !u) return null;
  const submit = () => {
    if (!reason.trim()) return setErr("دلیل مسدودسازی الزامی است؛ برای کاربر هم ارسال می‌شود.");
    if (userId === t.realActingUser.id) return setErr("نمی‌توانید حساب خودتان را مسدود کنید.");
    const durationMinutes = kind === "permanent" ? null : dur;
    const b = blockUser({ userId, kind, durationMinutes, reason, by: t.realActingUser.id });
    inbox.send([u.name], "security", `حساب شما ${blockKindShort[b.kind]} شد${b.until ? ` تا ${b.until}` : " (دائم)"}. دلیل: ${b.reason}`, `/dashboard/profile/${u.id}?tab=security`, { urgent: true, system: true });
    notify(`«${u.name}» ${blockKindShort[b.kind]} شد (${minutesLabel(durationMinutes)}).`, "success");
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`مسدودسازی «${u.name}»`} description="نوع، مدت و دلیل؛ کاربر با دلیل و زمان پایان مطلع می‌شود و رویداد در لاگ ممیزی ثبت می‌شود." width="max-w-md">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="نوع مسدودسازی">
          {(Object.keys(blockKindLabel) as BlockKind[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`text-right rounded-lg border px-3 py-2 text-[12.5px] ${kind === k ? "border-rose-300 bg-rose-50 text-rose-800" : "border-ink-200 text-ink-700 hover:bg-ink-50"}`}>
              <span className="font-semibold">{blockKindLabel[k]}</span>
              <span className="block text-[11px] text-ink-500">{k === "read_only" ? "می‌بیند ولی نمی‌تواند پیام، پاسخ یا محتوا بفرستد." : k === "login" ? "ورود ممکن نیست و نشست‌های باز بسته می‌شوند." : "تا رفع دستی، ورود و ارسال ممکن نیست."}</span>
            </button>
          ))}
        </div>
        {kind !== "permanent" && (
          <label className="block">
            <span className="text-xs font-medium text-ink-600 block mb-1.5">مدت</span>
            <select className="input-field" value={dur ?? ""} onChange={(e) => setDur(e.target.value ? Number(e.target.value) : null)}>
              {DURATION_OPTIONS.filter((d) => d !== null).map((d) => (
                <option key={d} value={d!}>
                  {minutesLabel(d)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="text-xs font-medium text-ink-600 block mb-1.5">دلیل (برای کاربر ارسال می‌شود)</span>
          <textarea className="input-field min-h-[70px]" value={reason} onChange={(e) => (setReason(e.target.value), setErr(""))} placeholder="مثلاً: ارسال مکرر پیام تبلیغاتی در گروه‌ها" />
        </label>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button variant="danger" icon={<Ban size={14} />} onClick={submit}>
            مسدود کن
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** دکمه‌ی «مسدودسازی کاربر» / «رفع مسدودی» — اگر مسدودی فعال دارد، رفعش؛ وگرنه مودال */
export function BlockUserButton({ userId, defaultReason, extraPerm, size = "sm" }: { userId: string; defaultReason?: string; extraPerm?: string; size?: "sm" | "md" }) {
  useLocalStore(blocksStore);
  const can = useCanBlock(extraPerm);
  const t = useTenancy();
  const inbox = useInbox();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  if (!can || userId === t.realActingUser.id) return null;
  const b = activeBlockOf(userId);
  const name = users.find((u) => u.id === userId)?.name ?? "";
  if (b)
    return (
      <Button
        size={size}
        variant="secondary"
        icon={<ShieldOff size={13} />}
        title={`${blockKindShort[b.kind]} — ${b.reason}`}
        onClick={() =>
          confirm({
            title: `مسدودی «${name}» برداشته شود؟`,
            message: `${blockKindLabel[b.kind]}${b.until ? ` تا ${b.until}` : " (دائم)"} — ${b.reason}`,
            confirmLabel: "رفع مسدودی",
            onConfirm: () => {
              liftBlock(b.id, t.realActingUser.id);
              inbox.send([name], "security", "مسدودی حساب شما برداشته شد.", `/dashboard/profile/${userId}?tab=security`, { system: true });
              notify(`مسدودی «${name}» برداشته شد.`, "success");
            },
          })
        }
      >
        رفع مسدودی
      </Button>
    );
  return (
    <>
      <Button size={size} variant="secondary" className="text-rose-600" icon={<Ban size={13} />} onClick={() => setOpen(true)}>
        مسدودسازی کاربر
      </Button>
      {open && <BlockUserModal userId={userId} defaultReason={defaultReason} onClose={() => setOpen(false)} />}
    </>
  );
}
