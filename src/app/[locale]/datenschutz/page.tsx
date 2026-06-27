import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternates } from "@/lib/seo";
import { LegalShell } from "@/components/marketing/LegalShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("datenschutz.title"), alternates: alternates(locale, "/datenschutz") };
}

// The sub-processor list below reflects the actual services Immotrim uses —
// keep it accurate if you add/remove vendors.
export default async function DatenschutzPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("legal");

  return (
    <LegalShell locale={locale} title={t("datenschutz.title")}>
      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
        Caspar Baumeister, Fürbringerstr. 27, 10961 Berlin, Deutschland,{" "}
        <a href="mailto:caspar.baumeister.privat@gmail.com">
          caspar.baumeister.privat@gmail.com
        </a>
        .
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        Bei der Nutzung von Immotrim verarbeiten wir Ihre E-Mail-Adresse und Ihr
        Passwort (verschlüsselt) zur Kontoführung, die von Ihnen eingegebenen bzw.
        hochgeladenen Immobiliendaten und Dokumente sowie Zahlungs- und
        Abonnementdaten. Beim Aufruf der Website werden zudem technisch notwendige
        Server-Logdaten verarbeitet.
      </p>

      <h2>3. Eingesetzte Dienste / Auftragsverarbeiter</h2>
      <p>Zur Bereitstellung des Dienstes setzen wir folgende Dienstleister ein:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Vercel Inc.</strong> – Hosting der Anwendung.
        </li>
        <li>
          <strong>Supabase</strong> – Datenbank, Authentifizierung und
          Dokumentenspeicher (Speicherung Ihrer Konto- und Immobiliendaten).
        </li>
        <li>
          <strong>Stripe</strong> – Zahlungsabwicklung und Abonnementverwaltung.
        </li>
        <li>
          <strong>Google (Gemini API)</strong> – KI-gestützte Auslesung Ihrer
          hochgeladenen Dokumente. Hochgeladene Exposés und Unterlagen werden zur
          Datenextraktion an Google übermittelt und können dabei in den USA
          verarbeitet werden.
        </li>
      </ul>
      <p>
        Mit allen genannten Dienstleistern bestehen, soweit erforderlich, Verträge
        zur Auftragsverarbeitung (Art. 28 DSGVO). Bei Übermittlungen in Drittländer
        (z. B. USA) erfolgt die Absicherung über die EU-Standardvertragsklauseln.
      </p>

      <h2>4. Rechtsgrundlagen</h2>
      <p>
        Die Verarbeitung erfolgt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO),
        zur Erfüllung rechtlicher Pflichten (lit. c) sowie auf Grundlage unseres
        berechtigten Interesses am sicheren Betrieb des Dienstes (lit. f).
      </p>

      <h2>5. Cookies</h2>
      <p>
        Wir verwenden ausschließlich technisch notwendige Cookies zur
        Sitzungsverwaltung (Login). Es werden keine Tracking- oder Marketing-Cookies
        eingesetzt.
      </p>

      <h2>6. Speicherdauer</h2>
      <p>
        Wir speichern Ihre Daten, solange Ihr Konto besteht, und löschen sie nach
        Kontoauflösung, soweit keine gesetzlichen Aufbewahrungsfristen entgegenstehen.
      </p>

      <h2>7. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
        Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, sich bei
        einer Aufsichtsbehörde zu beschweren. Anfragen richten Sie bitte an{" "}
        <a href="mailto:caspar.baumeister.privat@gmail.com">
          caspar.baumeister.privat@gmail.com
        </a>
        .
      </p>
    </LegalShell>
  );
}
