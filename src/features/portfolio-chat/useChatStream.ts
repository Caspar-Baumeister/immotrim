"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatStreamEvent } from "./types";

export type ChatStatus = "idle" | "streaming" | "error";

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// Owns the ephemeral conversation state and the NDJSON stream read loop for the
// portfolio chat. History lives only for the lifetime of this hook (v1: no
// persistence). `errorKey` is an i18n key under `portfolioChat.errors`.
export function useChatStream(currentPropertyId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const busyRef = useRef(false);
  // Mirror of the committed messages, so send() can build the request body
  // synchronously without depending on a setState updater having run yet.
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  // Keep the latest "currently viewing" property id available to send() without
  // re-creating the callback.
  const propertyIdRef = useRef(currentPropertyId);
  useEffect(() => {
    propertyIdRef.current = currentPropertyId;
  }, [currentPropertyId]);

  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, ...patch, text: patch.text ?? m.text } : m,
      ),
    );
  }, []);

  const appendText = useCallback((id: string, delta: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)),
    );
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return;
      busyRef.current = true;
      setErrorKey(null);
      setStatus("streaming");

      const userMsg: ChatMessage = { id: uid(), role: "user", text: trimmed };
      const assistantId = uid();
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", text: "" };

      // Build the request body from the committed history + this user turn
      // (excludes the empty assistant turn we add for streaming into).
      const history = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        const res = await fetch("/api/portfolio-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            context: propertyIdRef.current ? { propertyId: propertyIdRef.current } : undefined,
          }),
        });

        if (res.status === 429) {
          patchMessage(assistantId, { text: "" });
          setErrorKey("limit");
          setStatus("error");
          return;
        }
        if (!res.ok || !res.body) {
          setErrorKey("failed");
          setStatus("error");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            let event: ChatStreamEvent;
            try {
              event = JSON.parse(line) as ChatStreamEvent;
            } catch {
              continue;
            }
            if (event.type === "text") appendText(assistantId, event.delta);
            else if (event.type === "proposal") patchMessage(assistantId, { proposal: event.proposal });
            else if (event.type === "error") {
              setErrorKey(event.error === "busy" ? "busy" : "failed");
              setStatus("error");
            }
          }
        }
        setStatus((s) => (s === "error" ? s : "idle"));
      } catch {
        setErrorKey("failed");
        setStatus("error");
      } finally {
        busyRef.current = false;
      }
    },
    [appendText, patchMessage],
  );

  return { messages, status, errorKey, send };
}
