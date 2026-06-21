import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { isDemoMode } from "@/lib/env";

type RegisterPageProps = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  if (isDemoMode) redirect("/dashboard");
  const params = await searchParams;
  const callbackUrl = params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//")
    ? params.callbackUrl
    : "/dashboard";

  return (
    <div className="flex min-h-[calc(100vh-86px)] items-center justify-center px-4 py-10">
      <RegisterForm callbackUrl={callbackUrl} />
    </div>
  );
}
