// «سوابق در بنیاد» برای هر موجودیت — از همه‌ی ماژول‌ها ساخته می‌شود (فقط فهرست، بدون امتیاز)
import { users } from "../data/mock";
import type { EcoEntity, InnModule, InnStore } from "./types";
import { normName, toRial } from "./util";

export type EntityRecord = {
  key: string;
  module: InnModule;
  kind: string;
  title: string;
  role: string;
  status: string;
  amount?: number;
  date?: string;
  link: string;
  subjectId: string;
};

export function matchesEntity(e: EcoEntity, id?: string, name?: string): boolean {
  if (id) return id === e.id;
  if (!name) return false;
  return normName(name) === normName(e.name);
}

export function entityRecords(s: InnStore, e: EcoEntity): EntityRecord[] {
  const out: EntityRecord[] = [];
  s.contracts.forEach((c) => {
    if (matchesEntity(e, c.vendorEntityId, c.vendor))
      out.push({ key: `ct-${c.id}`, module: "contracts", kind: "قرارداد", title: c.title, role: "طرف قرارداد", status: c.stage, amount: c.value, date: c.startDate, link: `/dashboard/contracts?open=${c.id}`, subjectId: c.id });
  });
  s.nfProjects.forEach((p) => {
    if (matchesEntity(e, undefined, p.team.name))
      out.push({ key: `nf-${p.id}`, module: "funds", kind: "طرح صندوق نوآور", title: p.titleFa, role: "مجری", status: p.stage, amount: toRial(p.budget), link: `/dashboard/funds`, subjectId: p.id });
  });
  s.employment.forEach((f) => {
    if (matchesEntity(e, f.entityId, f.applicant))
      out.push({ key: `em-${f.id}`, module: "funds", kind: "طرح اشتغال‌زایی", title: f.title, role: "متقاضی", status: f.stage, amount: f.approved || f.requested, link: `/dashboard/funds?tab=employment`, subjectId: f.id });
  });
  s.calls.forEach((c) =>
    c.applications.forEach((a) => {
      if (matchesEntity(e, a.entityId, a.name))
        out.push({ key: `ap-${a.id}`, module: "research", kind: "درخواست فراخوان پژوهشی", title: c.title, role: "متقاضی", status: a.status, amount: a.status === "پذیرفته" ? c.budget : undefined, date: a.submittedAt, link: `/dashboard/research?open=${c.id}`, subjectId: c.id });
    })
  );
  s.rfps.forEach((r) =>
    r.bids.forEach((b) => {
      if (matchesEntity(e, b.entityId, b.name))
        out.push({ key: `rb-${r.id}-${b.id}`, module: "research", kind: "پیشنهاد RFP", title: r.title, role: r.winnerBidId === b.id ? "فناور برتر" : "پیشنهاددهنده", status: r.winnerBidId === b.id ? "برنده" : r.stage, amount: b.price, date: b.submittedAt, link: `/dashboard/research?tab=rfp`, subjectId: r.id });
    })
  );
  s.sabbaticals.forEach((sb) => {
    if (matchesEntity(e, sb.entityId, sb.professor))
      out.push({ key: `sb-${sb.id}`, module: "research", kind: "فرصت مطالعاتی", title: sb.topic, role: "استاد مجری", status: sb.stage, amount: sb.budget, link: `/dashboard/research?tab=sabbatical`, subjectId: sb.id });
    else
      sb.applicants.forEach((a) => {
        if (matchesEntity(e, a.entityId, a.name))
          out.push({ key: `sba-${a.id}`, module: "research", kind: "درخواست فرصت مطالعاتی", title: sb.topic, role: "متقاضی", status: a.status, link: `/dashboard/research?tab=sabbatical`, subjectId: sb.id });
      });
  });
  s.tenders.forEach((t) =>
    t.bids.forEach((b) => {
      if (matchesEntity(e, b.entityId, b.name))
        out.push({ key: `tb-${t.id}-${b.id}`, module: "contracts", kind: "پاکت مناقصه", title: t.title, role: t.winnerBidId === b.id ? "برنده" : "شرکت‌کننده", status: t.stage, amount: b.price, link: `/dashboard/contracts?tab=tender`, subjectId: t.id });
    })
  );
  s.awardEntries.forEach((a) => {
    if (a.entityId === e.id) {
      const cyc = s.awardCycles.find((c) => c.id === a.cycleId);
      out.push({ key: `aw-${a.id}`, module: "award", kind: "اثر جایزه", title: `${a.title} (${cyc?.title ?? ""})`, role: "صاحب فناوری / همکار", status: a.status, date: a.createdAt, link: `/dashboard/award`, subjectId: a.id });
    }
  });
  const userName = e.userId ? users.find((u) => u.id === e.userId)?.name : undefined;
  if (userName) {
    s.enrollments.filter((en) => en.user === userName).forEach((en) => {
      const c = s.courses.find((x) => x.id === en.courseId);
      if (c) out.push({ key: `en-${en.id}`, module: "training", kind: "دوره‌ی آموزشی", title: c.title, role: "فراگیر", status: en.certificateNo ? "گواهی‌دار" : "در حال یادگیری", date: en.enrolledAt, link: `/dashboard/training`, subjectId: c.id });
    });
    s.assignments.filter((a) => a.judge === userName).forEach((a) => {
      const en = s.awardEntries.find((x) => x.id === a.entryId);
      if (en) out.push({ key: `ja-${a.id}`, module: "award", kind: "داوری جایزه", title: en.title, role: "داور", status: a.scores ? "داوری‌شده" : a.coi === "دارد" ? "تعارض منافع" : "در انتظار", link: `/dashboard/award?tab=judge`, subjectId: en.id });
    });
  }
  return out;
}

export function entityEvaluations(s: InnStore, e: EcoEntity) {
  const decisions = s.decisions.filter((d) => d.options.some((o) => o.entityId === e.id));
  const outcomes = s.outcomes.filter((o) => o.entityIds.includes(e.id));
  return { decisions, outcomes };
}
