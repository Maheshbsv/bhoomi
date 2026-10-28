import { useTranslations } from "next-intl";

export function DemoStrip() {
  const t = useTranslations("Demo");
  return (
    <div
      role="note"
      className="bg-amber-100 px-4 py-1.5 text-center text-sm font-medium text-amber-950"
    >
      {t("strip")}
    </div>
  );
}
