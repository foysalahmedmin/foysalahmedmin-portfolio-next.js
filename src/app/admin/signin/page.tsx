"use client";

import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/redux/hooks";
import { setAuth } from "@/redux/slices/auth-slice";
import { signIn } from "@/services/auth.service";
import { Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const AdminSigninPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn({ email, password });
      if (res.success && res.data) {
        dispatch(
          setAuth({
            is_authenticated: true,
            info: res.data.info,
          })
        );
        router.push("/admin");
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl lg:p-12">
        <div className="text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-16 items-center justify-center rounded-2xl">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Admin Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            Please sign in to your account
          </p>
        </div>

        <form onSubmit={handleSignin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                Email Address
              </label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
                <input
                  required
                  type="email"
                  className="border-border bg-background focus:border-primary w-full rounded-xl border py-3 pr-4 pl-12 transition-all focus:outline-none"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
                <input
                  required
                  type="password"
                  className="border-border bg-background focus:border-primary w-full rounded-xl border py-3 pr-4 pl-12 transition-all focus:outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-4 text-center text-sm font-medium">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full font-bold tracking-widest uppercase"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
            <LogIn className="ml-2 size-4" />
          </Button>
        </form>
      </div>
    </main>
  );
};

export default AdminSigninPage;
