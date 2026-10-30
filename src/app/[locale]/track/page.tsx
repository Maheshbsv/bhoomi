import { Suspense, use } from "react";
import { setRequestLocale } from "next-intl/server";
import { TrackView } from "@/components/track/TrackView";

export default function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <Suspense fallback={<div className="mx-auto h-64 w-full max-w-2xl animate-pulse px-4 py-6" aria-busy="true" />}>
      <TrackView />
    </Suspense>
  );
}
