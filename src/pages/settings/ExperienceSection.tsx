// «تنظیمات سامانه ← برند و ظاهر ← ابزارک‌ها و راهنما» — تنظیمات راهبری F16 (اجرای خودکار تور).
import { LayoutGrid } from "lucide-react";
import { TourAdminCard } from "../../components/GuidedTour";
import { SectionHead } from "./iam/shared";

export default function ExperienceSection() {
  return (
    <div className="space-y-4">
      <SectionHead icon={<LayoutGrid size={18} />} title="ابزارک‌ها و راهنما" description="تور محصول برای کاربران تازه‌وارد." />
      <TourAdminCard />
    </div>
  );
}
