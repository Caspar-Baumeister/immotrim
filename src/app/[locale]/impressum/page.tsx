import { getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/marketing/LegalShell";

type Props = { params: Promise<{ locale: string }> };

// NOTE: Placeholder content. Replace the [bracketed] fields with the real provider
// details and have a lawyer review before launch. § 5 TMG requires this page.
export default async function ImpressumPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("legal");

  return (
    <LegalShell locale={locale} title={t("impressum.title")}>
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
        {t("draftNotice")}
      </p>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        [Name / Firma]<br />
        [Straße und Hausnummer]<br />
        [PLZ Ort]<br />
        [Land]
      </p>

      <h2>Vertreten durch</h2>
      <p>[Vor- und Nachname der vertretungsberechtigten Person]</p>

      <h2>Kontakt</h2>
      <p>
        Telefon: [Telefonnummer]<br />
        E-Mail: [E-Mail-Adresse]
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
        [USt-IdNr., falls vorhanden]
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        [Vor- und Nachname]<br />
        [Anschrift]
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
