// ---------------------------------------------------------------------------
// تیکت پشتیبانی — هر کاربرِ سامانه (در هر لایه‌ی سازمان) می‌تواند خطا، درخواست قابلیت یا
// پرسش خود را برای تیم سازنده‌ی موتوشاب ثبت کند و تا بسته شدن، تاریخچه‌ی کامل را ببیند.
//   «تیکت‌های من»       — tickets.create
//   «تیکت‌های سازمان»   — tickets.view-org (تیکت‌های اعضای واحد فعلی و زیرمجموعه‌ها)
//   «میز پشتیبانی»      — tickets.vendor (صف تیم سازنده با فیلتر، ارجاع گروهی و پاسخ آماده)
// پارامترها: ?view=mine|org|desk  ?id=MSH-1024 (باز کردن جزئیات)  ?new=1 (فرم ثبت)  &from=/مسیر
// ---------------------------------------------------------------------------
import ModuleReportsButton from "../reports/ModuleReportsButton";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LifeBuoy, Plus, Search, SlidersHorizontal, AlertTriangle, Timer, Smile, Inbox, MessageSquareText, Paperclip, X, UserCheck, Building2, Headset, Users, Bell } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import Avatar from "../components/Avatar";
import { useToast } from "../components/ui/ToastProvider";
import { useTenancy } from "../context/TenancyContext";
import { useTickets } from "../context/TicketsContext";
import { descendantsOrSelf } from "../iam/model";
import { fa } from "../pm/jalali";
import {
  affectedCount,
  fmtDur,
  isBreached,
  isFinal,
  modules,
  priorities,
  priorityTone,
  relTs,
  slaFirst,
  slaResolve,
  statusOrder,
  statusShort,
  vendorById,
  vendorTeam,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "./tickets/model";
import { SlaPill, StatusBadge } from "./tickets/parts";
import TicketForm, { typeIcon } from "./tickets/TicketForm";
import TicketDetail from "./tickets/TicketDetail";

type View = "mine" | "org" | "desk";
type StatusFilter = "all" | "open" | TicketStatus;
const prioRank: Record<TicketPriority, number> = { بحرانی: 0, زیاد: 1, متوسط: 2, کم: 3 };

export default function Tickets() {
  const tk = useTickets();
  const { actingUser, hasPermission, iam, contextId, contextNode } = useTenancy();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();

  const canCreate = hasPermission("tickets.create");
  const canOrg = hasPermission("tickets.view-org");
  const canDesk = tk.isVendor;
  const views: { id: View; label: string; icon: typeof Inbox }[] = [
    { id: "mine", label: "تیکت‌های من", icon: Inbox },
    ...(canOrg ? [{ id: "org" as View, label: "تیکت‌های سازمان", icon: Building2 }] : []),
    ...(canDesk ? [{ id: "desk" as View, label: "میز پشتیبانی", icon: Headset }] : []),
  ];
  const requested = params.get("view") as View | null;
  const view: View = views.some((v) => v.id === requested) ? requested! : "mine";
  const openId = params.get("id");
  const newOpen = params.get("new") === "1" && canCreate;

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [prio, setPrio] = useState<TicketPriority | "">("");
  const [mod, setMod] = useState("");
  const [sla, setSla] = useState<"" | "breached" | "risk">("");
  const [assignee, setAssignee] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const orgIds = useMemo(() => new Set(descendantsOrSelf(iam, contextId).map((s) => s.id)), [iam, contextId]);
  const lists = useMemo(
    () => ({
      // «تیکت‌های من» = ثبت‌کرده‌ها + دنبال‌شده‌ها + «من هم»ها
      mine: tk.tickets.filter((t) => tk.involved(t)),
      org: tk.tickets.filter((t) => orgIds.has(t.reporterScopeId)),
      desk: tk.tickets,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tk.tickets, actingUser.id, orgIds],
  );
  const base = lists[view];
  const now = tk.now;

  const slaState = (t: Ticket) => {
    if (isFinal(t.status) || t.status === "resolved") return "";
    if (isBreached(t, now)) return "breached";
    return slaFirst(t, now).state === "risk" || slaResolve(t, now).state === "risk" ? "risk" : "";
  };

  const filtered = base
    .filter((t) => {
      if (status === "open" ? isFinal(t.status) : status !== "all" && t.status !== status) return false;
      if (prio && t.priority !== prio) return false;
      if (mod && t.module !== mod) return false;
      if (sla && slaState(t) !== sla) return false;
      if (assignee === "none" ? !!t.assigneeId : assignee && t.assigneeId !== assignee) return false;
      const s = q.trim();
      return !s || t.id.toLowerCase().includes(s.toLowerCase()) || t.title.includes(s) || t.reporterName.includes(s) || t.labels.some((l) => l.includes(s));
    })
    .sort((a, b) => {
      if (view === "desk") {
        const ba = isBreached(a, now) ? 0 : 1;
        const bb = isBreached(b, now) ? 0 : 1;
        const fa_ = isFinal(a.status) ? 1 : 0;
        const fb_ = isFinal(b.status) ? 1 : 0;
        return fa_ - fb_ || ba - bb || prioRank[a.priority] - prioRank[b.priority] || affectedCount(b) - affectedCount(a) || b.updatedAt - a.updatedAt;
      }
      return b.updatedAt - a.updatedAt;
    });

  // آمار نمای فعلی
  const open = base.filter((t) => !isFinal(t.status));
  const breached = base.filter((t) => isBreached(t, now)).length;
  const responded = base.filter((t) => t.firstResponseAt !== undefined);
  const avgFirst = responded.length ? responded.reduce((s, t) => s + (t.firstResponseAt! - t.createdAt), 0) / responded.length : 0;
  const rated = base.filter((t) => t.rating);
  const csat = rated.length ? rated.reduce((s, t) => s + t.rating!.score, 0) / rated.length : 0;
  const awaitingMe = lists.mine.filter((t) => t.reporterId === actingUser.id && (t.status === "resolved" || t.status === "need-info")).length;
  const unassigned = open.filter((t) => !t.assigneeId).length;

  const extraFilters = [prio, mod, sla, assignee].filter(Boolean).length;
  const allowed = (id: string) => lists.mine.some((t) => t.id === id) || (canOrg && lists.org.some((t) => t.id === id)) || canDesk;
  const openTicket = openId ? tk.get(openId) : undefined;

  const switchView = (v: View) => {
    setSelected(new Set());
    setStatus(v === "mine" ? "all" : "open");
    setPrio("");
    setMod("");
    setSla("");
    setAssignee("");
    patchParams({ view: v === "mine" ? null : v });
  };

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  return (
    <div>
      <PageHeader
        title="تیکت پشتیبانی"
        description="گزارش خطا، درخواست قابلیت و پرسش به تیم سازنده‌ی موتوشاب — با تاریخچه‌ی کامل و پیگیری SLA"
        icon={<LifeBuoy size={18} />}
        actions={
          <>
          <ModuleReportsButton module="tickets" />
          {canCreate && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => patchParams({ new: "1" })}>
              تیکت جدید
            </Button>
          )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="تیکت‌های باز"
          value={fa(open.length)}
          tone="brand"
          icon={<Inbox size={16} />}
          hint={view === "desk" ? `${fa(unassigned)} بدون مسئول` : view === "mine" && awaitingMe ? `${fa(awaitingMe)} منتظر اقدام شما` : `از ${fa(base.length)} تیکت`}
        />
        <StatCard label="نقض SLA" value={fa(breached)} tone={breached ? "danger" : "success"} icon={<AlertTriangle size={16} />} hint="تیکت‌های باز خارج از مهلت" />
        <StatCard label="میانگین اولین پاسخ" value={responded.length ? fmtDur(avgFirst) : "—"} tone="warning" icon={<Timer size={16} />} hint={`${fa(responded.length)} تیکت پاسخ‌گرفته`} />
        <StatCard label="رضایت کاربران" value={rated.length ? `${fa(Math.round(csat * 10) / 10)} از ۵` : "—"} tone="success" icon={<Smile size={16} />} hint={`${fa(rated.length)} نظر ثبت‌شده`} />
      </div>

      {views.length > 1 && (
        <div className="flex items-center gap-1 border-b border-ink-200 mb-4 overflow-x-auto" role="tablist">
          {views.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              onClick={() => switchView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap ${view === v.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}
            >
              <v.icon size={14} /> {v.label}
              <span className="text-[10px] rounded-full px-1.5 bg-ink-100 text-ink-500">{fa(lists[v.id].filter((t) => !isFinal(t.status)).length)}</span>
            </button>
          ))}
        </div>
      )}

      {/* نوار ابزار */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی شماره، عنوان، برچسب…" className="input-field w-full pr-8" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="input-field w-auto max-w-[150px]" aria-label="وضعیت">
          <option value="all">همه‌ی وضعیت‌ها</option>
          <option value="open">باز</option>
          {statusOrder.map((s) => (
            <option key={s} value={s}>
              {statusShort[s]}
            </option>
          ))}
        </select>
        {view !== "mine" && (
          <Button icon={<SlidersHorizontal size={14} />} onClick={() => setShowFilters((v) => !v)} className={showFilters || extraFilters ? "!border-brand-400 !text-brand-700" : ""} aria-label="فیلترهای بیشتر">
            <span className="hidden sm:inline">فیلتر</span>
            {extraFilters > 0 && <span className="text-[10px] bg-brand-600 text-white rounded-full px-1.5">{fa(extraFilters)}</span>}
          </Button>
        )}
      </div>

      {view !== "mine" && showFilters && (
        <div className="card p-3 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={prio} onChange={(e) => setPrio(e.target.value as TicketPriority | "")} className="input-field" aria-label="اولویت">
            <option value="">همه‌ی اولویت‌ها</option>
            {priorities.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={mod} onChange={(e) => setMod(e.target.value)} className="input-field" aria-label="بخش">
            <option value="">همه‌ی بخش‌ها</option>
            {modules.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select value={sla} onChange={(e) => setSla(e.target.value as "" | "breached" | "risk")} className="input-field" aria-label="SLA">
            <option value="">همه (SLA)</option>
            <option value="breached">نقض SLA</option>
            <option value="risk">در آستانه‌ی نقض</option>
          </select>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="input-field" aria-label="مسئول">
            <option value="">همه‌ی مسئولان</option>
            <option value="none">بدون مسئول</option>
            {vendorTeam.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {extraFilters > 0 && (
            <button
              onClick={() => {
                setPrio("");
                setMod("");
                setSla("");
                setAssignee("");
              }}
              className="col-span-2 sm:col-span-4 text-[11.5px] text-brand-700 hover:underline text-right"
            >
              پاک کردن فیلترها
            </button>
          )}
        </div>
      )}

      {view === "org" && (
        <p className="text-[11.5px] text-ink-500 mb-2">
          تیکت‌های اعضای «{contextNode.name}» و همه‌ی زیرمجموعه‌هایش — برای دیدن واحد دیگر، از سربرگ سازمان را عوض کنید.
        </p>
      )}
      {view === "desk" && (
        <div className="flex items-center gap-2 flex-wrap text-[11.5px] text-ink-500 mb-2">
          <span>صف تیم سازنده — تیکت‌های همه‌ی سازمان‌ها؛ نقض‌شده‌ها و اولویت بالاتر در ابتدا.</span>
          <span className="flex items-center gap-1 mr-auto">
            پاسخ با هویت
            <select value={tk.agent.id} onChange={(e) => tk.setAgentId(e.target.value)} className="input-field !py-0.5 !px-2 text-[11.5px] w-auto">
              {vendorTeam.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </span>
        </div>
      )}

      {view === "desk" && selected.size > 0 && (
        <div className="sticky top-2 z-10 mb-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 flex items-center gap-2 flex-wrap text-[12px] text-brand-800">
          <span className="font-medium">{fa(selected.size)} تیکت انتخاب شد</span>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const id = e.target.value === "none" ? undefined : e.target.value;
              tk.bulkAssign([...selected], id);
              notify(`${fa(selected.size)} تیکت به «${vendorById(id)?.name ?? "بدون مسئول"}» ارجاع شد.`);
              setSelected(new Set());
            }}
            className="input-field !py-1 text-[12px] w-auto"
            aria-label="ارجاع گروهی"
          >
            <option value="">ارجاع به…</option>
            {vendorTeam.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
            <option value="none">بدون مسئول</option>
          </select>
          <Button
            size="sm"
            onClick={() => {
              const ids = [...selected].filter((id) => tk.get(id)?.status === "new");
              tk.bulkStatus(ids, "triage");
              notify(`${fa(ids.length)} تیکت جدید به «در حال بررسی» رفت.`);
              setSelected(new Set());
            }}
          >
            شروع بررسی
          </Button>
          <button onClick={() => setSelected(new Set())} className="mr-auto text-brand-700 hover:underline flex items-center gap-1">
            <X size={12} /> لغو انتخاب
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy size={22} />}
          title={base.length === 0 ? (view === "mine" ? "هنوز تیکتی ثبت نکرده‌اید" : "تیکتی در این بخش نیست") : "تیکتی با این فیلترها پیدا نشد"}
          description={view === "mine" && base.length === 0 ? "هر جا مشکلی دیدید از دکمه‌ی «گزارش مشکل» یا «تیکت جدید» استفاده کنید؛ مسیر صفحه و مرورگر خودکار ثبت می‌شود." : undefined}
        />
      ) : (
        <div className="card overflow-hidden divide-y divide-ink-100">
          {view === "desk" && (
            <label className="flex items-center gap-2 px-3 py-2 text-[11.5px] text-ink-500 bg-ink-50 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((t) => t.id)))}
                className="accent-[var(--color-brand-600)] w-4 h-4"
              />
              انتخاب همه ({fa(filtered.length)})
            </label>
          )}
          {filtered.map((t) => (
            <TicketRow
              key={t.id}
              t={t}
              now={now}
              showReporter={view !== "mine"}
              selectable={view === "desk"}
              selected={selected.has(t.id)}
              onToggle={() => toggleSel(t.id)}
              onOpen={() => patchParams({ id: t.id })}
              internalVisible={tk.isVendor}
              following={t.reporterId !== actingUser.id && tk.involved(t)}
            />
          ))}
        </div>
      )}

      <Modal open={newOpen} onClose={() => patchParams({ new: null, from: null })} title="تیکت پشتیبانی جدید" description="تیکت مستقیم به صف تیم سازنده‌ی موتوشاب می‌رود" width="max-w-2xl">
        {newOpen && (
          <TicketForm
            route={params.get("from") ?? undefined}
            onCancel={() => patchParams({ new: null, from: null })}
            onCreated={(t) => {
              notify(`تیکت ${t.id} ثبت شد؛ نتیجه از همین صفحه و صندوق اعلان‌ها اطلاع‌رسانی می‌شود.`);
              patchParams({ new: null, from: null, id: t.id, view: null });
            }}
            onJoined={(t) => {
              notify(`به تیکت ${t.id} پیوستید؛ به‌جای تیکت تکراری، پیشرفت همین تیکت به شما اعلان می‌شود.`);
              patchParams({ new: null, from: null, id: t.id, view: null });
            }}
          />
        )}
      </Modal>

      <Drawer open={!!openId} onClose={() => patchParams({ id: null })} title={openTicket ? `تیکت ${openTicket.id}` : "تیکت"} width="max-w-2xl">
        {openTicket && allowed(openTicket.id) ? (
          <TicketDetail key={openTicket.id} ticket={openTicket} onOpen={(id) => patchParams({ id })} />
        ) : (
          <EmptyState icon={<LifeBuoy size={22} />} title="این تیکت در دسترس شما نیست" description="یا شماره‌ی تیکت اشتباه است یا مجوز دیدن آن را در این سازمان ندارید." />
        )}
      </Drawer>
    </div>
  );
}

function TicketRow({
  t,
  now,
  showReporter,
  selectable,
  selected,
  onToggle,
  onOpen,
  internalVisible,
  following = false,
}: {
  following?: boolean;
  t: Ticket;
  now: number;
  showReporter: boolean;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  internalVisible: boolean;
}) {
  const Icon = typeIcon[t.type];
  const msgs = t.events.filter((e) => e.kind === "comment" || (internalVisible && e.kind === "note")).length;
  const assignee = vendorById(t.assigneeId);
  return (
    <div className={`flex items-start gap-2.5 px-3 py-3 hover:bg-ink-50 cursor-pointer ${selected ? "bg-brand-50/50" : ""}`} onClick={onOpen}>
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={onToggle}
          aria-label={`انتخاب ${t.id}`}
          className="accent-[var(--color-brand-600)] w-4 h-4 mt-2 shrink-0"
        />
      )}
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === "خطا" || t.type === "کندی و کارایی" ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-700"}`}>
        <Icon size={15} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-[13.5px] font-medium truncate ${isFinal(t.status) ? "text-ink-500" : "text-ink-900"}`}>{t.title}</p>
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[11px] text-ink-500 mt-1">
          <span className="font-mono" dir="ltr">
            {t.id}
          </span>
          <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
          <span className="truncate max-w-[140px]">{t.module}</span>
          {showReporter && <span className="truncate max-w-[140px]">· {t.reporterName}</span>}
          <span>· {relTs(t.updatedAt, now)}</span>
          {msgs > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquareText size={11} /> {fa(msgs)}
            </span>
          )}
          {t.attachments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip size={11} /> {fa(t.attachments.length)}
            </span>
          )}
          {t.rating && <span className="text-amber-600">★ {fa(t.rating.score)}</span>}
          {affectedCount(t) > 1 && (
            <span className={`flex items-center gap-0.5 ${affectedCount(t) >= 3 ? "text-rose-600 font-medium" : ""}`} title="کاربران درگیر (گزارش‌دهنده + «من هم»)">
              <Users size={11} /> {fa(affectedCount(t))}
            </span>
          )}
          {following && (
            <span className="flex items-center gap-0.5 text-brand-700" title="دنبال می‌کنید">
              <Bell size={11} /> دنبال‌شده
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <StatusBadge status={t.status} />
        <SlaPill t={t} now={now} />
        {selectable && (
          <span className="flex items-center gap-1 text-[10.5px] text-ink-400" title={assignee ? `مسئول: ${assignee.name}` : "بدون مسئول"}>
            {assignee ? <Avatar name={assignee.name} color={assignee.color} size={18} /> : <UserCheck size={12} />}
            <span className="hidden sm:inline">{assignee ? assignee.name.replace("مهندس ", "") : "بدون مسئول"}</span>
          </span>
        )}
      </div>
    </div>
  );
}
