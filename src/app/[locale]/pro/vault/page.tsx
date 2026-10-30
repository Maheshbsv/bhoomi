import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { VaultTable } from "@/components/pro/VaultTable";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <VaultTable />;
}
