"use client";

import { ProfileSectionPage } from "@/features/profile/components/ProfileSectionPage";
import { STAMMDATEN_GROUPS } from "@/features/profile/section-config";

export default function StammdatenPage() {
  return (
    <ProfileSectionPage
      section="stammdaten"
      title="Stammdaten"
      description="Deine persönlichen Angaben — sie werden in jede Bank-Selbstauskunft übernommen."
      help={
        <>
          Banken benötigen zuerst deine Person: Name, Anschrift, Familienstand und
          Beschäftigung. Fülle die Felder aus oder lade{" "}
          <strong>Personalausweis, Meldebescheinigung oder Gehaltsabrechnung</strong>{" "}
          hoch — wir lesen die Angaben automatisch aus und du übernimmst sie mit
          einem Klick.
        </>
      }
      groups={STAMMDATEN_GROUPS}
      uploadTitle="Dokumente hochladen & auswerten"
      uploadHint="Personalausweis, Meldebescheinigung, Gehaltsabrechnung oder Arbeitsvertrag (PDF/Bild)."
    />
  );
}
