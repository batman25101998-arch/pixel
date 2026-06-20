"use client";

import { FormEvent, useState } from "react";
import { Save, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/utils";

type Hex = {
  id: string;
  h3Index: string;
  title: string;
  message: string;
  avatarUrl: string | null;
  imageUrl: string | null;
  link: string | null;
  status: "OWNED" | "FOR_SALE" | "LOCKED" | "BANNED" | "AVAILABLE";
  priceCents: bigint | number;
};

export function HexEditor({ hex }: { hex: Hex }) {
  const [saved, setSaved] = useState(false);
  const [salePrice, setSalePrice] = useState(Number(hex.priceCents) / 100);
  const salePriceCents = Math.max(100, Math.round((Number.isFinite(salePrice) ? salePrice : 0) * 100));
  const platformFeeCents = Math.round(salePriceCents * 0.05);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const price = Math.max(100, Math.round(Number(form.get("salePriceDollars")) * 100));
    const response = await fetch(`/api/hexes/${hex.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title")),
        message: String(form.get("message")),
        avatarUrl: String(form.get("avatarUrl") || "") || null,
        imageUrl: String(form.get("imageUrl") || "") || null,
        externalLink: String(form.get("externalLink") || "") || null,
        status: form.get("forSale") ? "FOR_SALE" : "OWNED",
        priceCents: price
      })
    });
    setSaved(response.ok);
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="break-all font-semibold">{hex.h3Index}</h3>
        <span className="text-xs text-muted-foreground">{hex.status === "FOR_SALE" ? "For sale" : "Owned"}</span>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Collectible title</Label><Input name="title" defaultValue={hex.title} maxLength={80} /></div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea name="message" defaultValue={hex.message} maxLength={240} />
        </div>
        <div className="space-y-1.5"><Label>External link</Label><Input name="externalLink" type="url" defaultValue={hex.link ?? ""} /></div>
        {hex.imageUrl ? <img src={hex.imageUrl} alt="Collectible preview" className="aspect-video w-full max-w-md rounded-md object-cover" /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Avatar URL</Label>
            <Input name="avatarUrl" defaultValue={hex.avatarUrl ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input name="imageUrl" defaultValue={hex.imageUrl ?? ""} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm">
            <input name="forSale" type="checkbox" defaultChecked={hex.status === "FOR_SALE"} />
            List for resale
          </label>
          <div className="space-y-1.5">
            <Label>Price</Label>
            <Input name="salePriceDollars" type="number" min={1} step={1} value={salePrice} onChange={(event) => setSalePrice(Number(event.target.value))} />
            <p className="text-xs text-muted-foreground">
              Platform fee: {money(platformFeeCents)}. Estimated payout: {money(salePriceCents - platformFeeCents)}
            </p>
          </div>
          <Button><Save className="h-4 w-4" />Save</Button>
          <Button type="button" variant="outline"><Tag className="h-4 w-4" />Territory-ready</Button>
          {saved ? <span className="text-sm text-primary">Saved</span> : null}
        </div>
      </div>
    </form>
  );
}
