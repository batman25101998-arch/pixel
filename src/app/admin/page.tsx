import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  if (session.user.role !== "ADMIN") redirect("/");

  const [users, hexes, territories, revenue, recentTransactions] = await Promise.all([
    prisma.user.count(),
    prisma.hex.count(),
    prisma.territory.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.aggregate({ where: { status: "COMPLETED" }, _sum: { amountCents: true }, _count: true }),
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { email: true, displayName: true } },
        hex: { select: { h3Index: true } }
      }
    })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">Admin</p>
      <h1 className="mb-6 text-3xl font-semibold">World operations</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>{users}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Users</CardContent></Card>
        <Card><CardHeader><CardTitle>{hexes}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Purchased hexes</CardContent></Card>
        <Card><CardHeader><CardTitle>{territories}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Territories</CardContent></Card>
        <Card><CardHeader><CardTitle>{money(Number(revenue._sum.amountCents ?? 0))}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Revenue</CardContent></Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Owner</th>
                <th className="py-2">Hex</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-border">
                  <td className="py-3">{transaction.buyer.displayName ?? transaction.buyer.email}</td>
                  <td className="break-all py-3">{transaction.hex.h3Index}</td>
                  <td className="py-3">{money(Number(transaction.amountCents))}</td>
                  <td className="py-3">{transaction.status}</td>
                  <td className="py-3">{transaction.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
