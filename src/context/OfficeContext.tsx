// ---------------------------------------------------------------------------
// انبار «دبیرخانه و مشتریان» (WP8): نامه‌ها، ثبت دبیرخانه، پرونده‌ی مشتری، فرصت فروش، اسناد مالی.
// انبار سراسری مبتنی بر localStorage با اشتراک (useSyncExternalStore) است تا بدون Provider
// در هر جای برنامه (مانیتورینگ، میزکار، تنظیمات) خوانده شود. `OfficeProvider` فقط برای
// سازگاری با درخت Providerها صادر شده و کاری نمی‌کند.
// قراردادها: C4 (office/desk.ts) · C6 reassignPrincipal · C8 useFinanceMonitoring/useSalesMonitoring.
// ---------------------------------------------------------------------------
import { useMemo, type ReactNode } from "react";
import { createLocalStore, useLocalStore } from "../iam/store";
import { useTenancy } from "./TenancyContext";
import { useInbox } from "./InboxContext";
import { OFFICE_STORE_KEY, OFFICE_STORE_VERSION, seedOffice } from "../office/seed";
import { issueNumber } from "../office/numbering";
import { bucketOf, byProbability, salesTotalsOf, totalsOf, weightedOf } from "../office/ledger";
import type {
  AttachmentApi,
  CancelType,
  CaseLinkApi,
  CustomerActivity,
  CustomerContact,
  CustomerFile,
  FinancialDocument,
  Letter,
  LetterKind,
  LetterRegistration,
  NumberSeries,
  OfficeLabel,
  OfficeState,
  Opportunity,
  PrincipalId,
  RegistrationDirection,
} from "../office/types";
import { nameOf, nowStamp, OFFICE_TODAY, principalOf, userOfPrincipal } from "../office/util";
import type { ImportedCustomer } from "../office/import";

// ------------------------------------------------------------------ انبار

const normalize = (raw: unknown): OfficeState | null => {
  const s = raw as Partial<OfficeState> | null;
  if (!s || s.version !== OFFICE_STORE_VERSION || !Array.isArray(s.letters) || !Array.isArray(s.customers)) return null;
  return s as OfficeState;
};
export const officeStore = createLocalStore<OfficeState>(OFFICE_STORE_KEY, seedOffice, normalize);
export const useOfficeState = () => useLocalStore(officeStore);
export const resetOffice = () => officeStore.reset();

/** سازگاری با درخت Providerها — انبار سراسری است و Provider لازم ندارد */
export function OfficeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const nextId = (s: OfficeState) => s.seq + 1;

// ------------------------------------------------------------------ مجوزها

/** شناسه‌های مجوز (کاتالوگ در data/mock.ts — WP4 4.1) */
export const OFFICE_PERMS = {
  secretariatView: "secretariat.view",
  secretariatRegister: "secretariat.register",
  seriesManage: "secretariat.series.manage",
  crmView: "crm.view",
  crmManage: "crm.manage",
  financeView: "crm.finance.view",
  financeManage: "crm.finance.manage",
  crmImport: "crm.import",
} as const;
export type OfficePerm = (typeof OFFICE_PERMS)[keyof typeof OFFICE_PERMS];
const VIEW_PERMS: string[] = [OFFICE_PERMS.secretariatView, OFFICE_PERMS.crmView];

/**
 * بررسی مجوزهای ماژول. تا وقتی هیچ نقشی هنوز مجوز `secretariat.*` / `crm.*` ندارد (کاتالوگ
 * ثبت نشده)، راهبران همه‌ی مجوزها و بقیه فقط مجوز مشاهده را دارند تا دمو کار کند.
 */
export function useOfficePerms() {
  const t = useTenancy();
  return useMemo(() => {
    const registered = t.iam.roles.some((r) => r.permissions.some((p) => p.startsWith("secretariat.") || p.startsWith("crm.")));
    const can = (p: OfficePerm) => (registered ? t.hasPermission(p) : t.canAccessAdmin || VIEW_PERMS.includes(p));
    return {
      can,
      secretariat: can(OFFICE_PERMS.secretariatView) || can(OFFICE_PERMS.secretariatRegister),
      register: can(OFFICE_PERMS.secretariatRegister),
      seriesManage: can(OFFICE_PERMS.seriesManage),
      crm: can(OFFICE_PERMS.crmView) || can(OFFICE_PERMS.crmManage),
      crmManage: can(OFFICE_PERMS.crmManage),
      financeView: can(OFFICE_PERMS.financeView) || can(OFFICE_PERMS.financeManage),
      financeManage: can(OFFICE_PERMS.financeManage),
      crmImport: can(OFFICE_PERMS.crmImport),
      manager: t.canAccessAdmin,
    };
  }, [t]);
}

// ------------------------------------------------------------------ قواعد دید

export const registrationOf = (s: OfficeState, letterId: number) => s.registrations.find((r) => r.letter === letterId);

/** نامه‌ی شماره‌نخورده فقط برای فرستنده و گیرندگان؛ نامه‌ی شماره‌خورده برای مدیران و دبیرخانه هم */
export function canSeeLetter(s: OfficeState, l: Letter, me: PrincipalId, opts: { register: boolean; manager: boolean }) {
  if (l.sender_id === me || l.parties.some((p) => p.principal_id === me)) return true;
  return !!registrationOf(s, l.id) && (opts.register || opts.manager);
}

/** پرونده‌ی مشتری: مسئول، فهرست «قابل مشاهده برای» یا مدیر CRM */
export const canSeeCustomer = (c: CustomerFile, me: PrincipalId, crmManage: boolean) => crmManage || c.owner_id === me || c.access.includes(me);

/** حذف فقط برای نامه‌ی ثبت‌نشده‌ای که هنوز هیچ گیرنده‌ای ندیده (و فقط فرستنده) */
export function deleteCheck(s: OfficeState, l: Letter, me: PrincipalId): { ok: true } | { ok: false; reason: string } {
  if (registrationOf(s, l.id)) return { ok: false, reason: "نامه‌ی شماره‌خورده حذف نمی‌شود؛ فقط بایگانی می‌شود." };
  if (l.sender_id !== me) return { ok: false, reason: "فقط فرستنده می‌تواند نامه را حذف کند." };
  if (l.parties.some((p) => p.seen_at)) return { ok: false, reason: "نامه دیده شده و دیگر حذف نمی‌شود." };
  return { ok: true };
}

/** شباهت با پرونده‌های موجود (هشدار تکراری) */
export function duplicateOf(s: OfficeState, c: Pick<CustomerFile, "name" | "national_id" | "economic_code" | "phones">, exceptId?: number): string | null {
  const clean = (x: string) => x.replace(/[\s‌‌]+/g, "").toLowerCase();
  for (const o of s.customers) {
    if (o.id === exceptId) continue;
    if (c.national_id && o.national_id === c.national_id) return `شناسه/کد ملی با «${o.name}» یکسان است`;
    if (c.economic_code && o.economic_code === c.economic_code) return `کد اقتصادی با «${o.name}» یکسان است`;
    const phone = c.phones.find((p) => p.number && o.phones.some((q) => q.number === p.number));
    if (phone) return `شماره‌ی ${phone.number} پیش‌تر برای «${o.name}» ثبت شده`;
    if (c.name && clean(o.name) === clean(c.name)) return `پرونده‌ای با نام «${o.name}» وجود دارد`;
  }
  return null;
}

// ------------------------------------------------------------------ ورودی‌ها

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; reason: string };
const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

export type LetterInput = {
  subject: string;
  body: string;
  to: PrincipalId[];
  cc: PrincipalId[];
  labels: string[];
  attachments: AttachmentApi[];
  customer_ids: number[];
  related_task_title?: string;
  kind?: LetterKind;
};

export type RegisterInput = {
  direction: RegistrationDirection;
  series: number;
  registered_at: string;
  external_number: string;
  external_date: string;
  external_org: string;
};

export type CustomerInput = Omit<CustomerFile, "id" | "created_at" | "created_by">;
export type OpportunityInput = Omit<Opportunity, "id" | "created_at" | "created_by" | "closed_at">;
export type FinanceDocInput = Omit<FinancialDocument, "id" | "created_at" | "created_by" | "status" | "cancel_type" | "cancel_note" | "cancelled_at">;

// ------------------------------------------------------------------ هوک اصلی

export function useOffice() {
  const state = useOfficeState();
  const t = useTenancy();
  const inbox = useInbox();
  const perms = useOfficePerms();
  const meUser = t.actingUser;
  const me = principalOf(meUser.id);

  return useMemo(() => {
    const ro = (): { ok: false; reason: string } | null => (t.readOnly ? fail("در حالت «مشاهده به‌عنوان» تغییر ممکن نیست.") : null);
    /** اعلان درون‌برنامه‌ای با قرارداد C5 (notify) */
    const notifyPeople = (
      pids: PrincipalId[],
      text: string,
      link: string,
      kind: "letter_received" | "letter_referred" | "letter_paraph" | "crm_shared" | "direct_message",
      entity_type: string,
      entity_id: number | string,
    ) => {
      const ids = pids.filter((p) => p !== me).map((p) => userOfPrincipal(p)?.id).filter((x): x is string => !!x);
      if (ids.length) inbox.notify({ recipient_id: ids, actor_id: meUser.id, event_type: kind, entity_type, entity_id, data: { text, link } });
    };
    const set = officeStore.set;

    // ------------------------------------------------ نامه‌ها
    const visibleLetters = state.letters.filter((l) => canSeeLetter(state, l, me, perms));

    const createLetter = (input: LetterInput): Result<number> => {
      const r = ro();
      if (r) return r;
      if (!input.subject.trim()) return fail("موضوع نامه لازم است.");
      if (!input.to.length) return fail("دست‌کم یک گیرنده انتخاب کنید.");
      let id = 0;
      set((s) => {
        id = nextId(s);
        const cc = input.cc.filter((p) => !input.to.includes(p));
        const letter: Letter = {
          id,
          subject: input.subject.trim(),
          body: input.body,
          sender_id: me,
          parties: [...input.to.map((p) => ({ principal_id: p, role: "to" as const, seen_at: null })), ...cc.map((p) => ({ principal_id: p, role: "cc" as const, seen_at: null }))],
          labels: input.labels,
          attachments: input.attachments,
          related_task: null,
          case_links: input.customer_ids.map((cid) => ({ type: "customer_file" as const, id: cid })),
          archived: false,
          created_at: nowStamp(),
          kind: input.kind ?? "internal",
          archived_by: [],
          ...(input.related_task_title ? { related_task_title: input.related_task_title } : {}),
        };
        return { ...s, seq: id, letters: [letter, ...s.letters] };
      });
      notifyPeople([...input.to, ...input.cc], `نامه‌ی «${input.subject.trim()}» از ${meUser.name}`, `/secretariat?letter=${id}`, "letter_received", "letter", id);
      return { ok: true, value: id };
    };

    const markSeen = (letterId: number) => {
      const l = state.letters.find((x) => x.id === letterId);
      if (!l || t.readOnly || !l.parties.some((p) => p.principal_id === me && !p.seen_at)) return;
      const at = nowStamp();
      set((s) => ({ ...s, letters: s.letters.map((x) => (x.id !== letterId ? x : { ...x, parties: x.parties.map((p) => (p.principal_id === me && !p.seen_at ? { ...p, seen_at: at } : p)) })) }));
    };

    const addParaph = (letterId: number, text: string, parent: number | null = null, attachments: AttachmentApi[] = []): Result => {
      const r = ro();
      if (r) return r;
      if (!text.trim()) return fail("متن پاراف خالی است.");
      const l = state.letters.find((x) => x.id === letterId);
      set((s) => {
        const id = nextId(s);
        return { ...s, seq: id, paraphs: [...s.paraphs, { id, letter: letterId, author_id: me, parent, text: text.trim(), attachments, created_at: nowStamp() }] };
      });
      if (l) notifyPeople([l.sender_id, ...l.parties.map((p) => p.principal_id)], `${meUser.name} روی نامه‌ی «${l.subject}» پاراف نوشت`, `/secretariat?letter=${letterId}`, "letter_paraph", "letter", letterId);
      return { ok: true, value: undefined };
    };

    const refer = (letterId: number, toIds: PrincipalId[], note: string): Result => {
      const r = ro();
      if (r) return r;
      if (!toIds.length) return fail("گیرنده‌ی ارجاع را انتخاب کنید.");
      const l = state.letters.find((x) => x.id === letterId);
      if (!l) return fail("نامه پیدا نشد.");
      set((s) => {
        const id = nextId(s);
        return {
          ...s,
          seq: id,
          referrals: [...s.referrals, { id, letter: letterId, from_id: me, to_ids: toIds, note: note.trim(), created_at: nowStamp() }],
          letters: s.letters.map((x) =>
            x.id !== letterId
              ? x
              : {
                  ...x,
                  parties: [...x.parties, ...toIds.filter((p) => !x.parties.some((q) => q.principal_id === p) && p !== x.sender_id).map((p) => ({ principal_id: p, role: "to" as const, seen_at: null, via_referral: id }))],
                  archived_by: x.archived_by.filter((p) => !toIds.includes(p)),
                },
          ),
        };
      });
      notifyPeople(toIds, `${meUser.name} نامه‌ی «${l.subject}» را به شما ارجاع داد${note.trim() ? `: ${note.trim()}` : ""}`, `/secretariat?letter=${letterId}`, "letter_referred", "letter", letterId);
      return { ok: true, value: undefined };
    };

    const setArchivedForMe = (letterId: number, on: boolean) => {
      if (t.readOnly) return;
      set((s) => ({ ...s, letters: s.letters.map((x) => (x.id !== letterId ? x : { ...x, archived_by: on ? [...new Set([...x.archived_by, me])] : x.archived_by.filter((p) => p !== me) })) }));
    };

    /** بایگانی سراسری (به‌جای حذف نامه‌ی شماره‌خورده) — فرستنده یا دبیرخانه */
    const setArchived = (letterId: number, on: boolean): Result => {
      const r = ro();
      if (r) return r;
      const l = state.letters.find((x) => x.id === letterId);
      if (!l) return fail("نامه پیدا نشد.");
      if (l.sender_id !== me && !perms.register) return fail("فقط فرستنده یا دبیرخانه می‌تواند نامه را بایگانی کند.");
      set((s) => ({ ...s, letters: s.letters.map((x) => (x.id === letterId ? { ...x, archived: on } : x)) }));
      return { ok: true, value: undefined };
    };

    const deleteLetter = (letterId: number): Result => {
      const r = ro();
      if (r) return r;
      const l = state.letters.find((x) => x.id === letterId);
      if (!l) return fail("نامه پیدا نشد.");
      const c = deleteCheck(state, l, me);
      if (!c.ok) return c;
      set((s) => ({ ...s, letters: s.letters.filter((x) => x.id !== letterId), paraphs: s.paraphs.filter((p) => p.letter !== letterId), referrals: s.referrals.filter((p) => p.letter !== letterId) }));
      return { ok: true, value: undefined };
    };

    const setCaseLinks = (letterId: number, customerIds: number[]): Result => {
      const r = ro();
      if (r) return r;
      set((s) => ({
        ...s,
        letters: s.letters.map((x) => (x.id !== letterId ? x : { ...x, case_links: [...x.case_links.filter((c) => c.type !== "customer_file"), ...customerIds.map((id): CaseLinkApi => ({ type: "customer_file", id }))] })),
      }));
      return { ok: true, value: undefined };
    };

    /** ثبت شماره‌ی وارده/صادره در یک تراکنش — شمارنده فقط با ثبت موفق جلو می‌رود */
    const register = (letterId: number, input: RegisterInput): Result<string> => {
      const r = ro();
      if (r) return r;
      if (!perms.register) return fail("مجوز ثبت دبیرخانه ندارید.");
      if (registrationOf(state, letterId)) return fail("این نامه پیش‌تر ثبت شده است.");
      let out: Result<string> = fail("سری شماره پیدا نشد.");
      set((s) => {
        const series = s.series.find((x) => x.id === input.series);
        if (!series) return s;
        if (series.direction !== input.direction) {
          out = fail("سری انتخاب‌شده برای این نوع ثبت نیست.");
          return s;
        }
        const res = issueNumber(series, input.registered_at, s.registrations);
        if (!res.ok) {
          out = fail(res.reason);
          return s;
        }
        const reg: LetterRegistration = {
          letter: letterId,
          direction: input.direction,
          series: series.id,
          number: res.number,
          registered_at: input.registered_at,
          external_number: input.external_number.trim(),
          external_date: input.external_date,
          external_org: input.external_org.trim(),
          registered_by: me,
          counter: res.counter,
          reference_year: res.reference_year,
        };
        out = { ok: true, value: res.number };
        return {
          ...s,
          series: s.series.map((x) => (x.id === series.id ? res.series : x)),
          registrations: [...s.registrations, reg],
          letters: s.letters.map((x) => (x.id === letterId ? { ...x, kind: input.direction } : x)),
        };
      });
      return out;
    };

    /** ثبت نامه‌ی وارده‌ی جدید: ساخت نامه + ثبت شماره */
    const registerIncoming = (letter: LetterInput, reg: RegisterInput): Result<{ id: number; number: string }> => {
      const c = createLetter({ ...letter, kind: "incoming" });
      if (!c.ok) return c;
      const n = register(c.value, reg);
      if (!n.ok) {
        set((s) => ({ ...s, letters: s.letters.filter((x) => x.id !== c.value) }));
        return n;
      }
      return { ok: true, value: { id: c.value, number: n.value } };
    };

    // ------------------------------------------------ سری‌های شماره
    const saveSeries = (input: Omit<NumberSeries, "id" | "counter" | "reference_year"> & { id?: number }): Result => {
      const r = ro();
      if (r) return r;
      if (!perms.seriesManage) return fail("مجوز مدیریت سری‌های شماره ندارید.");
      if (!input.title.trim() || !input.prefix.trim()) return fail("عنوان و پیشوند لازم است.");
      if (state.series.some((x) => x.id !== input.id && x.prefix.trim() === input.prefix.trim() && x.suffix.trim() === input.suffix.trim())) return fail("سری دیگری با همین پیشوند و پسوند وجود دارد.");
      set((s) => {
        if (input.id) {
          const used = s.registrations.some((x) => x.series === input.id);
          return {
            ...s,
            series: s.series.map((x) => (x.id !== input.id ? x : { ...x, ...input, id: x.id, counter: x.counter, reference_year: x.reference_year, direction: used ? x.direction : input.direction, start_number: used ? x.start_number : input.start_number })),
          };
        }
        const id = nextId(s);
        return { ...s, seq: id, series: [...s.series, { ...input, id, counter: input.start_number - 1, reference_year: Number(OFFICE_TODAY.slice(0, 4)) }] };
      });
      return { ok: true, value: undefined };
    };

    // ------------------------------------------------ پرونده‌ها
    const visibleCustomers = state.customers.filter((c) => canSeeCustomer(c, me, perms.crmManage));

    const saveCustomer = (input: CustomerInput, id?: number): Result<number> => {
      const r = ro();
      if (r) return r;
      if (!input.name.trim()) return fail("نام پرونده لازم است.");
      const existing = id ? state.customers.find((c) => c.id === id) : undefined;
      if (id && !existing) return fail("پرونده پیدا نشد.");
      if (existing ? !(perms.crmManage || existing.owner_id === me) : !perms.crmManage) return fail("مجوز ویرایش این پرونده را ندارید.");
      let newId = id ?? 0;
      set((s) => {
        const access = [...new Set([input.owner_id, ...input.access])];
        if (id) return { ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, ...input, name: input.name.trim(), access } : c)) };
        newId = nextId(s);
        return { ...s, seq: newId, customers: [{ ...input, name: input.name.trim(), access, id: newId, created_at: nowStamp(), created_by: me }, ...s.customers] };
      });
      if (!id) notifyPeople(input.access, `پرونده‌ی مشتری «${input.name.trim()}» با شما به اشتراک گذاشته شد`, `/customers/${newId}`, "crm_shared", "customer", newId);
      return { ok: true, value: newId };
    };

    const importCustomers = (rows: ImportedCustomer[], common: { owner_id: PrincipalId; access: PrincipalId[]; labels: string[] }): Result<number> => {
      const r = ro();
      if (r) return r;
      if (!perms.crmImport) return fail("مجوز ورود از اکسل ندارید.");
      set((s) => {
        let seq = s.seq;
        const at = nowStamp();
        const made: CustomerFile[] = rows.map((v) => ({
          ...v,
          id: ++seq,
          labels: [...new Set([...v.labels, ...common.labels])],
          owner_id: common.owner_id,
          access: [...new Set([common.owner_id, ...common.access])],
          created_at: at,
          created_by: me,
        }));
        return { ...s, seq, customers: [...made, ...s.customers] };
      });
      return { ok: true, value: rows.length };
    };

    const saveContact = (c: Omit<CustomerContact, "id"> & { id?: number }): Result => {
      const r = ro();
      if (r) return r;
      if (!c.name.trim()) return fail("نام نماینده لازم است.");
      set((s) => {
        if (c.id) return { ...s, contacts: s.contacts.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x)) };
        const id = nextId(s);
        return { ...s, seq: id, contacts: [...s.contacts, { ...c, id }] };
      });
      return { ok: true, value: undefined };
    };
    const removeContact = (id: number) => !t.readOnly && set((s) => ({ ...s, contacts: s.contacts.filter((x) => x.id !== id) }));

    const addActivity = (a: Omit<CustomerActivity, "id" | "author_id" | "created_at">): Result => {
      const r = ro();
      if (r) return r;
      if (!a.text.trim() && !a.attachments.length) return fail("متن یا فایل لازم است.");
      set((s) => {
        const id = nextId(s);
        return { ...s, seq: id, activities: [{ ...a, text: a.text.trim(), id, author_id: me, created_at: nowStamp() }, ...s.activities] };
      });
      return { ok: true, value: undefined };
    };

    // ------------------------------------------------ فرصت‌ها
    const customerIds = new Set(visibleCustomers.map((c) => c.id));
    const visibleOpportunities = state.opportunities.filter((o) => customerIds.has(o.customer));

    const saveOpportunity = (input: OpportunityInput, id?: number): Result<number> => {
      const r = ro();
      if (r) return r;
      if (!input.title.trim()) return fail("عنوان فرصت لازم است.");
      if (!customerIds.has(input.customer)) return fail("به این پرونده دسترسی ندارید.");
      const probability = Math.max(0, Math.min(100, Math.round(input.probability)));
      let newId = id ?? 0;
      set((s) => {
        if (id) {
          return {
            ...s,
            opportunities: s.opportunities.map((o) =>
              o.id !== id ? o : { ...o, ...input, probability: input.status === "won" ? 100 : input.status === "lost" ? 0 : probability, closed_at: input.status === "open" ? null : (o.status === input.status ? o.closed_at : OFFICE_TODAY) },
            ),
          };
        }
        newId = nextId(s);
        return { ...s, seq: newId, opportunities: [{ ...input, title: input.title.trim(), probability, id: newId, created_at: nowStamp(), created_by: me, closed_at: input.status === "open" ? null : OFFICE_TODAY }, ...s.opportunities] };
      });
      if (input.owner_id !== me) notifyPeople([input.owner_id], `پیگیری فرصت فروش «${input.title.trim()}» به شما سپرده شد`, `/customers/${input.customer}?tab=opportunities&opp=${newId}`, "crm_shared", "opportunity", newId);
      return { ok: true, value: newId };
    };

    // ------------------------------------------------ اسناد مالی
    const visibleFinanceDocs = perms.financeView ? state.financeDocs.filter((d) => customerIds.has(d.customer)) : [];

    const saveFinanceDoc = (input: FinanceDocInput, id?: number): Result<number> => {
      const r = ro();
      if (r) return r;
      if (!perms.financeManage) return fail("مجوز ثبت سند مالی ندارید.");
      if (!(input.amount_rial > 0)) return fail("مبلغ باید بیشتر از صفر باشد.");
      if (!input.date) return fail("تاریخ سند لازم است.");
      if (input.form !== "cash" && !input.due_date) return fail("برای چک یا سند احتمالی، سررسید لازم است.");
      const existing = id ? state.financeDocs.find((d) => d.id === id) : undefined;
      if (existing?.status === "cancelled") return fail("سند ابطال‌شده ویرایش نمی‌شود.");
      let newId = id ?? 0;
      set((s) => {
        const clean = { ...input, is_cashed: input.form === "probable" ? false : input.is_cashed, ...(input.form === "cheque" ? {} : { cheque: undefined }) };
        if (id) return { ...s, financeDocs: s.financeDocs.map((d) => (d.id === id ? { ...d, ...clean } : d)) };
        newId = nextId(s);
        return { ...s, seq: newId, financeDocs: [{ ...clean, id: newId, status: "active", cancel_type: null, created_by: me, created_at: nowStamp() }, ...s.financeDocs] };
      });
      return { ok: true, value: newId };
    };

    const cancelFinanceDoc = (id: number, cancel_type: CancelType, note: string): Result => {
      const r = ro();
      if (r) return r;
      if (!perms.financeManage) return fail("مجوز ابطال سند ندارید.");
      set((s) => ({ ...s, financeDocs: s.financeDocs.map((d) => (d.id === id ? { ...d, status: "cancelled", cancel_type, cancel_note: note.trim(), cancelled_at: nowStamp() } : d)) }));
      return { ok: true, value: undefined };
    };

    const setCashed = (id: number, on: boolean): Result => {
      const r = ro();
      if (r) return r;
      if (!perms.financeManage) return fail("مجوز ویرایش سند ندارید.");
      set((s) => ({ ...s, financeDocs: s.financeDocs.map((d) => (d.id === id && d.status === "active" && d.form !== "probable" ? { ...d, is_cashed: on } : d)) }));
      return { ok: true, value: undefined };
    };

    /** تبدیل سند احتمالی به نقدی/چک هنگام تحقق */
    const realize = (id: number, form: "cash" | "cheque"): Result<number> => saveFinanceDoc({ ...(state.financeDocs.find((d) => d.id === id) as FinanceDocInput), form, is_cashed: form === "cash" }, id);

    // ------------------------------------------------ برچسب‌ها
    const saveLabel = (l: Omit<OfficeLabel, "id"> & { id?: number }): Result => {
      const r = ro();
      if (r) return r;
      if (!l.title.trim()) return fail("عنوان برچسب لازم است.");
      if (state.labels.some((x) => x.id !== l.id && x.namespace === l.namespace && x.title === l.title.trim())) return fail("این برچسب وجود دارد.");
      set((s) => {
        if (l.id) return { ...s, labels: s.labels.map((x) => (x.id === l.id ? { ...x, ...l, title: l.title.trim(), id: x.id } : x)) };
        const id = nextId(s);
        return { ...s, seq: id, labels: [...s.labels, { ...l, title: l.title.trim(), id }] };
      });
      return { ok: true, value: undefined };
    };
    const removeLabel = (id: number) => !t.readOnly && set((s) => ({ ...s, labels: s.labels.filter((x) => x.id !== id) }));

    return {
      state,
      me,
      meUser,
      perms,
      nameOf,
      // نامه
      visibleLetters,
      registrationOf: (id: number) => registrationOf(state, id),
      deleteCheck: (l: Letter) => deleteCheck(state, l, me),
      createLetter,
      markSeen,
      addParaph,
      refer,
      setArchivedForMe,
      setArchived,
      deleteLetter,
      setCaseLinks,
      register,
      registerIncoming,
      saveSeries,
      // CRM
      visibleCustomers,
      customerOf: (id: number) => visibleCustomers.find((c) => c.id === id),
      duplicateOf: (c: Pick<CustomerFile, "name" | "national_id" | "economic_code" | "phones">, exceptId?: number) => duplicateOf(state, c, exceptId),
      saveCustomer,
      importCustomers,
      saveContact,
      removeContact,
      addActivity,
      visibleOpportunities,
      saveOpportunity,
      visibleFinanceDocs,
      saveFinanceDoc,
      cancelFinanceDoc,
      setCashed,
      realize,
      saveLabel,
      removeLabel,
      labelsOf: (ns: OfficeLabel["namespace"]) => state.labels.filter((l) => l.namespace === ns),
    };
  }, [state, t, inbox, perms, me, meUser]);
}

export type OfficeApi = ReturnType<typeof useOffice>;

// ------------------------------------------------------------------ مانیتورینگ (C8)

/** مانیتورینگ مالی: چهار سبد قطعی/احتمالی + معوقه، روی اسناد پرونده‌های قابل‌دید (مجوز crm.finance.view) */
export function useFinanceMonitoring(filter?: { labels?: string[]; year?: number }) {
  const o = useOffice();
  return useMemo(() => {
    let docs = o.visibleFinanceDocs;
    if (filter?.labels?.length) docs = docs.filter((d) => d.labels.some((l) => filter.labels!.includes(l)));
    if (filter?.year) docs = docs.filter((d) => d.date.startsWith(String(filter.year)));
    const totals = totalsOf(docs);
    const withBucket = docs.map((d) => ({ doc: d, bucket: bucketOf(d), customer: o.state.customers.find((c) => c.id === d.customer) }));
    return {
      allowed: o.perms.financeView,
      docs,
      totals,
      overdue: withBucket.filter((x) => x.bucket === "overdue").sort((a, b) => b.doc.amount_rial - a.doc.amount_rial),
      probable: withBucket.filter((x) => x.bucket === "probable_in" || x.bucket === "probable_out"),
    };
  }, [o, filter?.labels, filter?.year]);
}

/** مانیتورینگ فروش: فروش موفق، فرصت‌های احتمالی (ارزش × احتمال) و فهرست به ازای هر احتمال */
export function useSalesMonitoring() {
  const o = useOffice();
  return useMemo(() => {
    const opps = o.visibleOpportunities;
    return {
      allowed: o.perms.crm,
      opportunities: opps,
      totals: salesTotalsOf(opps),
      byProbability: byProbability(opps.filter((x) => x.status === "open")),
      topOpen: [...opps].filter((x) => x.status === "open").sort((a, b) => weightedOf(b) - weightedOf(a)).slice(0, 5),
    };
  }, [o]);
}

// ------------------------------------------------------------------ انتقال کار (C6)

const asPrincipal = (x: string) => (/^[0-9a-f-]{36}$/i.test(x) ? x : principalOf(x));

/**
 * انتقال پرونده‌های مشتری (مسئول و دسترسی) و فرصت‌های فروش از کاربر A به B.
 * from/to می‌توانند شناسه‌ی کاربر دمو (u4) یا principal_id باشند. خروجی = تعداد اقلام منتقل‌شده.
 */
export function reassignPrincipal(from: string, to: string, include: { customerFiles?: boolean; opportunities?: boolean; letters?: boolean } = { customerFiles: true, opportunities: true }): { customerFiles: number; opportunities: number; letters: number } {
  const a = asPrincipal(from);
  const b = asPrincipal(to);
  const out = { customerFiles: 0, opportunities: 0, letters: 0 };
  if (a === b) return out;
  officeStore.set((s) => ({
    ...s,
    customers: include.customerFiles
      ? s.customers.map((c) => {
          if (c.owner_id !== a && !c.access.includes(a)) return c;
          out.customerFiles++;
          return { ...c, owner_id: c.owner_id === a ? b : c.owner_id, access: [...new Set(c.access.map((p) => (p === a ? b : p)))] };
        })
      : s.customers,
    opportunities: include.opportunities
      ? s.opportunities.map((o) => {
          if (o.owner_id !== a || o.status !== "open") return o;
          out.opportunities++;
          return { ...o, owner_id: b };
        })
      : s.opportunities,
    letters: include.letters
      ? s.letters.map((l) => {
          if (!l.parties.some((p) => p.principal_id === a)) return l;
          out.letters++;
          return { ...l, parties: l.parties.some((p) => p.principal_id === b) ? l.parties : [...l.parties, { principal_id: b, role: "to" as const, seen_at: null }] };
        })
      : s.letters,
  }));
  return out;
}

/** تعداد اقلام هر کاربر (برای پیش‌نمایش صفحه‌ی انتقال کار) */
export function officeHoldingsOf(userOrPrincipal: string) {
  const p = asPrincipal(userOrPrincipal);
  const s = officeStore.get();
  return {
    customerFiles: s.customers.filter((c) => c.owner_id === p || c.access.includes(p)).length,
    opportunities: s.opportunities.filter((o) => o.owner_id === p && o.status === "open").length,
  };
}
