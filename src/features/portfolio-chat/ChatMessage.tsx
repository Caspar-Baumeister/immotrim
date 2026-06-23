"use client";

import { cn } from "@/lib/utils";
import { ChangeProposalCard } from "./ChangeProposalCard";
import type { ChatMessage as ChatMessageType } from "./types";

// Renders one chat turn. User turns are a right-aligned bubble; assistant turns
// are plain text plus an optional change-proposal card.
export function ChatMessage({
  message,
  onApplied,
}: {
  message: ChatMessageType;
  onApplied?: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap break-words">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {message.text && (
        <div
          className={cn(
            "max-w-[92%] text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed",
          )}
        >
          {message.text}
        </div>
      )}
      {message.proposal && (
        <ChangeProposalCard proposal={message.proposal} onApplied={onApplied} />
      )}
    </div>
  );
}
