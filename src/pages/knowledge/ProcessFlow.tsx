// ---------------------------------------------------------------------------
// فرآیند تصمیم‌دار: نمودار SVG با خطوط شنا (نقش‌ها)، گام‌های تصمیم (بله/خیر) و ماتریس RACI،
// به‌همراه ویرایشگر ساده. نمودار راست‌به‌چپ رسم می‌شود (شروع در سمت راست).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Plus, Trash2, X, WandSparkles } from "lucide-react";
import Button from "../../components/ui/Button";
import { fa } from "../../pm/jalali";
import { flowOf, linearFlow, raciLabel } from "../../km/templates";
import type { KProcess, ProcStep, ProcStepKind, RaciCode } from "../../km/types";

const LABEL_W = 96;
const COL_W = 150;
const LANE_H = 92;
const short = (t: string, n = 17) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
/** رنگ کم‌رنگ سازگار با حالت تیره: ترکیب رنگ با سطح (ink-50 در حالت تیره تیره است) */
const tint = (hex: string, pct = 14) => ({ fill: `color-mix(in srgb, ${hex} ${pct}%, var(--color-ink-50))` });

/** نمودار خطوط شنا */
export function SwimlaneDiagram({ process }: { process: KProcess }) {
  const { steps, lanes } = flowOf(process);
  const cols = steps.length;
  const W = LABEL_W + cols * COL_W + 16;
  const H = lanes.length * LANE_H;
  const pos = new Map<string, { x: number; y: number; s: ProcStep; col: number; lane: number }>();
  steps.forEach((s, i) => {
    const lane = Math.max(0, lanes.indexOf(s.lane));
    pos.set(s.id, { x: W - LABEL_W - (i + 0.5) * COL_W, y: lane * LANE_H + LANE_H / 2, s, col: i, lane });
  });
  const halfW = (k: ProcStepKind) => (k === "decision" ? 54 : k === "task" ? 60 : 34);
  const halfH = (k: ProcStepKind) => (k === "decision" ? 30 : k === "task" ? 22 : 16);
  const edges: { from: string; to: string; label?: string }[] = [];
  steps.forEach((s) => {
    if (s.kind === "decision") {
      if (s.yes) edges.push({ from: s.id, to: s.yes, label: "بله" });
      if (s.no) edges.push({ from: s.id, to: s.no, label: "خیر" });
    } else if (s.next && s.kind !== "end") edges.push({ from: s.id, to: s.next });
  });
  const path = (e: (typeof edges)[number], k: number) => {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) return null;
    const forward = b.col > a.col;
    if (forward) {
      // از لبه‌ی چپ مبدأ به لبه‌ی راست مقصد (راست‌به‌چپ)
      const sx = a.x - halfW(a.s.kind);
      const tx = b.x + halfW(b.s.kind);
      const mid = sx - Math.min(28, (sx - tx) / 2);
      return { d: a.y === b.y ? `M${sx},${a.y} L${tx},${b.y}` : `M${sx},${a.y} L${mid},${a.y} L${mid},${b.y} L${tx},${b.y}`, lx: sx - 14, ly: a.y - 6 };
    }
    // بازگشت (مثلاً «خیر» ← گام قبلی): از پایین مبدأ، زیر خط شنا، تا پایین مقصد
    const bottom = Math.max(a.lane, b.lane) * LANE_H + LANE_H - 8 - (k % 3) * 4;
    const sy = a.y + halfH(a.s.kind);
    const ty = b.y + halfH(b.s.kind);
    return { d: `M${a.x},${sy} L${a.x},${bottom} L${b.x},${bottom} L${b.x},${ty}`, lx: a.x - 16, ly: sy + 14 };
  };
  return (
    <div className="overflow-x-auto rounded-lg border border-ink-200 bg-ink-50" dir="ltr">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`نمودار فرآیند ${process.name}`} className="block">
        <defs>
          <marker id={`arr-${process.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-ink-400)" />
          </marker>
        </defs>
        {lanes.map((l, i) => (
          <g key={l}>
            <rect x={0} y={i * LANE_H} width={W} height={LANE_H} style={i % 2 ? tint("#1f4f99", 4) : { fill: "transparent" }} />
            <line x1={0} x2={W} y1={(i + 1) * LANE_H} y2={(i + 1) * LANE_H} stroke="var(--color-ink-200)" />
            <rect x={W - LABEL_W} y={i * LANE_H} width={LABEL_W} height={LANE_H} style={tint("#1f4f99", 12)} />
            <text x={W - LABEL_W / 2} y={i * LANE_H + LANE_H / 2} textAnchor="middle" dominantBaseline="middle" direction="rtl" fill="var(--color-ink-700)" className="text-[11px] font-bold">
              <title>{l}</title>
              {short(l, 13)}
            </text>
          </g>
        ))}
        <line x1={W - LABEL_W} x2={W - LABEL_W} y1={0} y2={H} stroke="var(--color-ink-200)" />
        {edges.map((e, k) => {
          const p = path(e, k);
          if (!p) return null;
          return (
            <g key={`${e.from}-${e.to}-${k}`}>
              <path d={p.d} fill="none" strokeWidth={1.5} stroke={e.label === "خیر" ? "#f43f5e" : e.label === "بله" ? "#10b981" : "var(--color-ink-400)"} markerEnd={`url(#arr-${process.id})`} />
              {e.label && (
                <text x={p.lx} y={p.ly} textAnchor="middle" direction="rtl" fill={e.label === "خیر" ? "#f43f5e" : "#10b981"} className="text-[10px] font-bold">
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
        {[...pos.values()].map(({ x, y, s }) => (
          <g key={s.id}>
            <title>{s.label}</title>
            {s.kind === "decision" ? (
              <polygon points={`${x},${y - 30} ${x + 54},${y} ${x},${y + 30} ${x - 54},${y}`} style={tint("#f59e0b", 16)} stroke="#f59e0b" strokeWidth={1.5} />
            ) : s.kind === "task" ? (
              <rect x={x - 60} y={y - 22} width={120} height={44} rx={8} style={tint("#2a66bd", 14)} stroke="#5b8ad1" strokeWidth={1.2} />
            ) : (
              <rect x={x - 34} y={y - 16} width={68} height={32} rx={16} style={tint(s.kind === "start" ? "#10b981" : "#475569", 18)} stroke={s.kind === "start" ? "#10b981" : "#64748b"} strokeWidth={1.5} />
            )}
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" direction="rtl" fill="var(--color-ink-800)" className="text-[10.5px]">
              {short(s.label, s.kind === "decision" ? 14 : s.kind === "task" ? 19 : 8)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** ماتریس RACI: گام‌ها × نقش‌ها */
export function RaciTable({ process }: { process: KProcess }) {
  const { steps, lanes } = flowOf(process);
  const acts = steps.filter((s) => s.kind === "task" || s.kind === "decision");
  const raci = process.raci ?? {};
  // اگر RACI تعریف نشده، صاحب خط شنای هر گام «مجری» فرض می‌شود
  const cell = (sid: string, lane: string, s: ProcStep): RaciCode | "" => raci[sid]?.[lane] ?? (!process.raci && s.lane === lane ? "R" : "");
  const tone: Record<RaciCode, string> = { R: "bg-brand-600 text-white", A: "bg-navy-800 text-white", C: "bg-amber-100 text-amber-800", I: "bg-ink-100 text-ink-600" };
  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px] border border-ink-200 rounded-lg min-w-[420px]">
          <thead className="bg-ink-50">
            <tr>
              <th className="p-2 text-right font-bold text-ink-700 border-b border-ink-200">فعالیت</th>
              {lanes.map((l) => (
                <th key={l} className="p-2 text-center font-bold text-ink-700 border-b border-ink-200 whitespace-nowrap">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {acts.map((s) => (
              <tr key={s.id} className="border-b border-ink-100 last:border-0">
                <td className="p-2 text-ink-800">{s.label}</td>
                {lanes.map((l) => {
                  const c = cell(s.id, l, s);
                  return (
                    <td key={l} className="p-2 text-center">
                      {c ? (
                        <span className={`inline-flex w-6 h-6 rounded-md items-center justify-center text-[11px] font-bold ${tone[c]}`} title={raciLabel[c]}>
                          {c}
                        </span>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10.5px] text-ink-400">
        {(Object.keys(raciLabel) as RaciCode[]).map((k) => `${k} = ${raciLabel[k]}`).join(" · ")}
      </p>
    </div>
  );
}

type FlowDraft = Pick<KProcess, "flow" | "lanes" | "raci" | "steps" | "owner">;
const kindLabel: Record<ProcStepKind, string> = { start: "شروع", task: "فعالیت", decision: "تصمیم (بله/خیر)", end: "پایان" };

/** ویرایشگر نمودار تصمیم‌دار، خطوط شنا و RACI */
export function ProcessFlowEditor({ value, onChange }: { value: FlowDraft; onChange: (v: Pick<KProcess, "flow" | "lanes" | "raci">) => void }) {
  const [laneInput, setLaneInput] = useState("");
  const flow = value.flow ?? [];
  const lanes = value.lanes?.length ? value.lanes : [...new Set(flow.map((s) => s.lane))];
  const raci = value.raci ?? {};
  const set = (patch: Partial<Pick<KProcess, "flow" | "lanes" | "raci">>) => onChange({ flow, lanes, raci, ...patch });
  const setStep = (id: string, patch: Partial<ProcStep>) => set({ flow: flow.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const addStep = () => {
    const id = `s${Date.now().toString(36)}`;
    const endIdx = flow.findIndex((s) => s.kind === "end");
    const step: ProcStep = { id, label: "گام جدید", kind: "task", lane: lanes[0] ?? value.owner, next: flow[endIdx]?.id ?? null };
    const next = endIdx >= 0 ? [...flow.slice(0, endIdx), step, ...flow.slice(endIdx)] : [...flow, step];
    set({ flow: next, lanes: lanes.length ? lanes : [value.owner] });
  };
  const removeStep = (id: string) => set({ flow: flow.filter((s) => s.id !== id).map((s) => ({ ...s, next: s.next === id ? null : s.next, yes: s.yes === id ? null : s.yes, no: s.no === id ? null : s.no })) });
  const targets = (id: string) => flow.filter((s) => s.id !== id && s.kind !== "start");
  const pick = (val: string | null | undefined, onPick: (v: string | null) => void, id: string, label: string) => (
    <select className="input-field !py-1 !text-[11px] !w-auto max-w-[150px]" value={val ?? ""} onChange={(e) => onPick(e.target.value || null)} aria-label={label}>
      <option value="">{label}: —</option>
      {targets(id).map((t) => (
        <option key={t.id} value={t.id}>
          {label}: {t.label}
        </option>
      ))}
    </select>
  );
  const setRaci = (sid: string, lane: string, code: RaciCode | "") => {
    const row = { ...(raci[sid] ?? {}) };
    if (code) row[lane] = code;
    else delete row[lane];
    set({ raci: { ...raci, [sid]: row } });
  };

  if (!flow.length)
    return (
      <div className="rounded-lg border border-dashed border-ink-300 p-3 text-center space-y-2">
        <p className="text-[11.5px] text-ink-500">نمودار تصمیم‌دار تعریف نشده؛ نمایش از روی «گام‌های فرآیند» ساخته می‌شود.</p>
        <Button size="sm" icon={<WandSparkles size={13} />} onClick={() => onChange({ flow: linearFlow(value), lanes: [value.owner], raci: {} })}>
          ساخت از گام‌ها و ویرایش
        </Button>
      </div>
    );

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11.5px] font-medium text-ink-600 mb-1">خطوط شنا (نقش‌ها)</p>
        <div className="flex flex-wrap gap-1 items-center">
          {lanes.map((l) => (
            <span key={l} className="inline-flex items-center gap-1 text-[11px] bg-navy-50 text-navy-700 rounded px-1.5 py-0.5">
              {l}
              <button type="button" onClick={() => set({ lanes: lanes.filter((x) => x !== l) })} aria-label={`حذف ${l}`}>
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            className="input-field !py-1 !text-xs !w-40"
            value={laneInput}
            onChange={(e) => setLaneInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && laneInput.trim() && !lanes.includes(laneInput.trim())) {
                e.preventDefault();
                set({ lanes: [...lanes, laneInput.trim()] });
                setLaneInput("");
              }
            }}
            placeholder="+ نقش (Enter)"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11.5px] font-medium text-ink-600">گام‌ها (به ترتیب نمایش)</p>
        {flow.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ink-200 p-2">
            <span className="text-[10.5px] text-ink-400 w-5 text-center">{fa(i + 1)}</span>
            <input className="input-field !py-1 !text-xs flex-1 min-w-[120px]" value={s.label} onChange={(e) => setStep(s.id, { label: e.target.value })} aria-label="عنوان گام" />
            <select className="input-field !py-1 !text-[11px] !w-auto" value={s.kind} onChange={(e) => setStep(s.id, { kind: e.target.value as ProcStepKind })} aria-label="نوع گام">
              {(Object.keys(kindLabel) as ProcStepKind[]).map((k) => (
                <option key={k} value={k}>
                  {kindLabel[k]}
                </option>
              ))}
            </select>
            <select className="input-field !py-1 !text-[11px] !w-auto max-w-[130px]" value={s.lane} onChange={(e) => setStep(s.id, { lane: e.target.value })} aria-label="خط شنا">
              {[...new Set([...lanes, s.lane])].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {s.kind === "decision" ? (
              <>
                {pick(s.yes, (v) => setStep(s.id, { yes: v }), s.id, "بله")}
                {pick(s.no, (v) => setStep(s.id, { no: v }), s.id, "خیر")}
              </>
            ) : s.kind !== "end" ? (
              pick(s.next, (v) => setStep(s.id, { next: v }), s.id, "بعدی")
            ) : null}
            <button type="button" onClick={() => removeStep(s.id)} className="p-1 text-ink-400 hover:text-rose-600" aria-label="حذف گام">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <Button size="sm" icon={<Plus size={13} />} onClick={addStep}>
          افزودن گام
        </Button>
      </div>
      <div>
        <p className="text-[11.5px] font-medium text-ink-600 mb-1">ماتریس RACI</p>
        <div className="overflow-x-auto">
          <table className="text-[11px] border border-ink-200 rounded-lg min-w-[360px] w-full">
            <thead className="bg-ink-50">
              <tr>
                <th className="p-1.5 text-right">فعالیت</th>
                {lanes.map((l) => (
                  <th key={l} className="p-1.5 text-center whitespace-nowrap">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flow
                .filter((s) => s.kind === "task" || s.kind === "decision")
                .map((s) => (
                  <tr key={s.id} className="border-t border-ink-100">
                    <td className="p-1.5 text-ink-700">{s.label}</td>
                    {lanes.map((l) => (
                      <td key={l} className="p-1 text-center">
                        <select className="text-[11px] bg-transparent border border-ink-200 rounded px-1 py-0.5" value={raci[s.id]?.[l] ?? ""} onChange={(e) => setRaci(s.id, l, e.target.value as RaciCode | "")} aria-label={`RACI ${s.label} — ${l}`}>
                          <option value="">—</option>
                          {(["R", "A", "C", "I"] as RaciCode[]).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <button type="button" onClick={() => onChange({ flow: undefined, lanes: undefined, raci: undefined })} className="text-[11px] text-ink-400 hover:text-rose-600">
        حذف نمودار تصمیم‌دار (بازگشت به گام‌های خطی)
      </button>
    </div>
  );
}
