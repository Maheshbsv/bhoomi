import { Suspense, use } from "react";
import { setRequestLocale } from "next-intl/server";
import { WorkspaceView } from "@/components/admin/WorkspaceView";

export default function WorkspacePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <Suspense fallback={<div className="mx-auto h-64 w-full max-w-7xl animate-pulse px-4 py-6" aria-busy="true" />}>
      <WorkspaceView />
    </Suspense>
  );
}
