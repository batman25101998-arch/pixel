"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Hex = {
  id: string;
  h3Index: string;
  title: string;
  message: string;
  avatarUrl: string | null;
  imageUrl: string | null;
  link: string | null;
};

export function HexEditor({ hex }: { hex: Hex }) {
  const [status, setStatus] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/hexes/${hex.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title")),
        message: String(form.get("message")),
        avatarUrl: String(form.get("avatarUrl") || "") || null,
        imageUrl: String(form.get("imageUrl") || "") || null,
        externalLink: String(form.get("externalLink") || "") || null
      })
    });
    setStatus(response.ok ? "Saved" : "Could not save changes.");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="break-all font-semibold">{hex.h3Index}</h3>
        <span className="text-xs font-medium text-emerald-500">Owned permanently</span>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Collectible title</Label><Input name="title" defaultValue={hex.title} maxLength={80} /></div>
        <div className="space-y-1.5"><Label>Message</Label><Textarea name="message" defaultValue={hex.message} maxLength={240} /></div>
        <div className="space-y-1.5"><Label>External link</Label><Input name="externalLink" type="url" defaultValue={hex.link ?? ""} /></div>
        {hex.imageUrl ? <img src={hex.imageUrl} alt="Collectible preview" className="aspect-video w-full max-w-md rounded-md object-cover" /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Avatar URL</Label><Input name="avatarUrl" type="url" defaultValue={hex.avatarUrl ?? ""} /></div>
          <div className="space-y-1.5"><Label>Image URL</Label><Input name="imageUrl" type="url" defaultValue={hex.imageUrl ?? ""} /></div>
        </div>
        <div className="flex items-center gap-3"><Button><Save className="h-4 w-4" /> Save content</Button>{status ? <span className="text-sm text-muted-foreground">{status}</span> : null}</div>
      </div>
    </form>
  );
}
