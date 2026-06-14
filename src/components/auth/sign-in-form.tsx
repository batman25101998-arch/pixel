"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const displayName = String(form.get("displayName") ?? "");

    if (mode === "register") {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName })
      });
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "Registration failed.");
        setBusy(false);
        return;
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (result?.error) {
      setError("Email or password is incorrect.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          {mode === "register" ? (
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" name="displayName" minLength={2} maxLength={40} required />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={busy}>{busy ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}</Button>
        </form>
        <Button className="mt-3 w-full" variant="ghost" onClick={() => setMode(mode === "signin" ? "register" : "signin")}>
          {mode === "signin" ? "Need an account?" : "Already have an account?"}
        </Button>
      </CardContent>
    </Card>
  );
}
