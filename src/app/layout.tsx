import type { Metadata } from "next";
import Link from "next/link";
import { Earth, LayoutDashboard, Shield, Store, Trophy, UserCircle } from "lucide-react";
import { auth } from "@/auth";
import { Providers } from "@/components/providers";
import { FounderBadge } from "@/components/founder-badge";
import { FounderSpots } from "@/components/founder-spots";
import { KingdomBadge } from "@/components/kingdom-badge";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { getFounderAvailability } from "@/lib/founders";
import { DEMO_USER } from "@/lib/demo";
import { isDemoMode } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Own a Pixel of Earth",
  description: "Buy, customize, trade, and combine hexagonal pieces of the planet."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const founderAvailability = await getFounderAvailability();

  return (
    <html lang="en" className="dark">
      <body>
        <Providers session={session}>
          <header className="fixed inset-x-0 top-0 z-40 h-[86px] border-b border-border/70 bg-background/88 backdrop-blur">
            <div className="mx-auto flex h-[86px] max-w-7xl items-center justify-between px-4">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Earth className="h-5 w-5 text-primary" />
                <span className="hidden sm:inline">Own a Pixel of Earth</span>
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                <Button asChild variant="ghost" size="sm"><Link href="/marketplace"><Store className="h-4 w-4" /> Market</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href="/leaderboard"><Trophy className="h-4 w-4" /> Leaders</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href="/profile"><UserCircle className="h-4 w-4" /> Profile</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href="/dashboard"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link></Button>
                {session?.user.role === "ADMIN" ? (
                  <Button asChild variant="ghost" size="sm"><Link href="/admin"><Shield className="h-4 w-4" /> Admin</Link></Button>
                ) : null}
              </nav>
              <div className="flex items-center gap-2">
                <FounderSpots initialRemaining={founderAvailability.remaining} />
                {session?.user ? (
                  <>
                    <FounderBadge founderNumber={session.user.founderNumber} compact />
                    <KingdomBadge unlocked={session.user.kingdomUnlocked} compact />
                    {isDemoMode ? (
                      <Button asChild size="sm" variant="outline"><Link href="/dashboard">{DEMO_USER.name}</Link></Button>
                    ) : (
                      <UserMenu
                        email={session.user.email}
                        image={session.user.image}
                        name={session.user.name}
                        username={session.user.username}
                      />
                    )}
                  </>
                ) : (
                  <Button asChild size="sm"><Link href="/sign-in">Sign in</Link></Button>
                )}
              </div>
            </div>
          </header>
          <main className="min-h-screen pt-[86px]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
