import type { ReactNode } from "react";
import "./globals.css";

// The html element is rendered by src/app/[locale]/layout.tsx so that
// the lang attribute follows the active locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
