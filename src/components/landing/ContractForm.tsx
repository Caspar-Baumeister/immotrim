"use client";

import { CircleCheck, Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import {
  CONTACT_EMAIL,
  CONTRACT_LABEL,
  LIMITS,
  declarationLines,
  formatDateTime,
  type CancelType,
  type CancelWhen,
  type ContractDeclaration,
  type ContractKind,
} from "@/lib/contract";

const INPUT =
  "w-full rounded-lg border border-border bg-[#1b1b1b] px-3 py-2.5 text-[15px] text-[var(--ink)] outline-none transition-colors focus:border-[#6c5ce7]";
const LABEL = "mb-1.5 block text-sm font-medium text-muted-foreground";

/**
 * The confirmation page behind "Verträge hier kündigen" (§ 312k BGB) and
 * "Vertrag widerrufen" (§ 356a BGB). Public, no sign in, and it asks only
 * for what the law allows: who, which contract, and for a cancellation its
 * kind and date. After sending, the declaration is shown with date and time
 * so it can be printed or saved, and a receipt goes out by mail.
 */
export function ContractForm({ kind }: { kind: ContractKind }) {
  const cancel = kind === "cancel";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cancelType, setCancelType] = useState<CancelType>("ordinary");
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState<CancelWhen>("asap");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: string; receivedAt: number; data: ContractDeclaration } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (cancel && when === "date" && !date) {
      setError("Bitte wähl das Datum, zu dem du kündigen möchtest.");
      return;
    }
    const data: ContractDeclaration = {
      kind,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      ...(cancel
        ? {
            cancelType,
            ...(cancelType === "extraordinary" && reason.trim() ? { reason: reason.trim() } : {}),
            when,
            ...(when === "date" ? { date } : {}),
          }
        : {}),
    };
    setBusy(true);
    try {
      const res = await fetch("/api/vertrag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; receivedAt?: number; error?: string };
      if (!res.ok || !body.id || !body.receivedAt) throw new Error(body.error ?? `http-${res.status}`);
      setDone({ id: body.id, receivedAt: body.receivedAt, data });
      window.scrollTo({ top: 0 });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(
        code === "rate-limited"
          ? "Zu viele Versuche. Bitte warte ein paar Minuten."
          : code === "email"
            ? "Bitte gib eine gültige E-Mail-Adresse an."
            : code === "name"
              ? "Bitte gib deinen Namen an."
              : code === "date"
                ? "Bitte wähl ein gültiges Datum."
                : `Das hat nicht geklappt. Bitte versuch es nochmal oder schreib an ${CONTACT_EMAIL}.`,
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6c5ce7]/15 text-[var(--violet)]">
          <CircleCheck size={22} strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-[var(--ink)]">
          {cancel ? "Deine Kündigung ist eingegangen" : "Dein Widerruf ist eingegangen"}
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Eingegangen am {formatDateTime(done.receivedAt)}. Eine Bestätigung mit allen Angaben geht an {done.data.email}.
        </p>
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--faint)]">Deine Erklärung</p>
          <dl className="mt-3 grid gap-2 text-[15px]">
            {declarationLines(done.data).map((line) => (
              <div key={line.label} className="grid gap-0.5 sm:grid-cols-[180px_1fr] sm:gap-3">
                <dt className="text-muted-foreground">{line.label}</dt>
                <dd className="whitespace-pre-line break-words text-[var(--ink)]">{line.value}</dd>
              </div>
            ))}
            <div className="grid gap-0.5 sm:grid-cols-[180px_1fr] sm:gap-3">
              <dt className="text-muted-foreground">Eingangsnummer</dt>
              <dd className="break-all text-[var(--ink)]">{done.id}</dd>
            </div>
          </dl>
        </div>
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-white/5 print:hidden"
          onClick={() => window.print()}
        >
          <Printer size={15} strokeWidth={1.75} />
          Drucken oder als PDF speichern
        </button>
        <p className="mt-5 text-sm leading-relaxed text-[var(--faint)]">
          Kommt in den nächsten Minuten keine Mail an, schau im Spam nach oder schreib an {CONTACT_EMAIL}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--faint)]">Vertrag</p>
      <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--ink)] md:text-[40px]">
        {cancel ? "Verträge hier kündigen" : "Vertrag widerrufen"}
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {cancel
          ? "Hier kündigst du dein Abo bei Immotrim, ohne Anmeldung. Den Eingang bestätigen wir dir sofort per Mail, mit Datum und Uhrzeit."
          : "Hier widerrufst du dein Abo bei Immotrim, ohne Anmeldung. Das geht innerhalb von 14 Tagen nach Abschluss. Den Eingang bestätigen wir dir sofort per Mail, mit Datum und Uhrzeit."}
      </p>

      <div className="mt-8 grid gap-5">
        <div>
          <span className={LABEL}>Vertrag</span>
          <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-[15px] text-[var(--ink)]">{CONTRACT_LABEL}</div>
        </div>

        <label className="block">
          <span className={LABEL}>Dein Name</span>
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={LIMITS.name} required />
        </label>

        <label className="block">
          <span className={LABEL}>E-Mail</span>
          <input
            className={INPUT}
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={LIMITS.email}
            required
          />
          <span className="mt-1.5 block text-sm text-[var(--faint)]">
            Die E-Mail-Adresse deines Immotrim-Kontos. Dorthin schicken wir die Bestätigung.
          </span>
        </label>

        {cancel ? (
          <>
            <fieldset>
              <legend className={LABEL}>Art der Kündigung</legend>
              <div className="grid gap-2">
                <Choice
                  name="cancelType"
                  checked={cancelType === "ordinary"}
                  onChange={() => setCancelType("ordinary")}
                  title="Ordentliche Kündigung"
                  text="Zum Ende des laufenden Zeitraums."
                />
                <Choice
                  name="cancelType"
                  checked={cancelType === "extraordinary"}
                  onChange={() => setCancelType("extraordinary")}
                  title="Außerordentliche Kündigung"
                  text="Aus wichtigem Grund, ohne Frist."
                />
              </div>
            </fieldset>

            {cancelType === "extraordinary" ? (
              <label className="block">
                <span className={LABEL}>Grund (freiwillig)</span>
                <textarea className={INPUT} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={LIMITS.reason} />
              </label>
            ) : null}

            <fieldset>
              <legend className={LABEL}>Zeitpunkt</legend>
              <div className="grid gap-2">
                <Choice name="when" checked={when === "asap"} onChange={() => setWhen("asap")} title="Zum nächstmöglichen Zeitpunkt" />
                <Choice name="when" checked={when === "date"} onChange={() => setWhen("date")} title="Zu einem bestimmten Datum">
                  {when === "date" ? (
                    <input
                      className={`${INPUT} mt-2 max-w-[220px]`}
                      type="date"
                      min={today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      aria-label="Datum"
                      required
                    />
                  ) : null}
                </Choice>
              </div>
            </fieldset>
          </>
        ) : null}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#6c5ce7] text-[16px] font-semibold text-white transition-colors hover:bg-[#7b6cf0] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {cancel ? "Jetzt kündigen" : "Widerruf bestätigen"}
        </button>

        <p className="text-sm leading-relaxed text-[var(--faint)]">
          Wir speichern deine Angaben als Nachweis. Mehr in der{" "}
          <Link href="/datenschutz" className="text-muted-foreground underline-offset-2 hover:text-[var(--ink)] hover:underline">
            Datenschutzerklärung
          </Link>
          .{" "}
          {cancel ? "Innerhalb von 14 Tagen nach Abschluss kannst du stattdessen auch " : "Nach den 14 Tagen kannst du "}
          <Link href={cancel ? "/widerrufen" : "/kuendigen"} className="text-muted-foreground underline-offset-2 hover:text-[var(--ink)] hover:underline">
            {cancel ? "widerrufen" : "kündigen"}
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

function Choice({
  name,
  checked,
  onChange,
  title,
  text,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
        checked ? "border-[#6c5ce7]/50 bg-[#6c5ce7]/10" : "border-border bg-card hover:border-[var(--line-strong)]"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 shrink-0 accent-[#6c5ce7]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-[var(--ink)]">{title}</span>
        {text ? <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span> : null}
        {children}
      </span>
    </label>
  );
}
