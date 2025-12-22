"use client";

import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/redux/hooks";
import { setAuth } from "@/redux/slices/auth-slice";
import { signIn } from "@/services/auth.service";
import { Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const AdminLoginPage = () => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            const res = await signIn({ email, password });
            if (res.success && res.data) {
                dispatch(setAuth({
                    is_authenticated: true,
                    info: res.data.info,
                    token: res.data.token
                }));
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
        <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
            <div className="w-full max-w-md space-y-8 rounded-3xl border border-border bg-card p-8 shadow-2xl lg:p-12">
                <div className="text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ShieldCheck className="size-8" />
                    </div>
                    <h1 className="mt-6 text-3xl font-bold tracking-tight">Admin Portal</h1>
                    <p className="text-muted-foreground mt-2">Please sign in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <input
                                    required
                                    type="email"
                                    className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 focus:border-primary focus:outline-none transition-all"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <input
                                    required
                                    type="password"
                                    className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 focus:border-primary focus:outline-none transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive border border-destructive/20 text-center">
                            {error}
                        </div>
                    )}

                    <Button type="submit" size="lg" className="w-full font-bold uppercase tracking-widest" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                        <LogIn className="ml-2 size-4" />
                    </Button>
                </form>
            </div>
        </main>
    );
};

export default AdminLoginPage;
