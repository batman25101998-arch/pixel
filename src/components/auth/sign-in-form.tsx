"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignInFormProps = {
  googleEnabled: boolean;
  callbackUrl: string;
};

type BusyProvider = "google" | "credentials" | null;

export function SignInForm({ googleEnabled, callbackUrl }: SignInFormProps) {
  const router = useRouter();
  const [busyProvider, setBusyProvider] = useState<BusyProvider>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setBusyProvider("google");
    setError(null);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setBusyProvider(null);
      setError("Google sign-in could not be started.");
    }
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyProvider("credentials");
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: false
      });
      if (result?.error) {
        setError("Email or password is incorrect.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Sign-in could not be completed.");
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Sign in</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2">
          <Button type="button" variant="outline" disabled={!googleEnabled || busyProvider !== null} onClick={signInWithGoogle}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold">G</span>
            {busyProvider === "google" ? "Connecting..." : googleEnabled ? "Continue with Google" : "Google unavailable"}
          </Button>
        </div>

        <div className="flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-xs uppercase tracking-wide text-muted-foreground">or</span><div className="h-px flex-1 bg-border" /></div>

        <form className="space-y-3" onSubmit={signInWithPassword}>
          <div className="space-y-1.5">
            <Label htmlFor="sign-in-email">Email</Label>
            <Input id="sign-in-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sign-in-password">Password</Label>
            <Input id="sign-in-password" type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <Button className="w-full" disabled={busyProvider !== null}>
            {busyProvider === "credentials" ? "Signing in..." : "Sign in with email"}
          </Button>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account? <Link className="font-medium text-primary hover:underline" href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Register</Link>
        </p>
      </CardContent>
    </Card>
  );
}
