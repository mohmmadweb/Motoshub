// ---------------------------------------------------------------------------
// «درخواست‌های دسترسی» (Just-in-time) — درخواست‌هایی که کاربران از «نقش و دسترسی من» فرستاده‌اند
// و به مدیرانی می‌رسد که در آن واحد اختیار «تخصیص نقش» دارند. تأیید = تخصیص زمان‌دار
// (assignRole با validUntil)، رد = با دلیل؛ هر دو در تاریخچه ثبت و به درخواست‌دهنده اعلان می‌شود.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Check as CheckIcon, Clock, Inbox, KeyRound, X } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useInbox } from "../../context/InboxContext";
import { addDays } from "../../pm/jalali";
import type { AccessRequest, AccessRequestStatus } from "../../iam/model";
import { CheckLine, Field, GuardButton, PermId, ScopeName, SectionHead, UserCell, fmtN, permLabel, userName, useSubtree } from "./iam/shared";

export const reqStatusLabel: Record<AccessRequestStatus, string> = { pending: "در انتظار", approved: "تأییدشده", rejected: "ردشده", cancelled: "انصراف" };
export const reqStatusTone: Record<AccessRequestStatus, BadgeTone> = { pending: "warning", approved: "success", rejected: "danger", cancelled: "neutral" };
export const durationLabel = (d: number | null) => (d ? `${fmtN(d)} روز` : "دائمی");

type Tab = "pending" | "history";

export default function AccessRequestsSection() {
  const t = useTenancy();
  const sub = useSubtree();
  const [tab, setTab] = useState<Tab>("pending");
  const [deciding, setDeciding] = useState<{ r: AccessRequest; mode: "approve" | "reject" } | null>(null);

  const inView = useMemo(() => t.iam.requests.filter((r) => sub.ids.has(r.scopeId) && t.canAdmin(r.scopeId, "roles.assign")), [t, sub]);
  const pending = inView.filter((r) => r.status === "pending");
  const history = inView.filter((r) => r.status !== "pending");
  const rows = tab === "pending" ? pending : history;

  return (
    <div>
      <SectionHead icon={<Inbox size={18} />} title="درخواست‌های دسترسی" description={`درخواست نقش‌های زمان‌دار در «${sub.root.name}» و زیرمجموعه‌هایش؛ تأیید شما یک تخصیص با تاریخ پایان می‌سازد.`} />
      <Tabs<Tab>
        tabs={[
          { id: "pending", label: "در انتظار بررسی", count: pending.length },
          { id: "history", label: "سابقه", count: history.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {rows.length === 0 && <EmptyState icon={<Inbox size={22} />} title={tab === "pending" ? "درخواستی در انتظار نیست" : "هنوز درخواستی بررسی نشده"} description="درخواست‌ها از صفحه‌ی «نقش و دسترسی من» ← «درخواست دسترسی» ثبت می‌شوند." />}
      <ul className="space-y-2">
        {rows.map((r) => (
          <RequestCard key={r.id} r={r} onDecide={(mode) => setDeciding({ r, mode })} />
        ))}
      </ul>
      {deciding && <DecideModal r={deciding.r} mode={deciding.mode} onClose={() => setDeciding(null)} />}
    </div>
  );
}

function RequestCard({ r, onDecide }: { r: AccessRequest; onDecide: (m: "approve" | "reject") => void }) {
  const t = useTenancy();
  const role = t.iam.roles.find((x) => x.id === r.roleId);
  const c = t.checkDecideRequest(r);
  return (
    <li className="card p-3.5">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <UserCell userId={r.userId} sub={`ثبت: ${r.createdAt}`} />
          <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[12px]">
            <Badge tone="brand" icon={<KeyRound size={11} />}>
              {role?.name ?? "—"}
            </Badge>
            <span className="text-ink-400">در</span>
            <span className="inline-flex">
              <ScopeName id={r.scopeId} />
            </span>
            <Badge tone="neutral" icon={<Clock size={11} />}>
              {durationLabel(r.durationDays)}
            </Badge>
            {t.isAdminRole(role) && <Badge tone="navy">مدیریتی</Badge>}
          </div>
          <p className="text-[12px] text-ink-600 mt-1.5 leading-6">«{r.reason}»</p>
          {r.perm && (
            <p className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1 flex-wrap">
              به‌خاطر مجوز: {permLabel(r.perm)} <PermId id={r.perm} />
            </p>
          )}
          {r.status !== "pending" && (
            <p className="text-[11.5px] text-ink-500 mt-1.5">
              {reqStatusLabel[r.status]} {r.decidedBy ? `توسط ${userName(r.decidedBy)}` : ""} {r.decidedAt ? `— ${r.decidedAt}` : ""}
              {r.validUntil ? ` · اعتبار تا ${r.validUntil}` : ""}
              {r.decisionNote ? ` · ${r.decisionNote}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={reqStatusTone[r.status]}>{reqStatusLabel[r.status]}</Badge>
          {r.status === "pending" && (
            <>
              <GuardButton size="sm" variant="ghost" icon={<X size={13} />} check={c} onClick={() => onDecide("reject")}>
                رد
              </GuardButton>
              <GuardButton size="sm" variant="primary" icon={<CheckIcon size={13} />} check={c} onClick={() => onDecide("approve")}>
                تأیید
              </GuardButton>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function DecideModal({ r, mode, onClose }: { r: AccessRequest; mode: "approve" | "reject"; onClose: () => void }) {
  const t = useTenancy();
  const inbox = useInbox();
  const { notify } = useToast();
  const [note, setNote] = useState("");
  const role = t.iam.roles.find((x) => x.id === r.roleId);
  const validUntil = r.durationDays ? addDays(t.today, r.durationDays) : undefined;
  const preview = mode === "approve" ? t.checkAssign({ userId: r.userId, roleId: r.roleId, scopeId: r.scopeId, validFrom: t.today, validUntil }) : note.trim().length >= 3 ? ({ ok: true } as const) : ({ ok: false, reason: "دلیل رد را بنویسید؛ برای درخواست‌دهنده فرستاده می‌شود." } as const);

  const submit = () => {
    const res = mode === "approve" ? t.approveRequest(r.id, note) : t.rejectRequest(r.id, note);
    if (!res.ok) return notify(res.reason, "warning");
    const text =
      mode === "approve"
        ? `درخواست شما برای نقش «${role?.name}» در «${t.scopeLabel(r.scopeId)}» تأیید شد${validUntil ? ` (تا ${validUntil})` : ""}.${note.trim() ? ` یادداشت مدیر: ${note.trim()}` : ""}`
        : `درخواست شما برای نقش «${role?.name}» در «${t.scopeLabel(r.scopeId)}» رد شد. دلیل: ${note.trim()}`;
    inbox.send([userName(r.userId)], "access", text, "/dashboard/access");
    notify(mode === "approve" ? `نقش «${role?.name}» به «${userName(r.userId)}» داده شد.` : "درخواست رد شد و به درخواست‌دهنده اطلاع داده شد.", "success");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={mode === "approve" ? "تأیید درخواست دسترسی" : "رد درخواست دسترسی"} description={`${userName(r.userId)} — «${role?.name}» در «${t.scopeLabel(r.scopeId)}»`} width="max-w-md">
      <div className="space-y-3">
        {mode === "approve" && (
          <div className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-[12px] text-ink-600 leading-6">
            تخصیص از امروز ({t.today}) {validUntil ? `تا ${validUntil}` : "بدون تاریخ پایان"} ثبت می‌شود و پس از آن خودکار بی‌اثر است.
          </div>
        )}
        <Field label={mode === "approve" ? "یادداشت (اختیاری)" : "دلیل رد (الزامی)"}>
          <textarea className="input-field min-h-[72px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "approve" ? "مثلاً: شماره‌ی ابلاغ ۱۲۳۴" : "مثلاً: این کار با نقش فعلی شما ممکن است."} />
        </Field>
        <CheckLine check={preview} okText={mode === "approve" ? "تخصیص قابل ثبت است." : "رد درخواست ثبت و اعلان می‌شود."} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <GuardButton variant={mode === "approve" ? "primary" : "danger"} check={preview} onClick={submit}>
            {mode === "approve" ? "تأیید و تخصیص" : "رد درخواست"}
          </GuardButton>
        </div>
      </div>
    </Modal>
  );
}
