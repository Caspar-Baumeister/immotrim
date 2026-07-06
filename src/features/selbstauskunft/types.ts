import type { SaMissing, SaStatus } from "@/lib/selbstauskunft/completeness";
import type { SaDocType } from "@/lib/selbstauskunft/requirements";

// A property as shown in the funnel's tile grid. Returned by /api/selbstauskunft/sort
// and re-derived client-side from saved properties on reload (same shape).
export type FlowProperty = {
  id: string;
  name: string;
  address: string | null;
  status: SaStatus;
  reportReady: boolean;
  missing: SaMissing[];
  hint: string | null;
  docCount: number;
  docTypes: SaDocType[];
};
