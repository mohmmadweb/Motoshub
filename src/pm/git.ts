// ---------------------------------------------------------------------------
// «توسعه» در سطح تسک (شبیه‌سازی‌شده) — شاخه‌ها، کامیت‌ها و درخواست‌های ادغام که نامشان
// کلید تسک (مثل QGJ-12) را دارد. داده به‌صورت قطعی از کلید تسک ساخته می‌شود (هر بار همان)
// و کامیت/PR های واردشده از اتصال GitLab/GitHub کارکرد هم اگر کلید را داشته باشند اضافه می‌شوند.
// در محصول واقعی این‌ها از Webhook مخزن می‌آیند.
// ---------------------------------------------------------------------------
import { addDays, dayNum, fa } from "./jalali";
import { isDone, kindOf } from "./selectors";
import type { PMTask, ProjectState } from "./types";

export type GitProvider = "gitlab" | "github";
export type GitBranch = { name: string; repo: string; provider: GitProvider; ahead: number; updated: string };
export type GitCommit = { sha: string; message: string; author: string; date: string; repo: string; provider: GitProvider; source: "repo" | "timesheet" };
export type MRState = "open" | "merged" | "draft" | "closed";
export type GitMR = { id: string; title: string; state: MRState; repo: string; provider: GitProvider; source: string; target: string; author: string; date: string; approvals: number };
export type GitActivity = { branches: GitBranch[]; commits: GitCommit[]; mrs: GitMR[] };

export const mrStateLabel: Record<MRState, string> = { open: "باز", merged: "ادغام‌شده", draft: "پیش‌نویس", closed: "بسته" };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

const slug = (title: string) =>
  title
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join("-")
    .toLowerCase() || "task";

const verbs = ["پیاده‌سازی", "اصلاح", "بازآرایی", "افزودن آزمون برای", "به‌روزرسانی", "مستندسازی"];

/** مخزن پیش‌فرض پروژه: «motoshub/<کلید پروژه>» */
export const repoOf = (p: ProjectState) => `motoshub/${(p.meta.key ?? p.meta.id).toLowerCase()}`;

type ExtEntry = { description: string; externalRef?: string; externalProject?: string; date: string; source: string; personId: string; projectId?: string; taskId?: string; id?: string };

/** فعالیت توسعه‌ی یک تسک — شبیه‌سازی قطعی + ورودی‌های GitLab/GitHub کارکرد که کلید تسک را دارند */
export function gitActivity(p: ProjectState, t: PMTask, ext: ExtEntry[] = [], personName: (id: string) => string = (x) => x): GitActivity {
  const key = t.key;
  if (!key) return { branches: [], commits: [], mrs: [] };
  const r = rng(hash(`${p.meta.id}:${key}`));
  const kind = kindOf(p, t.status);
  const started = !["backlog", "todo"].includes(kind);
  const done = isDone(p, t);
  const repo = repoOf(p);
  const provider: GitProvider = hash(p.meta.id) % 2 ? "gitlab" : "github";
  const author = t.assignee && t.assignee !== "بدون مسئول" ? t.assignee : p.meta.manager;
  const base = dayNum(t.start) !== null ? t.start : p.meta.start;
  const out: GitActivity = { branches: [], commits: [], mrs: [] };
  if (started || done || t.progress > 0) {
    const prefix = t.type === "bug" ? "fix" : "feature";
    const branch = `${prefix}/${key}-${slug(t.title)}`;
    const n = 2 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      out.commits.push({
        sha: Math.floor(r() * 0xfffffff).toString(16).padStart(7, "0"),
        message: `${key}: ${verbs[Math.floor(r() * verbs.length)]} ${t.title}`,
        author,
        date: addDays(base, Math.min(i, Math.max(0, (dayNum(t.due) ?? 0) - (dayNum(base) ?? 0)))),
        repo,
        provider,
        source: "repo",
      });
    }
    if (!done) out.branches.push({ name: branch, repo, provider, ahead: n, updated: out.commits[out.commits.length - 1].date });
    if (kind === "review" || done) {
      out.mrs.push({
        id: `${provider === "gitlab" ? "!" : "#"}${fa(10 + Math.floor(r() * 180))}`,
        title: `${key} ${t.title}`,
        state: done ? "merged" : r() > 0.7 ? "draft" : "open",
        repo,
        provider,
        source: branch,
        target: "develop",
        author,
        date: out.commits[out.commits.length - 1].date,
        approvals: done ? 2 : Math.floor(r() * 2),
      });
    }
  }
  // ورودی‌های واقعی از اتصال GitLab/GitHub کارکرد
  const k = key.toUpperCase();
  ext
    .filter((e) => (e.source === "gitlab" || e.source === "github") && ((e.projectId === p.meta.id && e.taskId === t.id) || `${e.description} ${e.externalRef ?? ""}`.toUpperCase().includes(k)))
    .forEach((e, i) => {
      const ref = e.externalRef ?? "";
      const extRepo = e.externalProject || ref.split(/[#!@]/)[0] || repo;
      const isMr = /!\d+/.test(ref) || /(merge|pull request|درخواست ادغام)/i.test(e.description);
      if (isMr) out.mrs.push({ id: ref.match(/[!#]\d+/)?.[0] ?? `ext-${i}`, title: e.description, state: "open", repo: extRepo, provider: e.source as GitProvider, source: `feature/${key}`, target: "develop", author: personName(e.personId), date: e.date, approvals: 0 });
      else out.commits.push({ sha: ref.match(/[#@][\w]+$/)?.[0] ?? (e.id ?? `ext${i}`).slice(-7), message: e.description, author: personName(e.personId), date: e.date, repo: extRepo, provider: e.source as GitProvider, source: "timesheet" });
    });
  out.commits.sort((a, b) => (dayNum(b.date) ?? 0) - (dayNum(a.date) ?? 0));
  return out;
}
