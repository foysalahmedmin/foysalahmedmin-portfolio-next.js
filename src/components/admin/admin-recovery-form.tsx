"use client";

import { Button } from "@/components/ui/button";
import { forgetPassword, resetPassword } from "@/services/auth.service";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type AdminRecoveryFormProps =
  | { mode: "request" }
  | { mode: "reset"; token: string | null };

const recoveryMessage =
  "If an eligible account exists, password reset instructions will be sent.";

export default function AdminRecoveryForm(props: AdminRecoveryFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (props.mode !== "reset") return;
    window.history.replaceState(null, "", "/admin/reset-password");
  }, [props.mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (props.mode === "reset") {
      if (!props.token) {
        setError("This reset link is missing or invalid. Request a new link.");
        return;
      }
      if (password !== confirmation) {
        setError("Passwords do not match.");
        return;
      }
    }

    setPending(true);
    try {
      if (props.mode === "request") {
        await forgetPassword({ email });
        setMessage(recoveryMessage);
        setEmail("");
      } else {
        await resetPassword({ token: props.token!, password });
        setMessage("Password updated. Redirecting to sign in…");
        window.setTimeout(() => router.replace("/admin/signin"), 800);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The request could not be completed. Please try again."
      );
    } finally {
      setPending(false);
    }
  };

  const isReset = props.mode === "reset";

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl lg:p-12">
        <div className="text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-16 items-center justify-center rounded-2xl">
            <ShieldCheck className="size-8" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            {isReset ? "Choose a new password" : "Recover admin access"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isReset
              ? "Use the one-time recovery link from your email."
              : "Enter the account email. The response will not reveal whether an account exists."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {isReset ? (
            <>
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-semibold">
                  New password
                </label>
                <div className="relative">
                  <KeyRound
                    className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    type="password"
                    className="border-border bg-background focus-visible:ring-ring w-full rounded-xl border py-3 pr-4 pl-12 focus-visible:ring-2 focus-visible:outline-none"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-describedby="password-requirements"
                  />
                </div>
                <p
                  id="password-requirements"
                  className="text-muted-foreground text-xs"
                >
                  Use at least 12 characters with upper- and lowercase letters
                  and a number.
                </p>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-semibold"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  type="password"
                  className="border-border bg-background focus-visible:ring-ring w-full rounded-xl border px-4 py-3 focus-visible:ring-2 focus-visible:outline-none"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label htmlFor="recovery-email" className="text-sm font-semibold">
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="recovery-email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  inputMode="email"
                  type="email"
                  className="border-border bg-background focus-visible:ring-ring w-full rounded-xl border py-3 pr-4 pl-12 focus-visible:ring-2 focus-visible:outline-none"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
          )}

          <div aria-live="polite" aria-atomic="true">
            {error ? (
              <p
                role="alert"
                className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm"
              >
                {error}
              </p>
            ) : message ? (
              <p className="border-success/30 bg-success/10 text-foreground rounded-lg border p-4 text-sm">
                {message}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending
              ? "Submitting…"
              : isReset
                ? "Update password"
                : "Send recovery instructions"}
          </Button>
        </form>

        <Link
          href="/admin/signin"
          className="focus-visible:ring-ring mx-auto flex w-fit items-center gap-2 rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
