"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type UserMenuProps = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
};

export function UserMenu({ name, username, email, image }: UserMenuProps) {
  const label = username || name || email || "Account";
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link href="/profile" aria-label="Open profile">
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={image ?? undefined} alt="" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="hidden min-w-0 max-w-40 leading-tight lg:block">
        <p className="truncate text-sm font-medium">{label}</p>
        {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
      </div>
      <Button
        aria-label="Sign out"
        size="sm"
        type="button"
        variant="outline"
        onClick={() => signOut({ redirectTo: "/" })}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden xl:inline">Sign out</span>
      </Button>
    </div>
  );
}
