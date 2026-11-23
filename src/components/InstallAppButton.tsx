// ---------------------------------------------------------------------------
// دکمه‌ی «نصب اپلیکیشن» — روی Chrome/Edge/Android پنجره‌ی نصب مرورگر را باز می‌کند
// (beforeinstallprompt که src/pwa.ts نگه داشته)، روی iOS راهنمای «افزودن به صفحه‌ی اصلی»
// را نشان می‌دهد و وقتی اپ نصب‌شده اجرا می‌شود چیزی نمایش نمی‌دهد.
// ---------------------------------------------------------------------------
import { useState, useSyncExternalStore } from "react";
import { Download, MoreVertical, PlusSquare, Share } from "lucide-react";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import { useToast } from "./ui/ToastProvider";
import { getInstallState, promptInstall, subscribeInstall } from "../pwa";

export default function InstallAppButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, getInstallState);
  const [help, setHelp] = useState(false);
  const { notify } = useToast();

  if (state.installed) return null;

  const onClick = async () => {
    if (state.canPrompt) {
      const r = await promptInstall();
      if (r === "accepted") notify("کاریز روی دستگاه شما نصب شد.", "success");
      return;
    }
    setHelp(true);
  };

  return (
    <>
      {compact ? (
        <button onClick={onClick} className={`flex items-center gap-2.5 text-[14px] text-ink-800 hover:bg-ink-50 text-start ${className}`}>
          <Download size={18} className="text-ink-500" /> نصب اپلیکیشن
        </button>
      ) : (
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={onClick} className={className}>
          نصب اپلیکیشن
        </Button>
      )}

      <Modal open={help} onClose={() => setHelp(false)} title="نصب کاریز روی دستگاه" description="کاریز مثل یک اپلیکیشن روی صفحه‌ی اصلی می‌نشیند و تمام‌صفحه باز می‌شود.">
        {state.ios ? (
          <ol className="space-y-3 text-[13px] text-ink-700 leading-6">
            <li className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 text-[12px] font-bold">۱</span>
              <span>
                در Safari دکمه‌ی <Share size={14} className="inline text-brand-600 mx-0.5" /> «اشتراک‌گذاری» پایین صفحه را بزنید.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 text-[12px] font-bold">۲</span>
              <span>
                گزینه‌ی <PlusSquare size={14} className="inline text-brand-600 mx-0.5" /> «Add to Home Screen / افزودن به صفحه‌ی اصلی» را انتخاب کنید.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 text-[12px] font-bold">۳</span>
              <span>نام «کاریز» را تأیید کنید و «Add» را بزنید.</span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-[13px] text-ink-700 leading-6">
            <li className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 text-[12px] font-bold">۱</span>
              <span>
                در Chrome یا Edge منوی <MoreVertical size={14} className="inline text-brand-600 mx-0.5" /> مرورگر را باز کنید.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 text-[12px] font-bold">۲</span>
              <span>«نصب کاریز» یا «Install app / Add to Home screen» را انتخاب کنید.</span>
            </li>
            <li className="text-[12px] text-ink-500">اگر این گزینه دیده نمی‌شود، مرورگر شما از نصب اپ وب پشتیبانی نمی‌کند (مثلاً Firefox دسکتاپ).</li>
          </ol>
        )}
        <div className="flex justify-end mt-5">
          <Button variant="primary" onClick={() => setHelp(false)}>
            متوجه شدم
          </Button>
        </div>
      </Modal>
    </>
  );
}
