"use client";

import { useEffect, useRef, useState } from "react";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type HexImageUploadProps = {
  hexId: string;
  imageUrl?: string | null;
  disabled?: boolean;
  onImageChange: (imageUrl: string | null) => void;
};

export function HexImageUpload({ hexId, imageUrl, disabled = false, onImageChange }: HexImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [blobAvailable, setBlobAvailable] = useState<boolean | null>(null);
  const [blobUnavailableReason, setBlobUnavailableReason] = useState<"missing" | "placeholder" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkAvailability() {
      try {
        const response = await fetch("/api/upload/status", { cache: "no-store" });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return;
        const data = (await response.json()) as { available?: boolean; reason?: "configured" | "missing" | "placeholder" };
        if (!cancelled && typeof data.available === "boolean") {
          setBlobAvailable(data.available);
          setBlobUnavailableReason(data.reason === "missing" || data.reason === "placeholder" ? data.reason : null);
        }
      } catch {
        // The upload request remains authoritative when this optional check is unavailable.
      }
    }
    void checkAvailability();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(nextFile?: File) {
    setFile(null);
    setPreviewUrl(null);
    setMessage(null);
    if (!nextFile) return;
    if (!ALLOWED_IMAGE_TYPES.includes(nextFile.type)) {
      setMessage("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (nextFile.size <= 0 || nextFile.size > MAX_IMAGE_SIZE) {
      setMessage("Image must be smaller than 5MB.");
      return;
    }
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function upload() {
    if (!file) return;
    setBusy("upload");
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("hexId", hexId);
      formData.set("file", file);
      const response = await fetch("/api/upload/hex-image", { method: "POST", body: formData });
      const data = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.error ?? "Image could not be uploaded.");
      onImageChange(data.imageUrl);
      setFile(null);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      setMessage("Image uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    setMessage(null);
    try {
      const response = await fetch(`/api/upload/hex-image?hexId=${encodeURIComponent(hexId)}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Image could not be removed.");
      onImageChange(null);
      setFile(null);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      setMessage("Image removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image could not be removed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      <div>
        <p className="text-sm font-medium">Hex image</p>
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Maximum 5MB.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
      {previewUrl || imageUrl ? <img src={previewUrl ?? imageUrl ?? ""} alt="Hex image preview" className="aspect-video w-full rounded-md object-cover" /> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" className="h-11 w-full" disabled={disabled || blobAvailable === false || busy !== null} onClick={() => inputRef.current?.click()}>
          <ImageUp className="h-4 w-4" /> Choose image
        </Button>
        <Button type="button" className="h-11 w-full" disabled={disabled || blobAvailable === false || !file || busy !== null} onClick={upload}>
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
          {busy === "upload" ? "Uploading..." : "Upload image"}
        </Button>
      </div>
      {imageUrl ? (
        <Button type="button" variant="outline" className="h-11 w-full text-destructive hover:text-destructive" disabled={disabled || busy !== null} onClick={remove}>
          {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {busy === "remove" ? "Removing..." : "Remove image"}
        </Button>
      ) : null}
      {disabled ? <p className="text-xs text-muted-foreground">Direct image uploads require production storage.</p> : null}
      {!disabled && blobAvailable === false ? (
        <p className="text-xs text-destructive">
          {blobUnavailableReason === "placeholder"
            ? "Image uploads are unavailable because the local Blob token is still a placeholder."
            : "Image uploads are unavailable because BLOB_READ_WRITE_TOKEN is missing locally."}
        </p>
      ) : null}
      {message ? <p className="text-xs text-muted-foreground" aria-live="polite">{message}</p> : null}
    </div>
  );
}
