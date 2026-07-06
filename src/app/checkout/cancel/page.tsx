import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CheckoutCancelPageProps = {
  searchParams: Promise<{ hex?: string }>;
};

export default async function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
  const h3Index = (await searchParams).hex;
  const mapHref = h3Index ? `/?hex=${encodeURIComponent(h3Index)}` : "/";

  return (
    <main className="flex min-h-[calc(100vh-86px)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle className="flex items-center gap-2"><XCircle className="h-6 w-6 text-amber-400" />Checkout canceled</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">You were not charged and the hex remains available.</p>
          <Button asChild className="w-full"><Link href={mapHref}>Return to hex</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
