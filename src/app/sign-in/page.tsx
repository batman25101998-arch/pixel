import { SignInForm } from "@/components/auth/sign-in-form";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";

export default function SignInPage() {
  if (isDemoMode) redirect("/dashboard");
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <SignInForm />
    </div>
  );
}
