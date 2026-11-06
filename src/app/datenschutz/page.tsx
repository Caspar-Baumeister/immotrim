import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternates } from "@/lib/seo";
import { LegalShell } from "@/components/marketing/LegalShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("datenschutz.title"), alternates: alternates("/datenschutz") };
}

// The sub-processor list below reflects the services Immotrim actually uses.
// Keep it accurate when adding or removing vendors.
export default async function DatenschutzPage() {
  const t = await getTranslations("legal");

  return (
    <LegalShell title={t("datenschutz.title")}>
      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
        Caspar Baumeister, Dernburgstraße 7, 14057 Berlin, Deutschland,{" "}
        <a href="mailto:caspar.baumeister.privat@gmail.com">
          caspar.baumeister.privat@gmail.com
        </a>
        .
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        Bei der Nutzung von Immotrim verarbeiten wir Ihre E-Mail-Adresse und Ihr Passwort
        (nur als Hashwert gespeichert) oder Ihr Google-Konto zur Anmeldung, die von Ihnen
        eingegebenen Immobiliendaten, die von Ihnen hochgeladenen Dokumente sowie Zahlungs-
        und Abonnementdaten. Beim Aufruf der Website werden zudem technisch notwendige
        Server-Logdaten verarbeitet.
      </p>

      <h2>3. Eingesetzte Dienste und Auftragsverarbeiter</h2>
      <p>Zur Bereitstellung des Dienstes setzen wir folgende Dienstleister ein:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Vercel Inc.</strong>: Hosting der Website und der Anwendung.
        </li>
        <li>
          <strong>Google Firebase (Google Ireland Limited)</strong>: Anmeldung
          (Firebase Authentication), Datenbank (Cloud Firestore) und Dokumentenspeicher
          (Cloud Storage). Ihre Konto- und Immobiliendaten und Ihre Dokumente werden in
          Rechenzentren in Frankfurt am Main gespeichert.
        </li>
        <li>
          <strong>Stripe</strong>: Zahlungsabwicklung und Abonnementverwaltung.
        </li>
        <li>
          <strong>Google (Gemini API)</strong>: KI-gestützte Auslesung der Dokumente, die
          Sie zur Auswertung freigeben (siehe Abschnitt&nbsp;6).
        </li>
      </ul>
      <p>
        Mit allen genannten Dienstleistern bestehen, soweit erforderlich, Verträge zur
        Auftragsverarbeitung (Art.&nbsp;28 DSGVO). Bei Übermittlungen in Drittländer
        (z.&nbsp;B. USA) erfolgt die Absicherung über das EU-US Data Privacy Framework
        bzw. die EU-Standardvertragsklauseln.
      </p>

      <h2>4. Rechtsgrundlagen</h2>
      <p>
        Die Verarbeitung erfolgt zur Vertragserfüllung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b
        DSGVO), zur Erfüllung rechtlicher Pflichten (lit.&nbsp;c) sowie auf Grundlage
        unseres berechtigten Interesses am sicheren Betrieb des Dienstes (lit.&nbsp;f).
      </p>

      <h2>5. Cookies und lokale Speicherung</h2>
      <p>
        Wir setzen <strong>keine Tracking- oder Marketing-Cookies</strong> ein. Verwendet
        werden ausschließlich technisch notwendige Speichertechnologien:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Sitzungs-Cookie (<code>__session</code>)</strong>: hält Sie nach der
          Anmeldung bis zu 14 Tage angemeldet. Erstanbieter-Cookie, nur für den Server
          lesbar, technisch notwendig.
        </li>
        <li>
          <strong>Anmeldestatus von Firebase (IndexedDB im Browser)</strong>: wird für das
          direkte Hochladen Ihrer Dokumente in Ihren geschützten Speicherbereich benötigt.
          Technisch notwendig, wird beim Abmelden gelöscht.
        </li>
      </ul>

      <h2>6. Auswertung von Dokumenten mit KI</h2>
      <p>
        Wenn Sie in Immotrim auf &bdquo;Werte aus Dokumenten auslesen&ldquo; klicken, werden
        die zu dieser Immobilie hochgeladenen Dokumente an die Gemini API von Google
        übermittelt. Google liest daraus Werte wie Kaufpreis, Zins oder Miete aus und gibt
        sie an uns zurück. Sie prüfen die Werte, bevor sie übernommen werden. Wir nutzen den
        kostenpflichtigen Zugang der Gemini API; nach den Bedingungen von Google werden die
        Inhalte dabei nicht zum Training von Modellen verwendet. Eine Verarbeitung in den
        USA kann nicht ausgeschlossen werden. Rechtsgrundlage ist die Vertragserfüllung
        (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO). Ohne Ihren Klick werden keine Dokumente
        an Google übermittelt.
      </p>

      <h2>7. Kontaktaufnahme per E-Mail (Google Gmail)</h2>
      <p>
        Wenn Sie uns per E-Mail kontaktieren (z.&nbsp;B. an die oben genannte Adresse),
        verarbeiten wir die von Ihnen übermittelten Daten (Ihre E-Mail-Adresse, Betreff und
        Inhalt) zur Bearbeitung Ihrer Anfrage. Unser E-Mail-Postfach wird über
        <strong> Google Gmail (Google Ireland Limited bzw. Google LLC)</strong> betrieben;
        eingehende und ausgehende Nachrichten werden daher auf Servern von Google
        gespeichert und verarbeitet, wobei eine Verarbeitung in den USA nicht ausgeschlossen
        werden kann. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO
        (vorvertragliche oder vertragliche Kommunikation) bzw. lit.&nbsp;f DSGVO
        (berechtigtes Interesse an effizienter Kommunikation).
      </p>

      <h2>8. Reichweitenmessung (Vercel Analytics)</h2>
      <p>
        In der Produktivumgebung setzen wir <strong>Vercel Web Analytics</strong> (Vercel Inc.)
        zur anonymen Reichweitenmessung ein. Dieser Dienst arbeitet
        <strong> cookielos</strong> und speichert nach Angaben des Anbieters keine Daten auf
        Ihrem Endgerät und keine personenbezogenen Identifikatoren; erfasst werden aggregierte,
        anonymisierte Aufrufstatistiken. Rechtsgrundlage ist unser berechtigtes Interesse an
        der Verbesserung unseres Angebots (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO).
      </p>

      <h2>9. Speicherdauer und Kontolöschung</h2>
      <p>
        Wir speichern Ihre Daten, solange Ihr Konto besteht. Unter &bdquo;Konto&ldquo;
        können Sie Ihr Konto jederzeit selbst löschen; dabei werden Ihre Immobiliendaten,
        Dokumente und Zugangsdaten unwiderruflich gelöscht und ein laufendes Abonnement
        gekündigt. Rechnungsdaten bei Stripe bewahren wir nur so lange auf, wie gesetzliche
        Aufbewahrungsfristen es verlangen.
      </p>

      <h2>10. Ihre Rechte</h2>
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
