import { getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/marketing/LegalShell";

type Props = { params: Promise<{ locale: string }> };

// NOTE: Placeholder content. Replace [bracketed] fields and have a lawyer review
// before launch (esp. Widerrufsrecht for consumers and liability clauses).
export default async function AgbPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("legal");

  return (
    <LegalShell locale={locale} title={t("agb.title")}>
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
        {t("draftNotice")}
      </p>

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung des
        Online-Dienstes Immotrim, angeboten von [Name / Firma] („Anbieter“).
      </p>

      <h2>2. Leistungsbeschreibung</h2>
      <p>
        Immotrim ist eine Software-as-a-Service-Anwendung zur Analyse von
        Immobilien-Investitionen (u. a. Cashflow-, Rendite- und Tilgungsberechnung
        sowie KI-gestützte Auslesung hochgeladener Dokumente). Es wird keine Anlage-,
        Steuer- oder Rechtsberatung geschuldet; alle Berechnungen sind unverbindliche
        Informationen.
      </p>

      <h2>3. Vertragsschluss</h2>
      <p>
        Der Vertrag kommt mit Abschluss des kostenpflichtigen Abonnements über unseren
        Zahlungsdienstleister Stripe zustande.
      </p>

      <h2>4. Preise und Zahlung</h2>
      <p>
        Es gelten die im Bestellprozess angegebenen Preise. Die Abrechnung erfolgt im
        gewählten Intervall (monatlich oder jährlich) im Voraus über Stripe.
      </p>

      <h2>5. Laufzeit und Kündigung</h2>
      <p>
        Das Abonnement verlängert sich automatisch um die jeweilige Laufzeit und kann
        jederzeit zum Ende des laufenden Abrechnungszeitraums über das Kundenkonto
        gekündigt werden.
      </p>

      <h2>6. Widerrufsrecht für Verbraucher</h2>
      <p>
        Verbrauchern steht ein gesetzliches Widerrufsrecht zu. [Vollständige
        Widerrufsbelehrung hier einfügen.]
      </p>

      <h2>7. Haftung</h2>
      <p>
        Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie
        nach dem Produkthaftungsgesetz. Im Übrigen ist die Haftung auf die Verletzung
        wesentlicher Vertragspflichten und den vorhersehbaren Schaden begrenzt. Eine
        Haftung für die Richtigkeit der durch KI extrahierten Werte oder der
        Berechnungsergebnisse ist ausgeschlossen.
      </p>

      <h2>8. Schlussbestimmungen</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland. Sollten einzelne
        Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.
      </p>
    </LegalShell>
  );
}
