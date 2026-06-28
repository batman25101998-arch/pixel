import type { Metadata } from "next";
import Link from "next/link";
import { Earth, LayoutDashboard, UserCircle } from "lucide-react";
import { auth } from "@/auth";
import { Providers } from "@/components/providers";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { DEMO_USER } from "@/lib/demo";
import { isDemoMode } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Own a Hex of Earth",
  description: "Own and customize a permanent collectible hex on the world map."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html lang="en" className="dark">
      <body>
        <Providers session={session}>
          <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-border/70 bg-background/88 backdrop-blur md:h-[86px]">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 md:h-[86px] md:px-4">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Earth className="h-6 w-6 text-primary md:h-5 md:w-5" />
                <span className="hidden sm:inline">Own a Hex of Earth</span>
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                <Button asChild variant="ghost" size="sm"><Link href="/profile"><UserCircle className="h-4 w-4" /> Profile</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href="/dashboard"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link></Button>
              </nav>
              <div className="flex items-center gap-2">
                {session?.user ? (
                  <>
                    {isDemoMode ? (
                      <Button asChild size="icon" variant="outline" aria-label="Demo profile"><Link href="/profile"><UserCircle className="h-5 w-5" /></Link></Button>
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
          <main className="min-h-screen pt-16 md:pt-[86px]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
