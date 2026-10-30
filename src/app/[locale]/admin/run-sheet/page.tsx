import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { RunSheet } from "@/components/admin/RunSheet";

export default function RunSheetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <RunSheet />;
}
