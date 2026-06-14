import type { Metadata } from "next";
import Link from "next/link";
import { Earth, LayoutDashboard, Shield, Store, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Own a Pixel of Earth",
  description: "Buy, customize, trade, and combine hexagonal pieces of the planet."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Earth className="h-5 w-5 text-primary" />
                <span>Own a Pixel of Earth</span>
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                <Button asChild variant="ghost" size="sm"><Link href="/marketplace"><Store className="h-4 w-4" /> Market</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href="/leaderboard"><Trophy className="h-4 w-4" /> Leaders</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href="/dashboard"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link></Button>
                {session?.user.role === "ADMIN" ? (
                  <Button asChild variant="ghost" size="sm"><Link href="/admin"><Shield className="h-4 w-4" /> Admin</Link></Button>
                ) : null}
              </nav>
              <div className="flex items-center gap-2">
                {session?.user ? (
                  <Button asChild size="sm" variant="outline"><Link href="/api/auth/signout">Sign out</Link></Button>
                ) : (
                  <Button asChild size="sm"><Link href="/sign-in">Sign in</Link></Button>
                )}
              </div>
            </div>
          </header>
          <main className="min-h-screen pt-14">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
