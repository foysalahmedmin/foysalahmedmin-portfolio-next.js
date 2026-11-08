"use client";

import { AuthPanel, AuthStatus } from "@/components/admin/auth-frame";
import { Button } from "@/components/ui/button";
import { FormControl, FormControlLabel } from "@/components/ui/form-control";
import { TextLink } from "@/components/ui/text-link";
import {
  completeMfaEnrollment,
  refreshToken,
  signIn,
  signOut,
  verifyMfa,
} from "@/services/auth.service";
import { Check, Copy } from "lucide-react";
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
    <AuthPanel title={title} description={description}>
      {step === "credentials" ? (
        <form onSubmit={handleSignin} className="ca-form">
          <div className="ca-field">
            <FormControlLabel htmlFor="admin-email">
              Email address
            </FormControlLabel>
            <FormControl
              id="admin-email"
              required
              autoComplete="username"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="ca-field">
            <div className="ca-label-row">
              <FormControlLabel htmlFor="admin-password">
                Password
              </FormControlLabel>
              <TextLink
                href="/admin/forgot-password"
                variant="quiet"
                className="ca-quiet"
              >
                Forgot password?
              </TextLink>
            </div>
            <FormControl
              id="admin-password"
              required
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <AuthStatus error={error} />

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      ) : step === "enroll" || step === "verify" ? (
        <form onSubmit={handleMfa} className="ca-form">
          {step === "enroll" && (
            <div className="ca-box glass-inner">
              <p>
                <span className="ca-key">Issuer:</span>{" "}
                <strong>{issuer}</strong>
              </p>
              <p>
                <span className="ca-key">Account:</span>{" "}
                <strong className="break-all">{accountName}</strong>
              </p>
              <div>
                <p className="ca-key">Manual setup key</p>
                <code className="ca-secret">{manualSecret}</code>
              </div>
              <p className="ca-key">
                Choose a time-based account with six digits and a 30-second
                period. Never share this key.
              </p>
            </div>
          )}

          <div className="ca-field">
            <FormControlLabel htmlFor="admin-mfa-code">
              {useRecoveryCode ? "Recovery code" : "Authenticator code"}
            </FormControlLabel>
            <FormControl
              id="admin-mfa-code"
              required
              autoFocus
              autoComplete={useRecoveryCode ? "off" : "one-time-code"}
              inputMode={useRecoveryCode ? "text" : "numeric"}
              pattern={
                useRecoveryCode ? "[A-Za-z2-7]{8}-?[A-Za-z2-7]{8}" : "[0-9]{6}"
              }
              maxLength={useRecoveryCode ? 17 : 6}
              className="ca-code"
              value={verificationCode}
              onChange={(event) =>
                setVerificationCode(event.target.value.trim())
              }
            />
          </div>

          <AuthStatus error={error} />

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify and sign in"}
          </Button>

          {step === "verify" && (
            <button
              type="button"
              className="ca-linkbtn link-draw"
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
        <div className="ca-form">
          <div
            role="group"
            className="ca-box glass-inner ca-codes"
            aria-label="One-time MFA recovery codes"
          >
            <ul>
              {recoveryCodes.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
          </div>
          <AuthStatus error={error} />
          <div className="ca-actions">
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
              className="w-full"
              onClick={continueToAdmin}
            >
              I have saved these codes
            </Button>
          </div>
        </div>
      )}
    </AuthPanel>
  );
};

export default AdminSignInForm;
