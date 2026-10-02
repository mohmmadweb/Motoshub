// ---------------------------------------------------------------------------
// زمینه‌ی کارکرد (تایم‌شیت) — ذخیره در localStorage با کلید motoshub.timesheet.v1
// ورودی‌های زمان، فهرست کارکنان، وضعیت دوره‌های حقوق (ارسال/تأیید/برگشت)،
// اتصال ابزارهای بیرونی و تنظیمات ساعت موظف.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_REF_DATE } from "../pm/seed";
import { nowClock } from "../pm/jalali";
import { TS_VERSION, seedTimesheet } from "../timesheet/seed";
import type { Integration, IntegrationKind, PeriodRecord, PeriodStatus, Person, TimeEntry, TsSettings, TsState } from "../timesheet/types";

const KEY = "motoshub.timesheet.v1";

function load(): TsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as TsState;
      if (s && s.version === TS_VERSION && Array.isArray(s.entries)) return s;
    }
  } catch {
    /* داده‌ی خراب → بازسازی از نمونه */
  }
  return seedTimesheet();
}

export type NewEntry = Omit<TimeEntry, "id" | "createdAt"> & { createdAt?: string };

type Ctx = {
  state: TsState;
  today: string;
  entries: TimeEntry[];
  roster: Person[];
  settings: TsSettings;
  integrations: Integration[];
  personById: (id: string) => Person | undefined;
  // --- ورودی‌ها
  addEntry: (e: NewEntry) => string;
  addEntries: (list: NewEntry[]) => number;
  updateEntry: (id: string, patch: Partial<TimeEntry>) => void;
  removeEntry: (id: string) => void;
  /** پذیرش یا رد ورودی واردشده از ابزار بیرونی */
  reviewEntries: (ids: string[], accept: boolean) => void;
  // --- دوره
  periodRecord: (personId: string, key: string) => PeriodRecord;
  submitPeriod: (personId: string, key: string, by: string, comment?: string) => void;
  decidePeriod: (personIds: string[], key: string, approve: boolean, by: string, comment?: string) => void;
  reopenPeriod: (personId: string, key: string, by: string) => void;
  // --- اتصال‌ها
  integrationOf: (personId: string, kind: IntegrationKind) => Integration | undefined;
  saveIntegration: (i: Integration) => void;
  disconnect: (personId: string, kind: IntegrationKind) => void;
  // --- تنظیمات و کارکنان
  updateSettings: (patch: Partial<TsSettings>) => void;
  ensurePerson: (p: Person) => void;
  reset: () => void;
};

const TimesheetContext = createContext<Ctx | null>(null);

const stamp = () => `${DEMO_REF_DATE} ${nowClock()}`;

export function TimesheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TsState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* فضای ذخیره پر است — نادیده */
    }
  }, [state]);

  const value = useMemo<Ctx>(() => {
    const nextIds = (s: TsState, n: number) => Array.from({ length: n }, (_, i) => `te${s.seq + i + 1}`);
    const setPeriod = (s: TsState, personId: string, key: string, status: PeriodStatus, by: string, comment?: string): PeriodRecord[] => {
      const h = { at: stamp(), by, action: status, comment: comment?.trim() || undefined };
      const found = s.periods.find((p) => p.personId === personId && p.key === key);
      if (found) return s.periods.map((p) => (p === found ? { ...p, status, history: [...p.history, h] } : p));
      return [...s.periods, { personId, key, status, history: [h] }];
    };
    return {
      state,
      today: DEMO_REF_DATE,
      entries: state.entries,
      roster: state.roster,
      settings: state.settings,
      integrations: state.integrations,
      personById: (id) => state.roster.find((p) => p.id === id),

      addEntry: (e) => {
        const id = `te${state.seq + 1}`;
        setState((s) => ({ ...s, seq: s.seq + 1, entries: [...s.entries, { ...e, id: `te${s.seq + 1}`, createdAt: e.createdAt ?? stamp() }] }));
        return id;
      },
      addEntries: (list) => {
        if (!list.length) return 0;
        setState((s) => {
          const ids = nextIds(s, list.length);
          return { ...s, seq: s.seq + list.length, entries: [...s.entries, ...list.map((e, i) => ({ ...e, id: ids[i], createdAt: e.createdAt ?? stamp() }))] };
        });
        return list.length;
      },
      updateEntry: (id, patch) => setState((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEntry: (id) => setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })),
      reviewEntries: (ids, accept) => {
        const set = new Set(ids);
        setState((s) => ({ ...s, entries: s.entries.map((e) => (set.has(e.id) ? { ...e, review: accept ? "accepted" : "rejected" } : e)) }));
      },

      periodRecord: (personId, key) => state.periods.find((p) => p.personId === personId && p.key === key) ?? { personId, key, status: "draft", history: [] },
      submitPeriod: (personId, key, by, comment) => setState((s) => ({ ...s, periods: setPeriod(s, personId, key, "submitted", by, comment) })),
      decidePeriod: (personIds, key, approve, by, comment) =>
        setState((s) => {
          let periods = s.periods;
          personIds.forEach((pid) => {
            periods = setPeriod({ ...s, periods }, pid, key, approve ? "approved" : "returned", by, comment);
          });
          return { ...s, periods };
        }),
      reopenPeriod: (personId, key, by) => setState((s) => ({ ...s, periods: setPeriod(s, personId, key, "draft", by, "بازگشایی برای ویرایش") })),

      integrationOf: (personId, kind) => state.integrations.find((i) => i.personId === personId && i.kind === kind),
      saveIntegration: (i) =>
        setState((s) => {
          const has = s.integrations.some((x) => x.personId === i.personId && x.kind === i.kind);
          return { ...s, integrations: has ? s.integrations.map((x) => (x.personId === i.personId && x.kind === i.kind ? i : x)) : [...s.integrations, i] };
        }),
      disconnect: (personId, kind) => setState((s) => ({ ...s, integrations: s.integrations.filter((x) => !(x.personId === personId && x.kind === kind)) })),

      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      ensurePerson: (p) => setState((s) => (s.roster.some((x) => x.id === p.id) ? s : { ...s, roster: [...s.roster, p] })),
      reset: () => setState(seedTimesheet()),
    };
  }, [state]);

  return <TimesheetContext.Provider value={value}>{children}</TimesheetContext.Provider>;
}

export function useTimesheet() {
  const ctx = useContext(TimesheetContext);
  if (!ctx) throw new Error("useTimesheet must be used within TimesheetProvider");
  return ctx;
}
