import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PersonalHub from "./dashboard/PersonalHub";
import { ReportBuilderModal } from "../reports/ModuleReportsButton";
import { reportStore } from "../reports/store";
import { useT } from "../i18n";

/** ?report=<id> (از اعلان گزارش زمان‌بندی‌شده) ← گزارش در گزارش‌ساز باز می‌شود */
function ReportFromLink() {
  const [params, setParams] = useSearchParams();
  const id = params.get("report");
  const spec = id ? reportStore.all().find((r) => r.id === id) : undefined;
  if (!spec) return null;
  const close = () => {
    const n = new URLSearchParams(params);
    n.delete("report");
    setParams(n, { replace: true });
  };
  return <ReportBuilderModal open onClose={close} module={spec.module} initialReportId={spec.id} />;
}

/** «میزکار من» — قهرمان «امروز» جای سرآیند صفحه را می‌گیرد (v6.8)؛ عنوان صفحه همان برچسب منوست */
export default function Dashboard() {
  const title = useT()("میزکار من");
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
  return (
    <div>
      <h1 className="sr-only">{title}</h1>
      <PersonalHub />
      <ReportFromLink />
    </div>
  );
}
