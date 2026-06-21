import { redirect } from "next/navigation";
import { googleAuthConfigured } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { isDemoMode } from "@/lib/env";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  if (isDemoMode) redirect("/dashboard");

  const params = await searchParams;
  const callbackUrl = params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//")
    ? params.callbackUrl
    : "/dashboard";

  return (
    <div className="flex min-h-[calc(100vh-86px)] items-center justify-center px-4 py-10">
      <SignInForm
        callbackUrl={callbackUrl}
        googleEnabled={googleAuthConfigured}
      />
    </div>
  );
}
