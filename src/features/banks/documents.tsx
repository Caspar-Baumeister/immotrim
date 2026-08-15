import type { SelbstauskunftPayload } from "./types";
import { MbsSelbstauskunftDocument } from "./mbs/MbsSelbstauskunftDocument";
import { ImmotrimSelbstauskunftDocument } from "./selbstauskunft/ImmotrimSelbstauskunftDocument";
import { GENERIC_SELBSTAUSKUNFT_ID } from "./registry";

// Maps a bankId to its Selbstauskunft document component. Adding a bank = add its
// entry here (and to registry.ts). The print page renders the component for the
// job's bankId; unknown ids render nothing.
const BANK_DOCUMENTS: Record<
  string,
  (payload: SelbstauskunftPayload) => React.ReactNode
> = {
  mbs: (payload) => <MbsSelbstauskunftDocument payload={payload} />,
  [GENERIC_SELBSTAUSKUNFT_ID]: (payload) => (
    <ImmotrimSelbstauskunftDocument payload={payload} />
  ),
};

export function renderBankDocument(
  bankId: string,
  payload: SelbstauskunftPayload
): React.ReactNode {
  return BANK_DOCUMENTS[bankId]?.(payload) ?? null;
}
