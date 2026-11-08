"use client";

import { useState } from "react";
import { saveDisplayName } from "@/lib/account-actions";

export function DisplayNameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(false);

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-3">
      <h2 className="font-semibold">Name auf der Bankenübersicht</h2>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await saveDisplayName(name);
          setSaved(true);
        }}
      >
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder="Vor- und Nachname"
          className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-[#6c5ce7]/60"
        />
        <button
          type="submit"
          className="rounded-lg border border-border text-sm font-medium px-4 py-2 hover:bg-accent transition-colors"
        >
          {saved ? "Gespeichert" : "Speichern"}
        </button>
      </form>
    </section>
  );
}
