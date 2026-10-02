// بخش «توسعه» در جزئیات تسک — شاخه‌ها، کامیت‌ها و درخواست‌های ادغامی که نامشان کلید تسک را دارد
// (شبیه‌سازی‌شده + ورودی‌های GitLab/GitHub از اتصال‌های کارکرد). پیوندها فقط برچسب‌اند.
import { useState } from "react";
import { GitBranch, GitCommitHorizontal, GitPullRequest, GitMerge, Copy, ExternalLink } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { fa } from "../../pm/jalali";
import { mrStateLabel, type GitActivity, type MRState } from "../../pm/git";
import type { PMTask, ProjectState } from "../../pm/types";

const mrTone: Record<MRState, "success" | "brand" | "neutral" | "danger"> = { merged: "success", open: "brand", draft: "neutral", closed: "danger" };
const providerLabel = { gitlab: "GitLab", github: "GitHub" } as const;

export default function DevSection({ t, activity }: { p: ProjectState; t: PMTask; activity: GitActivity }) {
  const { notify } = useToast();
  const [all, setAll] = useState(false);
  const { branches, commits, mrs } = activity;
  const branchName = `feature/${t.key}-…`;
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    notify("در حافظه کپی شد.", "info");
  };
  const empty = !branches.length && !commits.length && !mrs.length;
  const shown = all ? commits : commits.slice(0, 5);

  return (
    <div className="space-y-4">
      <p className="text-[11.5px] text-ink-500 leading-5">
        هر شاخه، کامیت یا درخواست ادغامی که کلید <span className="font-mono text-ink-700" dir="ltr">{t.key}</span> را در نام یا پیام داشته باشد این‌جا دیده می‌شود (اتصال شبیه‌سازی‌شده‌ی GitLab/GitHub).
      </p>
      {empty && (
        <div className="rounded-lg border border-dashed border-ink-200 p-4 text-center space-y-2">
          <p className="text-xs text-ink-500">هنوز فعالیت توسعه‌ای برای این تسک ثبت نشده است.</p>
          <button type="button" onClick={() => copy(`git checkout -b feature/${t.key}`)} className="text-[11.5px] text-brand-700 hover:underline inline-flex items-center gap-1">
            <Copy size={12} /> کپی دستور ساخت شاخه <span className="font-mono" dir="ltr">{branchName}</span>
          </button>
        </div>
      )}

      {mrs.length > 0 && (
        <div>
          <p className="text-xs font-bold text-ink-700 mb-1.5 flex items-center gap-1.5">
            <GitPullRequest size={13} /> درخواست‌های ادغام ({fa(mrs.length)})
          </p>
          <div className="space-y-1.5">
            {mrs.map((m) => (
              <div key={`${m.repo}${m.id}`} className="rounded-lg border border-ink-100 p-2.5 flex items-center gap-2 flex-wrap">
                {m.state === "merged" ? <GitMerge size={14} className="text-emerald-600 shrink-0" /> : <GitPullRequest size={14} className="text-brand-600 shrink-0" />}
                <span className="font-mono text-[11px] text-ink-500 shrink-0" dir="ltr">
                  {m.id}
                </span>
                <span className="text-xs text-ink-800 flex-1 min-w-[140px] truncate" title={m.title}>
                  {m.title}
                </span>
                <Badge tone={mrTone[m.state]}>{mrStateLabel[m.state]}</Badge>
                <span className="text-[10.5px] text-ink-400 w-full sm:w-auto">
                  <span className="font-mono" dir="ltr">
                    {m.source} → {m.target}
                  </span>{" "}
                  · {m.author} · {m.date}
                  {m.approvals ? ` · ${fa(m.approvals)} تأیید` : ""}
                </span>
                <span className="text-[10.5px] text-ink-400 inline-flex items-center gap-0.5" title="پیوند بیرونی (نمایشی)">
                  <ExternalLink size={11} /> {providerLabel[m.provider]} · {m.repo}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {branches.length > 0 && (
        <div>
          <p className="text-xs font-bold text-ink-700 mb-1.5 flex items-center gap-1.5">
            <GitBranch size={13} /> شاخه‌ها ({fa(branches.length)})
          </p>
          {branches.map((b) => (
            <div key={b.name} className="rounded-lg border border-ink-100 p-2.5 flex items-center gap-2 flex-wrap text-xs">
              <span className="font-mono text-ink-800 truncate flex-1 min-w-[160px]" dir="ltr">
                {b.name}
              </span>
              <span className="text-[10.5px] text-ink-400">
                {fa(b.ahead)} کامیت جلوتر از develop · {b.updated}
              </span>
              <button type="button" onClick={() => copy(b.name)} className="p-1 text-ink-400 hover:text-brand-700" aria-label="کپی نام شاخه" title="کپی نام شاخه">
                <Copy size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {commits.length > 0 && (
        <div>
          <p className="text-xs font-bold text-ink-700 mb-1.5 flex items-center gap-1.5">
            <GitCommitHorizontal size={13} /> کامیت‌ها ({fa(commits.length)})
          </p>
          <div className="rounded-lg border border-ink-100 divide-y divide-ink-100">
            {shown.map((c, i) => (
              <div key={`${c.sha}-${i}`} className="p-2 flex items-center gap-2 text-xs flex-wrap">
                <span className="font-mono text-[11px] text-brand-700 shrink-0" dir="ltr">
                  {c.sha}
                </span>
                <span className="flex-1 min-w-[140px] truncate text-ink-800" title={c.message}>
                  {c.message}
                </span>
                <span className="text-[10.5px] text-ink-400 shrink-0">
                  {c.author} · {c.date}
                </span>
                {c.source === "timesheet" && <Badge tone="navy">از کارکرد</Badge>}
              </div>
            ))}
          </div>
          {commits.length > 5 && (
            <button type="button" onClick={() => setAll((v) => !v)} className="text-[11.5px] text-brand-700 hover:underline mt-1">
              {all ? "نمایش کمتر" : `نمایش همه (${fa(commits.length)})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
