"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRightLeft,
  Ban,
  CircleDollarSign,
  Flag,
  Hexagon,
  ImageOff,
  Map,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Undo2,
  UserRoundCheck,
  Users
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FounderBadge } from "@/components/founder-badge";
import { KingdomBadge } from "@/components/kingdom-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminDashboardData } from "@/lib/admin-dashboard";
import { money } from "@/lib/utils";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function initials(value: string) {
  return value.slice(0, 2).toUpperCase();
}

export function AdminDashboard({ initialData }: { initialData: AdminDashboardData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [banReasons, setBanReasons] = useState<Record<string, string>>({});
  const maxSales = Math.max(...data.sales.map((point) => point.revenueCents), 1);
  const maxHeat = Math.max(...data.heatmap.map((point) => point.count), 1);

  const metrics = useMemo(() => [
    { label: "Users", value: data.metrics.users.toLocaleString(), icon: Users },
    { label: "Banned", value: data.metrics.bannedUsers.toLocaleString(), icon: Ban },
    { label: "Purchased hexes", value: data.metrics.hexes.toLocaleString(), icon: Hexagon },
    { label: "Territories", value: data.metrics.territories.toLocaleString(), icon: Flag },
    { label: "Transactions", value: data.metrics.transactions.toLocaleString(), icon: ReceiptText },
    { label: "Gross sales", value: money(data.metrics.grossRevenueCents), icon: CircleDollarSign },
    { label: "Platform fees", value: money(data.metrics.platformFeesCents), icon: ShieldCheck },
    { label: "Refunded", value: money(data.metrics.refundedCents), icon: Undo2 }
  ], [data.metrics]);

  async function runAction(key: string, request: () => Promise<Response>, successMessage: string) {
    setBusy(key);
    setFeedback(null);
    try {
      const response = await request();
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Action failed.");
      const refreshed = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (refreshed.ok) setData(await refreshed.json());
      setFeedback(successMessage);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function searchTransactions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("query") ?? "");
    setBusy("search");
    try {
      const response = await fetch(`/api/admin/dashboard?q=${encodeURIComponent(query)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Search failed.");
      setData(result);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setBusy(null);
    }
  }

  async function transferOwnership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runAction(
      "ownership",
      () => fetch("/api/admin/hexes/ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hexIdentifier: String(form.get("hexIdentifier")),
          ownerIdentifier: String(form.get("ownerIdentifier")),
          reason: String(form.get("reason"))
        })
      }),
      "Hex ownership updated."
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm uppercase tracking-wide text-secondary">
            <ShieldCheck className="h-4 w-4" /> Administration
          </p>
          <h1 className="mt-1 text-3xl font-semibold">World operations</h1>
        </div>
        {feedback ? <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">{feedback}</p> : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-secondary" />
              </div>
              <p className="mt-2 truncate text-xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-secondary" /> Sales, 30 days</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-64 items-end gap-1 border-b border-l border-border px-2 pt-4">
              {data.sales.length ? data.sales.map((point) => (
                <div key={point.day} className="flex min-w-0 flex-1 items-end self-stretch" title={`${formatDate(point.day)}: ${money(point.revenueCents)} from ${point.count} sales`}>
                  <div
                    className="w-full bg-emerald-500/80 transition-colors hover:bg-emerald-400"
                    style={{ height: `${Math.max(4, (point.revenueCents / maxSales) * 100)}%` }}
                  />
                </div>
              )) : <p className="m-auto text-sm text-muted-foreground">No completed sales in this period.</p>}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{data.sales[0] ? new Date(data.sales[0].day).toLocaleDateString() : ""}</span>
              <span>{data.sales.at(-1) ? new Date(data.sales.at(-1)!.day).toLocaleDateString() : ""}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Map className="h-4 w-4 text-secondary" /> Ownership heatmap</CardTitle></CardHeader>
          <CardContent>
            <div className="relative aspect-[2/1] overflow-hidden rounded-md border border-border bg-[#071525]">
              <div className="absolute inset-x-0 top-1/2 border-t border-slate-700/60" />
              <div className="absolute inset-y-0 left-1/2 border-l border-slate-700/60" />
              {data.heatmap.map((point) => (
                <span
                  key={`${point.latitude}-${point.longitude}`}
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200 bg-amber-400"
                  style={{
                    left: `${((point.longitude + 180) / 360) * 100}%`,
                    top: `${((90 - point.latitude) / 180) * 100}%`,
                    opacity: Math.max(0.3, point.count / maxHeat)
                  }}
                  title={`${point.latitude}°, ${point.longitude}°: ${point.count} hexes, ${money(point.valueCents)}`}
                />
              ))}
              {!data.heatmap.length ? <p className="absolute inset-0 grid place-items-center text-sm text-slate-400">No ownership data yet.</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-secondary" /> User moderation</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-y border-border bg-muted/20 text-left text-muted-foreground">
                <tr><th className="px-4 py-2">User</th><th>Role</th><th>Hexes</th><th>Status</th><th>Reason</th><th className="pr-4 text-right">Action</th></tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-b border-border/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl ?? undefined} /><AvatarFallback>{initials(user.displayName)}</AvatarFallback></Avatar>
                        <div>
                          <div className="flex items-center gap-2"><p className="font-medium">{user.displayName}</p><FounderBadge founderNumber={user.founderNumber} compact /><KingdomBadge unlocked={user.kingdomUnlocked} compact /></div>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{user.role}</td>
                    <td>{user.ownedHexes.toLocaleString()}</td>
                    <td className={user.bannedAt ? "text-destructive" : "text-emerald-400"}>{user.bannedAt ? "Banned" : "Active"}</td>
                    <td className="w-56 py-2">
                      <Input
                        className="h-8"
                        disabled={Boolean(user.bannedAt) || user.role === "ADMIN"}
                        value={banReasons[user.id] ?? ""}
                        onChange={(event) => setBanReasons((current) => ({ ...current, [user.id]: event.target.value }))}
                        placeholder={user.banReason ?? "Reason"}
                      />
                    </td>
                    <td className="pr-4 text-right">
                      <Button
                        size="sm"
                        variant={user.bannedAt ? "outline" : "destructive"}
                        disabled={busy === user.id || user.role === "ADMIN"}
                        title={user.bannedAt ? "Unban user" : "Ban user"}
                        onClick={() => void runAction(
                          user.id,
                          () => fetch(`/api/admin/users/${user.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ banned: !user.bannedAt, reason: banReasons[user.id] ?? "" })
                          }),
                          user.bannedAt ? "User restored." : "User banned."
                        )}
                      >
                        {user.bannedAt ? <UserRoundCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        {user.bannedAt ? "Unban" : "Ban"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="h-4 w-4 text-secondary" /> Change hex ownership</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={transferOwnership}>
              <div className="space-y-1.5"><Label>Hex ID or H3 index</Label><Input name="hexIdentifier" required /></div>
              <div className="space-y-1.5"><Label>New owner ID, email, or username</Label><Input name="ownerIdentifier" required /></div>
              <div className="space-y-1.5"><Label>Reason</Label><Input name="reason" minLength={3} maxLength={240} required /></div>
              <Button disabled={busy === "ownership"} className="w-full"><ArrowRightLeft className="h-4 w-4" /> Transfer ownership</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ImageOff className="h-4 w-4 text-secondary" /> Image moderation</CardTitle></CardHeader>
          <CardContent className="max-h-[520px] space-y-2 overflow-auto">
            {data.images.length ? data.images.map((image) => (
              <div key={`${image.targetType}-${image.targetId}-${image.field}`} className="flex items-center gap-3 border-b border-border/70 py-3 last:border-0">
                <img src={image.url} alt="Moderation preview" className="h-14 w-14 rounded-md border border-border object-cover" />
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-medium">{image.ownerName}</p><FounderBadge founderNumber={image.ownerFounderNumber} compact /><KingdomBadge unlocked={image.ownerKingdomUnlocked} compact /></div><p className="truncate text-xs text-muted-foreground">{image.label} · {image.field}</p></div>
                <Button
                  size="icon"
                  variant="destructive"
                  title="Remove image"
                  disabled={busy === `${image.targetId}-${image.field}`}
                  onClick={() => void runAction(
                    `${image.targetId}-${image.field}`,
                    () => fetch("/api/admin/images", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(image)
                    }),
                    "Image removed."
                  )}
                ><ImageOff className="h-4 w-4" /></Button>
              </div>
            )) : <p className="text-sm text-muted-foreground">No uploaded images.</p>}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><RefreshCcw className="h-4 w-4 text-secondary" /> Payment refunds</CardTitle></CardHeader>
          <CardContent className="max-h-[520px] space-y-2 overflow-auto">
            {data.payments.length ? data.payments.map((payment) => (
              <div key={payment.id} className="flex items-center gap-3 border-b border-border/70 py-3 last:border-0">
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-medium">{payment.userName} · {money(payment.amountCents)}</p><FounderBadge founderNumber={payment.userFounderNumber} compact /><KingdomBadge unlocked={payment.userKingdomUnlocked} compact /></div><p className="truncate text-xs text-muted-foreground">{payment.userEmail} · {formatDate(payment.createdAt)}</p></div>
                <span className={payment.status === "REFUNDED" ? "text-xs text-amber-400" : "text-xs text-emerald-400"}>{payment.status}</span>
                <Button
                  size="sm"
                  variant="outline"
                  title="Refund payment"
                  disabled={payment.status !== "SUCCEEDED" || !payment.providerPaymentIntent || busy === payment.id}
                  onClick={() => {
                    if (!window.confirm(`Refund ${money(payment.amountCents)} to ${payment.userName}?`)) return;
                    void runAction(payment.id, () => fetch(`/api/admin/payments/${payment.id}/refund`, { method: "POST" }), "Payment refunded.");
                  }}
                ><Undo2 className="h-4 w-4" /> Refund</Button>
              </div>
            )) : <p className="text-sm text-muted-foreground">No refundable payments.</p>}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-5 overflow-hidden">
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4 text-secondary" /> Transactions</CardTitle>
          <form className="flex w-full max-w-lg gap-2" onSubmit={searchTransactions}>
            <Input name="query" placeholder="ID, H3 index, buyer, seller" />
            <Button size="icon" title="Search transactions" disabled={busy === "search"}><Search className="h-4 w-4" /></Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-y border-border bg-muted/20 text-left text-muted-foreground"><tr><th className="px-4 py-2">Buyer</th><th>Seller</th><th>Hex</th><th>Type</th><th>Amount</th><th>Status</th><th className="pr-4">Date</th></tr></thead>
            <tbody>{data.transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-border/70">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><p className="font-medium">{transaction.buyerName}</p><FounderBadge founderNumber={transaction.buyerFounderNumber} compact /><KingdomBadge unlocked={transaction.buyerKingdomUnlocked} compact /></div><p className="text-xs text-muted-foreground">{transaction.buyerEmail}</p></td>
                <td><span className="inline-flex items-center gap-2">{transaction.sellerName ?? "Platform"}<FounderBadge founderNumber={transaction.sellerFounderNumber} compact /><KingdomBadge unlocked={transaction.sellerKingdomUnlocked} compact /></span></td><td className="max-w-44 truncate">{transaction.h3Index}</td><td>{transaction.type.replaceAll("_", " ")}</td><td>{money(transaction.amountCents)}</td><td>{transaction.status}</td><td className="pr-4">{formatDate(transaction.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table>
          {!data.transactions.length ? <p className="p-5 text-sm text-muted-foreground">No matching transactions.</p> : null}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-secondary" /> Admin activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.auditLog.length ? data.auditLog.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 py-2 text-sm last:border-0">
              <span className="inline-flex flex-wrap items-center gap-2"><strong>{entry.adminName}</strong><FounderBadge founderNumber={entry.adminFounderNumber} compact /><KingdomBadge unlocked={entry.adminKingdomUnlocked} compact /> · {entry.action.replaceAll("_", " ").toLowerCase()} · {entry.targetType} {entry.targetId}</span>
              <span className="text-muted-foreground">{formatDate(entry.createdAt)}</span>
            </div>
          )) : <p className="text-sm text-muted-foreground">No administrative actions recorded.</p>}
        </CardContent>
      </Card>
    </main>
  );
}
