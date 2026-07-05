"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Edit3, Eye, Loader2, Save, X } from "lucide-react";
import { HexImageUpload } from "@/components/hex-image-upload";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Hex = {
  id: string;
  h3Index: string;
  title: string;
  message: string;
  imageUrl: string | null;
  link: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function HexEditor({ hex }: { hex: Hex }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(hex.imageUrl ?? "");
  const location = hex.latitude !== null && hex.longitude !== null
    ? `${hex.latitude.toFixed(4)}, ${hex.longitude.toFixed(4)}`
    : "Location unavailable";

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
          externalLink: String(form.get("externalLink") || "") || null
        })
      });
      const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
      if (!response.ok) throw new Error(apiErrorMessage(data, `Could not save changes (${response.status}).`));
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid gap-4 p-4 sm:grid-cols-[112px_1fr_auto] sm:items-center">
        <div className="aspect-video overflow-hidden rounded-md border border-border bg-[#0b1117] sm:aspect-square">
          {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[#101820]" />}
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-semibold">{hex.title || "Untitled hex"}</h3>
          <p className="truncate text-xs text-muted-foreground">{hex.h3Index}</p>
          <p className="truncate text-xs text-cyan-200">{location}</p>
          {hex.message ? <p className="line-clamp-2 text-sm text-muted-foreground">{hex.message}</p> : <p className="text-sm text-muted-foreground">No message yet.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
          <Button type="button" variant={editing ? "outline" : "default"} size="sm" onClick={() => setEditing((open) => !open)}>
            {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {editing ? "Close" : "Edit"}
          </Button>
          <Button asChild type="button" variant="outline" size="sm">
            <Link href={`/?focusHex=${encodeURIComponent(hex.h3Index)}`}><Eye className="h-4 w-4" /> View on Map</Link>
          </Button>
        </div>
      </div>

      {editing ? (
        <form onSubmit={submit} className="space-y-4 border-t border-border p-4">
          <div className="space-y-1.5"><Label htmlFor={`title-${hex.id}`}>Collectible title</Label><Input id={`title-${hex.id}`} name="title" defaultValue={hex.title} maxLength={80} /></div>
          <div className="space-y-1.5"><Label htmlFor={`message-${hex.id}`}>Message</Label><Textarea id={`message-${hex.id}`} name="message" defaultValue={hex.message} maxLength={240} /></div>
          <div className="space-y-1.5"><Label htmlFor={`link-${hex.id}`}>External link</Label><Input id={`link-${hex.id}`} name="externalLink" type="url" defaultValue={hex.link ?? ""} placeholder="https://..." /></div>
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
