import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { MatterList } from "@/components/pro/MatterList";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <MatterList />;
}
