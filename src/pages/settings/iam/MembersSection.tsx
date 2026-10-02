// «اعضا و عضویت‌ها» — عضویت کاربران در واحدهای زیرمجموعه‌ی کانتکست.
import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Eye, KeyRound, Lock, Star, Trash2, UserPlus, Users } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import Drawer from "../../../components/ui/Drawer";
import EmptyState from "../../../components/ui/EmptyState";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useTenancy } from "../../../context/TenancyContext";
import { descendantsOrSelf, type Membership } from "../../../iam/model";
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
  TOTAL_PERMS,
  UserCell,
  UserPicker,
  ValidityText,
  bindingStatus,
  fmtN,
  userName,
  useRun,
  useSubtree,
} from "./shared";

type StatusFilter = "" | "active" | "suspended";

export function MembersSection() {
  const t = useTenancy();
  const { iam, today } = t;
  const sub = useSubtree();
  const run = useRun();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [adding, setAdding] = useState(false);
  const [drawerUser, setDrawerUser] = useState<string | null>(null);

  const manageable = useMemo(() => sub.nodes.filter((n) => n.active && t.canAdmin(n.id, "iam.members.manage")), [sub, t]);

  const rows = useMemo(() => {
    const scopeSet = scope ? new Set(descendantsOrSelf(iam, scope).map((n) => n.id)) : sub.ids;
    return iam.memberships
      .filter((m) => scopeSet.has(m.scopeId))
      .filter((m) => !status || m.status === status)
      .filter((m) => !q.trim() || userName(m.userId).includes(q.trim()) || (m.title ?? "").includes(q.trim()))
      .sort((a, b) => sub.nodes.findIndex((n) => n.id === a.scopeId) - sub.nodes.findIndex((n) => n.id === b.scopeId) || userName(a.userId).localeCompare(userName(b.userId), "fa"));
  }, [iam, scope, status, q, sub]);

  const rolesCount = (m: Membership) => iam.bindings.filter((b) => b.userId === m.userId && b.scopeId === m.scopeId && bindingStatus(b, today) === "live").length;

  const toggleStatus = (m: Membership) => {
    const next = m.status === "active" ? "suspended" : "active";
    if (next === "suspended")
      confirm({
        title: `تعلیق عضویت «${userName(m.userId)}» در «${t.scopeLabel(m.scopeId)}»؟`,
        message: "تا رفع تعلیق، نقش‌هایی که در این واحد به او داده شده اعمال نمی‌شوند. چیزی حذف نمی‌شود.",
        confirmLabel: "بله، تعلیق شود",
        onConfirm: () => run(t.setMembershipStatus(m.id, "suspended"), "عضویت معلق شد."),
      });
    else run(t.setMembershipStatus(m.id, "active"), "عضویت دوباره فعال شد.");
  };
  const remove = (m: Membership) => {
    const sc = new Set(descendantsOrSelf(iam, m.scopeId).map((n) => n.id));
    const n = iam.bindings.filter((b) => b.userId === m.userId && b.active && sc.has(b.scopeId)).length;
    confirm({
      title: `حذف عضویت «${userName(m.userId)}» از «${t.scopeLabel(m.scopeId)}»؟`,
      message: `${n ? `${fmtN(n)} تخصیص نقشِ او در این واحد و زیرمجموعه‌هایش لغو می‌شود. ` : ""}این کار در تاریخچه ثبت می‌شود و برای بازگشت باید دوباره عضو و نقش داده شود.`,
      confirmLabel: "بله، حذف شود",
      onConfirm: () => run(t.removeMembership(m.id), "عضویت حذف شد."),
    });
  };

  const addCheck = manageable.length ? { ok: true as const } : { ok: false as const, reason: "در هیچ واحدی از محدوده‌ی فعلی اختیار مدیریت اعضا ندارید." };
  const activeCount = rows.filter((m) => m.status === "active").length;

  return (
    <div>
      <SectionHead
        icon={<Users size={18} />}
        title="اعضا و عضویت‌ها"
        description={`عضویت‌های «${sub.root.name}» و همه‌ی زیرمجموعه‌هایش. عضویت تعیین می‌کند کاربر در کدام لایه «ایستاده» و محتوای کدام لایه‌ها را می‌بیند.`}
        actions={
          <GuardButton variant="primary" icon={<UserPlus size={15} />} check={addCheck} onClick={() => setAdding(true)}>
            افزودن عضویت
          </GuardButton>
        }
      />

      <div className="card p-3 mb-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px] gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="جستجوی نام یا عنوان شغلی…" />
        <ScopeSelect value={scope} onChange={setScope} nodes={sub.nodes} allLabel="همه‌ی واحدها" />
        <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="وضعیت">
          <option value="">همه‌ی وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="suspended">معلق</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_minmax(0,1fr)_90px_70px_80px] gap-3 px-4 py-2 bg-ink-50 border-b border-ink-100 text-[11px] font-bold text-ink-500">
          <span>کاربر</span>
          <span>واحد</span>
          <span>عنوان</span>
          <span>وضعیت</span>
          <span>نقش‌ها</span>
          <span />
        </div>
        {rows.length === 0 && <EmptyState icon={<Users size={22} />} title="عضویتی پیدا نشد" description="فیلترها را تغییر دهید یا عضویت جدید اضافه کنید." />}
        <ul className="divide-y divide-ink-100">
          {rows.map((m) => {
            const c = t.checkMembership(m.userId, m.scopeId);
            const self = m.userId === t.actingUser.id;
            const cSelf = self ? { ok: false as const, reason: "عضویت خودتان را نمی‌توانید تغییر دهید." } : c;
            const rc = rolesCount(m);
            return (
              <li
                key={m.id}
                onClick={() => setDrawerUser(m.userId)}
                className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_minmax(0,1fr)_90px_70px_80px] gap-x-3 gap-y-1.5 px-4 py-2.5 items-center hover:bg-ink-50 cursor-pointer"
              >
                <UserCell userId={m.userId} />
                <div className="flex items-center gap-1 md:hidden justify-end">
                  <StatusBadge m={m} />
                </div>
                <div className="col-span-2 md:col-span-1 min-w-0">
                  <ScopeName id={m.scopeId} showPath />
                </div>
                <span className="hidden md:block text-[12px] text-ink-600 truncate">{m.title ?? "—"}</span>
                <span className="hidden md:flex items-center gap-1">
                  <StatusBadge m={m} />
                </span>
                <span className="text-[12px] text-ink-600 flex items-center gap-1" title="نقش‌های فعال در همین واحد">
                  <KeyRound size={12} className="text-ink-400" /> {fmtN(rc)}
                  <span className="md:hidden text-ink-400">نقش{m.title ? ` · ${m.title}` : ""}</span>
                </span>
                <span className="flex items-center justify-end gap-0.5">
                  {!c.ok && !self && <Lock size={12} className="text-ink-300 ml-1" aria-label={c.reason} />}
                  <IconAction
                    check={cSelf}
                    icon={m.status === "active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    label={m.status === "active" ? "تعلیق" : "فعال‌سازی"}
                    tone={m.status === "active" ? "danger" : "success"}
                    onClick={() => toggleStatus(m)}
                  />
                  <IconAction check={cSelf} icon={<Trash2 size={14} />} label="حذف عضویت" tone="danger" onClick={() => remove(m)} />
                </span>
              </li>
            );
          })}
        </ul>
        {rows.length > 0 && (
          <p className="px-4 py-2 text-[11px] text-ink-400 border-t border-ink-100">
            {fmtN(rows.length)} عضویت · {fmtN(activeCount)} فعال · {fmtN(rows.length - activeCount)} معلق — برای دیدن همه‌ی عضویت‌ها و نقش‌های هر نفر روی ردیف بزنید.
          </p>
        )}
      </div>

      {adding && <AddMembership scopes={manageable} onClose={() => setAdding(false)} />}
      <UserDrawer userId={drawerUser} onClose={() => setDrawerUser(null)} />
    </div>
  );
}

function StatusBadge({ m }: { m: Membership }) {
  return (
    <>
      {m.status === "active" ? <Badge tone="success">فعال</Badge> : <Badge tone="warning">معلق</Badge>}
      {m.primary && <Star size={12} className="text-amber-500 fill-amber-400 shrink-0" aria-label="عضویت اصلی" />}
    </>
  );
}

function AddMembership({ scopes, onClose }: { scopes: ReturnType<typeof useSubtree>["nodes"]; onClose: () => void }) {
  const t = useTenancy();
  const run = useRun();
  const [userId, setUserId] = useState<string[]>([]);
  const [scopeId, setScopeId] = useState(scopes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const uid = userId[0];
  const exists = uid && t.iam.memberships.some((m) => m.userId === uid && m.scopeId === scopeId);
  const check = !uid ? { ok: false as const, reason: "یک کاربر انتخاب کنید." } : exists ? { ok: false as const, reason: "این کاربر از قبل عضو این واحد است." } : t.checkMembership(uid, scopeId);

  return (
    <Modal open onClose={onClose} title="افزودن عضویت" description="کاربر را عضو یکی از واحدهایی کنید که مدیریت اعضایش با شماست." width="max-w-xl">
      <div className="space-y-3">
        <Field label="کاربر">
          <UserPicker value={userId} onChange={setUserId} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="واحد" hint="فقط واحدهایی که اختیار مدیریت اعضایشان را دارید.">
            <ScopeSelect value={scopeId} onChange={setScopeId} nodes={scopes} />
          </Field>
          <Field label="عنوان شغلی (اختیاری)">
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: کارشناس ارشد" />
          </Field>
        </div>
        <Callout tone="neutral">عضویت به‌تنهایی دسترسی مدیریتی نمی‌دهد؛ کاربر محتوای این واحد و زیرمجموعه‌هایش را می‌بیند. برای اختیارات بیشتر از «تخصیص نقش» استفاده کنید.</Callout>
        <CheckLine check={check} okText={`«${userName(uid)}» عضو «${t.scopeLabel(scopeId)}» می‌شود.`} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <GuardButton variant="primary" check={check} onClick={() => run(t.addMembership(uid!, scopeId, title.trim() || undefined), "عضویت ثبت شد.") && onClose()}>
            ثبت عضویت
          </GuardButton>
        </div>
      </div>
    </Modal>
  );
}

/** کشوی جزئیات کاربر: همه‌ی عضویت‌ها، تخصیص‌ها و دسترسی مؤثر در هر واحد */
export function UserDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const t = useTenancy();
  const { iam, today } = t;
  const sub = useSubtree();
  const [imp, setImp] = useState(false);
  if (!userId) return null;
  const canImp = t.hasPermission("iam.impersonate") || t.readOnly;
  const impCheck = t.checkImpersonate(userId);
  const inView = (id: string) => sub.ids.has(id) || sub.chainIds.has(id);
  const allMs = t.membershipsOf(userId);
  const ms = allMs.filter((m) => inView(m.scopeId));
  const allBs = iam.bindings.filter((b) => b.userId === userId && b.active);
  const bs = allBs.filter((b) => inView(b.scopeId));
  const hidden = allMs.length - ms.length + (allBs.length - bs.length);
  const scopeIds = [...new Set([...ms.map((m) => m.scopeId), ...bs.map((b) => b.scopeId)])].filter((id) => iam.scopes.find((s) => s.id === id)?.active);
  const roleOf = (id: string) => iam.roles.find((r) => r.id === id);

  return (
    <Drawer open onClose={onClose} title="جزئیات عضو" width="max-w-lg">
      <div className="card p-3 mb-4 flex items-center justify-between gap-2 flex-wrap">
        <UserCell userId={userId} size={40} />
        {canImp && (
          <GuardButton size="sm" variant="secondary" icon={<Eye size={13} />} check={impCheck} onClick={() => setImp(true)}>
            مشاهده به‌عنوان این کاربر
          </GuardButton>
        )}
      </div>
      {imp && (
        <ImpersonateModal
          userId={userId}
          onClose={() => setImp(false)}
          onStarted={() => {
            setImp(false);
            onClose();
          }}
        />
      )}

      <p className="text-[12px] font-bold text-ink-600 mb-2">عضویت‌ها ({fmtN(ms.length)})</p>
      <ul className="space-y-1.5 mb-5">
        {ms.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2">
            <div className="min-w-0">
              <ScopeName id={m.scopeId} showPath />
              {m.title && <p className="text-[11px] text-ink-400 mt-0.5">{m.title}</p>}
            </div>
            <span className="flex items-center gap-1 shrink-0">
              <StatusBadge m={m} />
            </span>
          </li>
        ))}
        {ms.length === 0 && <li className="text-[12px] text-ink-400">عضویتی در محدوده‌ی شما ندارد.</li>}
      </ul>

      <p className="text-[12px] font-bold text-ink-600 mb-2">نقش‌های تخصیص‌یافته ({fmtN(bs.length)})</p>
      <ul className="space-y-1.5 mb-5">
        {bs.map((b) => {
          const r = roleOf(b.roleId);
          return (
            <li key={b.id} className="rounded-lg border border-ink-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-ink-800 truncate flex items-center gap-1.5">
                  <KeyRound size={12} className="text-brand-600 shrink-0" />
                  {r?.name ?? "—"}
                  {t.isAdminRole(r) && <Badge tone="navy">مدیریتی</Badge>}
                </span>
                <BindingStatusBadge status={bindingStatus(b, today)} />
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <ScopeName id={b.scopeId} />
                <ValidityText b={b} />
              </div>
            </li>
          );
        })}
        {bs.length === 0 && <li className="text-[12px] text-ink-400">نقشی در محدوده‌ی شما ندارد.</li>}
      </ul>

      <p className="text-[12px] font-bold text-ink-600 mb-2">دسترسی مؤثر در هر واحد</p>
      <ul className="space-y-1.5">
        {scopeIds.map((id) => {
          const n = t.effectiveOf(userId, id).size;
          return (
            <li key={id} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2">
              <div className="min-w-0 flex-1">
                <ScopeName id={id} />
                <div className="h-1.5 rounded-full bg-ink-100 mt-1.5 overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(n / TOTAL_PERMS) * 100}%` }} />
                </div>
              </div>
              <span className="text-[12px] font-bold text-ink-700 shrink-0">
                {fmtN(n)} <span className="text-ink-400 font-normal">از {fmtN(TOTAL_PERMS)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-ink-400 mt-2 leading-5">دسترسی مؤثر = اجتماعِ مجوزهای همه‌ی نقش‌های معتبری که در همان واحد یا لایه‌های بالاترش داده شده‌اند.</p>
      {hidden > 0 && (
        <p className="text-[11px] text-ink-400 mt-3 flex items-center gap-1">
          <Lock size={11} /> {fmtN(hidden)} عضویت/نقش دیگر خارج از محدوده‌ی دید شماست.
        </p>
      )}
    </Drawer>
  );
}

/** شروع «مشاهده به‌عنوان» رسمی: دلیل و مدت الزامی، فقط‌خواندنی، شروع/پایان در تاریخچه ثبت می‌شود */
function ImpersonateModal({ userId, onClose, onStarted }: { userId: string; onClose: () => void; onStarted: () => void }) {
  const t = useTenancy();
  const run = useRun();
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState(30);
  const base = t.checkImpersonate(userId);
  const check = !base.ok ? base : reason.trim().length < 5 ? { ok: false as const, reason: "دلیل را بنویسید (مثلاً شماره‌ی تیکت پشتیبانی)." } : base;
  return (
    <Modal open onClose={onClose} title={`مشاهده به‌عنوان «${userName(userId)}»`} description="سامانه را دقیقاً از دید این کاربر می‌بینید؛ هیچ تغییری ممکن نیست و شروع و پایان در تاریخچه ثبت می‌شود." width="max-w-md">
      <div className="space-y-3">
        <Field label="دلیل (الزامی)">
          <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: بررسی تیکت T-1042 — منوی پروژه دیده نمی‌شود" autoFocus />
        </Field>
        <Field label="مدت">
          <select className="input-field" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {[15, 30, 60, 120].map((m) => (
              <option key={m} value={m}>
                {m.toLocaleString("fa-IR")} دقیقه
              </option>
            ))}
          </select>
        </Field>
        <Callout tone="warning">در این مدت نوار کهربایی بالای صفحه نشان می‌دهد در حالت فقط‌خواندنی هستید؛ با «پایان» یا تمام شدن مهلت به حساب خودتان برمی‌گردید.</Callout>
        <CheckLine check={check} okText="آماده‌ی شروع." />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <GuardButton variant="primary" icon={<Eye size={14} />} check={check} onClick={() => run(t.startImpersonation(userId, reason, minutes), `اکنون سامانه را به‌عنوان «${userName(userId)}» می‌بینید (فقط‌خواندنی).`) && onStarted()}>
            شروع مشاهده
          </GuardButton>
        </div>
      </div>
    </Modal>
  );
}
