// «بازبینی دسترسی‌ها» — مرور دوره‌ای تخصیص‌های زنده (مانند Access Reviews در Entra).
import { useMemo, useState } from "react";
import { AlarmClock, Ban, ClipboardCheck, History, Lightbulb, ShieldAlert, Sparkles, UserX } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useToast } from "../../../components/ui/ToastProvider";
import { useTenancy, type Check } from "../../../context/TenancyContext";
import { ancestorsOrSelf, descendantsOrSelf, type Binding } from "../../../iam/model";
import { Callout, GuardButton, ScopeName, ScopeSelect, SectionHead, UserCell, ValidityText, bindingStatus, daysAgoLabel, daysLeft, fmtN, lastActivityDays, userName, useSubtree } from "./shared";

type Decision = "keep" | "revoke";
type Flag = "admin" | "expiring" | "suspended" | "unused";
const flagMeta: Record<Flag, { label: string; tone: "warning" | "danger" | "neutral" | "navy"; icon: typeof Ban }> = {
  admin: { label: "نقش مدیریتی", tone: "navy", icon: ShieldAlert },
  expiring: { label: "انقضا تا ۳۰ روز", tone: "warning", icon: AlarmClock },
  suspended: { label: "عضویت معلق", tone: "danger", icon: UserX },
  unused: { label: "بدون استفاده", tone: "neutral", icon: Ban },
};
const UNUSED_DAYS = 75;

export function AccessReviewSection() {
  const t = useTenancy();
  const { iam, today } = t;
  const sub = useSubtree();
  const confirm = useConfirm();
  const { notify } = useToast();
  const reviewable = useMemo(() => sub.nodes.filter((n) => n.active && t.canAdmin(n.id, "iam.review.manage")), [sub, t]);
  const [scopeId, setScopeId] = useState(reviewable.find((n) => n.id === sub.root.id)?.id ?? reviewable[0]?.id ?? "");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const items = useMemo(() => {
    if (!scopeId) return [];
    const set = new Set(descendantsOrSelf(iam, scopeId).map((n) => n.id));
    return iam.bindings
      .filter((b) => set.has(b.scopeId) && bindingStatus(b, today) === "live")
      .map((b) => {
        const role = iam.roles.find((r) => r.id === b.roleId);
        const chain = new Set(ancestorsOrSelf(iam, b.scopeId).map((n) => n.id));
        const last = lastActivityDays(b.userId, b.id);
        const dl = daysLeft(b, today);
        const flags: Flag[] = [];
        if (t.isAdminRole(role)) flags.push("admin");
        if (dl !== null && dl <= 30) flags.push("expiring");
        if (iam.memberships.some((m) => m.userId === b.userId && m.status === "suspended" && chain.has(m.scopeId))) flags.push("suspended");
        if (last > UNUSED_DAYS) flags.push("unused");
        return { b, role, last, flags, check: t.checkRevoke(b) };
      });
  }, [iam, scopeId, today, t]);

  const byUser = useMemo(() => {
    const m = new Map<string, typeof items>();
    items.forEach((x) => m.set(x.b.userId, [...(m.get(x.b.userId) ?? []), x]));
    return [...m.entries()].sort((a, b) => userName(a[0]).localeCompare(userName(b[0]), "fa"));
  }, [items]);

  const decision = (b: Binding): Decision => decisions[b.id] ?? "keep";
  const setD = (id: string, d: Decision) => setDecisions((p) => ({ ...p, [id]: d }));
  const revokedIds = items.filter((x) => decision(x.b) === "revoke").map((x) => x.b.id);
  const flagged = items.filter((x) => x.flags.some((f) => f === "suspended" || f === "unused") && x.check.ok);

  const suggest = () => {
    setDecisions((p) => ({ ...p, ...Object.fromEntries(flagged.map((x) => [x.b.id, "revoke" as Decision])) }));
    notify(`${fmtN(flagged.length)} تخصیصِ بدون استفاده یا با عضویت معلق برای لغو علامت خورد.`, "info");
  };

  const canSubmit: Check = !scopeId ? { ok: false, reason: "واحدی برای بازبینی انتخاب نشده است." } : !t.canAdmin(scopeId, "iam.review.manage") ? { ok: false, reason: "اختیار بازبینی دسترسی در این واحد را ندارید." } : !items.length ? { ok: false, reason: "تخصیص زنده‌ای برای بازبینی وجود ندارد." } : { ok: true };

  const submit = () =>
    confirm({
      title: `ثبت نتیجه‌ی بازبینیِ «${t.scopeLabel(scopeId)}»؟`,
      message: `${fmtN(items.length - revokedIds.length)} تخصیص تأیید و ${fmtN(revokedIds.length)} تخصیص لغو می‌شود. نتیجه در تاریخچه‌ی تغییرناپذیر ثبت می‌شود.`,
      confirmLabel: "ثبت نتیجه",
      onConfirm: () => {
        t.completeReview(scopeId, revokedIds);
        setDecisions({});
        notify(`بازبینی ثبت شد: ${fmtN(revokedIds.length)} لغو، ${fmtN(items.length - revokedIds.length)} تأیید.`, "success");
      },
    });

  const history = iam.audits.filter((a) => a.event === "review.completed" && sub.ids.has(a.scopeId)).slice(0, 5);

  if (!reviewable.length)
    return (
      <div>
        <SectionHead icon={<ClipboardCheck size={18} />} title="بازبینی دسترسی‌ها" />
        <div className="card">
          <EmptyState icon={<ClipboardCheck size={22} />} title="اختیار بازبینی ندارید" description="بازبینی دوره‌ای دسترسی‌ها فقط برای مدیرانی است که مجوز «بازبینی دوره‌ای دسترسی‌ها» را در این محدوده دارند." />
        </div>
      </div>
    );

  return (
    <div>
      <SectionHead
        icon={<ClipboardCheck size={18} />}
        title="بازبینی دسترسی‌ها"
        description="هر چند وقت یک‌بار همه‌ی نقش‌های زنده‌ی یک واحد را مرور کنید: هر تخصیص یا تأیید می‌شود یا لغو."
        actions={<ScopeSelect value={scopeId} onChange={(id) => {
              setScopeId(id);
              setDecisions({});
            }} nodes={reviewable} className="w-full sm:w-72" ariaLabel="واحد مورد بازبینی" />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { l: "تخصیص زنده", v: items.length, c: "text-ink-900" },
          { l: "کاربر", v: byUser.length, c: "text-ink-900" },
          { l: "نیازمند توجه", v: items.filter((x) => x.flags.some((f) => f !== "admin")).length, c: "text-amber-700" },
          { l: "برای لغو", v: revokedIds.length, c: "text-rose-600" },
        ].map((s) => (
          <div key={s.l} className="card px-3 py-2.5">
            <p className={`text-lg font-black ${s.c}`}>{fmtN(s.v)}</p>
            <p className="text-[11px] text-ink-400">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Button size="sm" icon={<Sparkles size={13} />} onClick={suggest} disabled={!flagged.length} className="disabled:opacity-45">
          اعمال پیشنهادها ({fmtN(flagged.length)})
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDecisions({})} disabled={!revokedIds.length} className="disabled:opacity-45">
          همه را نگه دار
        </Button>
        <span className="text-[11px] text-ink-400 flex items-center gap-1">
          <Lightbulb size={12} /> «بدون استفاده» یعنی بیش از {fmtN(UNUSED_DAYS)} روز فعالیتی با این نقش ثبت نشده است.
        </span>
      </div>

      {byUser.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ClipboardCheck size={22} />} title="تخصیص زنده‌ای در این واحد نیست" />
        </div>
      ) : (
        <div className="space-y-3">
          {byUser.map(([uid, list]) => (
            <div key={uid} className="card overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-ink-50 border-b border-ink-100">
                <UserCell userId={uid} />
                <span className="text-[11px] text-ink-400 shrink-0">{fmtN(list.length)} نقش</span>
              </div>
              <ul className="divide-y divide-ink-100">
                {list.map((x) => {
                  const d = decision(x.b);
                  return (
                    <li key={x.b.id} className={`grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-2 md:gap-3 px-4 py-2.5 items-center ${d === "revoke" ? "bg-rose-50" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink-800 truncate">{x.role?.name}</p>
                        <ScopeName id={x.b.scopeId} />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {x.flags.map((f) => {
                          const M = flagMeta[f];
                          return (
                            <Badge key={f} tone={M.tone} icon={<M.icon size={10} />}>
                              {M.label}
                            </Badge>
                          );
                        })}
                        {!x.flags.length && <span className="text-[11px] text-ink-400">بدون هشدار</span>}
                      </div>
                      <div className="text-[11px] text-ink-500 leading-5">
                        <span className="block">آخرین فعالیت: {daysAgoLabel(x.last)}</span>
                        <ValidityText b={x.b} />
                      </div>
                      <div className="flex items-center rounded-lg border border-ink-200 overflow-hidden shrink-0 justify-self-start md:justify-self-end" role="radiogroup" aria-label="تصمیم">
                        <button type="button" onClick={() => setD(x.b.id, "keep")} className={`px-3 py-1.5 text-[12px] ${d === "keep" ? "bg-emerald-600 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
                          نگه‌داشتن
                        </button>
                        <button
                          type="button"
                          disabled={!x.check.ok}
                          title={x.check.ok ? undefined : x.check.reason}
                          onClick={() => setD(x.b.id, "revoke")}
                          className={`px-3 py-1.5 text-[12px] border-r border-ink-200 ${d === "revoke" ? "bg-rose-600 text-white" : "text-ink-600 hover:bg-ink-50"} disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          لغو
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="card p-3 mt-4 flex items-center justify-between gap-3 flex-wrap sticky bottom-2">
        <p className="text-[12px] text-ink-600">
          {fmtN(items.length - revokedIds.length)} تأیید · <b className="text-rose-600">{fmtN(revokedIds.length)} لغو</b>
        </p>
        <GuardButton variant="primary" icon={<ClipboardCheck size={14} />} check={canSubmit} onClick={submit}>
          ثبت نتیجه‌ی بازبینی
        </GuardButton>
      </div>

      <div className="mt-6">
        <p className="text-[12.5px] font-bold text-ink-700 mb-2 flex items-center gap-1.5">
          <History size={14} /> بازبینی‌های اخیر
        </p>
        {history.length ? (
          <ul className="card divide-y divide-ink-100">
            {history.map((a) => (
              <li key={a.id} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-[11px] text-ink-400 shrink-0 w-32">{a.at}</span>
                <span className="text-[12px] text-ink-700 flex-1 leading-5">{a.summary}</span>
                <span className="text-[11px] text-ink-500 shrink-0">{userName(a.actorId)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Callout tone="neutral">هنوز بازبینی‌ای در این محدوده ثبت نشده است. پیشنهاد: هر سه ماه یک‌بار نقش‌های مدیریتی و دسترسی‌های زمان‌دار را بازبینی کنید.</Callout>
        )}
      </div>
    </div>
  );
}
