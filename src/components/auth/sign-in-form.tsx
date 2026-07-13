"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeAuthCallbackUrl } from "@/lib/auth-callback";

type SignInFormProps = {
  googleEnabled: boolean;
  callbackUrl: string;
  authError?: string | null;
};

type BusyProvider = "google" | "credentials" | null;

function isInAppBrowser(userAgent: string) {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|Line\/|TikTok|Twitter|GSA|Gmail/i.test(userAgent);
}

export function SignInForm({ googleEnabled, callbackUrl, authError }: SignInFormProps) {
  const router = useRouter();
  const session = useSession();
  const destination = safeAuthCallbackUrl(callbackUrl);
  const googleTimeoutRef = useRef<number | null>(null);
  const navigationStartedRef = useRef(false);
  const [busyProvider, setBusyProvider] = useState<BusyProvider>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError ? "Google sign-in could not be completed. Please try again." : null
  );
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    const detected = isInAppBrowser(userAgent);
    setInAppBrowser(detected);
    if (detected) {
      console.info("[auth] mobile in-app browser detected", {
        origin: window.location.origin,
        userAgent
      });
    }
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") {
      router.replace(destination);
    }
  }, [destination, router, session.status]);

  useEffect(() => {
    const markNavigationStarted = () => {
      navigationStartedRef.current = true;
    };
    window.addEventListener("pagehide", markNavigationStarted);
    window.addEventListener("beforeunload", markNavigationStarted);
    return () => {
      window.removeEventListener("pagehide", markNavigationStarted);
      window.removeEventListener("beforeunload", markNavigationStarted);
      if (googleTimeoutRef.current !== null) window.clearTimeout(googleTimeoutRef.current);
    };
  }, []);

  async function signInWithGoogle() {
    if (busyProvider === "google") return;
    if (inAppBrowser) {
      setError("Open this page in Safari or Chrome to sign in with Google.");
      return;
    }

    setBusyProvider("google");
    setError(null);
    navigationStartedRef.current = false;
    console.info("[auth] google sign-in start", {
      origin: window.location.origin,
      callbackUrl: "/",
      userAgent: window.navigator.userAgent,
      authError: authError ?? null
    });
    if (googleTimeoutRef.current !== null) window.clearTimeout(googleTimeoutRef.current);
    googleTimeoutRef.current = window.setTimeout(() => {
      if (navigationStartedRef.current) return;
      setBusyProvider(null);
      setError("Google sign-in could not start. Please try again in your browser.");
    }, 10000);

    try {
      const result = await signIn("google", {
        callbackUrl: "/",
        redirect: true
      });

      if (result && typeof result === "object" && "error" in result && result.error) {
        if (googleTimeoutRef.current !== null) window.clearTimeout(googleTimeoutRef.current);
        googleTimeoutRef.current = null;
        setBusyProvider(null);
        console.warn("[auth] google sign-in returned error", {
          origin: window.location.origin,
          callbackUrl: "/",
          error: result.error
        });
        setError("Google sign-in could not start. Please try again in your browser.");
      }
    } catch (error) {
      if (googleTimeoutRef.current !== null) window.clearTimeout(googleTimeoutRef.current);
      googleTimeoutRef.current = null;
      setBusyProvider(null);
      console.error("[auth] google sign-in threw", {
        origin: window.location.origin,
        callbackUrl: "/",
        error
      });
      setError("Google sign-in could not start. Please try again in your browser.");
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
        callbackUrl: destination,
        redirect: false
      });
      if (result?.error) {
        setError("Email or password is incorrect.");
        return;
      }
      router.replace(destination);
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
        {inAppBrowser ? (
          <p className="rounded-md border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            Open this page in Safari or Chrome to sign in with Google.
          </p>
        ) : null}
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
          Don&apos;t have an account? <Link className="font-medium text-primary hover:underline" href={`/register?callbackUrl=${encodeURIComponent(destination)}`}>Register</Link>
        </p>
      </CardContent>
    </Card>
  );
}
