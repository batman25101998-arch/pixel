"use client";

import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignInFormProps = {
  googleEnabled: boolean;
  appleEnabled: boolean;
  emailEnabled: boolean;
  callbackUrl: string;
};

export function SignInForm({ googleEnabled, appleEnabled, emailEnabled, callbackUrl }: SignInFormProps) {
  const [busyProvider, setBusyProvider] = useState<"google" | "apple" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function signInWithProvider(provider: "google" | "apple") {
    setBusyProvider(provider);
    setError(null);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setBusyProvider(null);
      setError(`${provider === "google" ? "Google" : "Apple"} sign-in could not be started.`);
    }
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailEnabled) return;

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return;

    setBusyProvider("email");
    setError(null);
    setEmailSent(false);
    try {
      const result = await signIn("email", {
        email,
        callbackUrl,
        redirect: false
      });
      if (result?.error) {
        setError("The sign-in email could not be sent.");
      } else {
        setEmailSent(true);
      }
    } catch {
      setError("The sign-in email could not be sent.");
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2">
          <Button
            className="w-full"
            type="button"
            variant="outline"
            disabled={!googleEnabled || busyProvider !== null}
            onClick={() => signInWithProvider("google")}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold">G</span>
            {busyProvider === "google" ? "Connecting..." : googleEnabled ? "Continue with Google" : "Google unavailable"}
          </Button>
          <Button
            className="w-full"
            type="button"
            variant="outline"
            disabled={!appleEnabled || busyProvider !== null}
            onClick={() => signInWithProvider("apple")}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold">A</span>
            {busyProvider === "apple" ? "Connecting..." : appleEnabled ? "Continue with Apple" : "Continue with Apple - Coming soon"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-3" onSubmit={signInWithEmail}>
          <div className="space-y-1.5">
            <Label htmlFor="magic-link-email">Email</Label>
            <Input
              id="magic-link-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={!emailEnabled || busyProvider !== null}
            />
          </div>
          <Button className="w-full" disabled={!emailEnabled || busyProvider !== null}>
            <Mail className="h-4 w-4" />
            {busyProvider === "email" ? "Sending link..." : emailEnabled ? "Continue with Email" : "Continue with Email - Coming soon"}
          </Button>
        </form>

        {emailSent ? <p className="text-sm text-emerald-400">Check your email for a secure sign-in link.</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
