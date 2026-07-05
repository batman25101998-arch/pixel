export const PENDING_HEX_PURCHASE_KEY = "pendingHexPurchase";
const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingHexPurchase = {
  h3Index: string;
  title: string;
  message: string;
  externalLink: string;
  uploadedImageUrl: string | null;
  lat: number;
  lng: number;
  createdAt: string;
  uploadWarning?: string;
};

export function savePendingHexPurchase(draft: PendingHexPurchase) {
  window.localStorage.setItem(PENDING_HEX_PURCHASE_KEY, JSON.stringify(draft));
}

export function clearPendingHexPurchase() {
  window.localStorage.removeItem(PENDING_HEX_PURCHASE_KEY);
}

export function getPendingHexPurchase(): PendingHexPurchase | null {
  const stored = window.localStorage.getItem(PENDING_HEX_PURCHASE_KEY);
  if (!stored) return null;

  try {
    const draft = JSON.parse(stored) as Partial<PendingHexPurchase>;
    const createdAt = typeof draft.createdAt === "string" ? Date.parse(draft.createdAt) : Number.NaN;
    const valid =
      typeof draft.h3Index === "string" &&
      typeof draft.title === "string" &&
      typeof draft.message === "string" &&
      typeof draft.externalLink === "string" &&
      typeof draft.lat === "number" &&
      Number.isFinite(draft.lat) &&
      typeof draft.lng === "number" &&
      Number.isFinite(draft.lng) &&
      Number.isFinite(createdAt) &&
      Date.now() - createdAt <= MAX_DRAFT_AGE_MS;

    if (!valid) {
      clearPendingHexPurchase();
      return null;
    }

    return {
      h3Index: draft.h3Index!,
      title: draft.title!,
      message: draft.message!,
      externalLink: draft.externalLink!,
      uploadedImageUrl: typeof draft.uploadedImageUrl === "string" ? draft.uploadedImageUrl : null,
      lat: draft.lat!,
      lng: draft.lng!,
      createdAt: draft.createdAt!,
      uploadWarning: typeof draft.uploadWarning === "string" ? draft.uploadWarning : undefined
    };
  } catch {
    clearPendingHexPurchase();
    return null;
  }
}
