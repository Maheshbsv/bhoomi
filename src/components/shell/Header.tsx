import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { DemoStrip } from "./DemoStrip";
import { LocaleToggle } from "./LocaleToggle";

const NAV = [
  { href: "/request", key: "request" },
  { href: "/track", key: "track" },
  { href: "/pro", key: "pro" },
  { href: "/admin", key: "admin" },
] as const;

export function Header() {
  const t = useTranslations();
  return (
    <header className="border-b bg-background">
      <DemoStrip />
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="flex min-h-11 flex-col justify-center leading-tight">
          <span className="text-lg font-semibold">{t("Brand.name")}</span>
          <span className="text-xs text-muted-foreground">{t("Brand.tagline")}</span>
        </Link>
        <LocaleToggle />
      </div>
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-1 px-4 pb-1 text-sm">
        {NAV.map(({ href, key }) => (
          <Link
            key={key}
            href={href}
            className="inline-flex min-h-11 items-center px-2 hover:underline"
          >
            {t(`Nav.${key}`)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
