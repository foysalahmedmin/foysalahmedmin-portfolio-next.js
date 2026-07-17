"use client";

import { Button } from "@/components/ui/button";
import {
  completeMfaEnrollment,
  refreshToken,
  signIn,
  signOut,
  verifyMfa,
} from "@/services/auth.service";
import {
  Check,
  Copy,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type AdminSignInFormProps = {
  returnTo: string;
  canRecoverSession: boolean;
};

const AdminSignInForm = ({
  returnTo,
  canRecoverSession,
}: AdminSignInFormProps) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<
    "credentials" | "enroll" | "verify" | "recovery"
  >("credentials");
  const [verificationCode, setVerificationCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [manualSecret, setManualSecret] = useState("");
  const [issuer, setIssuer] = useState("");
  const [accountName, setAccountName] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<readonly string[]>([]);
  const [codesCopied, setCodesCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canRecoverSession) return;
    let active = true;
    setLoading(true);
    void refreshToken()
      .then(async (response) => {
        if (!active) return;
        if (!response.data.info?.capabilities.includes("admin:access")) {
          await signOut().catch(() => undefined);
          setLoading(false);
          return;
        }
        router.replace(returnTo);
        router.refresh();
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canRecoverSession, returnTo, router]);

  const handleSignin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await signIn({ email, password });
      setPassword("");

      if (response.data.mfa?.required) {
        const mfa = response.data.mfa;
        setStep(mfa.stage);
        setVerificationCode("");
        setUseRecoveryCode(false);
        setManualSecret(mfa.manual_secret ?? "");
        setIssuer(mfa.issuer ?? "");
        setAccountName(mfa.account_name ?? "");
        return;
      }

      if (
        response.success &&
        response.data.info?.capabilities.includes("admin:access")
      ) {
        router.replace(returnTo);
        router.refresh();
        return;
      }

      if (response.success) await signOut().catch(() => undefined);

      setError("Invalid email or password.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response =
        step === "enroll"
          ? await completeMfaEnrollment(verificationCode)
          : await verifyMfa(
              useRecoveryCode
                ? { recovery_code: verificationCode }
                : { code: verificationCode }
            );
      const recovery = response.data.mfa;
      if (
        recovery?.stage === "recovery" &&
        response.data.info?.capabilities.includes("admin:access")
      ) {
        setRecoveryCodes(recovery.recovery_codes);
        setVerificationCode("");
        setManualSecret("");
        setStep("recovery");
        return;
      }
      if (
        response.success &&
        response.data.info?.capabilities.includes("admin:access")
      ) {
        router.replace(returnTo);
        router.refresh();
        return;
      }
      setError("The verification code is invalid or has expired.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCodesCopied(true);
    } catch {
      setError("Copy failed. Save each recovery code manually.");
    }
  };

  const continueToAdmin = () => {
    router.replace(returnTo);
    router.refresh();
  };

  const title =
    step === "credentials"
      ? "Admin Portal"
      : step === "enroll"
        ? "Secure your account"
        : step === "verify"
          ? "Verify your identity"
          : "Save recovery codes";

  const description =
    step === "credentials"
      ? "Sign in with an authorized administrator account."
      : step === "enroll"
        ? "Add this account to an authenticator app, then enter its six-digit code."
        : step === "verify"
          ? "Enter a current authenticator code to finish signing in."
          : "Store these one-time codes securely. They will not be shown again.";

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl lg:p-12">
        <div className="text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-16 items-center justify-center rounded-2xl">
            <ShieldCheck className="size-8" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>

        {step === "credentials" ? (
          <form onSubmit={handleSignin} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="admin-email"
                  className="text-muted-foreground text-xs font-bold tracking-widest uppercase"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-email"
                    required
                    autoComplete="username"
                    inputMode="email"
                    type="email"
                    className="border-border bg-background focus:border-primary w-full rounded-xl border py-3 pr-4 pl-12 transition-colors focus:outline-none"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="admin-password"
                    className="text-muted-foreground text-xs font-bold tracking-widest uppercase"
                  >
                    Password
                  </label>
                  <Link
                    href="/admin/forgot-password"
                    className="text-primary focus-visible:ring-ring rounded-sm text-xs font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-password"
                    required
                    autoComplete="current-password"
                    type="password"
                    className="border-border bg-background focus:border-primary w-full rounded-xl border py-3 pr-4 pl-12 transition-colors focus:outline-none"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-4 text-center text-sm font-medium"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full font-bold tracking-widest uppercase"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              <LogIn className="ml-2 size-4" aria-hidden="true" />
            </Button>
          </form>
        ) : step === "enroll" || step === "verify" ? (
          <form onSubmit={handleMfa} className="mt-8 space-y-6">
            {step === "enroll" && (
              <div className="border-border bg-muted/40 space-y-3 rounded-xl border p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Issuer:</span>{" "}
                  <strong>{issuer}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Account:</span>{" "}
                  <strong className="break-all">{accountName}</strong>
                </p>
                <div>
                  <p className="text-muted-foreground">Manual setup key</p>
                  <code className="mt-1 block font-mono text-base font-bold tracking-wider break-all">
                    {manualSecret}
                  </code>
                </div>
                <p className="text-muted-foreground text-xs">
                  Choose a time-based account with six digits and a 30-second
                  period. Never share this key.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="admin-mfa-code"
                className="text-muted-foreground text-xs font-bold tracking-widest uppercase"
              >
                {useRecoveryCode ? "Recovery code" : "Authenticator code"}
              </label>
              <div className="relative">
                <KeyRound
                  className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="admin-mfa-code"
                  required
                  autoFocus
                  autoComplete={useRecoveryCode ? "off" : "one-time-code"}
                  inputMode={useRecoveryCode ? "text" : "numeric"}
                  pattern={
                    useRecoveryCode
                      ? "[A-Za-z2-7]{8}-?[A-Za-z2-7]{8}"
                      : "[0-9]{6}"
                  }
                  maxLength={useRecoveryCode ? 17 : 6}
                  className="border-border bg-background focus:border-primary w-full rounded-xl border py-3 pr-4 pl-12 font-mono tracking-widest transition-colors focus:outline-none"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.trim())
                  }
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-4 text-center text-sm font-medium"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full font-bold tracking-widest uppercase"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify and sign in"}
              <ShieldCheck className="ml-2 size-4" aria-hidden="true" />
            </Button>

            {step === "verify" && (
              <button
                type="button"
                className="text-primary focus-visible:ring-ring mx-auto block rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => {
                  setUseRecoveryCode((current) => !current);
                  setVerificationCode("");
                  setError("");
                }}
              >
                {useRecoveryCode
                  ? "Use an authenticator code"
                  : "Use a recovery code"}
              </button>
            )}
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div
              className="border-border bg-muted/40 rounded-xl border p-4"
              aria-label="One-time MFA recovery codes"
            >
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {recoveryCodes.map((code) => (
                  <li key={code}>
                    <code className="font-mono text-sm font-bold">{code}</code>
                  </li>
                ))}
              </ul>
            </div>
            {error && (
              <div
                role="alert"
                className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-4 text-center text-sm font-medium"
              >
                {error}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={copyRecoveryCodes}
            >
              {codesCopied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {codesCopied ? "Copied" : "Copy recovery codes"}
            </Button>
            <Button
              type="button"
              size="lg"
              className="w-full font-bold tracking-widest uppercase"
              onClick={continueToAdmin}
            >
              I have saved these codes
            </Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminSignInForm;
