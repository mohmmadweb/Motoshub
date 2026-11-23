import type { ReactNode } from "react";
import Sheet from "./Sheet";

/**
 * نام قدیمی برگه‌ی کناری — برای سازگاری با صفحه‌های موجود؛ همان `Sheet` v6.8 را رندر می‌کند.
 * فراخوانی‌های جدید مستقیم از `Sheet` استفاده کنند.
 */
export default function Drawer({
  open,
  onClose,
  title,
  children,
  width,
  eyebrow,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  eyebrow?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} width={width} eyebrow={eyebrow} footer={footer}>
      {children}
    </Sheet>
  );
}
