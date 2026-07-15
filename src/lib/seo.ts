import type { Metadata } from "next";

// Builds a self-referencing canonical for a page's own pathname. Relative paths
// resolve against the `metadataBase` set in the root layout. `path` is the route
// (e.g. "" or "/pricing"). The app is German-only with flat URLs, so there are no
// hreflang alternates.
export function alternates(path = ""): NonNullable<Metadata["alternates"]> {
  return {
    canonical: path || "/",
  };
}
