"use client";

import { FormEvent, useState } from "react";
import { Edit3, Loader2, Save, X } from "lucide-react";
import { HexImageUpload } from "@/components/hex-image-upload";
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(hex.imageUrl ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/hexes/${hex.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(form.get("title")),
          message: String(form.get("message")),
          avatarUrl: String(form.get("avatarUrl") || "") || null,
          imageUrl: imageUrl || null,
          externalLink: String(form.get("externalLink") || "") || null
        })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save changes.");
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{hex.title || hex.h3Index}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{hex.h3Index}</p>
        </div>
        <Button type="button" variant={editing ? "outline" : "default"} size="sm" onClick={() => setEditing((open) => !open)}>
          {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
          {editing ? "Close" : "Edit"}
        </Button>
      </div>

      {editing ? (
        <form onSubmit={submit} className="space-y-4 border-t border-border p-4">
          <div className="space-y-1.5"><Label htmlFor={`title-${hex.id}`}>Collectible title</Label><Input id={`title-${hex.id}`} name="title" defaultValue={hex.title} maxLength={80} /></div>
          <div className="space-y-1.5"><Label htmlFor={`message-${hex.id}`}>Message</Label><Textarea id={`message-${hex.id}`} name="message" defaultValue={hex.message} maxLength={240} /></div>
          <div className="space-y-1.5"><Label htmlFor={`link-${hex.id}`}>External link</Label><Input id={`link-${hex.id}`} name="externalLink" type="url" defaultValue={hex.link ?? ""} placeholder="https://..." /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor={`avatar-${hex.id}`}>Avatar URL</Label><Input id={`avatar-${hex.id}`} name="avatarUrl" type="url" defaultValue={hex.avatarUrl ?? ""} placeholder="https://..." /></div>
            <div className="space-y-1.5"><Label htmlFor={`image-${hex.id}`}>Image URL</Label><Input id={`image-${hex.id}`} name="imageUrl" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></div>
          </div>
          <HexImageUpload hexId={hex.id} imageUrl={imageUrl || null} onImageChange={(nextImageUrl) => setImageUrl(nextImageUrl ?? "")} />
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={saving} className="min-h-11">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save changes"}
            </Button>
            {status ? <span className="text-sm text-muted-foreground" aria-live="polite">{status}</span> : null}
          </div>
        </form>
      ) : null}
    </article>
  );
}
