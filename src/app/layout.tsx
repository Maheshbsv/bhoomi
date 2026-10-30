import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// A public demo that asks for phone numbers should not be indexed. Remove this for a real launch.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// The html element is rendered by src/app/[locale]/layout.tsx so that
// the lang attribute follows the active locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
