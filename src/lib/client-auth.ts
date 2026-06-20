import { getProviders, signIn } from "next-auth/react";

export async function startGoogleSignIn(callbackUrl: string) {
  const providers = await getProviders();
  if (providers?.google) {
    await signIn("google", { redirectTo: callbackUrl });
    return;
  }

  window.location.assign(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
