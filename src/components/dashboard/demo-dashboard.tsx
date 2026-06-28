"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_USER } from "@/lib/demo";
import { DEMO_STORAGE_EVENT, getDemoOwnedHexes, type DemoHex, updateDemoHexMetadata } from "@/lib/demo-storage";

function DemoHexEditor({ hex }: { hex: DemoHex }) {
  const [status, setStatus] = useState<string | null>(null);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateDemoHexMetadata(hex.h3Index, {
      title: String(form.get("title") ?? ""),
      message: String(form.get("message") ?? ""),
      avatarUrl: String(form.get("avatarUrl") || "") || null,
      imageUrl: String(form.get("imageUrl") || "") || null,
      externalLink: String(form.get("externalLink") || "") || null
    });
    setStatus("Saved");
  }
  return <form onSubmit={save} className="rounded-md border border-border p-4"><div className="flex justify-between gap-3"><p className="break-all font-semibold">{hex.h3Index}</p><span className="text-xs text-emerald-500">Owned permanently</span></div><div className="mt-3 grid gap-3"><div><Label>Title</Label><Input name="title" defaultValue={hex.title} /></div><div><Label>Message</Label><Textarea name="message" defaultValue={hex.message} /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Avatar URL</Label><Input name="avatarUrl" type="url" defaultValue={hex.avatarUrl ?? ""} /></div><div><Label>Image URL</Label><Input name="imageUrl" type="url" defaultValue={hex.imageUrl ?? ""} /></div></div><div><Label>External link</Label><Input name="externalLink" type="url" defaultValue={hex.externalLink ?? ""} /></div>{hex.imageUrl ? <img src={hex.imageUrl} alt="Hex preview" className="aspect-video w-full max-w-md rounded-md object-cover" /> : null}<div className="flex items-center gap-3"><Button>Save content</Button>{status ? <span className="text-sm text-muted-foreground">{status}</span> : null}</div></div></form>;
}

export function DemoDashboard() {
  const [hexes, setHexes] = useState<DemoHex[]>([]);
  useEffect(() => {
    const load = () => setHexes(getDemoOwnedHexes().filter((hex) => hex.ownerId === DEMO_USER.id));
    load();
    window.addEventListener(DEMO_STORAGE_EVENT, load);
    return () => window.removeEventListener(DEMO_STORAGE_EVENT, load);
  }, []);
  return <div className="mx-auto max-w-6xl px-4 py-8"><div className="mb-6"><h1 className="text-3xl font-semibold">{DEMO_USER.name}</h1><p className="text-muted-foreground">Demo profile · permanent collectible ownership</p></div><Card className="mb-5"><CardHeader><CardTitle>{hexes.length} owned hexes</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Demo purchases are saved in this browser.</CardContent></Card><div className="space-y-4">{hexes.length ? hexes.map((hex) => <DemoHexEditor key={hex.id} hex={hex} />) : <Card><CardContent className="pt-5 text-sm text-muted-foreground">Buy a hex from the map to begin.</CardContent></Card>}</div></div>;
}
