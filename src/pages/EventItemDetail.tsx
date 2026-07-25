import { useParams } from "react-router-dom";
import { CalendarDays, MapPin, Users, Hash, Send, Video, ExternalLink } from "lucide-react";
import { useContent } from "../context/ContentContext";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { VisibilityToggle, VisibilityBadge } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";

export default function EventItemDetail() {
  const { id } = useParams();
  const { events, setEvents } = useContent();
  const { notify } = useToast();
  const event = events.find((e) => e.id === id);

  if (!event) return (
    <div className="card p-8 text-center text-sm text-ink-400">رویداد پیدا نشد.</div>
  );

  const toggleVisibility = () => {
    const next = event.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, visibility: next } : e));
    notify(`«${event.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <PageHeader
        title={event.title}
        breadcrumb={[{ label: "رویدادها و جلسات", to: "/dashboard/events" }, { label: event.title }]}
        icon={<CalendarDays size={18} />}
        actions={
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={event.visibility} />
            <VisibilityToggle visibility={event.visibility} onChange={toggleVisibility} size="sm" />
          </div>
        }
      />

      <div className="max-w-3xl space-y-4">
        <div className="card p-6">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-20 h-20 rounded-xl bg-navy-900 text-white flex flex-col items-center justify-center shrink-0">
              <span className="text-xs text-navy-300">{event.jalaliDate.split("/")[1] ?? "—"}</span>
              <span className="text-2xl font-extrabold leading-tight">{event.jalaliDate.split("/")[2] ?? "—"}</span>
              <span className="text-[10px] text-navy-400">{event.jalaliDate.split("/")[0]}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink-900 mb-3 leading-8">{event.title}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-ink-600">
                  <CalendarDays size={15} className="text-brand-600 shrink-0" />
                  <span>{event.jalaliDate} · {event.time}</span>
                </div>
                <div className="flex items-center gap-2 text-ink-600">
                  <MapPin size={15} className="text-brand-600 shrink-0" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-ink-600">
                  <Users size={15} className="text-brand-600 shrink-0" />
                  <span>{event.attendees} شرکت‌کننده</span>
                </div>
                <div className="flex items-center gap-2 text-ink-600">
                  {event.mode === "آنلاین" ? <Video size={15} className="text-brand-600 shrink-0" /> : <MapPin size={15} className="text-brand-600 shrink-0" />}
                  <Badge tone={event.mode === "آنلاین" ? "brand" : "navy"}>{event.mode}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {event.mode === "آنلاین" && event.joinLink && (
                  <a href={event.joinLink} target="_blank" rel="noopener noreferrer" className="btn bg-brand-600 text-white hover:bg-brand-700 text-xs px-3.5 py-2">
                    <Video size={13} /> ورود به جلسه آنلاین <ExternalLink size={11} />
                  </a>
                )}
                {event.mode === "حضوری" && event.mapUrl && (
                  <a href={event.mapUrl} target="_blank" rel="noopener noreferrer" className="btn bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 text-xs px-3.5 py-2">
                    <MapPin size={13} /> مشاهده روی نقشه گوگل <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-ink-700 leading-8 mb-4">{event.description}</p>

          {event.hashtags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {event.hashtags.map((h) => (
                <Badge key={h} tone="neutral" icon={<Hash size={10} />}>{h}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-600 mb-3">ارسال سوال یا نظر</p>
          <div className="flex items-center gap-2">
            <input className="input-field flex-1" placeholder="سوال یا نظر خود را درباره این رویداد بنویسید…" />
            <Button variant="primary" icon={<Send size={14} />}>ارسال</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
