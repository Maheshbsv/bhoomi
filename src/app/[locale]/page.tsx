import { use } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { TrackBox } from "@/components/shell/TrackBox";
import type { ServiceType } from "@/domain/types";

const SERVICES: ServiceType[] = ["OLD_RTC", "OLD_MR", "LND_FILE", "LRF_FILE", "RRT_FILE"];

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("landing");
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-8 md:py-12">
      <section className="max-w-2xl space-y-4">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="text-base text-muted-foreground md:text-lg">{t("pitch")}</p>
        <Link
          href="/request/"
          className="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent/90"
        >
          {t("cta")}
        </Link>
      </section>

      <section aria-labelledby="services-h" className="space-y-3">
        <h2 id="services-h" className="text-xl font-semibold">{t("servicesTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <ServiceCard key={s} type={s} />
          ))}
        </div>
      </section>

      <section aria-labelledby="track-h" className="space-y-3 rounded-lg border bg-card p-4">
        <h2 id="track-h" className="text-xl font-semibold">{t("trackTitle")}</h2>
        <TrackBox />
      </section>

      <section aria-labelledby="how-h" className="space-y-3">
        <h2 id="how-h" className="text-xl font-semibold">{t("howTitle")}</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex gap-3 rounded-lg border bg-card p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {n}
              </span>
              <div>
                <h3 className="font-semibold">{t(`step${n}Title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`step${n}Desc`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
