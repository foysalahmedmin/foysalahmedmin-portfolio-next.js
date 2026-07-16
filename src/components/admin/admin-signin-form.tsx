"use client";

import { Button } from "@/components/ui/button";
import { refreshToken, signIn, signOut } from "@/services/auth.service";
import { Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
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

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl lg:p-12">
        <div className="text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-16 items-center justify-center rounded-2xl">
            <ShieldCheck className="size-8" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Admin Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign in with an authorized administrator account.
          </p>
        </div>

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
      </div>
    </main>
  );
};

export default AdminSignInForm;
