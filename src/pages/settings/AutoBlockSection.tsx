// ---------------------------------------------------------------------------
// «مسدودسازی خودکار» (F12 · قلم ۱.۱۹.۵) — تنظیمات سامانه ← ورود و امنیت.
// قواعد: N تلاش ناموفق ورود در M دقیقه (= login_attempts / lock_minutes «نشست و قفل حساب»)،
// عبور مکرر از سقف درخواست، گزارش‌های تخلف تأییدشده، هرزنامه؛ اقدام: فقط‌خواندنی / تعلیق ورود /
// دائم با مدت، و «نیاز به بازبینی راهبر». فهرست سفید. فهرست «کاربران مسدودشده» با زمان باقی‌مانده،
// دلیل، اقدام‌کننده و رفع مسدودی (BlockedUsersList — در «امنیت و انطباق» هم استفاده می‌شود).
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { Ban, Check, Clock, Plus, RotateCcw, Save, ShieldAlert, ShieldOff, Trash2, UserCheck } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useInbox } from "../../context/InboxContext";
import { useSocial } from "../../context/SocialContext";
import { useAbuseRules } from "../../iam/useAbuseRules";
import { users } from "../../data/mock";
import { DURATION_OPTIONS, blockKindLabel, blockKindShort, confirmReview, isLive, liftBlock, saveBlockPolicy, triggerLabel, triggerUnit, useBlocks, type BlockKind, type BlockRule } from "../../iam/blocks";
import { BlockUserModal, useCanBlock } from "../../iam/BlockUserModal";
import { durationLabel, minutesLabel } from "../../iam/securityClock";
import { securityEndpoints } from "../../iam/securityEndpoints";
import { emitSettingsChange } from "../../iam/settingsAudit";
import { ApiChip } from "../social/kit";
import { Callout, SectionHead, UserPicker, fmtN } from "./iam/shared";

const WINDOWS = [5, 15, 60, 1440, 10080, 43200];
const uname = (id: string) => (id === "system" ? "سامانه (قاعده‌ی خودکار)" : users.find((u) => u.id === id)?.name ?? id);

export default function AutoBlockSection() {
  const t = useTenancy();
  const st = useBlocks();
  const { notify } = useToast();
  const canEdit = t.hasPermission("settings.security") && !t.readOnly;
  const [rules, setRules] = useState<BlockRule[]>(st.rules);
  const [wl, setWl] = useState<string[]>(st.whitelist);
  const [pickWl, setPickWl] = useState(false);
  const dirty = JSON.stringify(rules) !== JSON.stringify(st.rules) || JSON.stringify(wl) !== JSON.stringify(st.whitelist);
  const setRule = (id: string, patch: Partial<BlockRule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = () => {
    saveBlockPolicy(rules, wl, t.actingUser.name);
    emitSettingsChange({ area: "مسدودسازی خودکار", summary: `قواعد: ${rules.filter((r) => r.enabled).map((r) => `${triggerLabel[r.trigger]} ≥ ${r.threshold} → ${blockKindShort[r.kind]} ${minutesLabel(r.duration_minutes)}`).join(" · ")}`, before: { rules: st.rules.length, whitelist: st.whitelist.length }, after: { rules: rules.length, whitelist: wl.length } });
    notify("قواعد مسدودسازی خودکار ذخیره شد.", "success");
  };

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<ShieldAlert size={18} />}
        title="مسدودسازی خودکار"
        description="چه رفتاری، چه مدت و چه نوع مسدودی. مسدودسازی دستی هم زمان‌دار است (کارت عضو، جزئیات عضو و صف گزارش تخلف)."
        actions={
          <>
            <ApiChip items={[{ label: "قواعد مسدودسازی", ep: securityEndpoints.blockRules() }, { label: "ذخیره‌ی قواعد", ep: securityEndpoints.blockRulesSave() }, { label: "مسدودی‌های کاربر", ep: securityEndpoints.userBlocks("{id}") }, { label: "مسدودسازی دستی", ep: securityEndpoints.userBlockCreate("{id}") }, { label: "رفع مسدودی", ep: securityEndpoints.userBlockDelete("{id}", "{block_id}") }]} />
            {st.updatedAt && <span className="text-[11px] text-ink-400">آخرین ذخیره: {st.updatedAt} — {st.updatedBy}</span>}
            <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} disabled={!canEdit || !dirty} onClick={() => (setRules(st.rules), setWl(st.whitelist))}>
              بازگردانی
            </Button>
            <Button variant="primary" size="sm" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
              ذخیره
            </Button>
          </>
        }
      />

      <div className="card p-0 overflow-hidden">
        <ul className="divide-y divide-ink-100">
          {rules.map((r) => (
            <li key={r.id} className={`px-4 py-3 space-y-2 ${r.enabled ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-ink-800">{triggerLabel[r.trigger]}</p>
                <Toggle on={r.enabled} disabled={!canEdit} onChange={() => setRule(r.id, { enabled: !r.enabled })} label={`قاعده‌ی ${triggerLabel[r.trigger]}`} />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-ink-600">
                <input type="number" min={1} max={100} className="input-field !w-16 !py-1" aria-label="آستانه" value={r.threshold} disabled={!canEdit} onChange={(e) => setRule(r.id, { threshold: Math.max(1, Number(e.target.value) || 1) })} />
                <span>{triggerUnit[r.trigger]} در</span>
                <select className="input-field !w-auto !py-1" aria-label="بازه" value={r.window_minutes} disabled={!canEdit} onChange={(e) => setRule(r.id, { window_minutes: Number(e.target.value) })}>
                  {[...new Set([...WINDOWS, r.window_minutes])].sort((a, b) => a - b).map((w) => (
                    <option key={w} value={w}>
                      {minutesLabel(w)}
                    </option>
                  ))}
                </select>
                <span>←</span>
                <select className="input-field !w-auto !py-1" aria-label="نوع مسدودی" value={r.kind} disabled={!canEdit} onChange={(e) => setRule(r.id, { kind: e.target.value as BlockKind, ...(e.target.value === "permanent" ? { duration_minutes: null } : r.duration_minutes === null ? { duration_minutes: 1440 } : {}) })}>
                  {(Object.keys(blockKindLabel) as BlockKind[]).map((k) => (
                    <option key={k} value={k}>
                      {blockKindShort[k]}
                    </option>
                  ))}
                </select>
                {r.kind !== "permanent" && (
                  <select className="input-field !w-auto !py-1" aria-label="مدت" value={r.duration_minutes ?? ""} disabled={!canEdit} onChange={(e) => setRule(r.id, { duration_minutes: Number(e.target.value) })}>
                    {[...new Set([...DURATION_OPTIONS.filter((x): x is number => x !== null), ...(r.duration_minutes ? [r.duration_minutes] : [])])].sort((a, b) => a - b).map((m) => (
                      <option key={m} value={m}>
                        {minutesLabel(m)}
                      </option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-1 mr-1">
                  <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={r.needs_review} disabled={!canEdit} onChange={() => setRule(r.id, { needs_review: !r.needs_review })} /> نیاز به بازبینی راهبر
                </label>
              </div>
              {r.trigger === "failed_logins" && <p className="text-[11px] text-ink-400">همان «حداکثر تلاش ناموفق ورود» و «مدت قفل حساب» در «ورود و احراز هویت ← نشست و قفل حساب»؛ پس از مدت تعیین‌شده خودکار برداشته می‌شود.</p>}
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-ink-100 flex items-center gap-2 flex-wrap">
          <UserCheck size={14} className="text-emerald-600" />
          <span className="text-[12px] text-ink-700">فهرست سفید (قواعد خودکار اعمال نمی‌شود):</span>
          {wl.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-ink-200 pl-1 pr-2 py-0.5 text-[11px] text-ink-700">
              {uname(id)}
              <button type="button" disabled={!canEdit} onClick={() => setWl((x) => x.filter((y) => y !== id))} aria-label={`حذف ${uname(id)}`} className="text-ink-400 hover:text-rose-600">
                <Trash2 size={11} />
              </button>
            </span>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus size={12} />} disabled={!canEdit} onClick={() => setPickWl(true)}>
            افزودن
          </Button>
        </div>
      </div>

      <BlockedUsersList />

      {pickWl && (
        <Modal open onClose={() => setPickWl(false)} title="افزودن به فهرست سفید" width="max-w-md">
          <UserPicker value={wl} onChange={setWl} multiple />
          <div className="flex justify-end mt-3">
            <Button variant="primary" onClick={() => setPickWl(false)}>
              تأیید
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** «کاربران مسدودشده»: فعال‌ها با زمان باقی‌مانده، دلیل، اقدام‌کننده و رفع مسدودی + سابقه‌ی اخیر */
export function BlockedUsersList() {
  const t = useTenancy();
  const st = useBlocks();
  const social = useSocial();
  useAbuseRules(social.reports);
  const inbox = useInbox();
  const confirm = useConfirm();
  const { notify } = useToast();
  const canBlock = useCanBlock();
  const [blockFor, setBlockFor] = useState<string | null>(null);
  const [pick, setPick] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const h = window.setInterval(() => tick((x) => x + 1), 30_000);
    return () => window.clearInterval(h);
  }, []);
  const now = Date.now();
  const live = st.blocks.filter((b) => isLive(b, now));
  const past = st.blocks.filter((b) => !isLive(b, now)).slice(0, 10);
  const lift = (id: string, userId: string) =>
    confirm({
      title: `مسدودی «${uname(userId)}» برداشته شود؟`,
      confirmLabel: "رفع مسدودی",
      onConfirm: () => {
        liftBlock(id, t.realActingUser.id, "رفع دستی توسط راهبر");
        inbox.send([uname(userId)], "security", "مسدودی حساب شما برداشته شد.", `/dashboard/profile/${userId}?tab=security`, { system: true });
        notify("مسدودی برداشته شد.", "success");
      },
    });
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
          <Ban size={15} className="text-rose-600" /> کاربران مسدودشده ({fmtN(live.length)})
        </h3>
        {canBlock && (
          <Button size="sm" icon={<Plus size={12} />} onClick={() => setPick(true)}>
            مسدودسازی دستی
          </Button>
        )}
      </div>
      <ul className="divide-y divide-ink-100 border-t border-ink-100">
        {live.map((b) => (
          <li key={b.id} className="px-4 py-2.5 flex items-start gap-2 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <p className="text-[12.5px] font-medium text-ink-800 flex items-center gap-1.5 flex-wrap">
                {uname(b.user_id)}
                <Badge tone={b.kind === "read_only" ? "warning" : "danger"}>{blockKindShort[b.kind]}</Badge>
                <Badge tone="neutral">{b.source === "rule" ? "قاعده‌ی خودکار" : "دستی"}</Badge>
                {b.needs_review && <Badge tone="warning">منتظر بازبینی راهبر</Badge>}
              </p>
              <p className="text-[11.5px] text-ink-500 mt-0.5 leading-5">{b.reason}</p>
              <p className="text-[11px] text-ink-400 flex items-center gap-1 flex-wrap">
                <Clock size={11} /> {b.until_ms === null ? "دائم" : `${durationLabel(b.until_ms - now)} باقی‌مانده (تا ${b.until})`} · از {b.from} · {uname(b.by)}
              </p>
            </div>
            {canBlock && (
              <span className="flex items-center gap-1.5">
                {b.needs_review && (
                  <Button size="sm" variant="secondary" icon={<Check size={12} />} onClick={() => (confirmReview(b.id, t.realActingUser.id), notify("مسدودی تأیید شد.", "success"))}>
                    تأیید
                  </Button>
                )}
                <Button size="sm" variant="ghost" icon={<ShieldOff size={12} />} onClick={() => lift(b.id, b.user_id)}>
                  رفع مسدودی
                </Button>
              </span>
            )}
          </li>
        ))}
        {live.length === 0 && <li className="px-4 py-3 text-xs text-ink-400">در حال حاضر کاربر مسدودشده‌ای وجود ندارد.</li>}
      </ul>
      {past.length > 0 && (
        <div className="border-t border-ink-100">
          <button type="button" onClick={() => setShowPast((v) => !v)} className="w-full text-[11.5px] text-ink-500 hover:text-brand-700 py-2" aria-expanded={showPast}>
            {showPast ? "پنهان کردن سابقه" : `سابقه‌ی مسدودی‌های پایان‌یافته (${fmtN(past.length)})`}
          </button>
          {showPast && (
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {past.map((b) => (
                <li key={b.id} className="px-4 py-2 text-[11.5px] text-ink-500">
                  {uname(b.user_id)} · {blockKindShort[b.kind]} · {b.reason} · {b.lifted_at ? `رفع ${b.lifted_at} توسط ${uname(b.lifted_by ?? "")}` : `پایان ${b.until}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="px-4 py-2.5 border-t border-ink-100">
        <Callout tone="neutral">کاربر فقط‌خواندنی وارد می‌شود ولی نمی‌تواند پاسخ، پرسش یا پیام بفرستد و پیام دلیل و زمان پایان را می‌بیند؛ «تعلیق ورود» و «دائم» در صفحه‌ی ورود رد می‌شوند. هر مسدودی و رفع آن در لاگ ممیزی ثبت و به کاربر اعلان می‌شود.</Callout>
      </div>
      {pick && (
        <Modal open onClose={() => setPick(false)} title="انتخاب کاربر برای مسدودسازی" width="max-w-md">
          <UserPicker value={[]} onChange={(ids) => (setPick(false), setBlockFor(ids[0] ?? null))} candidates={users.filter((u) => u.id !== t.realActingUser.id).map((u) => u.id)} />
        </Modal>
      )}
      {blockFor && <BlockUserModal userId={blockFor} onClose={() => setBlockFor(null)} />}
    </div>
  );
}

