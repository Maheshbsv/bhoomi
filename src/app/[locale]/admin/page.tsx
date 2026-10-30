import { Suspense, use } from "react";
import { setRequestLocale } from "next-intl/server";
import { QueueView } from "@/components/admin/QueueView";

export default function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <Suspense fallback={<div className="mx-auto h-64 w-full max-w-6xl animate-pulse px-4 py-6" aria-busy="true" />}>
      <QueueView />
    </Suspense>
  );
}
