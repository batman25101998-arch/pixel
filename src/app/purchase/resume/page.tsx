import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ResumePurchase } from "@/components/purchase/resume-purchase";

export default async function ResumePurchasePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Fpurchase%2Fresume");
  return <ResumePurchase />;
}
