import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { OverviewStats } from "@/components/admin/OverviewStats";

export default function OverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <OverviewStats />;
}
