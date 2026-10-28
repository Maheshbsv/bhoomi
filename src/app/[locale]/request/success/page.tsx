import { Suspense, use } from "react";
import { setRequestLocale } from "next-intl/server";
import { SuccessView } from "@/components/wizard/SuccessView";

export default function SuccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <Suspense fallback={<div className="mx-auto h-48 w-full max-w-xl animate-pulse px-4 py-6" aria-busy="true" />}>
      <SuccessView />
    </Suspense>
  );
}
