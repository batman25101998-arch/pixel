import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexEditor } from "@/components/dashboard/hex-editor";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { DemoDashboard } from "@/components/dashboard/demo-dashboard";
import { isDemoMode } from "@/lib/env";

export default async function DashboardPage() {
  if (isDemoMode) return <DemoDashboard />;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { ownedHexes: { orderBy: { purchaseDate: "desc" } } }
  });
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[340px_1fr]">
      <Card className="h-fit">
        <CardHeader><CardTitle>Owner profile</CardTitle></CardHeader>
        <CardContent className="space-y-4"><div className="text-sm"><p className="font-medium">@{user.username}</p><p className="text-muted-foreground">{user.email}</p></div><ProfileForm user={user} /></CardContent>
      </Card>
      <div className="space-y-5">
        <Card><CardHeader><CardTitle>{user.ownedHexes.length} owned hexes</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Every purchased hex is yours permanently. Customize each one below.</CardContent></Card>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Your collectible hexes</h2>
          {user.ownedHexes.length ? user.ownedHexes.map((hex) => <HexEditor key={hex.id} hex={hex} />) : <Card><CardContent className="pt-5 text-sm text-muted-foreground">You have not purchased a hex yet.</CardContent></Card>}
        </section>
      </div>
    </div>
  );
}
