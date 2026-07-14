import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Earth, UserCircle } from "lucide-react";
import { auth } from "@/auth";
import { Providers } from "@/components/providers";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { DEMO_USER } from "@/lib/demo";
import { isDemoMode } from "@/lib/env";
import "./globals.css";

const productionUrl = "https://hexofearth.com";
const title = "Own a Hex of Earth | Claim Your Place on Earth Forever";
const description = "Claim your own permanent hex on Earth for just $1. Add your photo, message and personal link. Make your mark and own a unique place on Earth for generations.";

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title,
  description,
  applicationName: "Own a Hex of Earth",
  alternates: { canonical: "/" },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" }
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: productionUrl,
    siteName: "Own a Hex of Earth",
    title: "Claim Your Place on Earth Forever",
    description: "Own a permanent hex on Earth for just $1.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Earth covered by collectible hexes" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Claim Your Place on Earth Forever",
    description: "Own a permanent hex on Earth for just $1.",
    images: ["/og-image.png"]
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b1020"
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
          <footer className="border-t border-border/70 bg-background/95">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>&copy; 2026 Own a Hex of Earth.</p>
              <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal links">
                <Link className="transition hover:text-foreground" href="/privacy">Privacy Policy</Link>
                <Link className="transition hover:text-foreground" href="/terms">Terms of Service</Link>
                <Link className="transition hover:text-foreground" href="/contact">Contact</Link>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
