import { useState } from "react";
import { CalendarDays, MapPin, Users, Hash, Plus, Calendar } from "lucide-react";
import { events } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function Events() {
  const [calendar, setCalendar] = useState<"jalali" | "gregorian">("jalali");

  return (
    <div>
      <PageHeader
        title="رویدادها و جلسات"
        description="انتشار رویداد، دعوت از کاربران و مدیریت اسناد جلسات"
        icon={<CalendarDays size={18} />}
        actions={
          <>
            <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1">
              <button
                onClick={() => setCalendar("jalali")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 ${calendar === "jalali" ? "bg-white shadow text-brand-700" : "text-ink-500"}`}
              >
                <Calendar size={12} /> شمسی
              </button>
              <button
                onClick={() => setCalendar("gregorian")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${calendar === "gregorian" ? "bg-white shadow text-brand-700" : "text-ink-500"}`}
              >
                میلادی
              </button>
            </div>
            <Button variant="primary" icon={<Plus size={15} />}>
              رویداد جدید
            </Button>
          </>
        }
      />

      <div className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className="card p-4 flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-navy-900 text-white flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] text-navy-300">{calendar === "jalali" ? e.jalaliDate.split("/")[1] : e.date.split("-")[1]}</span>
              <span className="text-base font-bold leading-tight">{calendar === "jalali" ? e.jalaliDate.split("/")[2] : e.date.split("-")[2]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-ink-900">{e.title}</h3>
              <p className="text-xs text-ink-500 mt-1 leading-6">{e.description}</p>
              <div className="flex items-center gap-4 mt-2.5 text-[11px] text-ink-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} /> {calendar === "jalali" ? e.jalaliDate : e.date} · {e.time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {e.location}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} /> {e.attendees} شرکت‌کننده
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {e.hashtags.map((h) => (
                  <Badge key={h} tone="neutral" icon={<Hash size={10} />}>
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="secondary" size="sm">
              دعوت‌نامه
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
