// «ساختار سازمانی» — درخت پیازیِ سیستم ← هلدینگ ← شرکت ← واحد.
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, Eye, KeyRound, Link2, Lock, Network, Pencil, Plus, Power, ShieldCheck, Users, X } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import Drawer from "../../../components/ui/Drawer";
import EmptyState from "../../../components/ui/EmptyState";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useTenancy } from "../../../context/TenancyContext";
import { childTypes, descendantsOrSelf, type ScopeNode, type ScopeType } from "../../../iam/model";
import { users } from "../../../data/mock";
import {
  Callout,
  CheckLine,
  Field,
  GuardButton,
  IconAction,
  ScopeCrumb,
  ScopeIcon,
  SearchBox,
  SectionHead,
  Stat,
  TypeBadge,
  UserCell,
  bindingStatus,
  BindingStatusBadge,
  fmtN,
  useMediaQuery,
  useRun,
  useSubtree,
} from "./shared";

type FormState = { mode: "create" | "edit"; parentId: string; id?: string; type: ScopeType; name: string; code: string; color: string; field: string; lead: string };

export function StructureSection() {
  const t = useTenancy();
  const { iam } = t;
  const sub = useSubtree();
  const run = useRun();
  const confirm = useConfirm();
  const wide = useMediaQuery("(min-width: 1024px)");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<FormState | null>(null);

  const childrenOf = (id: string) => iam.scopes.filter((s) => s.parentId === id);
  const rolesHere = (id: string) => iam.roles.filter((r) => r.createdIn === id);

  // جستجو: گره‌های منطبق + والدهایشان (در زیرِ کانتکست)
  const match = useMemo(() => {
    const term = q.trim();
    if (!term) return null;
    const hits = sub.nodes.filter((n) => n.name.includes(term) || n.code.toLowerCase().includes(term.toLowerCase()));
    const keep = new Set<string>();
    hits.forEach((h) => {
      let cur: ScopeNode | undefined = h;
      while (cur && sub.ids.has(cur.id)) {
        keep.add(cur.id);
        cur = iam.scopes.find((s) => s.id === cur!.parentId);
      }
    });
    return { keep, hits: new Set(hits.map((h) => h.id)) };
  }, [q, sub, iam.scopes]);

  const isOpen = (id: string, level: number) => toggled[id] ?? level < 2;
  const toggle = (id: string, level: number) => setToggled((prev) => ({ ...prev, [id]: !isOpen(id, level) }));

  const openCreate = (parent: ScopeNode) => {
    const type = childTypes[parent.type][0];
    setForm({ mode: "create", parentId: parent.id, type, name: "", code: "", color: "#1f4f99", field: "", lead: "" });
  };
  const openEdit = (n: ScopeNode) => setForm({ mode: "edit", parentId: n.parentId ?? "", id: n.id, type: n.type, name: n.name, code: n.code, color: n.color ?? "#1f4f99", field: n.field ?? "", lead: n.lead ?? "" });

  const toggleActive = (n: ScopeNode) => {
    if (n.active) {
      const subCount = descendantsOrSelf(iam, n.id).length - 1;
      const members = t.membersOf(n.id, true).length;
      confirm({
        title: `غیرفعال‌سازی «${n.name}»؟`,
        message: `${subCount ? `همه‌ی ${fmtN(subCount)} زیرمجموعه‌ی آن هم غیرفعال می‌شوند. ` : ""}دسترسیِ ${fmtN(members)} عضویت و همه‌ی نقش‌هایی که از این مسیر اعمال می‌شوند قطع می‌شود؛ اما سوابق، نقش‌ها، تخصیص‌ها و تاریخچه حفظ می‌شوند و بعداً قابل فعال‌سازی است.`,
        confirmLabel: "بله، غیرفعال شود",
        onConfirm: () => run(t.setScopeActive(n.id, false), `«${n.name}» غیرفعال شد.`),
      });
    } else {
      confirm({
        title: `فعال‌سازی دوباره‌ی «${n.name}»؟`,
        message: "فقط خودِ این واحد فعال می‌شود؛ زیرمجموعه‌ها را جداگانه فعال کنید. نقش‌های معتبر دوباره اعمال می‌شوند.",
        confirmLabel: "بله، فعال شود",
        onConfirm: () => run(t.setScopeActive(n.id, true), `«${n.name}» دوباره فعال شد.`),
      });
    }
  };

  const sel = selected ? iam.scopes.find((s) => s.id === selected) : undefined;

  const renderRow = (n: ScopeNode, level: number): ReactNode => {
    if (match && !match.keep.has(n.id)) return null;
    const kids = childrenOf(n.id);
    const open = match ? true : isOpen(n.id, level);
    const childType = childTypes[n.type][0];
    const cCreate = t.checkCreateScope(n.id, childType);
    const cEdit = t.checkEditScope(n.id);
    const isSel = selected === n.id;
    return (
      <Fragment key={n.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelected(n.id)}
          onKeyDown={(e) => e.key === "Enter" && setSelected(n.id)}
          className={`group flex items-center gap-1.5 py-2 pl-2 rounded-lg cursor-pointer transition-colors ${isSel ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-ink-50"} ${match?.hits.has(n.id) ? "outline outline-1 outline-amber-300" : ""}`}
          style={{ paddingRight: 6 + level * 18 }}
        >
          <button
            type="button"
            aria-label={open ? "بستن" : "باز کردن"}
            onClick={(e) => {
              e.stopPropagation();
              toggle(n.id, level);
            }}
            className={`w-6 h-6 rounded flex items-center justify-center text-ink-400 hover:bg-ink-100 shrink-0 ${kids.length ? "" : "invisible"}`}
          >
            {open ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
          </button>
          <span className="w-7 h-7 rounded-lg bg-ink-50 border border-ink-100 flex items-center justify-center shrink-0" style={n.color && n.type === "holding" ? { borderColor: n.color } : undefined}>
            <ScopeIcon type={n.type} size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[13px] font-semibold truncate ${n.active ? "text-ink-900" : "text-ink-400 line-through"}`}>{n.name}</span>
              <span className="hidden sm:inline"><TypeBadge type={n.type} /></span>
              {!n.active && <Badge tone="danger">غیرفعال</Badge>}
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span dir="ltr" className="font-mono text-[10.5px] text-ink-400">{n.code}</span>
              <Stat icon={<Users size={11} />} value={t.membersOf(n.id, true).length} label="اعضا (با زیرمجموعه‌ها)" />
              <Stat icon={<KeyRound size={11} />} value={rolesHere(n.id).length} label="نقش‌های تعریف‌شده در این واحد" />
              {kids.length > 0 && <Stat icon={<Network size={11} />} value={kids.length} label="زیرمجموعه‌ی مستقیم" />}
            </div>
          </div>
          <div className="flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
            <IconAction check={cCreate} icon={<Plus size={15} />} label="افزودن زیرمجموعه" onClick={() => openCreate(n)} />
            <IconAction check={cEdit} icon={<Pencil size={14} />} label="ویرایش" onClick={() => openEdit(n)} />
            <IconAction check={cEdit} icon={<Power size={14} />} label={n.active ? "غیرفعال‌سازی" : "فعال‌سازی"} tone={n.active ? "danger" : "success"} onClick={() => toggleActive(n)} />
          </div>
        </div>
        {open && kids.map((k) => renderRow(k, level + 1))}
      </Fragment>
    );
  };

  const detail = sel ? <DetailPanel node={sel} onPick={setSelected} onEdit={() => openEdit(sel)} onCreate={() => openCreate(sel)} onToggle={() => toggleActive(sel)} onClose={() => setSelected(null)} /> : null;

  return (
    <div>
      <SectionHead
        icon={<Network size={18} />}
        title="ساختار سازمانی"
        description="درخت لایه‌لایه‌ی سازمان: سیستم ← هلدینگ ← شرکت ← واحد. هر لایه فقط زیرمجموعه‌ی خودش را می‌بیند و اداره می‌کند."
        actions={<SearchBox value={q} onChange={setQ} placeholder="جستجوی نام یا کد واحد…" className="w-full sm:w-64" />}
      />

      <div className="mb-4">
        <Callout icon={<ShieldCheck size={14} />}>
          <b>هر واحد را مدیرِ لایه‌ی بالاتر اداره می‌کند.</b> مدیر هلدینگ شرکت‌هایش را می‌سازد و ویرایش می‌کند، مدیر شرکت واحدهای داخلی را؛ هیچ مدیری خودِ واحدش یا لایه‌ی هم‌سطح را تغییر نمی‌دهد.
          غیرفعال‌سازی یک واحد، زیرمجموعه‌هایش را هم غیرفعال و دسترسی‌های این مسیر را قطع می‌کند؛ سوابق پاک نمی‌شوند.
        </Callout>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="card p-2 sm:p-3 min-w-0">
          {sub.ancestors.length > 0 && (
            <div className="mb-1 pb-1 border-b border-dashed border-ink-200">
              {sub.ancestors.map((a, i) => (
                <div key={a.id} className="flex items-center gap-1.5 py-1.5 text-ink-400" style={{ paddingRight: 6 + i * 18 }} title="لایه‌ی بالاتر — فقط مسیر نمایش داده می‌شود">
                  <Lock size={12} className="shrink-0" />
                  <ScopeIcon type={a.type} size={13} className="opacity-60" />
                  <span className="text-[12px] truncate">{a.name}</span>
                  <span className="text-[10.5px]">(لایه‌ی بالاتر)</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginRight: sub.ancestors.length * 18 }}>
            {renderRow(sub.root, 0)}
          </div>
          {match && match.hits.size === 0 && <EmptyState title="واحدی با این نام یا کد پیدا نشد" description="عبارت دیگری را امتحان کنید." />}
          <p className="text-[11px] text-ink-400 px-2 pt-2 mt-1 border-t border-ink-100">
            {fmtN(sub.nodes.length)} واحد در محدوده‌ی شما · روی هر واحد بزنید تا جزئیات، اعضا و مدیرانش را ببینید.
          </p>
        </div>

        {wide ? (
          <aside className="card p-4 sticky top-4 min-w-0">
            {detail ?? (
              <EmptyState icon={<Eye size={22} />} title="یک واحد را انتخاب کنید" description="مسیر، اعضا، نقش‌های تعریف‌شده، تخصیص‌ها و مدیرانِ هر واحد اینجا نمایش داده می‌شود." />
            )}
          </aside>
        ) : (
          <Drawer open={!!sel} onClose={() => setSelected(null)} title={sel?.name ?? ""}>
            {detail}
          </Drawer>
        )}
      </div>

      {form && <ScopeForm form={form} setForm={setForm} onDone={(id) => id && setSelected(id)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
function DetailPanel({ node, onPick, onEdit, onCreate, onToggle, onClose }: { node: ScopeNode; onPick: (id: string) => void; onEdit: () => void; onCreate: () => void; onToggle: () => void; onClose: () => void }) {
  const t = useTenancy();
  const { iam, today } = t;
  const members = t.membersOf(node.id, false);
  const allMembers = t.membersOf(node.id, true);
  const roles = iam.roles.filter((r) => r.createdIn === node.id);
  const bindings = iam.bindings.filter((b) => b.scopeId === node.id && b.active);
  const admins = bindings.filter((b) => t.isAdminRole(iam.roles.find((r) => r.id === b.roleId)) && bindingStatus(b, today) === "live");
  const parent = node.parentId ? iam.scopes.find((s) => s.id === node.parentId) : undefined;
  const parentAdmins = parent
    ? iam.bindings.filter((b) => b.scopeId === parent.id && bindingStatus(b, today) === "live" && iam.roles.find((r) => r.id === b.roleId)?.permissions.includes("iam.structure.manage"))
    : [];
  const roleName = (id: string) => iam.roles.find((r) => r.id === id)?.name ?? "—";
  const childType = childTypes[node.type][0];
  const cEdit = t.checkEditScope(node.id);

  const Block = ({ title, count, children }: { title: string; count?: number; children: ReactNode }) => (
    <div className="mt-4">
      <p className="text-[11.5px] font-bold text-ink-500 mb-1.5 flex items-center gap-1.5">
        {title}
        {count !== undefined && <span className="text-[10px] rounded-full bg-ink-100 text-ink-500 px-1.5">{fmtN(count)}</span>}
      </p>
      {children}
    </div>
  );

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2.5">
        <span className="w-10 h-10 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-center shrink-0" style={node.color ? { borderColor: node.color } : undefined}>
          <ScopeIcon type={node.type} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-ink-900 leading-6">{node.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <TypeBadge type={node.type} />
            <span dir="ltr" className="font-mono text-[10.5px] text-ink-400">{node.code}</span>
            {node.active ? <Badge tone="success">فعال</Badge> : <Badge tone="danger">غیرفعال</Badge>}
          </div>
        </div>
        <button onClick={onClose} aria-label="بستن" className="hidden lg:flex w-7 h-7 rounded-lg hover:bg-ink-100 items-center justify-center text-ink-400 shrink-0">
          <X size={14} />
        </button>
      </div>

      <div className="mt-3">
        <ScopeCrumb id={node.id} onPick={onPick} />
      </div>
      {(node.field || node.lead) && (
        <p className="text-[12px] text-ink-500 mt-2 leading-6">
          {node.field && <>حوزه: <b className="text-ink-700">{node.field}</b>{node.lead ? " · " : ""}</>}
          {node.lead && <>سرپرست: <b className="text-ink-700">{node.lead}</b></>}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { l: "اعضا", v: allMembers.length, h: `${fmtN(members.length)} مستقیم` },
          { l: "نقش تعریف‌شده", v: roles.length },
          { l: "تخصیص فعال", v: bindings.length },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-ink-100 px-2 py-2 text-center">
            <p className="text-[15px] font-black text-ink-900">{fmtN(s.v)}</p>
            <p className="text-[10.5px] text-ink-400">{s.l}</p>
            {s.h && <p className="text-[10px] text-ink-400">{s.h}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {childTypes[node.type].length > 0 && (
          <GuardButton size="sm" variant="primary" icon={<Plus size={13} />} check={t.checkCreateScope(node.id, childType)} onClick={onCreate}>
            افزودن زیرمجموعه
          </GuardButton>
        )}
        <GuardButton size="sm" icon={<Pencil size={13} />} check={cEdit} onClick={onEdit}>
          ویرایش
        </GuardButton>
        <GuardButton size="sm" variant={node.active ? "ghost" : "secondary"} icon={<Power size={13} />} check={cEdit} onClick={onToggle}>
          {node.active ? "غیرفعال‌سازی" : "فعال‌سازی"}
        </GuardButton>
      </div>

      <Block title="مدیران این واحد" count={admins.length}>
        {admins.length ? (
          <ul className="space-y-1.5">
            {admins.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <UserCell userId={b.userId} sub={roleName(b.roleId)} size={26} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-ink-400">نقش مدیریتی مستقیمی در این واحد داده نشده است.</p>
        )}
        {parent && (
          <p className="text-[11.5px] text-ink-500 mt-2 leading-5 bg-ink-50 border border-ink-100 rounded-lg px-2.5 py-1.5">
            <Link2 size={11} className="inline ml-1" />
            ساختارِ این واحد را مدیرانِ «{parent.name}» اداره می‌کنند
            {parentAdmins.length ? `: ${parentAdmins.map((b) => users.find((u) => u.id === b.userId)?.name).join("، ")}` : " (و لایه‌های بالاتر)"}.
          </p>
        )}
      </Block>

      <Block title="اعضای مستقیم" count={members.length}>
        {members.length ? (
          <ul className="space-y-1.5">
            {members.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <UserCell userId={m.userId} sub={m.title ?? (m.primary ? "عضویت اصلی" : "عضو")} size={26} />
                {m.status === "suspended" && <Badge tone="warning">معلق</Badge>}
              </li>
            ))}
            {members.length > 6 && <li className="text-[11px] text-ink-400">و {fmtN(members.length - 6)} عضو دیگر…</li>}
          </ul>
        ) : (
          <p className="text-[12px] text-ink-400">عضو مستقیمی ندارد{allMembers.length ? ` (${fmtN(allMembers.length)} عضو در زیرمجموعه‌ها)` : ""}.</p>
        )}
      </Block>

      <Block title="نقش‌های تعریف‌شده در این واحد" count={roles.length}>
        {roles.length ? (
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <Badge key={r.id} tone={r.builtIn ? "navy" : "brand"} icon={<KeyRound size={10} />}>
                {r.name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink-400">نقشی در این واحد تعریف نشده؛ نقش‌های لایه‌های بالاتر اینجا هم قابل تخصیص‌اند.</p>
        )}
      </Block>

      <Block title="تخصیص‌های نقش در این واحد" count={bindings.length}>
        {bindings.length ? (
          <ul className="space-y-1.5">
            {bindings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <UserCell userId={b.userId} sub={roleName(b.roleId)} size={26} />
                <BindingStatusBadge status={bindingStatus(b, today)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-ink-400">تخصیصی مستقیماً در این واحد ثبت نشده است.</p>
        )}
      </Block>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ScopeForm({ form, setForm, onDone }: { form: FormState; setForm: (f: FormState | null) => void; onDone: (id?: string) => void }) {
  const t = useTenancy();
  const run = useRun();
  const parent = t.iam.scopes.find((s) => s.id === form.parentId);
  const types = parent ? childTypes[parent.type] : [];
  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const check = form.mode === "create" ? t.checkCreateScope(form.parentId, form.type) : t.checkEditScope(form.id!);
  const valid = check.ok && form.name.trim().length > 0;

  const submit = () => {
    const extra: Record<string, string> = {};
    if (form.code.trim()) extra.code = form.code.trim();
    if (form.type === "holding" && form.color) extra.color = form.color;
    if (form.type === "company" && form.field.trim()) extra.field = form.field.trim();
    if (form.lead.trim()) extra.lead = form.lead.trim();
    if (form.mode === "create") {
      const r = t.createScope(form.parentId, form.type, form.name, extra);
      if (run(r, `${t.scopeTypeLabel[form.type]} «${form.name.trim()}» زیر «${parent?.name}» ساخته شد.`)) {
        setForm(null);
        onDone(r.ok ? r.id : undefined);
      }
    } else {
      const r = t.updateScope(form.id!, { name: form.name.trim(), ...extra });
      if (run(r, `مشخصات «${form.name.trim()}» ذخیره شد.`)) setForm(null);
    }
  };

  return (
    <Modal
      open
      onClose={() => setForm(null)}
      title={form.mode === "create" ? "افزودن زیرمجموعه" : `ویرایش «${t.scopeLabel(form.id)}»`}
      description={parent ? `زیرِ «${parent.name}»` : "ریشه‌ی سامانه"}
    >
      <div className="space-y-3">
        {form.mode === "create" && (
          <Field label="نوع واحد" hint="نوع‌های مجاز بر اساس لایه‌ی والد محدود شده‌اند.">
            <div className="flex flex-wrap gap-2">
              {(["holding", "company", "unit"] as ScopeType[]).map((ty) => {
                const allowed = types.includes(ty);
                return (
                  <button
                    key={ty}
                    type="button"
                    disabled={!allowed}
                    title={allowed ? undefined : `زیر «${parent ? t.scopeTypeLabel[parent.type] : ""}» نمی‌توان «${t.scopeTypeLabel[ty]}» ساخت.`}
                    onClick={() => set({ type: ty })}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] ${form.type === ty ? "border-brand-400 bg-brand-50 text-brand-700 font-semibold" : "border-ink-200 text-ink-600"} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <ScopeIcon type={ty} size={14} /> {t.scopeTypeLabel[ty]}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <Field label="نام">
            <input className="input-field" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={form.type === "unit" ? "مثلاً: معاونت مالی" : "نام رسمی"} autoFocus />
          </Field>
          <Field label="کد" hint={form.mode === "create" ? "خالی بماند خودکار ساخته می‌شود" : undefined}>
            <input className="input-field font-mono" dir="ltr" value={form.code} onChange={(e) => set({ code: e.target.value })} placeholder="C042" />
          </Field>
        </div>
        {form.type === "holding" && (
          <Field label="رنگ شناسه">
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} className="w-10 h-9 rounded-lg border border-ink-200 bg-transparent cursor-pointer" aria-label="رنگ" />
              <span dir="ltr" className="font-mono text-[12px] text-ink-500">{form.color}</span>
            </div>
          </Field>
        )}
        {form.type === "company" && (
          <Field label="حوزه‌ی فعالیت">
            <input className="input-field" value={form.field} onChange={(e) => set({ field: e.target.value })} placeholder="مثلاً: صنایع غذایی" />
          </Field>
        )}
        <Field label={form.type === "unit" ? "سرپرست" : "مدیرعامل / سرپرست"} hint="فقط نمایشی است؛ اختیار مدیریتی را از «تخصیص نقش» بدهید.">
          <input className="input-field" value={form.lead} onChange={(e) => set({ lead: e.target.value })} />
        </Field>
        <CheckLine check={check} okText={form.mode === "create" ? "شما اختیار ساخت این زیرمجموعه را دارید." : "شما مدیرِ لایه‌ی بالاتر این واحد هستید و می‌توانید ویرایشش کنید."} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => setForm(null)}>
            انصراف
          </Button>
          <Button variant="primary" disabled={!valid} onClick={submit} className="disabled:opacity-45 disabled:cursor-not-allowed">
            {form.mode === "create" ? "ساخت واحد" : "ذخیره"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
