"use client";

import { ProfileSectionPage } from "@/features/profile/components/ProfileSectionPage";
import { HAUSHALT_GROUPS } from "@/features/profile/section-config";

export default function HaushaltPage() {
  return (
    <ProfileSectionPage
      section="haushalt"
      title="Haushaltsrechnung"
      description="Einnahmen, Ausgaben und Vermögen — daraus ergibt sich deine monatliche Sparrate und dein mögliches Finanzierungsvolumen."
      help={
        <>
          Die Bank prüft, wie viel dir monatlich nach allen Ausgaben bleibt. Trage
          Nettoeinkommen, laufende Ausgaben und Vermögen ein oder lade{" "}
          <strong>Gehaltsabrechnungen, Kontoauszüge oder eine Depotübersicht</strong>{" "}
          hoch — wir werten sie aus. Der Immobilien-Cashflow wird automatisch aus
          deinen Objekten ergänzt.
        </>
      }
      groups={HAUSHALT_GROUPS}
      uploadTitle="Dokumente hochladen & auswerten"
      uploadHint="Gehaltsabrechnung, Kontoauszüge, Depot-/Vermögensübersicht (PDF/Bild)."
    />
  );
}
