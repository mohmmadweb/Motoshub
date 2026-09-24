// ---------------------------------------------------------------------------
// جزئیات رویداد — /dashboard/events/:id
// EventDetail + اعضا (members / invitations / invite / rsvp / join / leave / promote / demote).
// ---------------------------------------------------------------------------
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Clock, Video, MapPin, Users, Repeat, Pencil, Trash2, Eye, EyeOff, Check, X, UserPlus, Send, LogOut, ShieldCheck, ShieldOff, CalendarPlus, ExternalLink, Crown } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import Tabs from "../../components/ui/Tabs";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { endpoints } from "../../social/endpoints";
import type { EventMember, EventMemberStatus, SocialEvent } from "../../social/types";
import { eventStatusLabel, memberTypeLabel } from "../../social/types";
import { dayNum, weekDayNames, fa } from "../../pm/jalali";
import { ApiChip, UserLine, UserPicker, PrivacyBadge, PublishBadge, CategoryBadges, TagList, AttachmentList, ReactionBar, CommentsPanel, Poster } from "./kit";
import { EventEditor, useEventVisibility } from "./EventsCalendar";

const statusTone: Record<EventMemberStatus, "warning" | "success" | "neutral" | "brand"> = { invited: "warning", accepted: "success", declined: "neutral", joined: "brand" };
const statusOrder: EventMemberStatus[] = ["joined", "accepted", "invited", "declined"];

export default function EventDetail() {
  const { id = "" } = useParams();
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const visible = useEventVisibility();
  const [tab, setTab] = useState<"about" | "members">("about");
  const [editing, setEditing] = useState(false);

  const ev = s.events.find((x) => x.id === id);
  if (!ev || !visible(ev))
    return (
      <div>
        <PageHeader title="رویداد" breadcrumb={[{ label: "رویدادها و جلسات", to: "/dashboard/events" }, { label: "رویداد" }]} icon={<CalendarDays size={18} />} />
        <EmptyState icon={<CalendarDays size={22} />} title="رویداد پیدا نشد" description="این رویداد حذف شده یا اجازه‌ی دیدن آن را ندارید (privacy)." />
      </div>
    );

  const manage = hasPermission("events.manage");
  const members = s.eventMembersOf(ev.id);
  const mine = s.myEventStatus(ev.id);
  const isOwner = ev.user_id === s.me;
  const canAdmin = isOwner || manage; // ویرایش، انتشار، حذف
  const canManageMembers = canAdmin || mine?.member_type === "organizer" || mine?.member_type === "owner";
  const count = s.participantCount(ev.id);
  const available = ev.capacity > 0 ? Math.max(0, ev.capacity - count) : null;
  const past = (dayNum(ev.end_date || ev.start_date) ?? 0) < (dayNum(s.today) ?? 0) && !ev.is_repeat;

  const ep = {
    detail: { label: "جزئیات رویداد", ep: { method: "GET" as const, path: `/events/events/${ev.id}/published/` } },
  };

  const togglePublish = () => {
    s.publishEvent(ev.id, !ev.is_public);
    notify(ev.is_public ? "انتشار رویداد لغو شد." : "رویداد منتشر شد.", "success");
  };
  const remove = () =>
    confirm({
      title: "حذف رویداد",
      message: `«${ev.title}» و همه‌ی اعضا و دعوت‌های آن حذف می‌شوند.`,
      confirmLabel: "حذف",
      onConfirm: () => {
        s.deleteEvent(ev.id);
        notify("رویداد حذف شد.", "success");
        navigate("/dashboard/events");
      },
    });

  return (
    <div>
      <PageHeader
        title={ev.title}
        icon={<CalendarDays size={18} />}
        breadcrumb={[{ label: "رویدادها و جلسات", to: "/dashboard/events" }, { label: ev.title }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ApiChip
              items={[
                ep.detail,
                { label: "ویرایش", ep: endpoints.eventUpdate(ev.id) },
                { label: "حذف", ep: endpoints.eventDelete(ev.id) },
                { label: "انتشار / لغو انتشار", ep: ev.is_public ? endpoints.eventUnpublish(ev.id) : endpoints.eventPublish(ev.id) },
                { label: "پاسخ به دعوت (rsvp)", ep: endpoints.eventRsvp(ev.id) },
                { label: "عضویت", ep: endpoints.eventJoin(ev.id) },
                { label: "انصراف", ep: endpoints.eventLeave(ev.id) },
                { label: "اعضا", ep: endpoints.eventMembers(ev.id) },
                { label: "افزودن عضو", ep: endpoints.eventMemberAdd(ev.id) },
                { label: "حذف عضو", ep: endpoints.eventMemberRemove(ev.id, "{user_id}") },
                { label: "ارتقا به هماهنگ‌کننده", ep: endpoints.eventPromote(ev.id, "{user_id}") },
                { label: "بازگشت به شرکت‌کننده", ep: endpoints.eventDemote(ev.id, "{user_id}") },
                { label: "دعوت", ep: endpoints.eventInvite(ev.id) },
                { label: "خلاصه‌ی دعوت‌ها", ep: endpoints.eventInvitations(ev.id) },
                { label: "نظرها", ep: endpoints.comments("event") },
                { label: "ثبت نظر", ep: endpoints.commentCreate("event") },
                { label: "واکنش", ep: endpoints.reactionToggle("event") },
              ]}
            />
            {canAdmin && (
              <>
                <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>
                  ویرایش
                </Button>
                <Button size="sm" icon={ev.is_public ? <EyeOff size={13} /> : <Eye size={13} />} onClick={togglePublish}>
                  {ev.is_public ? "لغو انتشار" : "انتشار"}
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 size={13} />} onClick={remove}>
                  حذف
                </Button>
              </>
            )}
          </div>
        }
      />

      <Poster color={ev.poster} className="h-36 sm:h-44 mb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1 mb-2">
            <PrivacyBadge value={ev.privacy} />
            <PublishBadge item={ev} />
            {past && <Badge tone="neutral">برگزار شد</Badge>}
            {ev.is_repeat && (
              <Badge tone="brand" icon={<Repeat size={10} />}>
                تکرار هفتگی
              </Badge>
            )}
          </div>
          <h1 className="text-lg sm:text-2xl font-bold leading-8 break-words">{ev.title}</h1>
          <p className="text-[12px] opacity-90 mt-1">برگزارکننده: {s.userName(ev.user_id)}</p>
        </div>
      </Poster>

      <Tabs
        tabs={[
          { id: "about", label: "درباره‌ی رویداد" },
          { id: "members", label: "اعضا و دعوت‌ها", count: members.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "about" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <div className="space-y-4 min-w-0">
            <div className="card p-4 space-y-3">
              <InfoRow icon={<CalendarDays size={15} />} label="تاریخ">
                {ev.start_date === ev.end_date || !ev.end_date ? ev.start_date : `${ev.start_date} تا ${ev.end_date}`}
              </InfoRow>
              <InfoRow icon={<Clock size={15} />} label="ساعت">
                {ev.start_time} تا {ev.end_time}
              </InfoRow>
              {ev.is_repeat && ev.repeat_days.length > 0 && (
                <InfoRow icon={<Repeat size={15} />} label="تکرار">
                  هر {ev.repeat_days.map((d) => weekDayNames[d]).join("، ")}
                </InfoRow>
              )}
              {ev.is_online ? (
                <InfoRow icon={<Video size={15} />} label="آنلاین">
                  {ev.meeting_link ? (
                    <a href={ev.meeting_link} target="_blank" rel="noreferrer" className="inline-flex">
                      <Button size="sm" variant="primary" icon={<ExternalLink size={13} />}>
                        ورود به جلسه
                      </Button>
                    </a>
                  ) : (
                    <span className="text-ink-400">لینک جلسه هنوز ثبت نشده</span>
                  )}
                </InfoRow>
              ) : (
                <InfoRow icon={<MapPin size={15} />} label="مکان">
                  {ev.location || "—"}
                </InfoRow>
              )}
              {(ev.category_ids.length > 0 || ev.tags.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <CategoryBadges ids={ev.category_ids} />
                  <TagList tags={ev.tags} />
                </div>
              )}
            </div>

            {ev.description && (
              <div className="card p-4">
                <p className="text-sm font-bold text-ink-900 mb-2">توضیحات</p>
                <p className="text-[13.5px] text-ink-700 leading-7 whitespace-pre-wrap">{ev.description}</p>
              </div>
            )}

            {ev.attachments.length > 0 && (
              <div className="card p-4">
                <p className="text-sm font-bold text-ink-900 mb-2">پیوست‌ها</p>
                <AttachmentList items={ev.attachments} />
              </div>
            )}

            <div className="card p-4 space-y-4">
              <ReactionBar entity="event" id={ev.id} />
              <CommentsPanel entity="event" id={ev.id} ownerId={ev.user_id} allowAdd={ev.add_comment} show={ev.show_comment} />
            </div>
          </div>

          <aside className="space-y-4">
            <MyStatus ev={ev} mine={mine} past={past} />
            <div className="card p-4">
              <p className="text-sm font-bold text-ink-900 mb-2 flex items-center gap-1.5">
                <Users size={15} className="text-brand-600" /> ظرفیت
              </p>
              <CapacityBar count={count} capacity={ev.capacity} />
              <p className="text-[11.5px] text-ink-500 mt-2">
                {fa(count)} شرکت‌کننده (participant_count)
                {available !== null ? ` · ${fa(available)} جای خالی (available_capacity)` : " · بدون محدودیت ظرفیت"}
              </p>
            </div>
            <Button variant="secondary" className="w-full justify-center" icon={<CalendarPlus size={14} />} onClick={() => notify(ev.google_calendar_event_id ? `این رویداد با شناسه‌ی google_calendar_event_id «${ev.google_calendar_event_id}» در تقویم گوگل ثبت است.` : "در نسخه‌ی متصل، رویداد به تقویم گوگل اضافه و شناسه‌ی آن در google_calendar_event_id ذخیره می‌شود.", "info")}>
              افزودن به تقویم گوگل
            </Button>
          </aside>
        </div>
      ) : (
        <MembersTab ev={ev} members={members} canManage={canManageMembers} />
      )}

      <EventEditor open={editing} event={ev} onClose={() => setEditing(false)} />
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[13px]">
      <span className="text-ink-400 mt-0.5 shrink-0">{icon}</span>
      <span className="text-ink-500 w-14 shrink-0">{label}</span>
      <span className="text-ink-800 min-w-0 break-words flex-1">{children}</span>
    </div>
  );
}

function CapacityBar({ count, capacity }: { count: number; capacity: number }) {
  if (capacity <= 0)
    return (
      <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
        <div className="h-full w-full bg-emerald-400/60" />
      </div>
    );
  const pct = Math.min(100, Math.round((count / capacity) * 100));
  return (
    <div>
      <div className="flex justify-between text-[11px] text-ink-500 mb-1">
        <span>
          {fa(count)} از {fa(capacity)}
        </span>
        <span>{fa(pct)}٪</span>
      </div>
      <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- وضعیت من
function MyStatus({ ev, mine, past }: { ev: SocialEvent; mine: EventMember | undefined; past: boolean }) {
  const s = useSocial();
  const { notify } = useToast();
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);

  const run = (r: { ok: true } | { ok: false; error: string }, msg: string) => {
    if (r.ok) {
      setError("");
      setChanging(false);
      notify(msg, "success");
    } else {
      setError(r.error);
      notify(r.error, "warning");
    }
  };
  const rsvpButtons = (
    <div className="flex gap-2">
      <Button size="sm" variant="primary" icon={<Check size={13} />} onClick={() => run(s.rsvp(ev.id, "accepted"), "حضور شما ثبت شد.")}>
        می‌آیم
      </Button>
      <Button size="sm" icon={<X size={13} />} onClick={() => run(s.rsvp(ev.id, "declined"), "پاسخ «نمی‌آیم» ثبت شد.")}>
        نمی‌آیم
      </Button>
    </div>
  );

  let body: ReactNode;
  if (mine?.member_type === "owner") {
    body = (
      <p className="text-[12.5px] text-ink-600 flex items-center gap-1.5">
        <Crown size={14} className="text-amber-500" /> شما برگزارکننده‌ی این رویداد هستید.
      </p>
    );
  } else if (!mine) {
    body = past ? (
      <p className="text-xs text-ink-400">این رویداد برگزار شده است.</p>
    ) : (
      <Button variant="primary" icon={<UserPlus size={14} />} onClick={() => run(s.joinEvent(ev.id), "در رویداد ثبت‌نام شدید.")}>
        ثبت‌نام / عضویت
      </Button>
    );
  } else if (mine.status === "invited") {
    body = (
      <>
        <p className="text-[12.5px] text-ink-600">به این رویداد دعوت شده‌اید. می‌آیید؟</p>
        {rsvpButtons}
      </>
    );
  } else if (mine.status === "declined") {
    body = changing ? (
      rsvpButtons
    ) : (
      <Button size="sm" onClick={() => setChanging(true)}>
        تغییر پاسخ
      </Button>
    );
  } else {
    body = (
      <Button
        size="sm"
        variant="secondary"
        icon={<LogOut size={13} />}
        onClick={() => {
          s.leaveEvent(ev.id);
          notify("از رویداد انصراف دادید.", "info");
        }}
      >
        انصراف
      </Button>
    );
  }

  return (
    <div className="card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink-900">وضعیت من</p>
        {mine && mine.member_type !== "owner" && <Badge tone={statusTone[mine.status]}>{eventStatusLabel[mine.status]}</Badge>}
      </div>
      {body}
      {error && <p className="text-[11.5px] text-rose-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- اعضا
function MembersTab({ ev, members, canManage }: { ev: SocialEvent; members: EventMember[]; canManage: boolean }) {
  const s = useSocial();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [picker, setPicker] = useState<null | "invite" | "add">(null);
  const [picked, setPicked] = useState<string[]>([]);

  const counts = { invited: 0, accepted: 0, declined: 0, joined: 0 } as Record<EventMemberStatus, number>;
  members.forEach((m) => counts[m.status]++);

  const submit = () => {
    if (!picked.length) return notify("کسی را انتخاب نکرده‌اید.", "warning");
    if (picker === "invite") {
      const n = s.inviteToEvent(ev.id, picked);
      notify(n ? `${fa(n)} نفر دعوت شدند.` : "همه‌ی افراد انتخاب‌شده قبلاً عضو یا دعوت‌شده بودند.", n ? "success" : "info");
    } else {
      let ok = 0;
      const errors: string[] = [];
      picked.forEach((u) => {
        const r = s.addEventMember(ev.id, u);
        if (r.ok) ok++;
        else errors.push(`${s.userName(u)}: ${r.error}`);
      });
      notify(ok ? `${fa(ok)} نفر به اعضا اضافه شدند.` : errors[0] ?? "کسی اضافه نشد.", ok ? "success" : "warning");
    }
    setPicked([]);
    setPicker(null);
  };

  return (
    <div className="space-y-4">
      {/* خلاصه‌ی دعوت‌ها (EventInvitationCounts) */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-500 ml-1">دعوت‌ها:</span>
        <Badge tone="warning">در انتظار {fa(counts.invited)}</Badge>
        <Badge tone="success">می‌آیند {fa(counts.accepted)}</Badge>
        <Badge tone="neutral">نمی‌آیند {fa(counts.declined)}</Badge>
        <Badge tone="brand">عضو شده {fa(counts.joined)}</Badge>
        {canManage && (
          <div className="flex gap-2 mr-auto">
            <Button size="sm" variant="primary" icon={<Send size={13} />} onClick={() => setPicker("invite")}>
              دعوت
            </Button>
            <Button size="sm" icon={<UserPlus size={13} />} onClick={() => setPicker("add")}>
              افزودن مستقیم
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statusOrder.map((st) => {
          const list = members.filter((m) => m.status === st).sort((a, b) => rank(a) - rank(b));
          return (
            <div key={st} className="card p-4">
              <p className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2">
                {eventStatusLabel[st]} <Badge tone={statusTone[st]}>{fa(list.length)}</Badge>
              </p>
              {list.length === 0 && <p className="text-xs text-ink-400">—</p>}
              <div className="divide-y divide-ink-100">
                {list.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 py-2">
                    <div className="flex-1 min-w-0">
                      <UserLine id={m.user_id} />
                    </div>
                    {m.member_type !== "member" && (
                      <Badge tone={m.member_type === "owner" ? "navy" : "brand"} icon={m.member_type === "owner" ? <Crown size={10} /> : <ShieldCheck size={10} />}>
                        {memberTypeLabel[m.member_type]}
                      </Badge>
                    )}
                    {canManage && m.member_type !== "owner" && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => {
                            const up = m.member_type === "member";
                            s.setEventRole(ev.id, m.user_id, up);
                            notify(up ? `«${s.userName(m.user_id)}» هماهنگ‌کننده شد.` : `«${s.userName(m.user_id)}» به شرکت‌کننده برگشت.`, "success");
                          }}
                          className="p-1.5 rounded text-ink-400 hover:text-brand-700 hover:bg-ink-50"
                          title={m.member_type === "member" ? "ارتقا به هماهنگ‌کننده (promote)" : "بازگشت به شرکت‌کننده (demote)"}
                          aria-label={m.member_type === "member" ? "ارتقا" : "تنزل"}
                        >
                          {m.member_type === "member" ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                        </button>
                        <button
                          onClick={() =>
                            confirm({
                              title: "حذف عضو",
                              message: `«${s.userName(m.user_id)}» از رویداد حذف شود؟`,
                              confirmLabel: "حذف",
                              onConfirm: () => {
                                s.removeEventMember(ev.id, m.user_id);
                                notify("عضو حذف شد.", "success");
                              },
                            })
                          }
                          className="p-1.5 rounded text-ink-400 hover:text-rose-600 hover:bg-ink-50"
                          title="حذف عضو"
                          aria-label="حذف عضو"
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={picker !== null}
        onClose={() => {
          setPicker(null);
          setPicked([]);
        }}
        title={picker === "invite" ? "دعوت به رویداد" : "افزودن مستقیم عضو"}
        description={picker === "invite" ? `POST /events/events/${ev.id}/invite/ — وضعیت «دعوت‌شده» و اعلان برای هر نفر` : `POST /events/events/${ev.id}/members/ — بدون نیاز به پذیرش، وضعیت «عضو شده»`}
      >
        <UserPicker value={picked} onChange={setPicked} exclude={members.map((m) => m.user_id)} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setPicker(null)}>
            انصراف
          </Button>
          <Button variant="primary" onClick={submit}>
            {picker === "invite" ? `دعوت${picked.length ? ` (${fa(picked.length)})` : ""}` : `افزودن${picked.length ? ` (${fa(picked.length)})` : ""}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const rank = (m: EventMember) => (m.member_type === "owner" ? 0 : m.member_type === "organizer" ? 1 : 2);
