"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export function LocaleToggle() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "en" ? "kn" : "en";

  return (
    <button
      type="button"
      lang={next}
      aria-label={`${t("label")}: ${t("switchTo")}`}
      onClick={() => {
        // Read at click time: the query string (?id=, filters) carries the page's state across the switch,
        // and this avoids a useSearchParams Suspense boundary in the header.
        const { search, hash } = window.location;
        router.replace(`${pathname}${search}${hash}`, { locale: next });
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
    >
      {t("switchTo")}
    </button>
  );
}
