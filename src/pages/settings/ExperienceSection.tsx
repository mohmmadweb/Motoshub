// «تنظیمات سامانه ← برند و ظاهر ← ابزارک‌ها و راهنما» — تنظیمات راهبری F16 (اجرای خودکار تور)
// و F17 (روشن/خاموش ابزارک اوقات شرعی برای کل سامانه + شهر پیش‌فرض).
import { LayoutGrid } from "lucide-react";
import { TourAdminCard } from "../../components/GuidedTour";
import { PrayerAdminCard } from "../../components/PrayerTimes";
import { SectionHead } from "./iam/shared";

export default function ExperienceSection() {
  return (
    <div className="space-y-4">
      <SectionHead icon={<LayoutGrid size={18} />} title="ابزارک‌ها و راهنما" description="تور محصول برای کاربران تازه‌وارد و ابزارک اوقات شرعی در میز کار." />
      <TourAdminCard />
      <PrayerAdminCard />
    </div>
  );
}
