import { getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/marketing/LegalShell";

type Props = { params: Promise<{ locale: string }> };

export default async function AgbPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("legal");

  return (
    <LegalShell locale={locale} title={t("agb.title")}>
      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung des
        Online-Dienstes Immotrim, angeboten von Caspar Baumeister, Fürbringerstr. 27,
        10961 Berlin, Deutschland („Anbieter“).
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
        Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Sie haben das Recht,
        binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
        Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
      </p>
      <p>
        Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Caspar Baumeister,
        Fürbringerstr. 27, 10961 Berlin, Deutschland,{" "}
        <a href="mailto:caspar.baumeister.privat@gmail.com">
          caspar.baumeister.privat@gmail.com
        </a>
        ) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief
        oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen,
        informieren. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die
        Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist
        absenden.
      </p>
      <p>
        Im Falle eines wirksamen Widerrufs erstatten wir Ihnen alle Zahlungen, die wir
        von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab
        dem Tag, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist.
      </p>
      <p>
        Vorzeitiges Erlöschen des Widerrufsrechts: Bei einem Vertrag über die
        Erbringung digitaler Inhalte bzw. Dienstleistungen erlischt das Widerrufsrecht,
        wenn wir mit der Ausführung des Vertrags begonnen haben, nachdem Sie
        ausdrücklich zugestimmt haben, dass wir vor Ablauf der Widerrufsfrist mit der
        Ausführung beginnen, und Sie Ihre Kenntnis davon bestätigt haben, dass Sie
        durch Ihre Zustimmung mit Beginn der Ausführung des Vertrags Ihr Widerrufsrecht
        verlieren (§ 356 Abs. 4, § 357 BGB).
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
