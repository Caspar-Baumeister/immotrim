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

      <h2>5. Technisch notwendige Cookies, Local Storage und Authentifizierung</h2>
      <p>
        Wir setzen <strong>keine Tracking- oder Marketing-Cookies</strong> ein. Verwendet
        werden ausschließlich technisch notwendige bzw. funktionale Speichertechnologien:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Authentifizierungs-Cookies (Supabase)</strong> – speichern Ihre
          angemeldete Sitzung (Login). Ohne diese ist eine sichere Nutzung des
          geschützten Bereichs nicht möglich. Erstanbieter-Cookie, technisch notwendig.
        </li>
        <li>
          <strong>Sprach-Cookie (<code>NEXT_LOCALE</code>)</strong> – merkt sich Ihre
          gewählte Sprache (Deutsch/Englisch). Erstanbieter-Cookie, funktional.
        </li>
        <li>
          <strong>Theme-Einstellung (<code>theme</code>, Local Storage)</strong> – speichert
          Ihre Auswahl zwischen hellem und dunklem Design. Erstanbieter, funktional, verbleibt
          bis zum Löschen durch Sie.
        </li>
        <li>
          <strong>Berechnungs-Annahmen (<code>immotrim_wishlist_assumptions</code>, Local
          Storage)</strong> – speichert Ihre persönlichen Standardannahmen für die
          Objektanalyse lokal in Ihrem Browser. Erstanbieter, funktional, verbleibt bis zum
          Löschen durch Sie. Es findet keine Übertragung an Dritte statt.
        </li>
        <li>
          <strong>YouTube-Einwilligung (<code>immotrim_youtube_consent</code>, Local
          Storage)</strong> – speichert ausschließlich Ihre Entscheidung, ob YouTube-Videos
          automatisch geladen werden dürfen (siehe Abschnitt&nbsp;6). Erstanbieter, verbleibt
          bis zum Widerruf in den Datenschutz-Einstellungen.
        </li>
      </ul>

      <h2>6. YouTube-Videos (Zwei-Klick-Lösung)</h2>
      <p>
        Auf unserer Website binden wir ein Vorschauvideo von YouTube (Anbieter: Google
        Ireland Limited bzw. Google LLC) ein. Zum Schutz Ihrer Daten wird das Video
        <strong> erst nach Ihrer ausdrücklichen Einwilligung</strong> geladen
        (&bdquo;Zwei-Klick-Lösung&ldquo;). Vor Ihrer Einwilligung wird ausschließlich ein
        lokal auf unserem Server gespeichertes Vorschaubild angezeigt; es werden
        <strong> keinerlei Skripte, Bilder, Cookies oder sonstige Ressourcen von YouTube
        oder Google geladen</strong> und keine Verbindung zu deren Servern aufgebaut.
      </p>
      <p>
        Erst wenn Sie auf &bdquo;YouTube-Video laden&ldquo; klicken, wird das Video über den
        Dienst <strong>youtube-nocookie.com</strong> (datenschutzerweiterter Modus) geladen.
        Dabei können Daten – insbesondere Ihre IP-Adresse – an YouTube/Google übertragen und
        ggf. in den USA verarbeitet werden. Die Einwilligung erfolgt auf Grundlage von
        Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO. Auf Wunsch speichern wir Ihre Einwilligung
        lokal in Ihrem Browser, damit Videos künftig automatisch geladen werden; diese
        Einwilligung können Sie jederzeit widerrufen (siehe Abschnitt&nbsp;9).
      </p>

      <h2>7. Kontaktaufnahme per E-Mail (Google / Gmail)</h2>
      <p>
        Wenn Sie uns per E-Mail kontaktieren (z.&nbsp;B. an die oben genannte Adresse),
        verarbeiten wir die von Ihnen übermittelten Daten (Ihre E-Mail-Adresse, Betreff und
        Inhalt) zur Bearbeitung Ihrer Anfrage. Unser E-Mail-Postfach wird über
        <strong> Google&nbsp;/&nbsp;Gmail (Google Ireland Limited bzw. Google LLC)</strong>
        betrieben; eingehende und ausgehende Nachrichten werden daher auf Servern von Google
        gespeichert und verarbeitet, wobei eine Verarbeitung in den USA nicht ausgeschlossen
        werden kann. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO
        (vorvertragliche/vertragliche Kommunikation) bzw. lit.&nbsp;f DSGVO (berechtigtes
        Interesse an effizienter Kommunikation). Wir empfehlen, keine besonders sensiblen
        Daten unverschlüsselt per E-Mail zu übermitteln.
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

      <h2>9. Widerruf / Änderung Ihrer Datenschutz-Einstellungen</h2>
      <p>
        Eine erteilte Einwilligung (z.&nbsp;B. zum Laden von YouTube-Videos) können Sie
        jederzeit mit Wirkung für die Zukunft widerrufen oder ändern. Nutzen Sie hierfür die
        Seite{" "}
        <a href={`/${locale}/privacy-settings`}>Datenschutz-Einstellungen</a>, die Sie auch
        über den Link im Footer jeder Seite erreichen. Zusätzlich können Sie die im Browser
        gespeicherten Daten jederzeit über die Einstellungen Ihres Browsers löschen.
      </p>

      <h2>10. Speicherdauer</h2>
      <p>
        Wir speichern Ihre Daten, solange Ihr Konto besteht, und löschen sie nach
        Kontoauflösung, soweit keine gesetzlichen Aufbewahrungsfristen entgegenstehen.
        Lokal in Ihrem Browser gespeicherte Einstellungen (siehe Abschnitt&nbsp;5) verbleiben
        dort, bis Sie sie löschen bzw. widerrufen.
      </p>

      <h2>11. Ihre Rechte</h2>
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
