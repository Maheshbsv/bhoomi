"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export function LocaleToggle() {
  const locale = useLocale();
  const t = useTranslations("Locale");
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "en" ? "kn" : "en";

  return (
    <button
      type="button"
      lang={next}
      aria-label={t("label")}
      onClick={() => router.replace(pathname, { locale: next })}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
    >
      {t("switchTo")}
    </button>
  );
}
