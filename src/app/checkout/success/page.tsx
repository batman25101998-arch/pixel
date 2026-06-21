import { redirect } from "next/navigation";
import { CheckoutSuccess } from "@/components/checkout/checkout-success";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const sessionId = (await searchParams).session_id;
  if (!sessionId) redirect("/");

  return (
    <main className="flex min-h-[calc(100vh-86px)] items-center justify-center px-4 py-10">
      <CheckoutSuccess sessionId={sessionId} />
    </main>
  );
}
