// دکمه‌ی «دنبال کردن» — برای افراد (F08، جدا از «درخواست ارتباط»؛ بدون نیاز به تأیید) و موضوعات
// پرسش و پاسخ (F06). کاربر بدون مجوز دکمه را نمی‌بیند. قرارداد مشترک: { kind, id }.
import type { MouseEvent } from "react";
import { Bell, BellOff, BellRing, Check, Plus, Rss } from "lucide-react";
import { useTenancy } from "../../context/TenancyContext";
import { useInbox } from "../../context/InboxContext";
import { useToast } from "../../components/ui/ToastProvider";
import { users } from "../../data/mock";
import { useFollows } from "./store";

type Props = {
  kind: "user" | "topic";
  id: string;
  /** button = دکمه‌ی متنی · icon = فقط آیکن (کارت‌ها) · link = متن کوچک */
  variant?: "button" | "icon" | "link";
  /** نمایش شمار دنبال‌کنندگان کنار دکمه */
  showCount?: boolean;
  className?: string;
};

/** مجوز دنبال‌کردن: افراد ← relations.use · موضوع ← forum.list */
export function useCanFollow(kind: "user" | "topic") {
  const { hasPermission, readOnly } = useTenancy();
  return !readOnly && (kind === "user" ? hasPermission("relations.follow") || hasPermission("relations.use") : hasPermission("forum.follow") || hasPermission("forum.list"));
}

export function FollowButton({ kind, id, variant = "button", showCount = false, className = "" }: Props) {
  const f = useFollows();
  const inbox = useInbox();
  const { actingUser } = useTenancy();
  const { notify } = useToast();
  const can = useCanFollow(kind);
  if (!can || (kind === "user" && id === f.me)) return null;

  const on = kind === "user" ? f.isFollowing(id) : f.isFollowingTopic(id);
  const count = kind === "user" ? f.followers(id).length : f.topicFollowers(id).length;
  const name = kind === "user" ? users.find((u) => u.id === id)?.name ?? "" : "";

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (kind === "user") {
      f.follow(id, !on);
      if (!on) {
        inbox.send([name], "follow", `«${actingUser.name}» شما را دنبال می‌کند.`, `/dashboard/profile/${actingUser.id}`);
        notify(`«${name}» را دنبال می‌کنید؛ محتوای عمومی او در داشبوردتان می‌آید.`, "success");
      } else notify(`دنبال‌کردن «${name}» لغو شد.`, "info");
    } else {
      f.followTopic(id, !on);
      notify(on ? "دنبال‌کردن این موضوع لغو شد." : "موضوع دنبال شد؛ از پاسخ‌ها و تغییرات آن باخبر می‌شوید.", on ? "info" : "success");
    }
  };

  const label = on ? "دنبال می‌کنید" : "دنبال کردن";
  const title = on ? (kind === "user" ? "لغو دنبال‌کردن" : "لغو دنبال‌کردن موضوع") : kind === "user" ? "دنبال‌کردن بدون نیاز به تأیید — محتوای عمومی او در داشبورد شما" : "دنبال‌کردن — اعلان پاسخ‌ها و تغییرات این موضوع";
  const countEl = showCount && count > 0 && <span className={`text-[10.5px] rounded-full px-1.5 ${on ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}>{count.toLocaleString("fa-IR")}</span>;

  if (variant === "icon")
    return (
      <button type="button" onClick={toggle} title={title} aria-label={`${label}${name ? ` — ${name}` : ""}`} aria-pressed={on} className={`h-8 min-w-8 px-2 rounded-lg border flex items-center justify-center gap-1 shrink-0 transition-colors ${on ? "border-brand-200 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500 hover:text-brand-700 hover:border-brand-300"} ${className}`}>
        {kind === "topic" ? on ? <BellRing size={14} /> : <Bell size={14} /> : on ? <Check size={14} /> : <Rss size={14} />}
        {countEl}
      </button>
    );
  if (variant === "link")
    return (
      <button type="button" onClick={toggle} title={title} aria-pressed={on} className={`text-[11px] flex items-center gap-0.5 ${on ? "text-brand-700" : "text-ink-500 hover:text-brand-700"} ${className}`}>
        {on ? <Check size={11} /> : <Plus size={11} />} {on ? "دنبال‌شده" : "دنبال"}
      </button>
    );
  return (
    <button type="button" onClick={toggle} title={title} aria-pressed={on} className={`h-8 px-2.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 shrink-0 transition-colors ${on ? "border-brand-200 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700"} ${className}`}>
      {kind === "topic" ? on ? <BellRing size={13} /> : <Bell size={13} /> : on ? <Check size={13} /> : <Rss size={13} />}
      {label}
      {countEl}
    </button>
  );
}

/** کلید کوچک اعلانِ موضوع دنبال‌شده (topic_follow.notify) */
export function TopicNotifyToggle({ topicId }: { topicId: string }) {
  const f = useFollows();
  const tf = f.topicFollow(topicId);
  const { notify } = useToast();
  if (!tf) return null;
  return (
    <button
      type="button"
      onClick={() => {
        f.setTopicNotify(topicId, !tf.notify);
        notify(tf.notify ? "اعلان این موضوع خاموش شد؛ فعالیت‌ها فقط در داشبورد دیده می‌شوند." : "اعلان این موضوع روشن شد.", "info");
      }}
      title={tf.notify ? "خاموش‌کردن اعلان این موضوع" : "روشن‌کردن اعلان این موضوع"}
      aria-label={tf.notify ? "خاموش‌کردن اعلان این موضوع" : "روشن‌کردن اعلان این موضوع"}
      aria-pressed={tf.notify}
      className="h-8 w-8 rounded-lg border border-ink-200 text-ink-500 hover:text-brand-700 flex items-center justify-center shrink-0"
    >
      {tf.notify ? <Bell size={13} /> : <BellOff size={13} />}
    </button>
  );
}

export default FollowButton;
