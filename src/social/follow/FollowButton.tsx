// دکمه‌ی «دنبال کردن» موضوعات پرسش و پاسخ (F06). کاربر بدون مجوز دکمه را نمی‌بیند.
import type { MouseEvent } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useTenancy } from "../../context/TenancyContext";
import { useToast } from "../../components/ui/ToastProvider";
import { useTopicFollows } from "./store";

type Props = {
  /** فقط «topic» — دنبال‌کردن افراد حذف شده است */
  kind?: "topic";
  id: string;
  /** button = دکمه‌ی متنی · icon = فقط آیکن */
  variant?: "button" | "icon";
  /** نمایش شمار دنبال‌کنندگان کنار دکمه */
  showCount?: boolean;
  className?: string;
};

/** مجوز دنبال‌کردن موضوع: forum.follow یا forum.list */
export function useCanFollowTopic() {
  const { hasPermission, readOnly } = useTenancy();
  return !readOnly && (hasPermission("forum.follow") || hasPermission("forum.list"));
}

export function FollowButton({ id, variant = "button", showCount = false, className = "" }: Props) {
  const f = useTopicFollows();
  const { notify } = useToast();
  const can = useCanFollowTopic();
  if (!can) return null;

  const on = f.isFollowingTopic(id);
  const count = f.topicFollowers(id).length;

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    f.followTopic(id, !on);
    notify(on ? "دنبال‌کردن این موضوع لغو شد." : "موضوع دنبال شد؛ از پاسخ‌ها و تغییرات آن باخبر می‌شوید.", on ? "info" : "success");
  };

  const label = on ? "دنبال می‌کنید" : "دنبال کردن";
  const title = on ? "لغو دنبال‌کردن موضوع" : "دنبال‌کردن — اعلان پاسخ‌ها و تغییرات این موضوع";
  const countEl = showCount && count > 0 && <span className={`text-[10.5px] rounded-full px-1.5 ${on ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}>{count.toLocaleString("fa-IR")}</span>;

  if (variant === "icon")
    return (
      <button type="button" onClick={toggle} title={title} aria-label={label} aria-pressed={on} className={`h-8 min-w-8 px-2 rounded-lg border flex items-center justify-center gap-1 shrink-0 transition-colors ${on ? "border-brand-200 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500 hover:text-brand-700 hover:border-brand-300"} ${className}`}>
        {on ? <BellRing size={14} /> : <Bell size={14} />}
        {countEl}
      </button>
    );
  return (
    <button type="button" onClick={toggle} title={title} aria-pressed={on} className={`h-8 px-2.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 shrink-0 transition-colors ${on ? "border-brand-200 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700"} ${className}`}>
      {on ? <BellRing size={13} /> : <Bell size={13} />}
      {label}
      {countEl}
    </button>
  );
}

/** کلید کوچک اعلانِ موضوع دنبال‌شده (topic_follow.notify) */
export function TopicNotifyToggle({ topicId }: { topicId: string }) {
  const f = useTopicFollows();
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
