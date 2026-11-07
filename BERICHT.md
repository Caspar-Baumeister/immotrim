# Immotrim Web: Bericht

## 1. Relaunch auf Firebase (06.11.2026)

### 1.1 Entscheidungen
- Immotrim macht nur noch drei Dinge: Unterlagen hochladen und auslesen, Portfolio mit Kennzahlen sehen, Bankenübersicht herunterladen. Entfernt: Selbstauskunft, Banken, Objekte/Wunschliste, Strategie, Haushalt, Stammdaten, Checkliste, Teilen, Mobile-API, Chat, YouTube-Video.
- Supabase durch Firebase ersetzt. Projekt `immo-2d39f` (umbenannt in „Immotrim“), weil das Google-Konto keine neuen Projekte mehr anlegen darf. Firestore in Frankfurt (`europe-west3`). Nur eine Live-Datenbank, kein Staging.
- Vercel bleibt das Hosting (www.immotrim.com).
- Preismodell: kostenlos 1 Immobilie mit allen Kennzahlen und 3 Dokumentauswertungen im Monat. Plus (Stripe, monatlich oder jährlich): unbegrenzt Immobilien, 300 Auswertungen, Bankenübersicht als PDF. Grundlage: Robins Feedback „erst testen, dann zahlen“.
- Altdaten werden umgezogen: 15 Nutzer (gleiche IDs, Passwörter als bcrypt-Hash, Google-Konten), 12 Objekte, 18 Objektdokumente, Abo-Status. Selbstauskunftsdaten (Ausweise, Kontoauszüge, IBAN, Geburtsdaten) bleiben bewusst zurück.
- iPhone-App folgt in einer eigenen Runde (hängt noch an Supabase).

### 1.2 Neu
- Dashboard: Kennzahlen plus Karte „Was dein Vermögen gerade bewegt“ (Tilgung, Cashflow, Wertsteigerung, Inflation auf die Schulden, Eigenkapitalhebel, Mieterhöhung, Nachbeleihung bis 80 %).
- Bankenübersicht `/bankuebersicht`: Kacheln (Marktwert, Restschuld, Eigenkapital, Beleihungsauslauf, Ø Zins, Jahreskaltmiete, Kapitaldienst, Kapitaldienstdeckung, Bruttomietrendite, Cashflow, Wohnfläche) und Objekttabelle, Stand heute, ohne Prognosen. PDF im A4-Querformat.
- Restschuld überall monatsgenau (vorher Jahresende, wich von der App ab).
- Konto: Name für die Bankenübersicht, Stripe-Kundenportal (Rechnungen, Kündigung), Konto selbst löschen (kündigt Stripe-Abo, löscht Daten, Dateien und Login).
- Neue Startseite („Mach deine Immobilien so übersichtlich wie Aktien“, sechs Kräfte, Diagramm-Karussell), neue Preisseite, Datenschutzerklärung für Firebase, Adresse Dernburgstraße 7.
- Google-Login läuft über immotrim.com (Rewrite `/__/auth`), OAuth-Client um beide Domains ergänzt. Firebase-Mails auf Deutsch, Absendername Immotrim.

### 1.3 Getestet (lokal gegen Firebase-Emulatoren)
Registrierung, Login per Session-Cookie, Immobilie anlegen, bearbeiten, löschen, Gratis-Grenze ab der zweiten Immobilie, Upload direkt in den Speicher, KI-Auslesen mit Gemini (Kaltmiete, Wohnfläche, Baujahr aus Test-PDF), Download, Bankenübersicht als HTML und PDF, Kontolöschung, Umzugsskript mit dem echten Export (15/15 Nutzer, 12 Objekte, 18/18 Dokumente). `tsc` sauber, `next build` läuft durch.
Nicht getestet: Stripe-Checkout (Klick vom Sicherheitsfilter blockiert, Code unverändert bis auf den Datenzugriff), bcrypt-Passwörter (der Emulator kann keine importierten Hashes prüfen; live ist das der offizielle Weg).

### 1.4 Stolpersteine
- Firebase-Emulatoren brauchen JDK 21 (`/opt/homebrew/opt/openjdk@21`) und laufen auf eigenen Ports (9299, 8288, 9399, UI 4100), weil auf den Standardports ein anderes Projekt läuft.
- `Firestore.settings()` darf nur einmal laufen; Flag auf `globalThis`.
- Eigene Aktions-URL für Passwort-Mails hat Firebase abgelehnt; nach dem Go-live erneut versuchen (`https://www.immotrim.com/__/auth/action`).

### 1.5 Go-live (06.11.2026, abends)
- Storage-Bucket `immo-2d39f.firebasestorage.app` in europe-west3 angelegt (Produktionsmodus, danach eigene Regeln deployt).
- `scripts/go-live.sh` lief komplett: Regeln, Export, Umzug (15 Konten, 12 Objekte, 18 von 18 Dokumenten), `FIREBASE_SERVICE_ACCOUNT` in Vercel (Production), Push auf main.
- Vercel-Projekt ist `immotrim-ypn7` im Team `caspar-baumeister-team`; lokal jetzt per `vercel link` verknüpft.
- Stolperstein: Nach dem ersten Deploy lieferten alle Seiten mit Auth 500. `firebase-admin` 14 zieht `jwks-rsa` 4, das die reine ESM-Bibliothek `jose` 6 per `require` lädt; die Vercel-Laufzeit kann das nicht (lokal mit Node 24 ging es). Fix: `overrides` auf `jwks-rsa@^3.2.0` (nutzt `jose` 4). Mit `node --no-experimental-require-module` lokal nachgestellt und geprüft.
- Live geprüft: Startseite, Login, Registrieren, Rechtstexte antworten 200, `/dashboard` leitet ohne Sitzung auf den Login.

### 1.6 Offen
1. Mit eigenem Konto (Passwort und Google) einloggen, Bankenübersicht-PDF und Checkout prüfen.
2. Eigene Aktions-URL für Passwort-Mails (`https://www.immotrim.com/__/auth/action`) noch einmal versuchen.
3. Supabase-Projekte erst löschen, wenn alles läuft; `.migration/` danach löschen. Service-Account-JSON aus Downloads an einen sicheren Ort verschieben.
4. Stripe: Robins Abo kündigen und erstatten, Kunden-E-Mails (Rechnungen, Verlängerungserinnerung) einschalten.
5. iPhone-App auf Firebase und den neuen Funktionsumfang umbauen.
6. Lint-Fehler (`any`) in alten Diagramm-Komponenten aufräumen.

## 2. Update: Landingpage im Pairspace-Stil, Kündigen und Widerrufen (07.11.2026)

### 2.1 Landingpage
- Dunkel wie joinpairspace.com, Tokens im Scope `.landing` (`globals.css`), damit Diagramme und Preiskarten ohne Änderung mitziehen. Gilt für `/`, `/pricing`, `/kuendigen`, `/widerrufen`. App und Rechtstexte bleiben hell.
- Aufbau: große linksbündige Headline, Dashboard-Fenster mit Demo-Portfolio (Kennzahlen zählen hoch, Kräfte füllen sich, Diagramm wächst), Erklärvideo, Bierdeckel gegen Kräfte-Balken, sechs Kräfte, Upload-Loop, Grafik-Karussell, Bank-Loop, drei Versprechen plus Karte mit echten Stripe-Preisen.
- Videos mit Remotion in `~/Code/immotrim-promo` (eigenes Repo, Vorlage pairspace-promo): `immotrim-promo.mp4` (31 s, 4,3 MB), `upload.mp4` und `bank.mp4` (je 9 s, nahtlose Loops). `npm run render` dort schreibt direkt nach `public/video`. Demo-Zahlen stehen in `src/components/landing/demo.ts` und im Video gleich.
- `HowItWorksSteps` und die alten Landing-Animationen (Selbstauskunft, Schritte) gelöscht.

### 2.2 Kündigen und Widerrufen (§ 312k, § 356a BGB)
- Fehlte bisher, ist für ein online verkauftes Abo an Verbraucher Pflicht. Portiert von Pairspace: `/kuendigen` und `/widerrufen` ohne Anmeldung, Links in jedem Footer und auf `/account`.
- `POST /api/vertrag`: prüft die Eingaben, höchstens 5 Versuche pro IP in 10 Minuten, speichert `contractRequests/{id}`, kündigt ein Stripe-Abo zum Periodenende, wenn die Mail zu einem Konto mit Abo gehört. Widerrufe erstattest du von Hand.
- Eingangsbestätigung per Mail über Resend (`src/lib/mail.ts`), Kopie an dich. **Ohne `RESEND_API_KEY` geht keine Mail raus**, die Erklärung steht dann nur auf der Seite und in Firestore (`mail.person = "not-configured"`). Das Gesetz verlangt die Bestätigung per Mail, siehe Offen.
- Datenschutz um Abschnitt 8a und Resend ergänzt.
- Lokal getestet: gültige Kündigung und gültiger Widerruf gespeichert, Name und Datum werden geprüft, Rate-Limit greift. Die automatische Kündigung bei Stripe ist nicht live getestet.

### 2.3 Stripe-Konto wird geteilt
- Pairspace, inredia und Immotrim hängen am selben Stripe-Konto, jeder Webhook bekommt alle Events. Der Immotrim-Webhook hätte für Käufe in Pairspace über `metadata.user_id` Dokumente in Firestore angelegt. Jetzt zählt nur noch eine uid, die in Immotrims Firebase Auth existiert (`isImmotrimUser`). Geprüft: Live-Firestore hat 15 Nutzer und 15 Dokumente, nichts Fremdes.
- Die Gegenrichtung (Pairspace bekommt Immotrim-Events) ist als eigene Aufgabe angelegt.

### 2.4 Live (07.11.2026)
- Auf Caspars OK auf main gebracht, Startseite, Preise, Kündigen, Widerrufen und Videos antworten live mit 200.
- Mails: Resend-Schlüssel von Pairspace (darf nur senden) als `RESEND_API_KEY`, Absender `MAIL_FROM = Immotrim <immotrim@joinpairspace.com>`, weil immotrim.com in Resend noch keine Domain ist. Live getestet mit einem Widerruf auf Caspars Adresse: beide Mails `sent`, Testeintrag danach gelöscht.
- Robin: Abo gekündigt und erstattet (von Caspar).

### 2.5 Offen
1. Mit eigenem Konto einloggen (Passwort und Google), PDF und Checkout prüfen.
2. Später: immotrim.com in Resend als Domain anlegen (braucht Caspars Resend-Login), dann `MAIL_FROM` auf `Immotrim <hallo@immotrim.com>` umstellen. DNS-Einträge setze ich per Vercel-CLI.
3. Stripe-Kundenmails (Rechnungen, Verlängerungserinnerung) einschalten.
4. Danach Supabase-Projekte und `.migration/` löschen, Service-Account-JSON aus Downloads wegräumen.
5. iPhone-App vor jeder neuen Einreichung auf Firebase umstellen.
