import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { BulkGrid } from "@/components/pro/BulkGrid";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <BulkGrid />;
}
