-- Objektanalyse (wishlist) rich model.
-- Adds separate Ist-/Soll-Miete plus two JSON blobs:
--   extras  → rich financial inputs (Nebenkosten breakdown, Rücklagen, Leerstand,
--             nicht umlagefähige Kosten, Steuer, Wachstum, Stellplätze)
--   details → descriptive expose metadata (Etage, Hausgeld, Energie, …)
-- Additive + idempotent so it is safe to re-run against a drifted schema.

alter table public.wishlist_properties
  add column if not exists ist_miete numeric,
  add column if not exists soll_miete numeric,
  add column if not exists extras jsonb not null default '{}'::jsonb,
  add column if not exists details jsonb not null default '{}'::jsonb;

-- Backfill the rent split from the previous single kaltmiete value.
update public.wishlist_properties
  set ist_miete = coalesce(ist_miete, kaltmiete),
      soll_miete = coalesce(soll_miete, kaltmiete)
  where kaltmiete is not null;
