// «نقش‌ها و مجوزها» — نقش‌های سفارشی به تفکیکِ واحدِ تعریف، با ماتریس کامل مجوزها.
import { useMemo, useState } from "react";
import { Check as CheckIcon, Copy, Eye, KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import EmptyState from "../../../components/ui/EmptyState";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useToast } from "../../../components/ui/ToastProvider";
import { useTenancy, type RoleInput } from "../../../context/TenancyContext";
import { permissionCatalog } from "../../../data/mock";
import type { Role, ScopeType } from "../../../iam/model";
import {
  BindingStatusBadge,
  Callout,
  CheckLine,
  Field,
  GuardButton,
  PermId,
  ScopeIcon,
  ScopeName,
  ScopeSelect,
  SearchBox,
  SectionHead,
  TOTAL_PERMS,
  TYPE_ORDER,
  TypeBadge,
  UserCell,
  bindingStatus,
  fmtN,
  useRun,
  useSubtree,
} from "./shared";

type Draft = RoleInput & { original?: Role };

export function RolesSection() {
  const t = useTenancy();
  const { iam, today } = t;
  const sub = useSubtree();
  const run = useRun();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<Role | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  // نقش‌های قابل‌مشاهده: تعریف‌شده در مسیر بالای کانتکست (قابل تخصیص در اینجا) + زیرمجموعه‌ها
  const visibleScopes = useMemo(() => [...sub.ancestors, ...sub.nodes], [sub]);
  const creatable = useMemo(() => visibleScopes.filter((n) => n.active && t.canAdmin(n.id, "roles.create")), [visibleScopes, t]);

  const groups = useMemo(() => {
    const term = q.trim();
    const list = iam.roles.filter((r) => !term || r.name.includes(term) || r.code.toLowerCase().includes(term.toLowerCase()) || r.description.includes(term));
    const out = visibleScopes
      .map((s) => ({ scope: s, roles: list.filter((r) => r.createdIn === s.id).sort((a, b) => Number(!!b.builtIn) - Number(!!a.builtIn) || a.name.localeCompare(b.name, "fa")) }))
      .filter((g) => g.roles.length);
    return out;
  }, [iam.roles, q, visibleScopes]);

  const holders = (r: Role) => iam.bindings.filter((b) => b.roleId === r.id && bindingStatus(b, today) === "live");

  const blank = (): Draft => ({ name: "", code: "", description: "", createdIn: creatable.find((c) => c.id === sub.root.id)?.id ?? creatable[0]?.id ?? sub.root.id, allowedTypes: [], permissions: [] });
  const openNew = () => {
    const d = blank();
    const node = iam.scopes.find((s) => s.id === d.createdIn);
    setDraft({ ...d, allowedTypes: node ? [node.type === "system" ? "holding" : node.type] : [] });
  };
  const openEdit = (r: Role) => setDraft({ id: r.id, name: r.name, code: r.code, description: r.description, createdIn: r.createdIn, allowedTypes: [...r.allowedTypes], permissions: [...r.permissions], original: r });
  const openCopy = (r: Role) => {
    const createdIn = creatable.some((c) => c.id === r.createdIn) ? r.createdIn : creatable.find((c) => c.id === sub.root.id)?.id ?? creatable[0]?.id;
    if (!createdIn) return notify("در هیچ واحدی اختیار ساخت نقش ندارید.", "warning");
    const can = t.grantablePermissions(createdIn);
    const perms = r.permissions.filter((p) => can.has(p));
    const node = iam.scopes.find((s) => s.id === createdIn)!;
    const types = r.allowedTypes.filter((ty) => TYPE_ORDER.indexOf(ty) >= TYPE_ORDER.indexOf(node.type));
    if (perms.length < r.permissions.length) notify(`${fmtN(r.permissions.length - perms.length)} مجوزی که خودتان ندارید در نسخه‌ی کپی حذف شد.`, "info");
    setDraft({ name: `کپی ${r.name}`, code: `${r.code}-copy`, description: r.description, createdIn, allowedTypes: types.length ? types : [node.type], permissions: perms });
  };
  const remove = (r: Role) => {
    const n = iam.bindings.filter((b) => b.roleId === r.id && b.active).length;
    confirm({
      title: `حذف نقش «${r.name}»؟`,
      message: `${n ? `${fmtN(n)} تخصیص فعالِ این نقش لغو می‌شود و دارندگانش مجوزهای آن را از دست می‌دهند. ` : ""}این کار در تاریخچه ثبت می‌شود.`,
      confirmLabel: "بله، حذف شود",
      onConfirm: () => run(t.deleteRole(r.id), `نقش «${r.name}» حذف شد.`),
    });
  };

  const newCheck = creatable.length ? { ok: true as const } : { ok: false as const, reason: "در هیچ واحدی از محدوده‌ی فعلی اختیار ساخت نقش ندارید." };

  return (
    <div>
      <SectionHead
        icon={<KeyRound size={18} />}
        title="نقش‌ها و مجوزها"
        description="هر مدیر برای واحد خودش نقش می‌سازد و از فهرست مجوزهای ریز به آن دسترسی می‌دهد؛ نقش در همان واحد و زیرمجموعه‌هایش قابل تخصیص است."
        actions={
          <>
            <SearchBox value={q} onChange={setQ} placeholder="جستجوی نقش…" className="w-full sm:w-56" />
            <GuardButton variant="primary" icon={<Plus size={15} />} check={newCheck} onClick={openNew}>
              نقش جدید
            </GuardButton>
          </>
        }
      />
      <div className="mb-4">
        <Callout icon={<ShieldCheck size={14} />}>
          <b>بدون افزایش امتیاز:</b> هیچ مدیری نمی‌تواند مجوزی در نقش بگذارد یا نقشی تخصیص دهد که خودش در آن واحد ندارد. نقش‌های <b>پایه</b> را فقط مدیر سامانه ویرایش می‌کند و حذف‌شدنی نیستند.
        </Callout>
      </div>

      {groups.length === 0 && <EmptyState icon={<KeyRound size={22} />} title="نقشی پیدا نشد" />}
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.scope.id}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <ScopeIcon type={g.scope.type} size={14} />
              <h3 className="text-[13px] font-bold text-ink-800">تعریف‌شده در «{g.scope.name}»</h3>
              <TypeBadge type={g.scope.type} />
              {sub.chainIds.has(g.scope.id) && g.scope.id !== sub.root.id && <span className="text-[11px] text-ink-400">لایه‌ی بالاتر — در محدوده‌ی شما قابل تخصیص</span>}
              <span className="text-[11px] text-ink-400 mr-auto">{fmtN(g.roles.length)} نقش</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {g.roles.map((r) => {
                const h = holders(r);
                const users = new Set(h.map((b) => b.userId)).size;
                const cEdit = t.checkRole({ ...r }, r);
                const cDel = t.checkDeleteRole(r);
                return (
                  <div key={r.id} className="card p-4 flex flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-ink-900 flex items-center gap-1.5 flex-wrap">
                          {r.name}
                          {r.builtIn && <Badge tone="navy">پایه</Badge>}
                          {t.isAdminRole(r) && <Badge tone="warning">مدیریتی</Badge>}
                        </p>
                        <span dir="ltr" className="font-mono text-[10.5px] text-ink-400">{r.code}</span>
                      </div>
                    </div>
                    <p className="text-[12px] text-ink-500 leading-5 mt-1.5 line-clamp-2 min-h-[2.5rem]">{r.description || "—"}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <span className="text-[10.5px] text-ink-400 ml-1">قابل تخصیص در:</span>
                      {TYPE_ORDER.filter((ty) => r.allowedTypes.includes(ty)).map((ty) => (
                        <span key={ty} className="inline-flex items-center gap-1 text-[10.5px] rounded-md bg-ink-50 border border-ink-100 px-1.5 py-0.5 text-ink-600">
                          <ScopeIcon type={ty} size={10} /> {t.scopeTypeLabel[ty]}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-[11.5px] text-ink-600">
                      <span className="flex items-center gap-1">
                        <KeyRound size={12} className="text-ink-400" /> {fmtN(r.permissions.length)} مجوز
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} className="text-ink-400" /> {fmtN(users)} دارنده
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-ink-100 mt-2 overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${(r.permissions.length / TOTAL_PERMS) * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-ink-100 flex-wrap">
                      <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setViewing(r)}>
                        مشاهده
                      </Button>
                      <GuardButton size="sm" variant="ghost" icon={<Pencil size={13} />} check={cEdit} onClick={() => openEdit(r)}>
                        ویرایش
                      </GuardButton>
                      <GuardButton size="sm" variant="ghost" icon={<Copy size={13} />} check={newCheck} onClick={() => openCopy(r)} title="کپی از نقش">
                        کپی
                      </GuardButton>
                      <span className="mr-auto" />
                      {!r.builtIn && (
                        <GuardButton size="sm" variant="ghost" icon={<Trash2 size={13} />} check={cDel} onClick={() => remove(r)} className="text-rose-600 hover:bg-rose-50" aria-label="حذف">
                          حذف
                        </GuardButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {viewing && <RoleView role={viewing} onClose={() => setViewing(null)} onEdit={() => {
            setViewing(null);
            openEdit(viewing);
          }} />}
      {draft && <RoleEditor draft={draft} setDraft={setDraft} creatable={creatable} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
function RoleView({ role, onClose, onEdit }: { role: Role; onClose: () => void; onEdit: () => void }) {
  const t = useTenancy();
  const [onlyGranted, setOnlyGranted] = useState(false);
  const bs = t.iam.bindings.filter((b) => b.roleId === role.id && b.active);
  const has = new Set(role.permissions);
  const cEdit = t.checkRole({ ...role }, role);
  return (
    <Modal open onClose={onClose} title={role.name} description={`${role.code} · تعریف‌شده در «${t.scopeLabel(role.createdIn)}»`} width="max-w-4xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {role.builtIn && <Badge tone="navy">پایه</Badge>}
          {t.isAdminRole(role) && <Badge tone="warning">مدیریتی</Badge>}
          <Badge tone="brand">
            {fmtN(role.permissions.length)} از {fmtN(TOTAL_PERMS)} مجوز
          </Badge>
          <span className="text-[11.5px] text-ink-500">قابل تخصیص در: {TYPE_ORDER.filter((x) => role.allowedTypes.includes(x)).map((x) => t.scopeTypeLabel[x]).join("، ")}</span>
          <span className="mr-auto" />
          <label className="flex items-center gap-1.5 text-[12px] text-ink-600 cursor-pointer">
            <input type="checkbox" checked={onlyGranted} onChange={(e) => setOnlyGranted(e.target.checked)} className="accent-[var(--color-brand-600)]" /> فقط مجوزهای داده‌شده
          </label>
          <GuardButton size="sm" icon={<Pencil size={13} />} check={cEdit} onClick={onEdit}>
            ویرایش
          </GuardButton>
        </div>
        {role.description && <p className="text-[12.5px] text-ink-600 leading-6">{role.description}</p>}

        <div>
          <p className="text-[12px] font-bold text-ink-600 mb-2">دارندگان ({fmtN(bs.length)})</p>
          {bs.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {bs.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2 min-w-0">
                  <UserCell userId={b.userId} sub={<ScopeName id={b.scopeId} />} size={26} />
                  <BindingStatusBadge status={bindingStatus(b, t.today)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-ink-400">هنوز به کسی تخصیص داده نشده است.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {permissionCatalog.map((g) => {
            const count = g.actions.filter((a) => has.has(a.id)).length;
            const actions = onlyGranted ? g.actions.filter((a) => has.has(a.id)) : g.actions;
            if (!actions.length) return null;
            return (
              <div key={g.id} className="rounded-lg border border-ink-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12.5px] font-bold text-ink-800">{g.label}</p>
                  <span className={`text-[10.5px] font-bold rounded-full px-2 ${count ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-400"}`}>
                    {fmtN(count)} از {fmtN(g.actions.length)}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {actions.map((a) => {
                    const on = has.has(a.id);
                    return (
                      <li key={a.id} className="flex items-start gap-2">
                        <span className={`w-4 h-4 mt-0.5 rounded-full flex items-center justify-center shrink-0 ${on ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-300"}`}>
                          {on ? <CheckIcon size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-[12px] ${on ? "text-ink-700" : "text-ink-400"}`}>{a.label}</span>
                          <PermId id={a.id} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
function RoleEditor({ draft, setDraft, creatable }: { draft: Draft; setDraft: (d: Draft | null) => void; creatable: ReturnType<typeof useSubtree>["nodes"] }) {
  const t = useTenancy();
  const run = useRun();
  const [q, setQ] = useState("");
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const where = t.iam.scopes.find((s) => s.id === draft.createdIn);
  const grantable = t.grantablePermissions(draft.createdIn);
  const originalPerms = new Set(draft.original?.permissions ?? []);
  const chosen = new Set(draft.permissions);
  const typeOptions: ScopeType[] = where ? TYPE_ORDER.filter((ty) => TYPE_ORDER.indexOf(ty) >= TYPE_ORDER.indexOf(where.type)) : [];
  const locked = (p: string) => !grantable.has(p) && !originalPerms.has(p);

  const { original, ...input } = draft;
  const check = t.checkRole(input, original);
  const term = q.trim();

  const togglePerm = (p: string) => set({ permissions: chosen.has(p) ? draft.permissions.filter((x) => x !== p) : [...draft.permissions, p] });
  const setGroup = (ids: string[], on: boolean) => {
    const next = new Set(draft.permissions);
    ids.forEach((id) => {
      if (on && !locked(id)) next.add(id);
      if (!on) next.delete(id);
    });
    set({ permissions: [...next] });
  };
  const changeScope = (id: string) => {
    const n = t.iam.scopes.find((s) => s.id === id);
    const allowed = n ? TYPE_ORDER.filter((ty) => TYPE_ORDER.indexOf(ty) >= TYPE_ORDER.indexOf(n.type)) : [];
    const g = t.grantablePermissions(id);
    set({ createdIn: id, allowedTypes: draft.allowedTypes.filter((x) => allowed.includes(x)), permissions: draft.permissions.filter((p) => g.has(p)) });
  };
  const save = () => {
    const r = t.saveRole(input);
    if (run(r, original ? `نقش «${draft.name}» ذخیره شد.` : `نقش «${draft.name}» ساخته شد.`)) setDraft(null);
  };

  return (
    <Modal open onClose={() => setDraft(null)} title={original ? `ویرایش نقش «${original.name}»` : "نقش جدید"} description="مجوزهایی که خودتان ندارید قفل‌اند و نمی‌توانید به نقش بدهید." width="max-w-4xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="نام نقش">
            <input className="input-field" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثلاً: کارشناس مالی" autoFocus />
          </Field>
          <Field label="کد (لاتین)">
            <input className="input-field font-mono" dir="ltr" value={draft.code} onChange={(e) => set({ code: e.target.value.replace(/\s+/g, "-") })} placeholder="finance-analyst" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="شرح">
              <textarea className="input-field min-h-[60px]" value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="این نقش برای چه کسانی و چه کاری است؟" />
            </Field>
          </div>
          <Field label="تعریف‌شده در" hint={original ? "واحدِ مالکِ نقش پس از ساخت تغییر نمی‌کند." : "فقط واحدهایی که اختیار ساخت نقش در آن‌ها را دارید."}>
            {original ? (
              <div className="input-field bg-ink-50">
                <ScopeName id={draft.createdIn} />
              </div>
            ) : (
              <ScopeSelect value={draft.createdIn} onChange={changeScope} nodes={creatable} />
            )}
          </Field>
          <Field label="قابل تخصیص در انواع" hint="فقط هم‌سطح یا پایین‌تر از واحدِ تعریف.">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_ORDER.map((ty) => {
                const allowed = typeOptions.includes(ty);
                const on = draft.allowedTypes.includes(ty);
                return (
                  <button
                    key={ty}
                    type="button"
                    disabled={!allowed}
                    title={allowed ? undefined : "نقش فقط در همان سطح یا زیرمجموعه‌ها قابل تخصیص است."}
                    onClick={() => set({ allowedTypes: on ? draft.allowedTypes.filter((x) => x !== ty) : [...draft.allowedTypes, ty] })}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] ${on ? "border-brand-400 bg-brand-50 text-brand-700 font-semibold" : "border-ink-200 text-ink-600"} disabled:opacity-35 disabled:cursor-not-allowed`}
                  >
                    {on && <CheckIcon size={12} />}
                    <ScopeIcon type={ty} size={12} /> {t.scopeTypeLabel[ty]}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="rounded-xl border border-ink-200">
          <div className="flex items-center gap-2 flex-wrap px-3 py-2.5 border-b border-ink-100 bg-ink-50 rounded-t-xl">
            <p className="text-[12.5px] font-bold text-ink-800">ماتریس مجوزها</p>
            <Badge tone="brand">
              {fmtN(draft.permissions.length)} از {fmtN(TOTAL_PERMS)}
            </Badge>
            <span className="mr-auto" />
            <SearchBox value={q} onChange={setQ} placeholder="جستجوی مجوز…" className="w-full sm:w-56" />
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[46vh] overflow-y-auto">
            {permissionCatalog.map((g) => {
              const actions = g.actions.filter((a) => !term || a.label.includes(term) || a.id.includes(term) || g.label.includes(term));
              if (!actions.length) return null;
              const ids = actions.map((a) => a.id);
              const count = g.actions.filter((a) => chosen.has(a.id)).length;
              return (
                <div key={g.id} className="rounded-lg border border-ink-100 p-3 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[12.5px] font-bold text-ink-800 truncate">{g.label}</p>
                    <span className="text-[10.5px] text-ink-400 shrink-0">
                      {fmtN(count)}/{fmtN(g.actions.length)}
                    </span>
                    <span className="mr-auto flex gap-1 shrink-0">
                      <button type="button" onClick={() => setGroup(ids, true)} className="text-[11px] rounded-md px-1.5 py-0.5 text-brand-700 hover:bg-brand-50">
                        همه
                      </button>
                      <button type="button" onClick={() => setGroup(ids, false)} className="text-[11px] rounded-md px-1.5 py-0.5 text-ink-500 hover:bg-ink-100">
                        هیچ
                      </button>
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {actions.map((a) => {
                      const lk = locked(a.id);
                      const on = chosen.has(a.id);
                      return (
                        <li key={a.id}>
                          <label className={`flex items-start gap-2 rounded-md px-1.5 py-1 ${lk ? "opacity-55 cursor-not-allowed" : "cursor-pointer hover:bg-ink-50"}`} title={lk ? "خودتان این مجوز را ندارید" : undefined}>
                            <input type="checkbox" checked={on} disabled={lk} onChange={() => togglePerm(a.id)} className="mt-1 accent-[var(--color-brand-600)] shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] text-ink-700 leading-5">{a.label}</span>
                              <PermId id={a.id} />
                            </span>
                            {!grantable.has(a.id) && <Lock size={12} className="text-ink-400 mt-1 shrink-0" aria-label="خودتان این مجوز را ندارید" />}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <CheckLine check={check} okText={`نقش با ${fmtN(draft.permissions.length)} مجوز در «${where?.name ?? ""}» ${original ? "ذخیره" : "ساخته"} می‌شود.`} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDraft(null)}>
            انصراف
          </Button>
          <GuardButton variant="primary" check={check} onClick={save}>
            {original ? "ذخیره‌ی تغییرات" : "ساخت نقش"}
          </GuardButton>
        </div>
      </div>
    </Modal>
  );
}
