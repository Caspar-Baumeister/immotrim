"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStream } from "./useChatStream";
import { ChatMessage } from "./ChatMessage";

export function PortfolioChatPanel({
  open,
  onOpenChange,
  currentPropertyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPropertyId?: string;
}) {
  const t = useTranslations("portfolioChat");
  const { messages, status, errorKey, send } = useChatStream(currentPropertyId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest turn in view as text streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft;
    setDraft("");
    void send(text);
  };

  // The property/portfolio pages fetch their data client-side, so router.refresh()
  // wouldn't pick up an applied change. Reload the page to reflect it, after a
  // short beat so the card's "Change applied" confirmation is visible.
  const handleApplied = () => {
    setTimeout(() => window.location.reload(), 700);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const suggestions = [
    t("suggestions.afa"),
    t("suggestions.wealth"),
    t("suggestions.missingData"),
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20 duration-150 supports-backdrop-filter:backdrop-blur-[1px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none duration-150 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 h-14 shrink-0">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <Dialog.Title className="font-heading text-base font-medium">
              {t("title")}
            </Dialog.Title>
            <Dialog.Close
              render={<Button variant="ghost" size="icon-sm" className="ml-auto" />}
            >
              <X />
              <span className="sr-only">{t("close")}</span>
            </Dialog.Close>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="m-auto flex max-w-[92%] flex-col gap-4 py-2">
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span className="flex size-9 items-center justify-center rounded-full bg-amber-500/10">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </span>
                  <h3 className="font-heading text-sm font-medium text-foreground">
                    {t("intro.heading")}
                  </h3>
                  <p className="text-xs text-muted-foreground">{t("intro.lead")}</p>
                </div>

                <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  {[t("intro.can1"), t("intro.can2"), t("intro.can3")].map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      <span className="text-left">{c}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
                  {t("intro.beta")}
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <ChatMessage key={m.id} message={m} onApplied={handleApplied} />
              ))
            )}

            {status === "streaming" && (
              <div className="flex gap-1 text-muted-foreground" aria-hidden>
                <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.2s]" />
                <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.1s]" />
                <span className="size-1.5 rounded-full bg-current animate-bounce" />
              </div>
            )}

            {errorKey && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {t(`errors.${errorKey}`)}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-ring">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={t("placeholder")}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-32 min-h-[1.5rem]"
              />
              <Button
                size="icon-sm"
                onClick={submit}
                disabled={status === "streaming" || draft.trim().length === 0}
                className={cn("shrink-0")}
              >
                <Send />
                <span className="sr-only">{t("send")}</span>
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
