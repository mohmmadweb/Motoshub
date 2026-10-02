// «تخصیص نقش» — کاربر + نقش + واحد (+ بازه‌ی اعتبار).
import { useMemo, useState } from "react";
import { CalendarClock, Check as CheckIcon, KeyRound, Lock, UserCheck, Users, UsersRound, X, XCircle } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import EmptyState from "../../../components/ui/EmptyState";
import JalaliDatePicker from "../../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useToast } from "../../../components/ui/ToastProvider";
import { useTenancy, type BindingInput, type Check } from "../../../context/TenancyContext";
import { descendantsOrSelf, type Binding } from "../../../iam/model";
import {
  BindingStatusBadge,
  Callout,
  CheckLine,
  Field,
  GuardButton,
  IconAction,
  ScopeName,
  ScopeSelect,
  SearchBox,
  SectionHead,
  UserCell,
  UserPicker,
  ValidityText,
  bindingStatus,
  daysLeft,
  fmtN,
  userName,
  useRun,
  useSubtree,
  type BStatus,
} from "./shared";

type StatusFilter = "current" | BStatus | "all";

export function BindingsSection() {
  const t = useTenancy();
  const { iam, today } = t;
  const sub = useSubtree();
  const run = useRun();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState("");
  const [scopeF, setScopeF] = useState("");
  const [statusF, setStatusF] = useState<StatusFilter>("current");
  const [modal, setModal] = useState<"single" | "bulk" | null>(null);

  const assignScopes = useMemo(() => sub.nodes.filter((n) => n.active && t.canAdmin(n.id, "roles.assign")), [sub, t]);
  const roleOptions = useMemo(() => {
    const ids = new Set(iam.bindings.filter((b) => sub.ids.has(b.scopeId)).map((b) => b.roleId));
    return iam.roles.filter((r) => ids.has(r.id));
  }, [iam, sub]);

  const rows = useMemo(() => {
    const scopeSet = scopeF ? new Set(descendantsOrSelf(iam, scopeF).map((n) => n.id)) : sub.ids;
    return iam.bindings
      .filter((b) => scopeSet.has(b.scopeId))
      .filter((b) => !roleF || b.roleId === roleF)
      .filter((b) => {
        const s = bindingStatus(b, today);
        return statusF === "all" ? true : statusF === "current" ? s !== "revoked" : s === statusF;
      })
      .filter((b) => !q.trim() || userName(b.userId).includes(q.trim()) || (b.note ?? "").includes(q.trim()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [iam, sub, scopeF, roleF, statusF, q, today]);

  const revoke = (b: Binding) => {
    const r = iam.roles.find((x) => x.id === b.roleId);
    confirm({
      title: `لغو نقش «${r?.name}» از «${userName(b.userId)}»؟`,
      message: `مجوزهای این نقش در «${t.scopeLabel(b.scopeId)}» و همه‌ی زیرمجموعه‌هایش بلافاصله از او گرفته می‌شود. سابقه در تاریخچه می‌ماند.`,
      confirmLabel: "بله، لغو شود",
      onConfirm: () => run(t.revokeBinding(b.id), "تخصیص لغو شد."),
    });
  };

  const addCheck: Check = assignScopes.length ? { ok: true } : { ok: false, reason: "در هیچ واحدی از محدوده‌ی فعلی اختیار تخصیص نقش ندارید." };
  const counts = useMemo(() => {
    const c = { live: 0, future: 0, expired: 0 };
    iam.bindings.filter((b) => sub.ids.has(b.scopeId)).forEach((b) => {
      const s = bindingStatus(b, today);
      if (s !== "revoked") c[s]++;
    });
    return c;
  }, [iam, sub, today]);

  return (
    <div>
      <SectionHead
        icon={<UserCheck size={18} />}
        title="تخصیص نقش"
        description="هر تخصیص یعنی «این کاربر، این نقش را، در این واحد (و همه‌ی زیرمجموعه‌هایش)» — اختیاری با تاریخ شروع و پایان."
        actions={
          <>
            <GuardButton icon={<UsersRound size={15} />} check={addCheck} onClick={() => setModal("bulk")}>
              تخصیص گروهی
            </GuardButton>
            <GuardButton variant="primary" icon={<KeyRound size={15} />} check={addCheck} onClick={() => setModal("single")}>
              ثبت تخصیص
            </GuardButton>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-3 text-[12px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1">
          <CheckIcon size={12} /> {fmtN(counts.live)} فعال
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1">
          <CalendarClock size={12} /> {fmtN(counts.future)} آینده
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1">
          <XCircle size={12} /> {fmtN(counts.expired)} منقضی
        </span>
      </div>

      <div className="card p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="جستجوی کاربر یا یادداشت…" />
        <select className="input-field" value={roleF} onChange={(e) => setRoleF(e.target.value)} aria-label="نقش">
          <option value="">همه‌ی نقش‌ها</option>
          {roleOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <ScopeSelect value={scopeF} onChange={setScopeF} nodes={sub.nodes} allLabel="همه‌ی واحدها" />
        <select className="input-field" value={statusF} onChange={(e) => setStatusF(e.target.value as StatusFilter)} aria-label="وضعیت">
          <option value="current">جاری (بدون لغوشده‌ها)</option>
          <option value="live">فعال</option>
          <option value="future">آینده</option>
          <option value="expired">منقضی</option>
          <option value="revoked">لغوشده</option>
          <option value="all">همه</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden lg:grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_44px] gap-3 px-4 py-2 bg-ink-50 border-b border-ink-100 text-[11px] font-bold text-ink-500">
          <span>کاربر</span>
          <span>نقش</span>
          <span>واحد</span>
          <span>اعتبار</span>
          <span>ثبت‌کننده</span>
          <span />
        </div>
        {rows.length === 0 && <EmptyState icon={<KeyRound size={22} />} title="تخصیصی پیدا نشد" description="فیلترها را تغییر دهید یا تخصیص جدید ثبت کنید." />}
        <ul className="divide-y divide-ink-100">
          {rows.map((b) => {
            const r = iam.roles.find((x) => x.id === b.roleId);
            const s = bindingStatus(b, today);
            const dl = daysLeft(b, today);
            const c = s === "revoked" ? ({ ok: false, reason: "این تخصیص قبلاً لغو شده است." } as Check) : t.checkRevoke(b);
            return (
              <li key={b.id} className={`grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_44px] gap-x-3 gap-y-1.5 px-4 py-2.5 items-center ${s === "revoked" ? "opacity-60" : ""}`}>
                <UserCell userId={b.userId} />
                <span className="lg:hidden flex justify-end">
                  <BindingStatusBadge status={s} />
                </span>
                <span className="min-w-0 col-span-2 lg:col-span-1 flex items-center gap-1.5 flex-wrap">
                  <KeyRound size={12} className="text-brand-600 shrink-0" />
                  <span className="text-[12.5px] font-semibold text-ink-800 truncate">{r?.name ?? "نقش حذف‌شده"}</span>
                  {t.isAdminRole(r) && <Badge tone="warning">مدیریتی</Badge>}
                </span>
                <span className="min-w-0 col-span-2 lg:col-span-1">
                  <ScopeName id={b.scopeId} showPath />
                </span>
                <span className="min-w-0 col-span-2 lg:col-span-1 flex items-center gap-1.5 flex-wrap">
                  <span className="hidden lg:inline">
                    <BindingStatusBadge status={s} />
                  </span>
                  <ValidityText b={b} />
                  {s === "live" && dl !== null && dl <= 30 && <span className="text-[10.5px] text-amber-700">({fmtN(dl)} روز مانده)</span>}
                </span>
                <span className="min-w-0 text-[11px] text-ink-500 leading-5">
                  <span className="block truncate">{userName(b.createdBy)}</span>
                  <span className="block text-ink-400">{b.createdAt}</span>
                  {b.note && (
                    <span className="block text-ink-500 truncate" title={b.note}>
                      «{b.note}»
                    </span>
                  )}
                </span>
                <span className="flex justify-end">
                  {s !== "revoked" ? <IconAction check={c} icon={<X size={15} />} label="لغو تخصیص" tone="danger" onClick={() => revoke(b)} /> : <Lock size={13} className="text-ink-300" />}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {modal && <AssignModal bulk={modal === "bulk"} scopes={assignScopes} onClose={() => setModal(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
function AssignModal({ bulk, scopes, onClose }: { bulk: boolean; scopes: ReturnType<typeof useSubtree>["nodes"]; onClose: () => void }) {
  const t = useTenancy();
  const run = useRun();
  const { notify } = useToast();
  const sub = useSubtree();
  const [userIds, setUserIds] = useState<string[]>([]);
  const [scopeId, setScopeId] = useState(scopes.find((s) => s.id === sub.root.id)?.id ?? scopes[0]?.id ?? "");
  const [roleId, setRoleId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");

  const roles = t.assignableRoles(scopeId);
  const probeUser = userIds[0] ?? "";
  const input = (userId: string): BindingInput => ({ userId, roleId, scopeId, validFrom: validFrom || undefined, validUntil: validUntil || undefined, note: note.trim() || undefined });
  const roleCheck = (rid: string) => t.checkAssign({ userId: probeUser, roleId: rid, scopeId });
  const perUser = userIds.map((u) => ({ u, c: roleId ? t.checkAssign(input(u)) : ({ ok: false, reason: "نقش را انتخاب کنید." } as Check) }));
  const okCount = perUser.filter((x) => x.c.ok).length;
  const firstFail = perUser.map((x) => (x.c.ok ? undefined : x.c.reason)).find(Boolean);
  const overall: Check = !userIds.length
    ? { ok: false, reason: bulk ? "حداقل یک کاربر انتخاب کنید." : "کاربر را انتخاب کنید." }
    : !roleId
      ? { ok: false, reason: "نقش را انتخاب کنید." }
      : bulk
        ? okCount
          ? { ok: true }
          : { ok: false, reason: firstFail ?? "هیچ تخصیصی معتبر نیست." }
        : perUser[0].c;

  const submit = () => {
    if (!bulk) {
      if (run(t.assignRole(input(userIds[0])), `نقش به «${userName(userIds[0])}» داده شد.`)) onClose();
      return;
    }
    let done = 0;
    const fails: string[] = [];
    perUser.forEach(({ u, c }) => {
      if (!c.ok) return fails.push(`${userName(u)}: ${c.reason}`);
      const r = t.assignRole(input(u));
      if (r.ok) done++;
      else fails.push(`${userName(u)}: ${r.reason}`);
    });
    notify(`${fmtN(done)} تخصیص ثبت شد${fails.length ? `؛ ${fmtN(fails.length)} مورد رد شد (${fails[0]}${fails.length > 1 ? " …" : ""})` : "."}`, fails.length ? "warning" : "success");
    if (done) onClose();
  };

  return (
    <Modal open onClose={onClose} title={bulk ? "تخصیص گروهی نقش" : "ثبت تخصیص نقش"} description={bulk ? "یک نقش را در یک واحد هم‌زمان به چند نفر بدهید." : "کاربر + نقش + واحد، با بازه‌ی اعتبار اختیاری."} width="max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3 min-w-0">
          <Field label={bulk ? "کاربران" : "کاربر"}>
            <UserPicker value={userIds} onChange={setUserIds} multiple={bulk} />
          </Field>
          <Field label="واحد" hint="نقش در این واحد و همه‌ی زیرمجموعه‌هایش اعمال می‌شود.">
            <ScopeSelect
              value={scopeId}
              onChange={(id) => {
                setScopeId(id);
                setRoleId("");
              }}
              nodes={scopes}
            />
          </Field>
        </div>
        <div className="space-y-3 min-w-0">
          <Field label="نقش" hint="نقش‌های تعریف‌شده در همین واحد یا لایه‌های بالاتر که برای این نوع واحد مجازند.">
            <div className="rounded-lg border border-ink-200 max-h-56 overflow-y-auto divide-y divide-ink-100">
              {roles.map((r) => {
                const c = roleCheck(r.id);
                const dup = !c.ok && c.reason.includes("از قبل");
                const blocked = !c.ok && !dup;
                const on = roleId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => setRoleId(r.id)}
                    title={c.ok ? r.description : c.reason}
                    className={`w-full text-right px-3 py-2 flex items-start gap-2 ${on ? "bg-brand-50" : "hover:bg-ink-50"} disabled:cursor-not-allowed`}
                  >
                    <span className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${on ? "bg-brand-600 border-brand-600 text-white" : "border-ink-300"}`}>{on && <CheckIcon size={10} strokeWidth={3} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${blocked ? "text-ink-400" : "text-ink-800"}`}>
                        {r.name}
                        {r.builtIn && <Badge tone="navy">پایه</Badge>}
                        {t.isAdminRole(r) && <Badge tone="warning">مدیریتی</Badge>}
                      </span>
                      <span className="block text-[10.5px] text-ink-400">
                        {fmtN(r.permissions.length)} مجوز · تعریف‌شده در {t.scopeLabel(r.createdIn)}
                      </span>
                      {!c.ok && (
                        <span className={`flex items-start gap-1 text-[10.5px] mt-0.5 ${dup ? "text-amber-700" : "text-rose-600"}`}>
                          <Lock size={10} className="mt-0.5 shrink-0" /> {c.reason}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
              {roles.length === 0 && <p className="px-3 py-4 text-center text-[12px] text-ink-400">نقشی برای این واحد قابل تخصیص نیست.</p>}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="از تاریخ (اختیاری)">
              <JalaliDatePicker value={validFrom} onChange={setValidFrom} placeholder="از امروز" />
            </Field>
            <Field label="تا تاریخ (اختیاری)">
              <JalaliDatePicker value={validUntil} onChange={setValidUntil} placeholder="بدون پایان" />
            </Field>
          </div>
          {(validFrom || validUntil) && (
            <button
              type="button"
              className="text-[11px] text-ink-500 hover:text-ink-800"
              onClick={() => {
                setValidFrom("");
                setValidUntil("");
              }}
            >
              پاک کردن بازه‌ی اعتبار
            </button>
          )}
          <Field label="یادداشت / شماره‌ی ابلاغ">
            <input className="input-field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: ابلاغ ۱۲۳۴ — پوشش مرخصی" />
          </Field>
        </div>
      </div>

      {bulk && userIds.length > 0 && roleId && (
        <div className="mt-4 rounded-lg border border-ink-100 divide-y divide-ink-100">
          {perUser.map(({ u, c }) => (
            <div key={u} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <UserCell userId={u} size={24} sub="" />
              {c.ok ? <Badge tone="success">قابل ثبت</Badge> : <span className="text-[11px] text-rose-600 text-left">{c.reason}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {validUntil && <Callout icon={<CalendarClock size={13} />} tone="neutral">دسترسی زمان‌دار: پس از {validUntil} این نقش خودکار بی‌اثر می‌شود و نیازی به لغو دستی نیست.</Callout>}
        <CheckLine
          check={overall}
          okText={
            bulk
              ? `${fmtN(okCount)} از ${fmtN(userIds.length)} تخصیص قابل ثبت است.`
              : `«${userName(userIds[0])}» نقش «${roles.find((r) => r.id === roleId)?.name}» را در «${t.scopeLabel(scopeId)}» و زیرمجموعه‌هایش می‌گیرد.`
          }
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <GuardButton variant="primary" icon={bulk ? <Users size={14} /> : undefined} check={overall} onClick={submit}>
            {bulk ? `ثبت ${fmtN(okCount)} تخصیص` : "ثبت تخصیص"}
          </GuardButton>
        </div>
      </div>
    </Modal>
  );
}
