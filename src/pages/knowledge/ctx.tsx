import { createContext, useContext } from "react";
import type { KDoc, KRelation } from "../../km/types";
import type { KSection } from "./shared";

type KPage = {
  openDoc: (id: string) => void;
  newDoc: (categoryId?: string) => void;
  editDoc: (d: KDoc) => void;
  openTaxonomy: () => void;
  go: (s: KSection, focus?: string) => void;
  openRelation: (r: KRelation) => void;
  focus?: string;
};

export const KPageContext = createContext<KPage | null>(null);
export function useKPage() {
  const c = useContext(KPageContext);
  if (!c) throw new Error("useKPage outside knowledge page");
  return c;
}
