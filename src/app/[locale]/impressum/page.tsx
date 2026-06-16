import { getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/marketing/LegalShell";

type Props = { params: Promise<{ locale: string }> };

// § 5 TMG requires this page. Provider is a sole proprietor (no company,
// no USt-ID, no editorial content) — those sections are intentionally omitted.
export default async function ImpressumPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("legal");

  return (
    <LegalShell locale={locale} title={t("impressum.title")}>
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        Caspar Baumeister<br />
        Fürbringerstr. 27<br />
        10961 Berlin<br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail:{" "}
        <a href="mailto:caspar.baumeister.privat@gmail.com">
          caspar.baumeister.privat@gmail.com
        </a>
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
        einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalShell>
  );
}
