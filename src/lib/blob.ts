import "server-only";

export function getBlobReadWriteToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || null;
}

export function isBlobUploadConfigured() {
  return getBlobReadWriteToken() !== null;
}
