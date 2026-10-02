import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ArrowDownToLine, Check, CircleHelp, Clock, GitMerge, Inbox, KeyRound, Layers, MapPin, Send, ShieldBan, ShieldCheck, Star, X } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Avatar from "../components/Avatar";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastProvider";
import { permissionCatalog } from "../data/mock";
import { useTenancy } from "../context/TenancyContext";
import { useInbox } from "../context/InboxContext";
import { ROOT_ID, ancestorsOrSelf, descendantsOrSelf, type ScopeNode } from "../iam/model";
import { useMyAccessRequests } from "../iam/hooks";
import { durationLabel, reqStatusLabel, reqStatusTone } from "./settings/AccessRequestsSection";
import {
  BindingStatusBadge,
  CheckLine,
  Field,
  PermId,
  ScopeIcon,
  ScopeName,
  ScopeSelect,
  SearchBox,
  TOTAL_PERMS,
  TypeBadge,
  ValidityText,
  bindingStatus,
  fmtN,
  userName,
} from "./settings/iam/shared";

/**
 * «نقش و دسترسی من» — نمای شفافِ اینکه کاربرِ فعلی در هر لایه‌ی سازمان دقیقاً چه کاری
 * می‌تواند بکند و هر مجوز از کدام نقش و کدام واحد آمده است.
 */
const ROLE_COLORS = ["#2a66bd", "#0d9488", "#b45309", "#7c3aed", "#db2777", "#059669", "#dc2626", "#0891b2"];
type Filter = "all" | "has" | "not";

export default function MyAccess() {
  const t = useTenancy();
  const { iam, today, actingUser: me } = t;
  const [pick, setPick] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [why, setWhy] = useState<string | null>(null);
  const [request, setRequest] = useState<{ scopeId: string; perm?: string } | null>(null);

  const reachableIds = new Set(t.reachable.map((r) => r.id));
  const scopeId = pick && reachableIds.has(pick) ? pick : t.contextId;
  const scopeNode = iam.scopes.find((s) => s.id === scopeId) ?? t.contextNode;
  const reachableOrdered = useMemo(() => descendantsOrSelf(iam, ROOT_ID).filter((n) => t.reachable.some((r) => r.id === n.id)), [iam, t.reachable]);

  const memberships = t.membershipsOf(me.id);
  const bindings = useMemo(() => iam.bindings.filter((b) => b.userId === me.id && b.active), [iam, me.id]);
  const liveCount = bindings.filter((b) => bindingStatus(b, today) === "live").length;
  const isAdmin = bindings.some((b) => bindingStatus(b, today) === "live" && t.isAdminRole(iam.roles.find((r) => r.id === b.roleId)));
  const primary = memberships.find((m) => m.primary) ?? memberships[0];

  // درخت عضویت‌ها: واحدهای عضویت/تخصیص + والدهایشان (والدها کم‌رنگ)
  const treeIds = useMemo(() => {
    const own = new Set([...memberships.map((m) => m.scopeId), ...bindings.map((b) => b.scopeId)]);
    const all = new Set<string>();
    own.forEach((id) => ancestorsOrSelf(iam, id).forEach((n) => all.add(n.id)));
    return { own, all };
  }, [memberships, bindings, iam]);

  const eff = t.effectiveOf(me.id, scopeId);
  const roleColor = useMemo(() => {
    const m = new Map<string, string>();
    [...new Set(bindings.map((b) => b.roleId))].forEach((id, i) => m.set(id, ROLE_COLORS[i % ROLE_COLORS.length]));
    return m;
  }, [bindings]);
  const applying = useMemo(() => {
    const seen = new Map<string, { roleId: string; scopeId: string }>();
    eff.forEach((srcs) => srcs.forEach((s) => seen.set(`${s.roleId}@${s.scopeId}`, s)));
    return [...seen.values()];
  }, [eff]);
  const roleName = (id: string) => iam.roles.find((r) => r.id === id)?.name ?? "—";

  const term = q.trim();
  const groups = permissionCatalog
    .map((g) => ({
      g,
      count: g.actions.filter((a) => eff.has(a.id)).length,
      actions: g.actions.filter((a) => (filter === "all" ? true : filter === "has" ? eff.has(a.id) : !eff.has(a.id))).filter((a) => !term || a.label.includes(term) || a.id.includes(term) || g.label.includes(term)),
    }))
    .filter((x) => x.actions.length);

  const renderNode = (n: ScopeNode, level: number): ReactNode => {
    const kids = iam.scopes.filter((s) => s.parentId === n.id && treeIds.all.has(s.id));
    const own = treeIds.own.has(n.id);
    const ms = memberships.filter((m) => m.scopeId === n.id);
    const bs = bindings.filter((b) => b.scopeId === n.id);
    const sel = n.id === scopeId;
    const canPick = reachableIds.has(n.id);
    return (
      <Fragment key={n.id}>
        <div className="relative" style={{ paddingRight: level * 14 }}>
          {level > 0 && <span className="absolute top-0 bottom-0 border-r border-dashed border-ink-200" style={{ right: level * 14 - 8 }} />}
          <button
            type="button"
            disabled={!canPick}
            onClick={() => setPick(n.id)}
            className={`w-full text-right rounded-lg px-2 py-1.5 ${sel ? "bg-brand-50 ring-1 ring-brand-200" : canPick ? "hover:bg-ink-50" : ""} ${own ? "" : "opacity-55"} disabled:cursor-default`}
            title={canPick ? "نمایش دسترسی‌ها در این واحد" : "لایه‌ی بالاتر — فقط مسیر"}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <ScopeIcon type={n.type} size={13} />
              <span className={`text-[12.5px] truncate ${own ? "font-semibold text-ink-900" : "text-ink-500"}`}>{n.name}</span>
              {ms.map((m) => (
                <span key={m.id} className="flex items-center gap-1 shrink-0">
                  {m.primary && <Star size={11} className="text-amber-500 fill-amber-400" aria-label="عضویت اصلی" />}
                  {m.status === "suspended" ? <Badge tone="warning">معلق</Badge> : <Badge tone="success">عضو</Badge>}
                </span>
              ))}
            </span>
            {ms[0]?.title && <span className="block text-[10.5px] text-ink-400 mr-5">{ms[0].title}</span>}
            {bs.length > 0 && (
              <span className="flex flex-col gap-1 mt-1 mr-5">
                {bs.map((b) => (
                  <span key={b.id} className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: roleColor.get(b.roleId) }} />
                    <span className="text-ink-700">{roleName(b.roleId)}</span>
                    <BindingStatusBadge status={bindingStatus(b, today)} />
                    {(b.validFrom || b.validUntil) && <ValidityText b={b} />}
                  </span>
                ))}
              </span>
            )}
          </button>
        </div>
        {kids.map((k) => renderNode(k, level + 1))}
      </Fragment>
    );
  };
  const root = iam.scopes.find((s) => s.id === ROOT_ID);

  return (
    <div>
      <PageHeader
        title="نقش و دسترسی من"
        description="عضویت‌ها، نقش‌ها و فهرست کامل کارهایی که در هر لایه‌ی سازمان می‌توانید انجام دهید — و اینکه هر دسترسی از کجا آمده است."
        icon={<KeyRound size={18} />}
        actions={
          <Button variant="primary" icon={<Send size={14} />} onClick={() => setRequest({ scopeId })}>
            درخواست دسترسی
          </Button>
        }
      />

      {/* کارت هویت */}
      <div className="card p-4 sm:p-5 mb-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
          <Avatar name={me.name} color={me.avatarColor} size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-ink-900">{me.name}</p>
            <p className="text-[12.5px] text-ink-500 mt-0.5">{me.role}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {primary && (
                <Badge tone="brand" icon={<MapPin size={11} />}>
                  {primary.scope.name}
                </Badge>
              )}
              <Badge tone="neutral" icon={<Layers size={11} />}>
                {fmtN(memberships.length)} عضویت
              </Badge>
              <Badge tone="neutral" icon={<KeyRound size={11} />}>
                {fmtN(liveCount)} نقش فعال
              </Badge>
              {isAdmin ? <Badge tone="navy" icon={<ShieldCheck size={11} />}>دارای نقش مدیریتی</Badge> : <Badge tone="neutral">بدون نقش مدیریتی</Badge>}
            </div>
          </div>
          <div className="text-left shrink-0">
            <p className="text-2xl font-black text-brand-700">
              {fmtN(t.effective.size)}
              <span className="text-sm text-ink-400"> / {fmtN(TOTAL_PERMS)}</span>
            </p>
            <p className="text-[11px] text-ink-400">مجوز در «{t.contextNode.name}»</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] gap-4 items-start">
        {/* ستون عضویت‌ها و قواعد */}
        <div className="space-y-4 min-w-0">
          <div className="card p-3">
            <p className="text-[12.5px] font-bold text-ink-800 px-1 mb-2">عضویت‌ها و نقش‌های من</p>
            {root && treeIds.all.size ? renderNode(root, 0) : <EmptyState title="عضویتی ندارید" />}
            <p className="text-[10.5px] text-ink-400 px-1 mt-2 leading-5">واحدهای کم‌رنگ لایه‌های بالاتر مسیرند. روی هر واحد بزنید تا دسترسی‌تان در آن را ببینید.</p>
          </div>

          <MyRequests />

          <div className="card p-4">
            <p className="text-[12.5px] font-bold text-ink-800 mb-3">قواعد دسترسی</p>
            <ul className="space-y-3">
              {[
                { i: <GitMerge size={14} />, h: "اجتماع نقش‌ها", d: "اگر چند نقش دارید، دسترسی‌تان مجموعِ مجوزهای همه‌ی آن‌هاست." },
                { i: <ArrowDownToLine size={14} />, h: "وراثت رو به پایین", d: "نقشی که در یک واحد گرفته‌اید در همه‌ی زیرمجموعه‌هایش هم معتبر است؛ اما در لایه‌های بالاتر نه." },
                { i: <ShieldBan size={14} />, h: "بدون افزایش امتیاز", d: "هیچ مدیری نمی‌تواند مجوزی بدهد که خودش ندارد، و مدیر هم‌سطح یا بالاتر را فقط لایه‌ی بالاتر تغییر می‌دهد." },
                { i: <Clock size={14} />, h: "نقش‌های زمان‌دار", d: "بعضی نقش‌ها تاریخ شروع یا پایان دارند و خودکار فعال یا بی‌اثر می‌شوند. عضویتِ معلق هم نقش‌های آن واحد را موقتاً بی‌اثر می‌کند." },
              ].map((r) => (
                <li key={r.h} className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">{r.i}</span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-ink-800">{r.h}</span>
                    <span className="block text-[11.5px] text-ink-500 leading-5">{r.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* دسترسی مؤثر */}
        <div className="min-w-0 space-y-3">
          <div className="card p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-center">
              <span className="text-[12px] text-ink-500">دسترسی من در</span>
              <ScopeSelect value={scopeId} onChange={setPick} nodes={reachableOrdered} ariaLabel="واحد" />
              {scopeId !== t.contextId ? (
                <Button size="sm" onClick={() => t.setContext(scopeId)} title="کانتکست کل سامانه به این واحد تغییر می‌کند">
                  ایستادن در این واحد
                </Button>
              ) : (
                <Badge tone="success">واحد فعلی شما</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <TypeBadge type={scopeNode.type} />
              <span className="text-[12px] text-ink-600">
                <b className="text-ink-900">{fmtN(eff.size)}</b> از {fmtN(TOTAL_PERMS)} مجوز — حاصل {fmtN(applying.length)} نقش:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {applying.map((s) => (
                <span key={`${s.roleId}@${s.scopeId}`} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1 text-[11.5px] text-ink-700">
                  <span className="w-2 h-2 rounded-full" style={{ background: roleColor.get(s.roleId) }} />
                  {roleName(s.roleId)}
                  <span className="text-ink-400">· {s.scopeId === scopeId ? "همین واحد" : `از «${t.scopeLabel(s.scopeId)}»`}</span>
                </span>
              ))}
              {!applying.length && <span className="text-[12px] text-ink-400">در این واحد نقش معتبری ندارید.</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-ink-200 overflow-hidden bg-white">
              {(
                [
                  ["all", "همه"],
                  ["has", "دارم"],
                  ["not", "ندارم"],
                ] as [Filter, string][]
              ).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFilter(id)} className={`px-3 py-1.5 text-[12px] ${filter === id ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
                  {label}
                </button>
              ))}
            </div>
            <SearchBox value={q} onChange={setQ} placeholder="جستجوی مجوز…" className="flex-1 min-w-[180px]" />
          </div>

          {groups.length === 0 && (
            <div className="card">
              <EmptyState title="مجوزی با این فیلتر نیست" />
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {groups.map(({ g, count, actions }) => (
              <div key={g.id} className="card p-3.5 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-[13px] font-bold text-ink-900 truncate">{g.label}</h3>
                  <span className={`text-[10.5px] font-bold rounded-full px-2 py-px shrink-0 ${count ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-ink-100 text-ink-400"}`}>
                    {fmtN(count)} از {fmtN(g.actions.length)}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {actions.map((a) => {
                    const srcs = eff.get(a.id) ?? [];
                    const ok = srcs.length > 0;
                    const open = why === a.id;
                    return (
                      <li key={a.id}>
                        <button type="button" onClick={() => setWhy(open ? null : a.id)} className={`w-full text-right flex items-start gap-2 rounded-md px-1.5 py-1 ${open ? "bg-ink-50" : "hover:bg-ink-50"}`}>
                          <span className={`w-4 h-4 mt-0.5 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-300"}`}>{ok ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[12px] leading-5 ${ok ? "text-ink-700" : "text-ink-400"}`}>{a.label}</span>
                            <PermId id={a.id} />
                          </span>
                          <span className="flex items-center gap-0.5 mt-1 shrink-0">
                            {srcs.map((s) => (
                              <span key={`${s.roleId}@${s.scopeId}`} className="w-2 h-2 rounded-full" style={{ background: roleColor.get(s.roleId) }} title={`${roleName(s.roleId)} — ${t.scopeLabel(s.scopeId)}`} />
                            ))}
                            <CircleHelp size={12} className="text-ink-300 mr-1" aria-label="چرا؟" />
                          </span>
                        </button>
                        {open && (
                          <div className="mr-7 mb-1.5 mt-0.5 rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-2 text-[11.5px] leading-6 text-ink-600">
                            {ok ? (
                              <>
                                <p className="font-semibold text-ink-700">چرا این دسترسی را دارم؟</p>
                                {srcs.map((s) => {
                                  const b = bindings.find((x) => x.roleId === s.roleId && x.scopeId === s.scopeId && bindingStatus(x, today) === "live");
                                  return (
                                    <p key={`${s.roleId}@${s.scopeId}`}>
                                      از نقش <b>«{roleName(s.roleId)}»</b> که در <b>«{t.scopeLabel(s.scopeId)}»</b> به شما داده شده
                                      {s.scopeId === scopeId ? "." : "؛ چون آن واحد بالاتر از این واحد است، اینجا هم به ارث رسیده."}
                                      {b?.validUntil && <span className="text-amber-700"> (تا {b.validUntil})</span>}
                                    </p>
                                  );
                                })}
                              </>
                            ) : (
                              <>
                                <p>هیچ‌کدام از نقش‌های شما در «{scopeNode.name}» یا لایه‌های بالاترش این مجوز را ندارد.</p>
                                <button type="button" className="text-brand-700 hover:underline font-semibold" onClick={() => setRequest({ scopeId, perm: a.id })}>
                                  درخواست نقشی که این مجوز را دارد ←
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {request && <RequestAccess initial={request} scopes={reachableOrdered} onClose={() => setRequest(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
function RequestAccess({ initial, scopes, onClose }: { initial: { scopeId: string; perm?: string }; scopes: ScopeNode[]; onClose: () => void }) {
  const t = useTenancy();
  const inbox = useInbox();
  const { notify } = useToast();
  const { iam, today, actingUser: me } = t;
  const [scopeId, setScopeId] = useState(initial.scopeId);
  const [roleId, setRoleId] = useState("");
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");

  const mine = new Set(iam.bindings.filter((b) => b.userId === me.id && b.scopeId === scopeId && bindingStatus(b, today) === "live").map((b) => b.roleId));
  const roles = t.assignableRoles(scopeId).filter((r) => !mine.has(r.id));
  const sorted = initial.perm ? [...roles].sort((a, b) => Number(b.permissions.includes(initial.perm!)) - Number(a.permissions.includes(initial.perm!))) : roles;

  // مدیرانِ نزدیک‌ترین لایه‌ای که اختیار تخصیص نقش دارند
  const managers = useMemo(() => {
    for (const n of ancestorsOrSelf(iam, scopeId)) {
      const ids = iam.bindings
        .filter((b) => b.scopeId === n.id && b.userId !== me.id && bindingStatus(b, today) === "live")
        .filter((b) => {
          const r = iam.roles.find((x) => x.id === b.roleId);
          return t.isAdminRole(r) && r!.permissions.includes("roles.assign");
        })
        .map((b) => b.userId);
      if (ids.length) return { layer: n, ids: [...new Set(ids)] };
    }
    return null;
  }, [iam, scopeId, me.id, today, t]);

  const role = iam.roles.find((r) => r.id === roleId);
  const durationDays = duration ? Number(duration) : null;
  const input = { roleId, scopeId, durationDays, reason, perm: initial.perm };
  const check = !managers ? ({ ok: false, reason: "مدیری برای این واحد پیدا نشد." } as const) : !roleId ? ({ ok: false, reason: "نقش مورد نیاز را انتخاب کنید." } as const) : t.checkRequestAccess(input);

  const submit = () => {
    if (!check.ok || !managers || !role) return notify(check.ok ? "اطلاعات ناقص است." : check.reason, "warning");
    const res = t.requestAccess(input);
    if (!res.ok) return notify(res.reason, "warning");
    const names = managers.ids.map(userName);
    const dur = durationDays ? ` برای ${durationLabel(durationDays)}` : " (دائمی)";
    inbox.send(names, "access", `«${me.name}» درخواست نقش «${role.name}» در «${t.scopeLabel(scopeId)}»${dur} را دارد. دلیل: ${reason.trim()}`, "/dashboard/settings?section=access-requests");
    notify(`درخواست ثبت و برای ${names.join("، ")} فرستاده شد؛ وضعیت را در «درخواست‌های من» ببینید.`, "success");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="درخواست دسترسی" description="درخواست شما به مدیرِ واحد می‌رسد؛ با تأیید او نقش به‌صورت زمان‌دار (تا پایان مدت) تخصیص می‌یابد." width="max-w-xl">
      <div className="space-y-3">
        <Field label="در کدام واحد؟">
          <ScopeSelect
            value={scopeId}
            onChange={(id) => {
              setScopeId(id);
              setRoleId("");
            }}
            nodes={scopes}
          />
        </Field>
        <Field label="نقش مورد نیاز" hint={initial.perm ? "نقش‌هایی که مجوز موردنظر را دارند بالاتر آمده‌اند." : "فقط نقش‌هایی که در این واحد قابل تخصیص‌اند و هنوز ندارید."}>
          <div className="rounded-lg border border-ink-200 max-h-52 overflow-y-auto divide-y divide-ink-100">
            {sorted.map((r) => {
              const on = roleId === r.id;
              const hasPerm = initial.perm ? r.permissions.includes(initial.perm) : false;
              return (
                <button key={r.id} type="button" onClick={() => setRoleId(r.id)} className={`w-full text-right px-3 py-2 flex items-start gap-2 ${on ? "bg-brand-50" : "hover:bg-ink-50"}`}>
                  <span className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${on ? "bg-brand-600 border-brand-600 text-white" : "border-ink-300"}`}>{on && <Check size={10} strokeWidth={3} />}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-800">
                      {r.name}
                      {hasPerm && <Badge tone="success">شامل مجوز</Badge>}
                    </span>
                    <span className="block text-[11px] text-ink-400 line-clamp-1">{r.description}</span>
                  </span>
                </button>
              );
            })}
            {sorted.length === 0 && <p className="px-3 py-4 text-center text-[12px] text-ink-400">نقش دیگری در این واحد برای درخواست نیست.</p>}
          </div>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-[160px_minmax(0,1fr)] gap-3">
          <Field label="مدت">
            <select className="input-field" value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="7">۱ هفته</option>
              <option value="30">۳۰ روز</option>
              <option value="90">۳ ماه</option>
              <option value="">دائمی</option>
            </select>
          </Field>
          <Field label="دلیل">
            <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: پوشش مرخصی همکار در پروژه‌ی …" />
          </Field>
        </div>
        {managers && (
          <div className="rounded-lg border border-ink-100 px-3 py-2 text-[12px] text-ink-600 flex items-center gap-2 flex-wrap">
            <span>گیرنده:</span>
            {managers.ids.map((id) => (
              <Badge key={id} tone="brand">
                {userName(id)}
              </Badge>
            ))}
            <span className="text-ink-400 text-[11px]">
              (مدیر <ScopeNameInline id={managers.layer.id} />)
            </span>
          </div>
        )}
        <CheckLine check={check} okText="درخواست آماده‌ی ارسال است؛ نتیجه در اعلان‌هایتان خبر داده می‌شود." />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button variant="primary" icon={<Send size={14} />} disabled={!check.ok} onClick={submit} className="disabled:opacity-45 disabled:cursor-not-allowed" title={check.ok ? undefined : check.reason}>
            ارسال درخواست
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ScopeNameInline({ id }: { id: string }) {
  return (
    <span className="inline-flex align-middle">
      <ScopeName id={id} />
    </span>
  );
}

/** درخواست‌های دسترسیِ من و وضعیتشان */
function MyRequests() {
  const t = useTenancy();
  const { notify } = useToast();
  const mine = useMyAccessRequests();
  if (!mine.length) return null;
  const roleName = (id: string) => t.iam.roles.find((r) => r.id === id)?.name ?? "—";
  return (
    <div className="card p-3">
      <p className="text-[12.5px] font-bold text-ink-800 px-1 mb-2 flex items-center gap-1.5">
        <Inbox size={14} className="text-brand-600" /> درخواست‌های من
      </p>
      <ul className="space-y-1.5">
        {mine.slice(0, 6).map((r) => (
          <li key={r.id} className="rounded-lg border border-ink-100 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-ink-800 truncate">{roleName(r.roleId)}</span>
              <Badge tone={reqStatusTone[r.status]}>{reqStatusLabel[r.status]}</Badge>
            </div>
            <p className="text-[11px] text-ink-400 truncate">
              {t.scopeLabel(r.scopeId)} · {durationLabel(r.durationDays)}
              {r.validUntil ? ` · تا ${r.validUntil}` : ""}
            </p>
            {r.decisionNote && <p className="text-[11px] text-ink-500 mt-0.5">{r.decisionNote}</p>}
            {r.status === "pending" && (
              <button type="button" className="text-[11px] text-rose-600 hover:underline mt-0.5" onClick={() => { const c = t.cancelRequest(r.id); notify(c.ok ? "درخواست لغو شد." : c.reason, c.ok ? "success" : "warning"); }}>
                انصراف از درخواست
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
