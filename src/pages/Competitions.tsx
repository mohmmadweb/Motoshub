import { useState } from "react";
import { Trophy, Plus, Image as ImageIcon, ThumbsUp, Flag, Swords, Users2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";
import { useToast } from "../components/ui/ToastProvider";
import { useTabParam } from "../lib/useTabParam";

// مسابقات (iiscompetition) + چالش‌ها (iischallenge)
type Competition = {
  id: string;
  title: string;
  category: string;
  deadline: string;
  participants: number;
  status: "ثبت‌نام باز" | "در حال داوری" | "اعلام نتایج";
  prize: string;
  entries: { id: string; by: string; title: string; votes: number; color: string; myVote?: boolean }[];
};

const initialCompetitions: Competition[] = [
  {
    id: "cp1",
    title: "مسابقه عکاسی «صنعت در قاب» — خطوط تولید شرکت‌های بنیاد",
    category: "عکاسی",
    deadline: "۱۴۰۵/۰۵/۲۰",
    participants: 63,
    status: "ثبت‌نام باز",
    prize: "۳ کمک‌هزینه سفر نمایشگاهی",
    entries: [
      { id: "e1", by: "دکتر آرین صدرا", title: "ربات جوشکار خط بدنه", votes: 41, color: "#5e7191" },
      { id: "e2", by: "مهندس پارسا یگانه", title: "برداشت شبانه دشت ناز", votes: 38, color: "#0d9488" },
      { id: "e3", by: "دکتر مهسا نیک‌اندیش", title: "آزمایشگاه کیت تشخیص", votes: 27, color: "#b45309" },
    ],
  },
  {
    id: "cp2",
    title: "مسابقه ایده «یک دقیقه برای بهره‌وری»",
    category: "ویدیوی کوتاه",
    deadline: "۱۴۰۵/۰۴/۲۵",
    participants: 29,
    status: "در حال داوری",
    prize: "اعتبار آموزش تخصصی",
    entries: [],
  },
];

type Challenge = {
  id: string;
  title: string;
  kind: "فردی" | "همگانی";
  category: string;
  joined: number;
  progress?: number;
  status: "فعال" | "پایان‌یافته";
};

const challenges: Challenge[] = [
  { id: "ch1", title: "چالش ۳۰ روز مستندسازی — هر روز یک درس‌آموخته در بانک دانش", kind: "همگانی", category: "مدیریت دانش", joined: 84, progress: 40, status: "فعال" },
  { id: "ch2", title: "چالش کاهش ۱۰٪ مصرف انرژی واحدها", kind: "همگانی", category: "انرژی", joined: 12, progress: 65, status: "فعال" },
  { id: "ch3", title: "چالش فردی: تکمیل پروفایل و مهارت‌ها", kind: "فردی", category: "عمومی", joined: 412, progress: 100, status: "پایان‌یافته" },
];

const compTone: Record<Competition["status"], BadgeTone> = { "ثبت‌نام باز": "success", "در حال داوری": "warning", "اعلام نتایج": "navy" };

export default function Competitions() {
  const [tab, setTab] = useTabParam<"comp" | "challenge">("comp", ["comp", "challenge"]);
  const [comps, setComps] = useState(initialCompetitions);
  const [joined, setJoined] = useState<string[]>(["ch1"]);
  const { notify } = useToast();

  const voteEntry = (cid: string, eid: string) => {
    setComps((prev) =>
      prev.map((c) =>
        c.id === cid
          ? {
              ...c,
              entries: c.entries.map((e) =>
                e.id === eid ? { ...e, votes: e.votes + (e.myVote ? -1 : 1), myVote: !e.myVote } : e
              ),
            }
          : c
      )
    );
  };

  return (
    <div>
      <PageHeader
        title="مسابقات و چالش‌ها"
        description="مسابقات سازمانی با ارسال اثر و رأی‌گیری، و چالش‌های فردی/همگانی با پایش پیشرفت"
        icon={<Trophy size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => notify("فرم تعریف مسابقه/چالش جدید (ویژه راهبران) باز شد.", "info")}>
            مورد جدید
          </Button>
        }
      />
      <Tabs
        tabs={[
          { id: "comp", label: "مسابقات", count: comps.length },
          { id: "challenge", label: "چالش‌ها", count: challenges.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "comp" && (
        <div className="space-y-4">
          {comps.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <p className="text-sm font-bold text-ink-900">{c.title}</p>
                <Badge tone={compTone[c.status]}>{c.status}</Badge>
              </div>
              <p className="text-[11.5px] text-ink-400 mb-3 flex items-center gap-2 flex-wrap">
                <Badge tone="neutral">{c.category}</Badge>
                <span className="flex items-center gap-1"><Users2 size={11} /> {c.participants.toLocaleString("fa-IR")} شرکت‌کننده</span>
                · مهلت ارسال {c.deadline} · جایزه: {c.prize}
              </p>
              {c.entries.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {c.entries.map((e) => (
                    <div key={e.id} className="rounded-lg border border-ink-100 overflow-hidden">
                      <div className="h-24 flex items-center justify-center" style={{ backgroundColor: e.color }} role="img" aria-label={e.title}>
                        <ImageIcon size={22} className="text-white/70" />
                      </div>
                      <div className="p-2.5">
                        <p className="text-[12px] font-medium text-ink-900 truncate">{e.title}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10.5px] text-ink-400 truncate">{e.by}</span>
                          <button
                            onClick={() => voteEntry(c.id, e.id)}
                            className={`flex items-center gap-1 text-[11px] rounded-full border px-2 py-0.5 transition-colors ${
                              e.myVote ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500 hover:border-brand-300"
                            }`}
                          >
                            <ThumbsUp size={11} /> {e.votes.toLocaleString("fa-IR")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {c.status === "ثبت‌نام باز" && (
                <Button variant="secondary" size="sm" onClick={() => notify(`فرم ارسال اثر برای «${c.title}» باز شد.`, "info")}>
                  ارسال اثر
                </Button>
              )}
            </div>
          ))}
          <p className="text-[11px] text-ink-400 leading-5">
            روند: تعریف مسابقه و دسته‌ها ← ثبت‌نام و ارسال اثر ← رأی مردمی و/یا داوری کمیته ← اعلام برگزیدگان.
          </p>
        </div>
      )}

      {tab === "challenge" && (
        <div className="card divide-y divide-ink-100">
          {challenges.map((c) => {
            const isJoined = joined.includes(c.id);
            return (
              <div key={c.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                    {c.kind === "فردی" ? <Flag size={14} className="text-brand-600" /> : <Swords size={14} className="text-brand-600" />}
                    {c.title}
                  </p>
                  <p className="text-[11.5px] text-ink-400 mt-1">
                    {c.kind} · {c.category} · {c.joined.toLocaleString("fa-IR")} شرکت‌کننده
                  </p>
                  {c.progress !== undefined && (
                    <div className="flex items-center gap-2 mt-2 max-w-xs">
                      <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                        <div className={`h-full rounded-full ${c.progress === 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${c.progress}%` }} />
                      </div>
                      <span className="text-[10.5px] text-ink-400">{c.progress.toLocaleString("fa-IR")}٪</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={c.status === "فعال" ? "success" : "neutral"}>{c.status}</Badge>
                  {c.status === "فعال" && (
                    <Button
                      variant={isJoined ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => {
                        setJoined((prev) => (isJoined ? prev.filter((x) => x !== c.id) : [...prev, c.id]));
                        notify(isJoined ? "از چالش خارج شدید." : `به چالش «${c.title}» پیوستید!`, "info");
                      }}
                    >
                      {isJoined ? "عضو هستید" : "پیوستن"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
