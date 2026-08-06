import type { ReactNode } from "react";
import { useTenancy } from "../context/TenancyContext";
import AccessDenied from "./ui/AccessDenied";

/**
 * گاردِ سطح-مسیر: اگر نقشِ کاربر مجوزِ دیدنِ ماژول را نداشته باشد، به‌جای صفحه
 * «دسترسی ندارید» نمایش داده می‌شود — حتی با ورودِ مستقیم از طریق URL.
 */
export default function RequirePerm({ perm, module, children }: { perm: string; module: string; children: ReactNode }) {
  const { hasPermission } = useTenancy();
  if (!hasPermission(perm)) return <AccessDenied module={module} />;
  return <>{children}</>;
}
