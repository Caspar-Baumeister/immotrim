import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getBaseUrl } from "@/lib/url";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Props = { params: Promise<{ locale: string }> };

// German-only SEO guide. The article content is always German, so we keep a
// single canonical pointing at the /de URL and deliberately emit no hreflang
// alternates (there is no English translation). Any /en hit is redirected to /de
// in the component below so no duplicate non-German page is served.
const PATH = "/ratgeber/bankenreport-immobilienportfolio-erstellen";
const DE_PATH = `/de${PATH}`;
const PUBLISHED = "2026-06-28";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "Bankenreport für Immobilienportfolio erstellen | Immotrim" },
    description:
      "Welche Kennzahlen und Unterlagen Banken bei Immobilieninvestoren interessieren und wie du dein Portfolio per Excel oder Software übersichtlich aufbereitest.",
    // Canonical resolves against metadataBase (set in the locale layout).
    alternates: { canonical: DE_PATH },
    openGraph: {
      type: "article",
      title: "Bankenreport für dein Immobilienportfolio erstellen",
      description:
        "So bereitest du Immobilien, Darlehen, Mieten, Cashflow und Vermögen übersichtlich für das nächste Bankgespräch auf.",
      url: DE_PATH,
      locale: "de_DE",
      images: ["/logo_immotrim.png"],
    },
  };
}

// Table-of-contents entries — one per top-level (h2) section, in document order.
const TOC = [
  { id: "das-wichtigste", label: "Das Wichtigste in Kürze" },
  { id: "was-ist-ein-bankenreport", label: "Was ist ein Bankenreport für ein Immobilienportfolio?" },
  { id: "warum-portfoliouebersicht", label: "Warum ist eine Portfolioübersicht für die Bank relevant?" },
  { id: "welche-angaben", label: "Welche Angaben gehören in einen Bankenreport?" },
  { id: "sechs-schritte", label: "Bankenreport in sechs Schritten selbst erstellen" },
  { id: "excel-oder-software", label: "Bankenreport mit Excel oder Software erstellen?" },
  { id: "haeufige-fehler", label: "Häufige Fehler bei der Aufbereitung für Banken" },
  { id: "mit-immotrim", label: "Bankenreport mit Immotrim erstellen" },
  { id: "faq", label: "Häufig gestellte Fragen" },
  { id: "fazit", label: "Fazit" },
] as const;

// Shared prose styling for the article body. Mirrors the typography language of
// LegalShell but tuned for a long-form guide (clear heading rhythm, amber links,
// scroll-margin so anchor targets clear any header).
const prose = [
  "[&_h2]:font-heading [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:mt-14 [&_h2]:mb-5 [&_h2]:scroll-mt-24",
  "[&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:scroll-mt-24",
  "[&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:my-4",
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-muted-foreground [&_ul]:marker:text-amber-500",
  "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:text-muted-foreground [&_ol]:marker:text-amber-500",
  "[&_li]:leading-relaxed [&_li]:pl-1",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_a]:text-amber-600 [&_a]:dark:text-amber-400 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-amber-500/40",
].join(" ");

export default async function BankenreportRatgeberPage({ params }: Props) {
  const { locale } = await params;

  // The article exists only in German; serve it under /de and redirect /en.
  if (locale !== "de") redirect(DE_PATH);

  const base = getBaseUrl();
  const canonical = `${base}${DE_PATH}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline:
      "Bankenreport für das Immobilienportfolio erstellen: Diese Angaben gehören hinein",
    description:
      "Welche Kennzahlen und Unterlagen Banken bei Immobilieninvestoren interessieren und wie du dein Portfolio per Excel oder Software übersichtlich aufbereitest.",
    inLanguage: "de-DE",
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    author: {
      "@type": "Person",
      name: "Caspar Baumeister",
      description: "Immobilieninvestor und Gründer von Immotrim",
    },
    publisher: {
      "@type": "Organization",
      name: "Immotrim",
      logo: { "@type": "ImageObject", url: `${base}/logo_immotrim.png` },
    },
    image: `${base}/logo_immotrim.png`,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: `${base}/de` },
      // "Ratgeber" has no overview page yet, so it carries no `item` (no dead link).
      { "@type": "ListItem", position: 2, name: "Ratgeber" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Bankenreport für das Immobilienportfolio erstellen",
        item: canonical,
      },
    ],
  };

  return (
    <main className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Top nav — matches the other public pages (logo + theme toggle). */}
      <nav className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Image
              src="/logo_immotrim.png"
              alt="Immotrim"
              width={100}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
            <span className="hidden sm:inline text-xl font-bold uppercase tracking-wide text-foreground">
              IMMOTRIM
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <article className="flex-1 mx-auto w-full max-w-3xl px-6 py-10 sm:py-14">
        {/* Breadcrumb — "Ratgeber" is plain text because no overview page exists. */}
        <nav aria-label="Brotkrümelnavigation" className="mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
                Startseite
              </Link>
            </li>
            <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <li>Ratgeber</li>
            <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <li aria-current="page" className="text-foreground font-medium">
              Bankenreport für das Immobilienportfolio erstellen
            </li>
          </ol>
        </nav>

        <header className="space-y-5">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-balance">
            Bankenreport für das Immobilienportfolio erstellen: Diese Angaben gehören
            hinein
          </h1>
          <div className="flex items-center gap-3">
            <Image
              src="/caspar_freundlich.JPG"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full border border-border object-cover"
            />
            <p className="text-sm text-muted-foreground">
              Von <span className="font-medium text-foreground">Caspar Baumeister</span>
              <span className="px-1.5">·</span>
              <time dateTime={PUBLISHED}>Veröffentlicht am 28. Juni 2026</time>
            </p>
          </div>
        </header>

        <div className={`mt-8 ${prose}`}>
          <p>
            Wer eine weitere Immobilie finanzieren möchte, muss der Bank meistens mehr
            zeigen als nur das Exposé des neuen Objekts. Besonders bei mehreren
            Bestandsimmobilien möchte die Bank nachvollziehen können, welche
            Vermögenswerte, Darlehen, Mieteinnahmen und laufenden Belastungen bereits
            vorhanden sind.
          </p>
          <p>
            Genau hier hilft ein Bankenreport für das Immobilienportfolio. Er fasst die
            wichtigsten Informationen zum gesamten Bestand in einer übersichtlichen und
            nachvollziehbaren Form zusammen.
          </p>
          <p>
            Ein solcher Report ersetzt weder die Selbstauskunft der Bank noch
            erforderliche Nachweise. Er kann aber dafür sorgen, dass du deine Zahlen
            nicht für jedes Bankgespräch neu zusammensuchen und in unterschiedlichen
            Excel-Dateien aufbereiten musst.
          </p>

          {/* Table of contents — pure anchor links, fully server-rendered. */}
          <nav
            aria-label="Inhaltsverzeichnis"
            className="not-prose my-8 rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <h2 className="!mt-0 !mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-foreground">
              Inhaltsverzeichnis
            </h2>
            <ol className="!my-0 !pl-0 list-none space-y-2 text-sm">
              {TOC.map((item, i) => (
                <li key={item.id} className="!pl-0">
                  <a
                    href={`#${item.id}`}
                    className="group flex gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
                      {i + 1}.
                    </span>
                    <span className="underline-offset-4 group-hover:underline">
                      {item.label}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Highlighted summary callout. */}
          <section
            aria-labelledby="das-wichtigste"
            className="not-prose my-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6 sm:p-7"
          >
            <h2
              id="das-wichtigste"
              className="font-heading text-xl font-bold tracking-tight text-foreground scroll-mt-24"
            >
              Das Wichtigste in Kürze
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground marker:text-amber-500 [&_strong]:font-semibold [&_strong]:text-foreground">
              <li>
                Ein Bankenreport zeigt Immobilien, Darlehen, Mieteinnahmen, Ausgaben,
                Vermögenswerte und wichtige Portfolio-Kennzahlen.
              </li>
              <li>
                Es gibt <strong>keinen einheitlichen Bankenreport</strong>, der bei jeder
                Bank identisch verwendet wird.
              </li>
              <li>Banken können zusätzlich eigene Formulare und Belege verlangen.</li>
              <li>
                Eine klare Portfolioübersicht erleichtert die Vorbereitung und kann
                unnötige Rückfragen vermeiden.
              </li>
              <li>
                Bei mehreren Immobilien wird die laufende Pflege mit Excel schnell
                aufwendig.
              </li>
              <li>
                Mit einer spezialisierten Software lassen sich Daten zentral verwalten und
                für neue Finanzierungsanfragen erneut verwenden.
              </li>
            </ul>
          </section>

          <h2 id="was-ist-ein-bankenreport">
            Was ist ein Bankenreport für ein Immobilienportfolio?
          </h2>
          <p>
            Der Begriff Bankenreport bezeichnet in diesem Zusammenhang eine strukturierte
            Übersicht über den Immobilienbestand eines Investors.
          </p>
          <p>
            Der Report soll einer Bank oder einem Finanzierungsvermittler ermöglichen, die
            wirtschaftliche Situation des Investors schneller zu verstehen. Dazu werden die
            wichtigsten Daten zu allen Immobilien und Darlehen zusammengeführt.
          </p>
          <p>Typischerweise beantwortet der Report Fragen wie:</p>
          <ul>
            <li>Wie viele Immobilien besitzt der Investor?</li>
            <li>Wie hoch ist der geschätzte Gesamtwert des Portfolios?</li>
            <li>Welche Restschulden bestehen?</li>
            <li>Wie hoch sind die monatlichen Mieteinnahmen?</li>
            <li>Welche Darlehensraten müssen bezahlt werden?</li>
            <li>Wie hoch ist der laufende Cashflow?</li>
            <li>Wie viel Eigenkapital ist im Portfolio gebunden?</li>
            <li>Wann laufen Zinsbindungen bestehender Darlehen aus?</li>
          </ul>
          <p>
            Wichtig ist die Abgrenzung zu den übrigen Finanzierungsunterlagen. Ein
            Bankenreport ist keine offizielle Finanzierungszusage und normalerweise auch
            kein Ersatz für bankeigene Formulare.
          </p>
          <p>Er ergänzt Unterlagen wie:</p>
          <ul>
            <li>persönliche Selbstauskunft</li>
            <li>Einkommensnachweise</li>
            <li>Steuerbescheide</li>
            <li>Konto- und Depotauszüge</li>
            <li>Darlehensverträge</li>
            <li>aktuelle Restschuldnachweise</li>
            <li>Grundbuchauszüge</li>
            <li>Kaufvertragsentwurf des neuen Objekts</li>
            <li>Exposé, Grundriss und weitere Objektunterlagen</li>
          </ul>
          <p>
            Welche Dokumente tatsächlich benötigt werden, hängt von der Bank, dem
            Finanzierungsmodell und der persönlichen Situation ab.
          </p>

          <h2 id="warum-portfoliouebersicht">
            Warum ist eine Portfolioübersicht für die Bank relevant?
          </h2>
          <p>
            Bei der Finanzierung einer weiteren Kapitalanlage betrachtet die Bank nicht nur
            das neue Objekt. Auch das bereits vorhandene Portfolio kann für die Beurteilung
            eine Rolle spielen.
          </p>
          <p>
            Dabei geht es unter anderem darum, ob Einnahmen und Verpflichtungen plausibel
            zusammenpassen. Eine Bank möchte beispielsweise nachvollziehen können, welche
            Mieteinnahmen regelmäßig eingehen und welche Kreditraten bereits bezahlt werden
            müssen.
          </p>
          <p>
            Bei einem einzelnen Objekt lassen sich diese Informationen oft noch relativ
            einfach darstellen. Mit jeder weiteren Immobilie wird die Situation komplexer.
          </p>
          <p>
            Unterschiedliche Banken, verschiedene Zinsbindungen, veränderte Mieten und
            laufende Tilgungen führen schnell dazu, dass Zahlen in älteren Tabellen nicht
            mehr aktuell sind. Eine zentrale Portfolioübersicht schafft deshalb nicht nur
            für die Bank, sondern auch für den Investor selbst mehr Klarheit. Wer sein{" "}
            <Link href={`/${locale}/signup`}>Immobilienportfolio analysieren</Link> möchte,
            profitiert von einem konsistenten Datenstand, der sich bei jeder neuen Anfrage
            wiederverwenden lässt.
          </p>

          <h2 id="welche-angaben">Welche Angaben gehören in einen Bankenreport?</h2>
          <p>
            Der genaue Aufbau kann sich je nach Bank unterscheiden. Die folgenden
            Bestandteile bilden jedoch eine sinnvolle Grundlage für einen
            Immobilienportfolio-Report.
          </p>

          <h3>1. Zusammenfassung des Gesamtportfolios</h3>
          <p>
            Die erste Seite sollte einen schnellen Überblick über den gesamten
            Immobilienbestand geben.
          </p>
          <p>Sinnvolle Kennzahlen sind:</p>
          <ul>
            <li>Anzahl der Immobilien</li>
            <li>Anzahl der vermieteten Einheiten</li>
            <li>gesamte Wohn- oder Nutzfläche</li>
            <li>Summe der ursprünglichen Kaufpreise</li>
            <li>geschätzter aktueller Immobilienwert</li>
            <li>gesamte offene Darlehenssumme</li>
            <li>geschätztes Nettovermögen im Portfolio</li>
            <li>monatliche oder jährliche Nettokaltmiete</li>
            <li>gesamte monatliche Darlehensrate</li>
            <li>jährliche Zins- und Tilgungsleistung</li>
            <li>laufender Cashflow</li>
            <li>vorhandene Liquiditätsreserven</li>
          </ul>
          <p>
            Der Immobilienwert sollte nicht mit dem ursprünglichen Kaufpreis verwechselt
            werden. Wenn ein aktueller Wert nur geschätzt wurde, muss dies klar erkennbar
            sein.
          </p>

          <h3>2. Übersicht aller Immobilien</h3>
          <p>
            Nach der Zusammenfassung sollte eine Tabelle mit allen Objekten folgen.
          </p>
          <p>Pro Immobilie können unter anderem diese Angaben enthalten sein:</p>
          <ul>
            <li>Ort und Adresse</li>
            <li>Objektart</li>
            <li>Baujahr</li>
            <li>Wohnfläche</li>
            <li>Anzahl der Einheiten</li>
            <li>Kaufdatum</li>
            <li>Kaufpreis</li>
            <li>aktuelle Nutzung</li>
            <li>monatliche Nettokaltmiete</li>
            <li>geschätzter Immobilienwert</li>
            <li>offene Darlehenssumme</li>
            <li>monatliche Kreditrate</li>
            <li>monatlicher Cashflow</li>
          </ul>
          <p>
            Die Tabelle sollte kompakt bleiben. Ausführlichere Informationen zu den
            einzelnen Immobilien können anschließend auf separaten Objektseiten dargestellt
            werden.
          </p>

          <h3>3. Übersicht über bestehende Darlehen</h3>
          <p>
            Für die Beurteilung des Portfolios sind nicht nur die Immobilienwerte, sondern
            auch die bestehenden Finanzierungen relevant.
          </p>
          <p>Für jedes Darlehen sollten möglichst folgende Angaben vorliegen:</p>
          <ul>
            <li>finanzierende Bank</li>
            <li>ursprüngliche Darlehenssumme</li>
            <li>aktuelle Restschuld</li>
            <li>Sollzins</li>
            <li>anfängliche oder aktuelle Tilgung</li>
            <li>monatliche Darlehensrate</li>
            <li>Beginn des Darlehens</li>
            <li>Ende der Zinsbindung</li>
            <li>mögliche Sondertilgung</li>
            <li>zugehörige Immobilie</li>
            <li>eingetragene oder vereinbarte Sicherheiten, soweit bekannt</li>
          </ul>
          <p>
            Besonders das Ende der Zinsbindung ist relevant, weil sich daraus zukünftiger
            Refinanzierungsbedarf ergeben kann.
          </p>

          <h3>4. Mieteinnahmen und laufende Kosten</h3>
          <p>
            Eine hohe Miete allein sagt noch wenig über die tatsächliche wirtschaftliche
            Leistung einer Immobilie aus. Deshalb sollte der Report Einnahmen und relevante
            Ausgaben nachvollziehbar gegenüberstellen.
          </p>
          <p>Dazu können gehören:</p>
          <ul>
            <li>Nettokaltmiete</li>
            <li>sonstige regelmäßige Einnahmen</li>
            <li>nicht umlagefähige Betriebskosten</li>
            <li>Verwaltungskosten</li>
            <li>Instandhaltung oder Rücklagen</li>
            <li>Leerstand</li>
            <li>Darlehensrate</li>
            <li>Zinsanteil</li>
            <li>Tilgungsanteil</li>
            <li>Cashflow vor Steuern</li>
          </ul>
          <p>
            Ein Cashflow nach Steuern kann als zusätzliche Modellrechnung sinnvoll sein. Er
            sollte jedoch klar als Berechnung auf Basis bestimmter Annahmen bezeichnet
            werden. Die tatsächliche steuerliche Behandlung hängt von der individuellen
            Situation ab.
          </p>

          <h3>5. Vermögen und weitere Verbindlichkeiten</h3>
          <p>
            Neben den Immobilien kann die Bank weitere Vermögenswerte und Verpflichtungen
            abfragen.
          </p>
          <p>Dazu gehören beispielsweise:</p>
          <ul>
            <li>Bankguthaben</li>
            <li>Wertpapierdepots</li>
            <li>Bausparguthaben</li>
            <li>Beteiligungen</li>
            <li>sonstige Immobilien</li>
            <li>private oder geschäftliche Kredite</li>
            <li>Bürgschaften</li>
            <li>Leasingverpflichtungen</li>
            <li>sonstige regelmäßige Zahlungsverpflichtungen</li>
          </ul>
          <p>
            Diese Informationen gehören nicht zwangsläufig vollständig in jeden
            Portfolio-Report. Häufig werden sie zusätzlich über die Selbstauskunft der
            jeweiligen Bank erfasst.
          </p>
          <p>
            Achte darauf, nur erforderliche personenbezogene Daten zu übermitteln und
            sensible Unterlagen über den von der Bank vorgesehenen sicheren
            Übertragungsweg einzureichen.
          </p>

          <h3>6. Detailseite pro Immobilie</h3>
          <p>
            Nach der Gesamtübersicht kann für jede wichtige Immobilie eine eigene Seite
            folgen.
          </p>
          <p>Eine solche Objektseite kann enthalten:</p>
          <ul>
            <li>ein oder zwei Fotos</li>
            <li>kurze Objektbeschreibung</li>
            <li>Lage und Objektart</li>
            <li>Kaufpreis und Kaufdatum</li>
            <li>Fläche und Anzahl der Einheiten</li>
            <li>aktuelle Miete</li>
            <li>geschätzter Immobilienwert</li>
            <li>Darlehensdaten</li>
            <li>Restschuld</li>
            <li>Zins und Tilgung</li>
            <li>Cashflow</li>
            <li>besondere Chancen oder Risiken</li>
          </ul>
          <p>
            Bei einem sehr großen Portfolio muss nicht jedes einzelne Objekt ausführlich
            dargestellt werden. Die Gesamtübersicht sollte jedoch immer alle Immobilien
            berücksichtigen.
          </p>

          <h2 id="sechs-schritte">Bankenreport in sechs Schritten selbst erstellen</h2>

          <h3>Schritt 1: Unterlagen zusammentragen</h3>
          <p>
            Sammle zunächst die aktuellen Unterlagen zu deinen Immobilien und
            Finanzierungen.
          </p>
          <p>
            Dazu gehören insbesondere Kaufverträge, Darlehensverträge, Restschuldnachweise,
            Mietverträge, Abrechnungen und vorhandene Objektunterlagen.
          </p>

          <h3>Schritt 2: Daten einheitlich erfassen</h3>
          <p>
            Lege fest, welche Werte du für jedes Objekt erfassen möchtest. Verwende für
            alle Immobilien dieselben Bezeichnungen und Zeiträume.
          </p>
          <p>
            Mische beispielsweise nicht monatliche und jährliche Werte innerhalb derselben
            Tabelle.
          </p>

          <h3>Schritt 3: Zahlen kontrollieren</h3>
          <p>
            Prüfe, ob Kaufpreise, Mieten, Restschulden und Darlehensraten aktuell sind.
            Restschulden verändern sich durch die laufende Tilgung und sollten nicht
            dauerhaft aus dem ursprünglichen Tilgungsplan übernommen werden, ohne sie zu
            aktualisieren.
          </p>

          <h3>Schritt 4: Gesamtwerte berechnen</h3>
          <p>
            Addiere die Werte der einzelnen Immobilien zu einer Portfolioübersicht.
          </p>
          <p>
            Wichtig ist, dass die Summen in der Übersicht exakt mit den Angaben auf den
            Objektseiten übereinstimmen.
          </p>

          <h3>Schritt 5: Annahmen kennzeichnen</h3>
          <p>
            Markiere Werte, die nicht durch einen aktuellen Nachweis belegt sind.
          </p>
          <p>Das betrifft häufig:</p>
          <ul>
            <li>geschätzte Marktwerte</li>
            <li>zukünftige Mieterhöhungen</li>
            <li>geplante Modernisierungskosten</li>
            <li>erwartete Wertsteigerungen</li>
            <li>steuerliche Berechnungen</li>
          </ul>
          <p>
            So kann der Empfänger zwischen belegten Daten und Annahmen unterscheiden.
          </p>

          <h3>Schritt 6: Als übersichtliches PDF exportieren</h3>
          <p>Der fertige Report sollte als sauberes PDF ausgegeben werden.</p>
          <p>Achte auf:</p>
          <ul>
            <li>einheitliche Tabellen</li>
            <li>gut lesbare Schriftgrößen</li>
            <li>klare Seitentitel</li>
            <li>nachvollziehbare Einheiten</li>
            <li>Erstellungsdatum</li>
            <li>Seitenzahlen</li>
            <li>konsistente Zahlen</li>
            <li>möglichst wenige unnötige Designelemente</li>
          </ul>
          <p>
            Der Report sollte professionell aussehen, aber nicht wie eine Werbebroschüre
            wirken.
          </p>

          <h2 id="excel-oder-software">Bankenreport mit Excel oder Software erstellen?</h2>
          <p>
            Ein Bankenreport lässt sich grundsätzlich mit Excel erstellen. Für ein kleines
            und einfach finanziertes Portfolio kann das vollkommen ausreichend sein.
          </p>
          <p>
            Mit zunehmender Anzahl an Immobilien und Darlehen steigt jedoch der
            Pflegeaufwand.
          </p>

          {/* Comparison table — horizontally scrollable on small screens. */}
          <figure className="not-prose my-6 -mx-6 sm:mx-0 overflow-x-auto px-6 sm:px-0">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border px-4 py-3 text-left font-semibold text-foreground">
                    Kriterium
                  </th>
                  <th className="border-b border-border px-4 py-3 text-left font-semibold text-foreground">
                    Excel
                  </th>
                  <th className="border-b border-border px-4 py-3 text-left font-semibold text-foreground">
                    Spezialisierte Software
                  </th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["Einstieg", "Schnell und günstig", "Erfordert eine kurze Einrichtung"],
                  ["Flexibilität", "Sehr hoch", "Durch vorhandene Datenstruktur begrenzt"],
                  ["Dateneingabe", "Meist vollständig manuell", "Teilweise automatisierbar"],
                  [
                    "Aktualisierung",
                    "Änderungen müssen an mehreren Stellen geprüft werden",
                    "Zentrale Datenbasis",
                  ],
                  [
                    "Fehleranfälligkeit",
                    "Formeln und Verknüpfungen können fehlerhaft sein",
                    "Berechnungen werden einheitlich ausgeführt",
                  ],
                  [
                    "Portfolioauswertung",
                    "Muss selbst aufgebaut werden",
                    "Vordefinierte Kennzahlen und Analysen",
                  ],
                  [
                    "PDF-Report",
                    "Muss gestaltet und gepflegt werden",
                    "Kann standardisiert erstellt werden",
                  ],
                  [
                    "Wiederverwendung",
                    "Abhängig vom Aufbau der Datei",
                    "Für wiederkehrende Anfragen geeignet",
                  ],
                ].map(([kriterium, excel, software]) => (
                  <tr key={kriterium}>
                    <td className="border-b border-border px-4 py-3 align-top font-medium text-foreground">
                      {kriterium}
                    </td>
                    <td className="border-b border-border px-4 py-3 align-top">{excel}</td>
                    <td className="border-b border-border px-4 py-3 align-top">{software}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>

          <p>
            Excel ist besonders geeignet, wenn du nur wenige Objekte besitzt, deine Tabelle
            selbst aufgebaut hast und sie regelmäßig pflegst.
          </p>
          <p>
            Eine spezialisierte Software wird interessanter, wenn du mehrere Immobilien,
            unterschiedliche Darlehen und wiederkehrende Finanzierungsanfragen verwalten
            möchtest.
          </p>

          <h2 id="haeufige-fehler">Häufige Fehler bei der Aufbereitung für Banken</h2>

          <h3>Veraltete Restschulden</h3>
          <p>
            Die ursprüngliche Darlehenssumme ist nicht mit der aktuellen Restschuld
            gleichzusetzen. Verwende möglichst einen aktuellen Stand.
          </p>

          <h3>Kaufpreis und Marktwert werden vermischt</h3>
          <p>
            Der historische Kaufpreis sollte getrennt von einem aktuellen oder geschätzten
            Immobilienwert dargestellt werden.
          </p>

          <h3>Kaltmiete und Warmmiete werden verwechselt</h3>
          <p>
            Für Wirtschaftlichkeitsberechnungen sollte klar erkennbar sein, welche Miete
            verwendet wurde.
          </p>

          <h3>Verpflichtungen werden nicht vollständig berücksichtigt</h3>
          <p>
            Ein Report wirkt wenig glaubwürdig, wenn Darlehen oder laufende Belastungen
            fehlen, die später aus anderen Unterlagen hervorgehen.
          </p>

          <h3>Unterschiedliche Zahlen in verschiedenen Tabellen</h3>
          <p>
            Wenn die Gesamtübersicht andere Werte enthält als die einzelnen Objektseiten,
            entstehen unnötige Rückfragen.
          </p>

          <h3>Schätzungen werden als Fakten dargestellt</h3>
          <p>
            Wertentwicklungen und zukünftige Mieten sind Annahmen. Sie sollten entsprechend
            gekennzeichnet werden.
          </p>

          <h3>Zu viele Informationen ohne klare Struktur</h3>
          <p>
            Ein umfangreicher Ordner mit Dokumenten ist noch kein Bankenreport. Die
            wichtigsten Informationen müssen schnell auffindbar sein.
          </p>

          <h2 id="mit-immotrim">Bankenreport mit Immotrim erstellen</h2>
          <p>
            Immotrim wurde für private Immobilieninvestoren entwickelt, die ihre
            Immobilien- und Finanzierungsdaten nicht bei jeder Anfrage neu in Excel
            übertragen möchten.
          </p>
          <p>Der grundlegende Ablauf ist:</p>
          <ol>
            <li>Vorhandene Immobilien- und Finanzierungsdokumente hochladen</li>
            <li>
              <Link href={`/${locale}/signup`}>Relevante Angaben automatisch auslesen</Link>{" "}
              lassen
            </li>
            <li>Erkannte Daten überprüfen und bei Bedarf korrigieren</li>
            <li>Einzelne Immobilien und das gesamte Portfolio analysieren</li>
            <li>Einen strukturierten Portfolio-Report für Banken erstellen</li>
          </ol>

          <figure className="not-prose my-7">
            <Image
              src="/step3.png"
              alt="Beispielhafte Portfolio-Übersicht für die Bank in Immotrim"
              width={1600}
              height={1200}
              sizes="(max-width: 768px) 100vw, 720px"
              className="w-full rounded-2xl border border-border object-cover shadow-sm"
            />
            <figcaption className="mt-2 text-xs text-muted-foreground">
              Beispielhafte Portfolio-Übersicht in Immotrim als Grundlage für das
              Bankgespräch.
            </figcaption>
          </figure>

          <p>
            Dadurch entsteht eine zentrale Datenbasis, die nicht nur für ein einzelnes
            Bankgespräch verwendet werden kann. Änderungen an Mieten, Darlehen oder
            Immobilienwerten lassen sich im Portfolio aktualisieren und bei einer späteren
            Finanzierungsanfrage erneut verwenden.
          </p>
          <p>
            Immotrim ersetzt dabei weder die Kreditentscheidung der Bank noch alle
            zusätzlich geforderten Nachweise. Das Ziel ist eine andere Aufgabe: dein
            Immobilienportfolio verständlich, konsistent und ohne ständig neu gebaute
            Excel-Tabellen aufzubereiten. Einen Überblick über die Tarife findest du auf
            der Seite <Link href={`/${locale}/pricing`}>Preise</Link>.
          </p>

          {/* Primary Immotrim CTA — links to the real signup route. */}
          <aside className="not-prose my-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6 sm:p-8 text-center">
            <p className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Dein Portfolio bereit für das nächste Bankgespräch
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              Lade deine vorhandenen Unterlagen hoch, prüfe die automatisch erkannten Daten
              und erstelle eine übersichtliche Portfolioauswertung.
            </p>
            <Link
              href={`/${locale}/signup`}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Portfolio in Immotrim aufbereiten
            </Link>
          </aside>

          <h2 id="faq">Häufig gestellte Fragen</h2>

          <h3>Ist ein Bankenreport bei einer Immobilienfinanzierung verpflichtend?</h3>
          <p>
            Es gibt keinen einheitlichen Bankenreport, der bei jeder Immobilienfinanzierung
            verpflichtend ist. Banken verwenden unterschiedliche Prozesse und eigene
            Formulare. Eine zusätzliche Portfolioübersicht kann jedoch dabei helfen, einen
            umfangreichen Immobilienbestand verständlich darzustellen.
          </p>

          <h3>
            Verbessert ein professioneller Bankenreport meine Chancen auf eine
            Finanzierung?
          </h3>
          <p>
            Ein übersichtlicher Report kann die Vorbereitung erleichtern und Rückfragen
            reduzieren. Er verändert jedoch nicht automatisch deine Bonität und garantiert
            weder eine Finanzierungszusage noch bestimmte Konditionen. Die Entscheidung
            hängt unter anderem von Einkommen, Vermögen, Verpflichtungen, Sicherheiten, dem
            neuen Objekt und den Vorgaben der jeweiligen Bank ab.
          </p>

          <h3>Reicht Excel für einen Immobilienreport aus?</h3>
          <p>
            Ja. Bei wenigen Immobilien kann eine gut gepflegte Excel-Datei ausreichend
            sein. Bei mehreren Objekten und Darlehen werden Aktualisierung, Fehlerkontrolle
            und PDF-Erstellung jedoch zunehmend aufwendig.
          </p>

          <h3>Welchen Immobilienwert sollte ich im Report angeben?</h3>
          <p>
            Kaufpreis und aktueller Immobilienwert sollten getrennt dargestellt werden. Bei
            einem geschätzten Marktwert sollte erkennbar sein, wann und auf welcher
            Grundlage die Schätzung vorgenommen wurde.
          </p>

          <h3>Wie aktuell müssen die Daten sein?</h3>
          <p>
            Vor einem Bankgespräch sollten insbesondere Restschulden, Mieten,
            Darlehensraten, verfügbare Liquidität und wesentliche Verpflichtungen überprüft
            werden. Der Report sollte ein gut sichtbares Erstellungs- oder
            Aktualisierungsdatum enthalten.
          </p>

          <h3>Ersetzt der Report die Selbstauskunft der Bank?</h3>
          <p>
            In der Regel nicht. Viele Banken verlangen eine eigene Selbstauskunft und
            zusätzliche Nachweise. Der Portfolio-Report dient als ergänzende, strukturierte
            Übersicht über den Immobilienbestand.
          </p>

          <h2 id="fazit">Fazit</h2>
          <p>
            Ein Bankenreport bringt die wichtigsten Informationen über Immobilien, Darlehen,
            Mieten und Vermögenswerte in eine nachvollziehbare Struktur.
          </p>
          <p>
            Für Investoren mit wenigen Objekten kann eine gepflegte Excel-Datei ausreichen.
            Sobald das Portfolio wächst, unterschiedliche Finanzierungen hinzukommen oder
            regelmäßig neue Bankanfragen gestellt werden, wird eine zentrale
            Softwarelösung deutlich praktischer.
          </p>
          <p>
            Entscheidend ist nicht, möglichst viele Kennzahlen zu zeigen. Der Report sollte
            aktuell, konsistent und verständlich sein. So erhält die Bank einen schnellen
            Überblick und du musst deine Portfoliodaten nicht bei jeder Finanzierung
            vollständig neu aufbereiten.
          </p>
        </div>

        {/* Disclaimer — small but readable. */}
        <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          Dieser Beitrag dient der allgemeinen Information und stellt keine
          Finanzierungs-, Rechts- oder Steuerberatung dar. Welche Unterlagen benötigt
          werden, entscheidet die jeweilige Bank anhand des konkreten
          Finanzierungsvorhabens.
        </p>
      </article>

      <SiteFooter locale={locale} />
    </main>
  );
}
