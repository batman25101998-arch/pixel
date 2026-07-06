import { redirect } from "next/navigation";
import { googleAuthConfigured } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeAuthCallbackUrl } from "@/lib/auth-callback";
import { isDemoMode } from "@/lib/env";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  if (isDemoMode) redirect("/");

  const params = await searchParams;
  const callbackUrl = safeAuthCallbackUrl(params.callbackUrl);
  console.log("[auth] sign-in callbackUrl", callbackUrl);

  return (
    <div className="flex min-h-[calc(100vh-86px)] items-center justify-center px-4 py-10">
      <SignInForm
        callbackUrl={callbackUrl}
        googleEnabled={googleAuthConfigured}
      />
    </div>
  );
}
