import type { ReactNode } from "react";
import { StoreGate } from "@/data/provider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <StoreGate>{children}</StoreGate>;
}
