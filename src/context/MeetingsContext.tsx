// ---------------------------------------------------------------------------
// انبار جلسات و صورتجلسه‌ها (DATA_ALIGNMENT §3) — انبار ماژولی (بدون Provider؛ useSyncExternalStore).
//   - صورتجلسه‌های سازمانی (پیشنهادی `/workspace/meetings/`، project nullable) کامل این‌جا نگه داشته می‌شوند.
//   - جلسات پروژه در ProjectsContext می‌مانند؛ لایه‌ی سازمانی آن‌ها (نقش‌ها، حضور، امضا، پیامک) این‌جاست.
// `useMeetings()` هر دو را به یک مدل نمایش (MeetingView) تبدیل می‌کند: «رویدادها و جلسات»، صفحه‌ی جلسه،
// مانیتورینگ و میزکار همه از همین می‌خوانند.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { createLocalStore, useLocalStore } from "../iam/store";
import { useProjectsPM } from "./ProjectsContext";
import { useTenancy } from "./TenancyContext";
import { users as allUsers } from "../data/mock";
import { intId, isoDate, jalaliOf, uuidOf } from "../pm/api";
import { columnLabel, isDone } from "../pm/selectors";
import { fa, nowClock, toEnDigits } from "../pm/jalali";
import { seedOrgMeetings } from "../meetings/seed";
import { seedMeetingTemplates } from "../meetings/templates";
import { DEFAULT_SIGN_RULE, isFullySigned, signersOf } from "../meetings/signature";
import { smsRecipients, smsText } from "../meetings/sms";
import {
  routeIdOf,
  type MeetingApi,
  type MeetingOverlay,
  type MeetingParticipant,
  type MeetingProposed,
  type MeetingResolution,
  type MeetingStatusCode,
  type MeetingTemplate,
  type MeetingView,
  type MinutesStatus,
  type OrgMeeting,
  type ResolutionView,
  type SmsKind,
} from "../meetings/types";
import type { ActionItem, PMMeeting, ProjectState } from "../pm/types";

type Store = { version: 1; seq: number; org: OrgMeeting[]; overlays: Record<string, MeetingOverlay>; templates: MeetingTemplate[] };
const defaults = (): Store => ({ version: 1, seq: 100, org: seedOrgMeetings(), overlays: {}, templates: seedMeetingTemplates() });
const store = createLocalStore<Store>("kariz.meetings.v1", defaults, (raw) => {
  const r = raw as Partial<Store> | null;
  if (!r || r.version !== 1 || !Array.isArray(r.org)) return null;
  return { ...defaults(), ...r } as Store;
});
const nextId = () => {
  const s = store.get();
  store.set({ ...s, seq: s.seq + 1 });
  return s.seq + 1;
};

const statusOfLabel: Record<PMMeeting["status"], MeetingStatusCode> = { "برنامه‌ریزی‌شده": 1, برگزارشده: 2, لغوشده: 3 };
const labelOfStatus: Record<MeetingStatusCode, PMMeeting["status"]> = { 1: "برنامه‌ریزی‌شده", 2: "برگزارشده", 3: "لغوشده" };
const userIdByName = (name: string) => allUsers.find((u) => u.name === name)?.id ?? null;
const nowIso = (refDate: string) => `${isoDate(refDate)}T${toEnDigits(nowClock()).padStart(5, "0")}:00Z`;
export const isLocked = (m: Pick<MeetingView, "minutes_status">) => m.minutes_status === "awaiting_signature" || m.minutes_status === "signed";

function resolutionView(r: MeetingResolution, projects: ProjectState[]): ResolutionView {
  const p = r.project ? projects.find((x) => x.meta.id === r.project) : undefined;
  const t = p && r.linked_task ? p.tasks.find((x) => x.id === r.linked_task) : undefined;
  return { ...r, due: jalaliOf(r.due_date), task_status: p && t ? columnLabel(p, t.status) : null, done: !!(p && t && isDone(p, t)) };
}

function apiOf(v: Omit<MeetingView, "api" | "route_id">, id: number, projectId: number | null): MeetingApi {
  const d = isoDate(v.date) ?? "";
  return {
    id,
    project: projectId,
    title: v.title,
    meeting_date: d,
    meeting_time: toEnDigits(v.time),
    duration_minutes: v.duration,
    meeting_type: v.meeting_type,
    status: v.status,
    description: v.description,
    meeting_link: v.link,
    topics_discussed: v.minutes_text ? v.minutes_text.split("\n").filter(Boolean) : [],
    decisions: v.decisions,
    attendees: v.participants.filter((x) => x.attendance === "present").map((x) => (x.principal_id ? uuidOf(x.name) : x.external_name ?? x.name)),
    tasks: v.resolutions.filter((r) => r.linked_task).map((r) => intId(r.linked_task!)),
    resolution_count: v.decisions.length,
    follow_up_count: v.resolutions.length,
    created_at: `${d}T08:00:00Z`,
    updated_at: `${d}T08:00:00Z`,
  };
}

/** لایه‌ی پیش‌فرض جلسه‌ی پروژه: شرکت‌کنندگان دمو با نقش (مدیر پروژه = رئیس) */
function defaultOverlay(p: ProjectState, m: PMMeeting, hasMinute: boolean, published: boolean): MeetingOverlay {
  const participants: MeetingParticipant[] = m.participants.map((name, i) => ({
    id: `pp${i + 1}`,
    principal_id: p.members.find((x) => x.name === name)?.userId ?? userIdByName(name),
    name,
    role: name === p.meta.manager ? "chair" : "member",
    attendance: m.status === "برگزارشده" ? "present" : "unknown",
  }));
  return { kind: "simple", location: m.mode === "حضوری" ? "" : "", labels: [], participants, minutes_status: published ? "forming" : hasMinute ? "forming" : "draft", sign_rule: { ...DEFAULT_SIGN_RULE }, sms_log: [], reminder: { enabled: false, minutes_before: 30 } };
}

function projectViews(projects: ProjectState[], overlays: Record<string, MeetingOverlay>): MeetingView[] {
  return projects.flatMap((p) =>
    p.meetings.map((m) => {
      const mn = p.minutes.find((x) => x.meetingId === m.id);
      const ov = overlays[`${p.meta.id}:${m.id}`] ?? defaultOverlay(p, m, !!mn, !!mn?.published);
      const resolutions = (mn?.actions ?? []).map((a) => resolutionView({ id: a.id, description: a.text, assignee: a.owner, due_date: isoDate(a.due), project: p.meta.id, linked_task: a.taskId ?? null }, projects));
      const base: Omit<MeetingView, "api" | "route_id"> = {
        source: "project",
        pid: p.meta.id,
        mid: m.id,
        minute_id: mn?.id ?? null,
        project_name: p.meta.name,
        title: m.title,
        date: m.date,
        time: m.time,
        duration: m.duration,
        meeting_type: m.mode === "حضوری" ? 1 : 2,
        link: m.link ?? null,
        description: m.description,
        status: statusOfLabel[m.status],
        organizer: p.meta.manager,
        agenda: (m.agenda ?? []).map((a) => a.title),
        minutes_text: (mn?.topics ?? []).join("\n"),
        decisions: mn?.decisionList ?? [],
        resolutions,
        files: p.documents.filter((d) => d.meetingId === m.id || (mn && d.minuteId === mn.id)).map((d) => ({ id: d.id, name: d.name })),
        ...ov,
      };
      return { ...base, route_id: routeIdOf("project", m.id, p.meta.id), api: apiOf(base, intId(m.id), intId(p.meta.id)) };
    }),
  );
}

function orgView(m: OrgMeeting, projects: ProjectState[]): MeetingView {
  const p = m.project_ref ? projects.find((x) => x.meta.id === m.project_ref) : undefined;
  const base: Omit<MeetingView, "api" | "route_id"> = {
    source: "org",
    pid: m.project_ref,
    mid: String(m.id),
    minute_id: null,
    project_name: p?.meta.name ?? null,
    title: m.title,
    date: jalaliOf(m.meeting_date),
    time: m.meeting_time.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]),
    duration: m.duration_minutes,
    meeting_type: m.meeting_type,
    link: m.meeting_link,
    location: m.location,
    description: m.description,
    status: m.status,
    organizer: m.organizer,
    agenda: m.agenda,
    minutes_text: m.minutes_text,
    decisions: m.decisions,
    resolutions: m.resolutions.map((r) => resolutionView(r, projects)),
    files: [],
    kind: m.kind,
    labels: m.labels,
    participants: m.participants,
    minutes_status: m.minutes_status,
    sign_rule: m.sign_rule,
    sms_log: m.sms_log,
    reminder: m.reminder,
  };
  return { ...base, route_id: routeIdOf("org", String(m.id)), api: apiOf(base, m.id, m.project) };
}

export type NewMeetingInput = {
  title: string;
  date: string;
  time: string;
  duration: number;
  meeting_type: 1 | 2;
  link: string;
  location: string;
  description: string;
  agenda: string[];
  participants: MeetingParticipant[];
  kind: MeetingProposed["kind"];
  labels: string[];
  project_ref: string | null;
  template_id: string | null;
  reminder: MeetingProposed["reminder"];
  sign_rule: MeetingProposed["sign_rule"];
};

export function useMeetings() {
  const s = useLocalStore(store);
  const pm = useProjectsPM();
  const { actingUser, hasPermission } = useTenancy();
  const me = actingUser.name;
  const monitor = hasPermission("monitoring.view");

  const views = useMemo(() => {
    const orgs = s.org
      .filter((m) => {
        if (monitor || m.organizer === me) return true;
        if (m.participants.some((x) => x.principal_id === actingUser.id || x.name === me)) return true;
        const p = m.project_ref ? pm.projects.find((x) => x.meta.id === m.project_ref) : undefined;
        return !!p && (p.meta.manager === me || p.members.some((x) => x.name === me || x.userId === actingUser.id));
      })
      .map((m) => orgView(m, pm.projects));
    return [...orgs, ...projectViews(pm.projects.filter((p) => !p.meta.archived), s.overlays)].sort((a, b) => (isoDate(b.date) ?? "").localeCompare(isoDate(a.date) ?? ""));
  }, [s, pm.projects, me, actingUser.id, monitor]);

  const byRoute = (rid: string) => views.find((v) => v.route_id === rid);
  const stamp = () => nowIso(pm.refDate);

  /** تغییر فیلدهای سازمانی (هر دو نوع جلسه) */
  const patch = (v: MeetingView, p: Partial<MeetingProposed> & Partial<Pick<OrgMeeting, "status" | "title" | "description" | "meeting_link" | "decisions">>) => {
    if (v.source === "org") {
      store.set((st) => ({ ...st, org: st.org.map((m) => (String(m.id) === v.mid ? { ...m, ...p, updated_at: stamp() } : m)) }));
      return;
    }
    const key = `${v.pid}:${v.mid}`;
    const cur: MeetingOverlay = { kind: v.kind, location: v.location, labels: v.labels, participants: v.participants, minutes_status: v.minutes_status, sign_rule: v.sign_rule, sms_log: v.sms_log, reminder: v.reminder };
    const pick = (({ kind, location, labels, participants, minutes_status, sign_rule, sms_log, reminder }) => ({ kind, location, labels, participants, minutes_status, sign_rule, sms_log, reminder }))({ ...cur, ...p } as MeetingOverlay);
    store.set((st) => ({ ...st, overlays: { ...st.overlays, [key]: pick } }));
  };

  /** متن صورتجلسه، مصوبات (تصمیم‌ها) و اقدام‌ها — جلسه‌ی پروژه از مسیر صورت‌جلسه‌ی ProjectsContext */
  const saveMinutes = (v: MeetingView, next: { minutes_text?: string; decisions?: string[]; resolutions?: MeetingResolution[] }) => {
    if (isLocked(v)) return false;
    if (v.source === "org") {
      patch(v, next);
      return true;
    }
    const p = pm.getProject(v.pid!);
    const m = p?.meetings.find((x) => x.id === v.mid);
    if (!p || !m) return false;
    const mn = p.minutes.find((x) => x.id === v.minute_id);
    const actions: ActionItem[] = (next.resolutions ?? v.resolutions).map((r) => ({ id: r.id, text: r.description, owner: r.assignee, due: jalaliOf(r.due_date) || pm.refDate, taskId: r.linked_task ?? undefined }));
    pm.saveMinutes(
      v.pid!,
      {
        ...(mn ?? { title: m.title, date: m.date, attendees: 0, decisions: 0, followUps: 0, meetingId: m.id, participants: m.participants }),
        topics: (next.minutes_text ?? v.minutes_text).split("\n").filter((x) => x.trim()),
        decisionList: next.decisions ?? v.decisions,
        actions,
      },
      false,
    );
    return true;
  };

  const logSms = (_v: MeetingView, kind: SmsKind, text: string, recipients: string[]) => ({ id: `sm${Date.now().toString(36)}`, kind, at: stamp(), recipients, text, by: me });

    /** پیامک (شبیه‌سازی) و ثبت در سابقه */
  const sms = (v: MeetingView, kind: SmsKind, custom?: string, onlyPresent = false): number => {
      const text = kind === "custom" ? custom ?? "" : smsText(kind, { title: v.title, date: v.date, time: v.time, location: v.location, meeting_type: v.meeting_type, link: v.link });
      const recipients = smsRecipients(v.participants.filter((x) => x.name !== me), onlyPresent);
      if (!text.trim() || !recipients.length) return 0;
      const cur = s.org.find((m) => String(m.id) === v.mid);
      const log = [logSms(v, kind, text, recipients), ...(v.source === "org" ? cur?.sms_log ?? [] : v.sms_log)];
      patch(v, { sms_log: log });
      return recipients.length;
    };
    /** تبدیل مصوبه به کار (پروژه‌ی مقصد + مسئول) — پیگیری از وضعیت همان کار */
  const convertResolution = (v: MeetingView, rid: string, opts?: { project?: string; assignee?: string }): boolean => {
      const r = v.resolutions.find((x) => x.id === rid);
      if (!r || r.linked_task) return false;
      if (v.source === "project") {
        const mn = pm.getProject(v.pid!)?.minutes.find((x) => x.id === v.minute_id);
        const a = mn?.actions?.find((x) => x.id === rid);
        if (!mn || !a) return false;
        pm.convertAction(v.pid!, mn.id, a);
        return true;
      }
      const pid = opts?.project ?? r.project;
      const p = pid ? pm.getProject(pid) : undefined;
      if (!p) return false;
      const taskId = `t-${v.mid}-${rid}-${Date.now().toString(36).slice(-4)}`;
      const due = r.due_date ? jalaliOf(r.due_date) : pm.refDate;
      pm.createTask(p.meta.id, { id: taskId, title: r.description, description: `مصوبه‌ی صورتجلسه‌ی «${v.title}» (${v.date})`, assignee: opts?.assignee ?? r.assignee, priority: "متوسط", start: pm.refDate, due: due < pm.refDate ? pm.refDate : due, labels: ["مصوبه"] });
      store.set((st) => ({ ...st, org: st.org.map((m) => (String(m.id) === v.mid ? { ...m, resolutions: m.resolutions.map((x) => (x.id === rid ? { ...x, project: p.meta.id, assignee: opts?.assignee ?? x.assignee, linked_task: taskId } : x)) } : m)) }));
      return true;
    };
  const dispatchResolutions = (v: MeetingView): number => {
      let n = 0;
      v.resolutions.filter((r) => !r.linked_task && r.assignee && (v.source === "project" || r.project)).forEach((r) => convertResolution(v, r.id) && (n += 1));
      return n;
    };
  const api = {
    views,
    templates: s.templates,
    byRoute,
    patch,
    saveMinutes,
    isLocked,
    sms,
    convertResolution,
    dispatchResolutions,
    createOrg: (input: NewMeetingInput): string => {
      const id = 9000 + nextId();
      const date = isoDate(input.date) ?? isoDate(pm.refDate)!;
      const pr = input.project_ref ? pm.getProject(input.project_ref) : undefined;
      const m: OrgMeeting = {
        id,
        project: pr ? intId(pr.meta.id) : null,
        title: input.title,
        meeting_date: date,
        meeting_time: toEnDigits(input.time),
        duration_minutes: input.duration,
        meeting_type: input.meeting_type,
        status: 1,
        description: input.description,
        meeting_link: input.meeting_type === 2 ? input.link || null : null,
        topics_discussed: [],
        decisions: [],
        attendees: [],
        tasks: [],
        resolution_count: 0,
        follow_up_count: 0,
        created_at: stamp(),
        updated_at: stamp(),
        kind: input.kind,
        location: input.location,
        labels: input.labels,
        template_id: input.template_id,
        participants: input.participants,
        minutes_status: "draft",
        sign_rule: input.sign_rule,
        sms_log: [],
        reminder: input.reminder,
        agenda: input.agenda.filter((x) => x.trim()),
        minutes_text: "",
        resolutions: [],
        organizer: me,
        project_ref: input.project_ref,
      };
      store.set((st) => ({ ...st, org: [m, ...st.org] }));
      return routeIdOf("org", String(id));
    },
    setStatus: (v: MeetingView, status: MeetingStatusCode) => {
      if (v.source === "project") pm.setMeetingStatus(v.pid!, v.mid, labelOfStatus[status]);
      else patch(v, { status });
      if (status === 3) sms(v, "cancel");
    },
    setAttendance: (v: MeetingView, id: string, attendance: MeetingParticipant["attendance"], reason?: string) => {
      if (isLocked(v)) return;
      patch(v, { participants: v.participants.map((x) => (x.id === id ? { ...x, attendance, absence_reason: attendance === "absent" ? reason ?? x.absence_reason : undefined } : x)) });
    },
    setParticipants: (v: MeetingView, participants: MeetingParticipant[]) => !isLocked(v) && patch(v, { participants }),
    /** ارسال دعوت‌نامه: پیش‌نویس رسمی می‌شود («در حال تشکیل جلسه») */
    sendInvites: (v: MeetingView) => {
      const text = smsText("invite", { title: v.title, date: v.date, time: v.time, location: v.location, meeting_type: v.meeting_type, link: v.link });
      const recipients = smsRecipients(v.participants.filter((x) => x.name !== me));
      patch(v, { minutes_status: v.minutes_status === "draft" ? "forming" : v.minutes_status, sms_log: [logSms(v, "invite", text, recipients), ...v.sms_log] });
      return recipients.length;
    },
    /** ارسال برای امضا: متن لازم است؛ پس از آن ویرایش قفل می‌شود */
    sendForSignature: (v: MeetingView): string | null => {
      if (!v.minutes_text.trim()) return "پیش از ارسال برای امضا، متن صورتجلسه را بنویسید.";
      const tmp = { participants: v.participants, sign_rule: v.sign_rule };
      const signers = signersOf(tmp);
      if (!signers.length) return v.sign_rule.mode === "named" ? "امضاکنندگان را مشخص کنید." : "حضور و غیاب را ثبت کنید؛ امضاکنندگان از میان حاضران‌اند.";
      const ids = new Set(signers.map((x) => x.id));
      const participants = v.participants.map((x) => (ids.has(x.id) ? { ...x, signature: { state: "pending" as const } } : { ...x, signature: undefined }));
      const text = smsText("sign_request", { title: v.title, date: v.date, time: v.time, location: v.location, meeting_type: v.meeting_type, link: v.link });
      patch(v, { participants, minutes_status: "awaiting_signature", sms_log: [logSms(v, "sign_request", text, signers.map((x) => x.name)), ...v.sms_log] });
      return null;
    },
    /** امضا یا رد امضای کاربر جاری؛ با رسیدن به حد نصاب «امضاشده» و مصوبات به کار تبدیل می‌شوند */
    sign: (v: MeetingView, state: "signed" | "rejected", note?: string) => {
      if (v.minutes_status !== "awaiting_signature") return false;
      const participants = v.participants.map((x) => (x.principal_id === actingUser.id || (x.principal_id && x.name === me) ? { ...x, signature: { state, at: stamp(), note } } : x));
      const done = isFullySigned({ participants, sign_rule: v.sign_rule });
      patch(v, { participants, minutes_status: done ? ("signed" as MinutesStatus) : v.minutes_status });
      if (done) dispatchResolutions({ ...v, participants, minutes_status: "signed" });
      return done;
    },
    saveTemplate: (t: Omit<MeetingTemplate, "id" | "created_by"> & { id?: string }) =>
      store.set((st) => {
        const ex = t.id ? st.templates.find((x) => x.id === t.id) : undefined;
        return ex ? { ...st, templates: st.templates.map((x) => (x.id === ex.id ? { ...ex, ...t, id: ex.id } : x)) } : { ...st, seq: st.seq + 1, templates: [...st.templates, { ...t, id: `mtpl${st.seq + 1}`, created_by: me }] };
      }),
    removeTemplate: (id: string) => store.set((st) => ({ ...st, templates: st.templates.filter((x) => x.id !== id) })),
    /** C6: انتقال نقش‌ها و مصوبات صورتجلسه‌های سازمانیِ باز از یک نفر به دیگری */
    reassignPrincipal: (from: string, to: string) => reassignMeetings(from, to),
  };
  return api;
}

/** C6 — بدون هوک (برای «انتقال کار به کاربر دیگر» در WP4): تعداد جلسه‌های تغییرکرده */
export function reassignMeetings(from: string, to: string): number {
  let n = 0;
  const toId = userIdByName(to);
  store.set((st) => ({
    ...st,
    org: st.org.map((m) => {
      if (m.minutes_status === "signed" || m.status === 3) return m;
      const hit = m.organizer === from || m.participants.some((x) => x.name === from) || m.resolutions.some((r) => r.assignee === from && !r.linked_task);
      if (!hit) return m;
      n += 1;
      return {
        ...m,
        organizer: m.organizer === from ? to : m.organizer,
        participants: m.participants.map((x) => (x.name === from ? { ...x, name: to, principal_id: toId ?? x.principal_id } : x)),
        resolutions: m.resolutions.map((r) => (r.assignee === from && !r.linked_task ? { ...r, assignee: to } : r)),
      };
    }),
  }));
  return n;
}

/** C4 — ردیف‌های میزکار «رویدادها و جلسات»: جلسه‌های پیش‌رو و صورتجلسه‌های منتظر امضای من */
export function useMeetingsDesk() {
  const m = useMeetings();
  const { actingUser, today } = useTenancy();
  const pm = useProjectsPM();
  const ref = isoDate(pm.refDate ?? today) ?? "";
  return useMemo(() => {
    const mine = m.views.filter((v) => v.participants.some((x) => x.principal_id === actingUser.id || x.name === actingUser.name) || v.organizer === actingUser.name);
    const upcoming = mine
      .filter((v) => v.status === 1 && (isoDate(v.date) ?? "") >= ref)
      .sort((a, b) => (isoDate(a.date) ?? "").localeCompare(isoDate(b.date) ?? ""))
      .map((v) => ({ id: `meeting:${v.route_id}`, kind: "meeting" as const, title: v.title, meta: `${v.project_name ?? "صورتجلسه‌ی سازمانی"} · ${v.date} ساعت ${v.time}`, due: v.date, href: `/meetings/${encodeURIComponent(v.route_id)}` }));
    const toSign = mine
      .filter((v) => v.minutes_status === "awaiting_signature" && v.participants.some((x) => x.principal_id === actingUser.id && x.signature?.state === "pending"))
      .map((v) => ({
        id: `sign:${v.route_id}`,
        kind: "minutes_sign" as const,
        title: v.title,
        meta: `صورتجلسه منتظر امضای شما · ${v.date}`,
        href: `/meetings/${encodeURIComponent(v.route_id)}`,
        actions: [{ id: "sign", label: "امضا", tone: "primary" as const, run: () => m.sign(v, "signed") }],
      }));
    return { rows: [...toSign, ...upcoming], counts: { upcoming: upcoming.length, toSign: toSign.length } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.views, actingUser.id, actingUser.name, ref]);
}

export const meetingCountLabel = (n: number) => `${fa(n)} جلسه`;
