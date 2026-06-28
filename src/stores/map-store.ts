import { create } from "zustand";

export type SelectedHex = {
  h3Index: string;
  lng: number;
  lat: number;
  purchased?: {
    id: string;
    ownerId?: string;
    ownerName: string;
    ownerUsername?: string | null;
    ownerImage?: string | null;
    avatarUrl?: string | null;
    ownerFounderNumber?: number | null;
    ownerKingdomUnlocked?: boolean;
    title?: string;
    message?: string;
    imageUrl?: string | null;
    externalLink?: string | null;
    status?: string;
    priceCents?: number;
    purchaseDate?: string;
  };
};

type MapStore = {
  selectedHex: SelectedHex | null;
  setSelectedHex: (hex: SelectedHex | null) => void;
  refreshToken: number;
  refresh: () => void;
  focusTarget: {
    lng: number;
    lat: number;
    zoom?: number;
    bbox?: [number, number, number, number];
    label?: string;
    nonce: number;
  } | null;
  focusMap: (
    lng: number,
    lat: number,
    options?: { zoom?: number; bbox?: [number, number, number, number]; label?: string }
  ) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  selectedHex: null,
  setSelectedHex: (selectedHex) => set({ selectedHex }),
  refreshToken: 0,
  refresh: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
  focusTarget: null,
  focusMap: (lng, lat, options = {}) => set({ focusTarget: { lng, lat, ...options, nonce: Date.now() } })
}));
