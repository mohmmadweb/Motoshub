// ---------------------------------------------------------------------------
// گراف زیست‌بوم: پژوهشگر ↔ شرکت ↔ پروژه/فرصت ↔ قرارداد ↔ صندوق ↔ ارزیابی
// چیدمان ستونی (بدون کتابخانه) با فیلتر حوزه و هلدینگ؛ هاور = برجسته‌سازی همسایه‌ها.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Network } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import { useTenancy } from "../../context/TenancyContext";
import { useInnovation } from "../../context/InnovationContext";
import { matchesEntity } from "../../innovation/records";
import { faN, rialShort, toRial } from "../../innovation/util";
import { entityHref } from "./shared";

type Col = "researcher" | "company" | "project" | "contract" | "fund" | "eval";
const cols: { id: Col; label: string; color: string }[] = [
  { id: "researcher", label: "پژوهشگران", color: "#059669" },
  { id: "company", label: "شرکت‌ها", color: "#1f4f99" },
  { id: "project", label: "پروژه / فرصت", color: "#7c3aed" },
  { id: "contract", label: "قراردادها", color: "#b45309" },
  { id: "fund", label: "صندوق / منبع", color: "#0d9488" },
  { id: "eval", label: "تصمیم و نتیجه", color: "#be123c" },
];

type GNode = { id: string; col: Col; label: string; sub: string; href?: string; field?: string; holdingId?: string };
type GEdge = { a: string; b: string; strong: boolean };

export default function EcosystemGraph() {
  const inn = useInnovation();
  const { holdings } = useTenancy();
  const [field, setField] = useState("همه");
  const [holding, setHolding] = useState("همه");
  const [hideIsolated, setHideIsolated] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const nodes: GNode[] = [];
    const edges: GEdge[] = [];
    const add = (n: GNode) => !nodes.some((x) => x.id === n.id) && nodes.push(n);
    const link = (a: string, b: string, strong = true) => a !== b && edges.push({ a, b, strong });
    const ents = inn.entities;
    const entFor = (id?: string, name?: string) => ents.find((e) => matchesEntity(e, id, name)) ?? (id ? undefined : ents.find((e) => matchesEntity(e, undefined, name)));

    ents.forEach((e) => add({ id: e.id, col: e.kind, label: e.name, sub: `${e.field} · ${e.city}`, href: entityHref(e.id), field: e.field, holdingId: e.holdingId }));
    ents.forEach((e) => e.collaborators.forEach((c) => ents.some((x) => x.id === c) && e.id < c && link(e.id, c, false)));
    ents.forEach((e) => e.collaborators.forEach((c) => ents.some((x) => x.id === c) && e.id > c && !ents.find((x) => x.id === c)?.collaborators.includes(e.id) && link(e.id, c, false)));

    // صندوق‌ها و منابع
    add({ id: "fund:nf", col: "fund", label: "صندوق نوآور", sub: "پیش‌شتابدهی TRL ۳ تا ۶", href: "/dashboard/funds" });
    add({ id: "fund:forsat", col: "fund", label: "صندوق فرصت", sub: "فرصت مطالعاتی اساتید", href: "/dashboard/research?tab=sabbatical" });
    add({ id: "fund:emp", col: "fund", label: "صندوق اشتغال‌زایی", sub: "طرح‌های اشتغال", href: "/dashboard/funds?tab=employment" });
    add({ id: "fund:research", col: "fund", label: "اعتبار پژوهشی بنیاد", sub: "فراخوان‌های پژوهشی", href: "/dashboard/research" });
    add({ id: "fund:rfp", col: "fund", label: "بودجه‌ی RFP شرکت‌ها", sub: "سهم شرکت‌های بنیادی", href: "/dashboard/research?tab=rfp" });

    inn.calls.forEach((c) => {
      const id = `call:${c.id}`;
      add({ id, col: "project", label: c.title, sub: `فراخوان پژوهشی · ${c.stage}`, href: `/dashboard/research?open=${c.id}`, field: c.field, holdingId: c.holdingId });
      link(id, "fund:research");
      c.applications.filter((a) => a.status !== "رد شده").forEach((a) => {
        const e = entFor(a.entityId, a.name);
        if (e) link(e.id, id, a.status === "پذیرفته");
      });
    });
    inn.rfps.forEach((r) => {
      const id = `rfp:${r.id}`;
      add({ id, col: "project", label: r.title.replace(/^RFP\s*/, "RFP "), sub: `${r.companyName} · ${r.stage}`, href: "/dashboard/research?tab=rfp", holdingId: r.holdingId });
      link(id, "fund:rfp");
      r.bids.forEach((b) => {
        const e = entFor(b.entityId, b.name);
        if (e) link(e.id, id, r.winnerBidId === b.id);
      });
    });
    inn.sabbaticals.forEach((s) => {
      const id = `sab:${s.id}`;
      add({ id, col: "project", label: s.topic, sub: `فرصت مطالعاتی · ${s.stage}`, href: "/dashboard/research?tab=sabbatical", holdingId: s.holdingId });
      link(id, "fund:forsat");
      const e = entFor(s.entityId, s.professor);
      if (e) link(e.id, id);
      s.applicants.forEach((a) => {
        const ae = entFor(a.entityId, a.name);
        if (ae && ae.id !== e?.id) link(ae.id, id, false);
      });
    });
    inn.nfProjects.forEach((p) => {
      const id = `nf:${p.id}`;
      add({ id, col: "project", label: p.titleFa, sub: `${p.id} · ${p.stage}`, href: "/dashboard/funds", field: p.macroField, holdingId: p.holdingId });
      link(id, "fund:nf");
      const e = entFor(undefined, p.team.name);
      if (e) link(e.id, id);
    });
    inn.employment.forEach((f) => {
      const id = `emp:${f.id}`;
      add({ id, col: "project", label: f.title, sub: `طرح اشتغال · ${f.stage}`, href: "/dashboard/funds?tab=employment", field: f.field, holdingId: f.holdingId });
      link(id, "fund:emp");
      const e = entFor(f.entityId, f.applicant);
      if (e) link(e.id, id);
    });
    inn.projectLinks.forEach((pl) => {
      const from = inn.calls.some((c) => c.id === pl.opportunityId) ? `call:${pl.opportunityId}` : inn.rfps.some((r) => r.id === pl.opportunityId) ? `rfp:${pl.opportunityId}` : `sab:${pl.opportunityId}`;
      if (pl.targetKind === "nf") link(from, `nf:${pl.targetId}`, false);
    });
    inn.contracts.forEach((c) => {
      const id = `ct:${c.id}`;
      add({ id, col: "contract", label: c.title, sub: `${c.stage} · ${rialShort(c.value)}`, href: `/dashboard/contracts?open=${c.id}`, holdingId: c.holdingId });
      const e = entFor(c.vendorEntityId, c.vendor);
      if (e) link(e.id, id);
      if (c.opportunityId) {
        const opp = inn.rfps.some((r) => r.id === c.opportunityId) ? `rfp:${c.opportunityId}` : `call:${c.opportunityId}`;
        link(id, opp);
      }
    });
    const subjectNode = (sid: string) => [`call:${sid}`, `rfp:${sid}`, `sab:${sid}`, `nf:${sid}`, `emp:${sid}`, `ct:${sid}`].find((x) => nodes.some((n) => n.id === x));
    inn.decisions.forEach((d) => {
      const id = `dc:${d.id}`;
      add({ id, col: "eval", label: `تصمیم: ${d.question}`, sub: `${d.chosenLabel}${d.deviates ? " · خلاف رتبه‌ی اول" : ""}`, href: "/dashboard/funds?tab=decisions" });
      const sn = subjectNode(d.subjectId);
      if (sn) link(sn, id);
      d.options.forEach((o) => o.entityId && nodes.some((n) => n.id === o.entityId) && link(o.entityId, id, o.id === d.chosenId));
    });
    inn.outcomes.forEach((o) => {
      const id = `oc:${o.id}`;
      add({ id, col: "eval", label: `نتیجه: ${o.subjectTitle}`, sub: `${faN(o.successPct)}٪ تحقق · ${o.delivered}`, href: "/dashboard/funds?tab=decisions" });
      const sn = subjectNode(o.subjectId);
      if (sn) link(sn, id);
      o.entityIds.forEach((eid) => nodes.some((n) => n.id === eid) && link(eid, id));
    });
    return { nodes, edges };
  }, [inn]);

  const fields = useMemo(() => Array.from(new Set(inn.entities.map((e) => e.field))).sort(), [inn.entities]);

  // فیلتر: موجودیت‌های منطبق + هرچه تا سه گام از آن‌ها قابل‌دسترسی است
  const visible = useMemo(() => {
    const adj = new Map<string, string[]>();
    edges.forEach((e) => {
      adj.set(e.a, [...(adj.get(e.a) ?? []), e.b]);
      adj.set(e.b, [...(adj.get(e.b) ?? []), e.a]);
    });
    const filtered = field !== "همه" || holding !== "همه";
    let set: Set<string>;
    if (!filtered) set = new Set(nodes.map((n) => n.id));
    else {
      const seeds = nodes.filter((n) => (n.col === "company" || n.col === "researcher") && (field === "همه" || n.field === field) && (holding === "همه" || n.holdingId === holding)).map((n) => n.id);
      set = new Set(seeds);
      let frontier = seeds;
      for (let d = 0; d < 3; d++) {
        const next: string[] = [];
        frontier.forEach((id) => (adj.get(id) ?? []).forEach((nb) => {
          const nn = nodes.find((x) => x.id === nb);
          if (!nn || set.has(nb) || nn.col === "company" || nn.col === "researcher") return;
          set.add(nb);
          next.push(nb);
        }));
        frontier = next;
      }
    }
    if (hideIsolated) set.forEach((id) => !(adj.get(id) ?? []).some((nb) => set.has(nb)) && set.delete(id));
    return set;
  }, [nodes, edges, field, holding, hideIsolated]);

  const vNodes = nodes.filter((n) => visible.has(n.id));
  const vEdges = edges.filter((e) => visible.has(e.a) && visible.has(e.b));

  // چیدمان ستونی با مرتب‌سازی بر اساس میانگین موقعیت همسایه‌ها (کاهش تقاطع)
  const W = 1180;
  const ROW = 30;
  const NW = 168;
  const colX = (i: number) => W - 20 - NW - i * ((W - 40 - NW) / (cols.length - 1));
  const pos = useMemo(() => {
    const p = new Map<string, { x: number; y: number }>();
    const byCol = cols.map((c) => vNodes.filter((n) => n.col === c.id));
    byCol.forEach((list, ci) => list.forEach((n, i) => p.set(n.id, { x: colX(ci), y: 46 + i * ROW })));
    for (let pass = 0; pass < 2; pass++) {
      byCol.forEach((list, ci) => {
        const score = (n: GNode) => {
          const ys = vEdges.filter((e) => e.a === n.id || e.b === n.id).map((e) => p.get(e.a === n.id ? e.b : e.a)?.y ?? 0);
          return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 1e6;
        };
        const sorted = [...list].sort((a, b) => score(a) - score(b));
        sorted.forEach((n, i) => p.set(n.id, { x: colX(ci), y: 46 + i * ROW }));
      });
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vNodes.length, vEdges.length, field, holding, hideIsolated]);

  const H = Math.max(...cols.map((c) => vNodes.filter((n) => n.col === c.id).length), 1) * ROW + 60;
  const focus = hover ?? sel;
  const neighbors = useMemo(() => {
    if (!focus) return null;
    const s = new Set<string>([focus]);
    vEdges.forEach((e) => {
      if (e.a === focus) s.add(e.b);
      if (e.b === focus) s.add(e.a);
    });
    return s;
  }, [focus, vEdges]);
  const selNode = sel ? nodes.find((n) => n.id === sel) : undefined;
  const selLinks = selNode ? vEdges.filter((e) => e.a === sel || e.b === sel).map((e) => nodes.find((n) => n.id === (e.a === sel ? e.b : e.a))!).filter(Boolean) : [];
  const colColor = (c: Col) => cols.find((x) => x.id === c)!.color;
  const trunc = (s: string, n = 24) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  const totalPaid = inn.contracts.reduce((s, c) => s + c.payments.filter((p) => p.status === "پرداخت‌شده").reduce((a, p) => a + p.amount, 0), 0) + inn.nfProjects.reduce((s, p) => s + toRial(p.finance.paid), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={field} onChange={(e) => setField(e.target.value)} className="input-field w-auto">
          <option value="همه">همه‌ی حوزه‌ها</option>
          {fields.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select value={holding} onChange={(e) => setHolding(e.target.value)} className="input-field w-auto">
          <option value="همه">همه‌ی هلدینگ‌ها</option>
          {holdings.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-ink-600"><Toggle on={hideIsolated} onChange={() => setHideIsolated((v) => !v)} label="فقط گره‌های دارای ارتباط" /> فقط گره‌های دارای ارتباط</label>
        <span className="text-[11px] text-ink-400 mr-auto">{faN(vNodes.length)} گره · {faN(vEdges.length)} ارتباط · پرداخت ثبت‌شده {rialShort(totalPaid)}</span>
      </div>

      <div className="card p-2 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[900px] w-full" style={{ height: "auto" }} onMouseLeave={() => setHover(null)}>
          {cols.map((c, i) => (
            <text key={c.id} x={colX(i) + NW / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill={c.color}>{c.label} ({faN(vNodes.filter((n) => n.col === c.id).length)})</text>
          ))}
          {vEdges.map((e, i) => {
            const pa = pos.get(e.a);
            const pb = pos.get(e.b);
            if (!pa || !pb) return null;
            const [l, r] = pa.x < pb.x ? [pa, pb] : [pb, pa];
            const sameCol = pa.x === pb.x;
            const x1 = sameCol ? l.x : l.x + NW;
            const x2 = r.x;
            const y1 = (pa.x < pb.x ? pa : pb).y + 11;
            const y2 = (pa.x < pb.x ? pb : pa).y + 11;
            const d = sameCol ? `M ${x1} ${y1} C ${x1 - 40} ${y1}, ${x1 - 40} ${y2}, ${x1} ${y2}` : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
            const on = !neighbors || (neighbors.has(e.a) && neighbors.has(e.b) && (e.a === focus || e.b === focus));
            return <path key={i} d={d} fill="none" stroke={on && neighbors ? "#1f4f99" : "#94a3b8"} strokeOpacity={on ? (neighbors ? 0.9 : 0.45) : 0.08} strokeWidth={on && neighbors ? 1.8 : 1} strokeDasharray={e.strong ? undefined : "4 3"} />;
          })}
          {vNodes.map((n) => {
            const p = pos.get(n.id);
            if (!p) return null;
            const dim = neighbors && !neighbors.has(n.id);
            const color = colColor(n.col);
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: "pointer" }} opacity={dim ? 0.25 : 1} onMouseEnter={() => setHover(n.id)} onClick={() => setSel(sel === n.id ? null : n.id)}>
                <title>{`${n.label}\n${n.sub}`}</title>
                <rect width={NW} height={22} rx={6} fill={sel === n.id ? color : "var(--graph-node, #ffffff)"} stroke={color} strokeWidth={sel === n.id ? 2 : 1.2} />
                <rect width={4} height={22} rx={2} x={NW - 4} fill={color} />
                <text x={NW - 10} y={15} textAnchor="end" fontSize={10.5} fill={sel === n.id ? "#ffffff" : "#0f172a"}>{trunc(n.label)}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-[10.5px] text-ink-400">
        <span className="flex items-center gap-1"><svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#94a3b8" strokeWidth="1.5" /></svg> ارتباط قطعی (پذیرش، برنده، مجری، طرف قرارداد)</span>
        <span className="flex items-center gap-1"><svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" /></svg> ارتباط غیرقطعی (درخواست، همکاری، پیوند پروژه)</span>
      </div>

      {selNode ? (
        <div className="card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink-900">{selNode.label}</p>
              <p className="text-[11px] text-ink-400 mt-0.5">{cols.find((c) => c.id === selNode.col)?.label} · {selNode.sub}</p>
            </div>
            {selNode.href && <Link to={selNode.href} className="text-xs text-brand-700 hover:underline flex items-center gap-1 shrink-0">مشاهده‌ی پرونده <ExternalLink size={11} /></Link>}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {selLinks.map((n) => (
              <button key={n.id} onClick={() => setSel(n.id)} className="text-[11px] px-2 py-0.5 rounded-full border border-ink-200 hover:bg-ink-50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: colColor(n.col) }} />
                {trunc(n.label, 32)}
              </button>
            ))}
            {selLinks.length === 0 && <span className="text-[11px] text-ink-400">ارتباطی در نمای فعلی ندارد.</span>}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-ink-400 flex items-center gap-1.5"><Network size={13} /> روی هر گره بایستید تا ارتباطاتش برجسته شود؛ با کلیک، جزئیات و پیوند پرونده نمایش داده می‌شود. <Badge tone="neutral">بدون امتیاز اعتباری</Badge></p>
      )}
    </div>
  );
}
