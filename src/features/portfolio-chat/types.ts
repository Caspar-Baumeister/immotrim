import type { FieldUnit } from "@/lib/portfolio-chat/fields";

// Wire protocol between /api/portfolio-chat and the client (newline-delimited
// JSON, one event per line).
export type ChatStreamEvent =
  | { type: "text"; delta: string }
  | { type: "proposal"; proposal: ChangeProposal }
  | { type: "error"; error: string }
  | { type: "done" };

// A proposed single-field change, surfaced to the client as a confirmation card.
// The client passes propertyId/field/newValue straight to the applyPortfolioChange
// server action on accept; the rest is for display.
export type ChangeProposal = {
  id: string;
  propertyId: string;
  propertyName: string;
  field: string;
  unit: FieldUnit;
  oldValue: number | null;
  newValue: number;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  // Set on an assistant message that carries a change proposal.
  proposal?: ChangeProposal;
};

// Request body: the prior turns (for multi-turn context) + the new user message,
// plus optional view context (which property the user currently has open).
export type ChatRequest = {
  messages: { role: ChatRole; text: string }[];
  context?: { propertyId?: string };
};
