import { Building2, Globe2, Network } from "lucide-react";
import Badge from "./Badge";
import { useTenancy } from "../../context/TenancyContext";
import type { ContentScope, Scoped } from "../../data/tenancy";

const scopeIcon: Record<ContentScope, typeof Globe2> = { سراسری: Globe2, هلدینگ: Network, شرکت: Building2 };
const scopeTone = { سراسری: "brand", هلدینگ: "navy", شرکت: "warning" } as const;

/** برچسب فشرده‌ی مالکِ یک آیتم — برای ردیف‌ها و کارت‌های فهرست */
export function ScopeBadge({ item }: { item: Scoped }) {
  const { ownerLabel } = useTenancy();
  const scope = item.scope ?? "سراسری";
  const Icon = scopeIcon[scope];
  return (
    <Badge tone={scopeTone[scope]} icon={<Icon size={10} />}>
      {ownerLabel(item)}
    </Badge>
  );
}
