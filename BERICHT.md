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

### 1.5 Offen
1. Blaze-Tarif + Storage aktivieren, Service-Account-Schlüssel erzeugen, `npx vercel login`, dann `bash scripts/go-live.sh <schlüssel.json>`.
2. Nach dem Go-live: mit eigenem Konto (Passwort und Google) einloggen, Bankenübersicht-PDF und Checkout prüfen.
3. Supabase-Projekte erst löschen, wenn alles läuft; `.migration/` danach löschen.
4. Stripe: Robins Abo kündigen und erstatten, Kunden-E-Mails (Rechnungen, Verlängerungserinnerung) einschalten.
5. iPhone-App auf Firebase und den neuen Funktionsumfang umbauen.
6. Lint-Fehler (`any`) in alten Diagramm-Komponenten aufräumen.
