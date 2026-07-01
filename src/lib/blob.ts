import "server-only";

export type BlobTokenStatus = {
  token: string | null;
  prefix: string;
  reason: "configured" | "missing" | "placeholder";
};

export function getBlobTokenStatus(): BlobTokenStatus {
  const value = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
  const prefix = value.slice(0, 20) || "(missing)";
  if (!value) return { token: null, prefix, reason: "missing" };
  if (/x{4,}|replace|your[_-]?token/i.test(value)) {
    return { token: null, prefix, reason: "placeholder" };
  }
  return { token: value, prefix, reason: "configured" };
}

export function getBlobReadWriteToken() {
  return getBlobTokenStatus().token;
}

export function isBlobUploadConfigured() {
  return getBlobReadWriteToken() !== null;
}
