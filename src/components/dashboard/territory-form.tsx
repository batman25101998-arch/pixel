"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TerritoryForm({ hexes }: { hexes: { id: string; h3Index: string }[] }) {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const hexIds = hexes.filter((hex) => form.get(hex.id)).map((hex) => hex.id);
    const response = await fetch("/api/territories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name")),
        description: String(form.get("description") ?? ""),
        color: String(form.get("color")),
        hexIds
      })
    });
    const data = await response.json();
    setMessage(response.ok ? "Territory created." : data.error || "Territory could not be created.");
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-[1fr_120px]">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <Input name="color" type="color" defaultValue="#22c55e" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input name="description" maxLength={240} />
      </div>
      <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-border p-3">
        {hexes.map((hex) => (
          <label key={hex.id} className="flex items-center gap-2 text-sm">
            <input name={hex.id} type="checkbox" />
            <span className="break-all">{hex.h3Index}</span>
          </label>
        ))}
      </div>
      <Button>Create territory</Button>
      {message ? <span className="ml-3 text-sm text-muted-foreground">{message}</span> : null}
    </form>
  );
}
