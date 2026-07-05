"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const destination = callbackUrl || "/";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const username = String(form.get("username") ?? "").trim();

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "Account could not be created.");
        return;
      }

      const result = await signIn("credentials", { email, password, callbackUrl: destination, redirect: false });
      if (result?.error) {
        setError("Account created, but automatic sign-in failed. Please sign in.");
        return;
      }
      router.replace(result?.url || destination);
      router.refresh();
    } catch {
      setError("Account could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Create account</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={register}>
          <div className="space-y-1.5"><Label htmlFor="register-username">Username</Label><Input id="register-username" name="username" minLength={3} maxLength={40} pattern="[A-Za-z0-9_]+" autoComplete="username" required /></div>
          <div className="space-y-1.5"><Label htmlFor="register-email">Email</Label><Input id="register-email" name="email" type="email" autoComplete="email" required /></div>
          <div className="space-y-1.5"><Label htmlFor="register-password">Password</Label><Input id="register-password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={busy}>{busy ? "Creating account..." : "Create account"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">Already have an account? <Link className="font-medium text-primary hover:underline" href={`/sign-in?callbackUrl=${encodeURIComponent(destination)}`}>Sign in</Link></p>
      </CardContent>
    </Card>
  );
}
