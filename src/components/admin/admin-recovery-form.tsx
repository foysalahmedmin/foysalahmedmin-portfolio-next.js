"use client";

import { AuthPanel, AuthStatus } from "@/components/admin/auth-frame";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormControlHelper,
  FormControlLabel,
} from "@/components/ui/form-control";
import { TextLink } from "@/components/ui/text-link";
import { forgetPassword, resetPassword } from "@/services/auth.service";
import { ArrowLeft } from "lucide-react";
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
    <AuthPanel
      title={isReset ? "Choose a new password" : "Recover admin access"}
      description={
        isReset
          ? "Use the one-time recovery link from your email."
          : "Enter the account email. The response will not reveal whether an account exists."
      }
      links={
        <TextLink href="/admin/signin" variant="quiet">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </TextLink>
      }
    >
      <form onSubmit={handleSubmit} className="ca-form" noValidate>
        {isReset ? (
          <>
            <div className="ca-field">
              <FormControlLabel htmlFor="new-password">
                New password
              </FormControlLabel>
              <FormControl
                id="new-password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby="password-requirements"
              />
              <FormControlHelper id="password-requirements">
                Use at least 12 characters with upper- and lowercase letters and
                a number.
              </FormControlHelper>
            </div>
            <div className="ca-field">
              <FormControlLabel htmlFor="confirm-password">
                Confirm new password
              </FormControlLabel>
              <FormControl
                id="confirm-password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="ca-field">
            <FormControlLabel htmlFor="recovery-email">
              Email address
            </FormControlLabel>
            <FormControl
              id="recovery-email"
              required
              maxLength={254}
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        )}

        <AuthStatus error={error} notice={message} />

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? "Submitting…"
            : isReset
              ? "Update password"
              : "Send recovery instructions"}
        </Button>
      </form>
    </AuthPanel>
  );
}
