"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm({ user }: { user: { displayName: string | null; bio: string | null; avatarUrl: string | null } }) {
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: String(form.get("displayName")),
        bio: String(form.get("bio")),
        avatarUrl: String(form.get("image") || undefined)
      })
    });
    setSaved(response.ok);
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" defaultValue={user.displayName ?? ""} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={user.bio ?? ""} maxLength={180} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="image">Avatar URL</Label>
        <Input id="image" name="image" defaultValue={user.avatarUrl ?? ""} placeholder="https://..." />
      </div>
      <Button>Save profile</Button>
      {saved ? <span className="ml-3 text-sm text-primary">Saved</span> : null}
    </form>
  );
}
