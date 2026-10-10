// «تنظیمات پروژه» — منوی «پروژه و فعالیت‌ها» (منوی ۱۴۰۵/۰۷). همان پیش‌فرض‌های سراسری پروژه‌ها که پیش‌تر
// در «تنظیمات سامانه ← پروژه‌ها» بود (?section=projects به اینجا هدایت می‌شود).
import { SlidersHorizontal } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import AccessDenied from "../components/ui/AccessDenied";
import { useTenancy } from "../context/TenancyContext";
import { PROJECT_SETTINGS_PERMS } from "../components/Sidebar";
import ProjectGlobalSettings from "./settings/ProjectGlobalSettings";

export default function ProjectSettingsPage() {
  const { hasPermission } = useTenancy();
  if (!PROJECT_SETTINGS_PERMS.some((p) => hasPermission(p))) return <AccessDenied module="تنظیمات پروژه" />;
  return (
    <div>
      <PageHeader
        title="تنظیمات پروژه"
        description="پیش‌فرض‌های پروژه‌های جدید: تقویم کاری، وضعیت‌ها و انواع کار، جلسات، خودکارسازی، دسترسی عضو تازه و قالب‌ها"
        icon={<SlidersHorizontal size={18} />}
      />
      <ProjectGlobalSettings />
    </div>
  );
}
