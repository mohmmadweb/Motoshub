// ---------------------------------------------------------------------------
// «پیشنهادی» — F01 تب «نظرسنجی‌های من» در داشبورد شخصی (PersonalHub)
// فهرست نظرسنجی‌های ساخته‌شده و شرکت‌کرده + «نظرسنجی جدید» (پرسش با هشتگ و منشن — ۱.۹.۶)
// API: GET /core/polls/my/?filter=created|participated · POST /core/polls/ («پیشنهادی»)
// منوی جداگانه ندارد؛ نظرسنجی‌ها فقط درون نگارشگرها ساخته می‌شوند.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { BarChart3, Plus } from "lucide-react";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import { useSocial } from "../../../context/SocialContext";
import { endpoints } from "../../../social/endpoints";
import { ApiChip, fa } from "../kit";
import PollCard from "./PollCard";
import PollComposer from "./PollComposer";

export default function MyPollsPanel() {
  const s = useSocial();
  const { created, participated } = s.myPolls();
  const [tab, setTab] = useState<"created" | "participated">(created.length || !participated.length ? "created" : "participated");
  const [composing, setComposing] = useState(false);
  const [limit, setLimit] = useState(4);
  const enabled = s.setting("core.polls.enabled") !== false;
  const list = tab === "created" ? created : participated;
  const open = (ps: typeof created) => ps.filter((p) => s.pollView(p.id)?.closed === false).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50">
          {(
            [
              ["created", `ساخته‌شده (${fa(created.length)})`],
              ["participated", `شرکت‌کرده (${fa(participated.length)})`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => (setTab(id), setLimit(4))} className={`text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap ${tab === id ? "bg-white text-brand-700 font-medium shadow-sm" : "text-ink-500 hover:text-ink-800"}`}>
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-ink-400">{fa(open(list))} در جریان</span>
        <span className="mr-auto flex items-center gap-1.5">
          <ApiChip
            items={[
              { label: "نظرسنجی‌های من", ep: endpoints.pollMine() },
              { label: "ساخت نظرسنجی", ep: endpoints.pollCreate() },
              { label: "جزئیات", ep: endpoints.pollGet("{id}") },
              { label: "رأی", ep: endpoints.pollVote("{id}") },
              { label: "بستن", ep: endpoints.pollClose("{id}") },
              { label: "بازگشایی", ep: endpoints.pollReopen("{id}") },
              { label: "رأی‌دهندگان", ep: endpoints.pollVoters("{id}") },
              { label: "خروجی اکسل", ep: endpoints.pollExport("{id}") },
              { label: "حذف", ep: endpoints.pollDelete("{id}") },
            ]}
          />
          {enabled && (
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setComposing(true)}>
              نظرسنجی جدید
            </Button>
          )}
        </span>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<BarChart3 size={22} />} title={tab === "created" ? "هنوز نظرسنجی نساخته‌اید" : "در نظرسنجی‌ای شرکت نکرده‌اید"} description={tab === "created" ? "در هر گروه یا کانال، دکمه‌ی «نظرسنجی» کنار پیوست را بزنید." : "نظرسنجی‌های گروه‌ها و کانال‌ها در گفتگوها دیده می‌شوند."} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {list.slice(0, limit).map((p) => (
            <PollCard key={p.id} pollId={p.id} showSource />
          ))}
        </div>
      )}
      {list.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + 6)} className="text-xs text-brand-700 hover:underline">
          نمایش {fa(Math.min(6, list.length - limit))} مورد دیگر
        </button>
      )}

      <PollComposer open={composing} onClose={() => setComposing(false)} onCreated={() => setTab("created")} />
    </div>
  );
}
