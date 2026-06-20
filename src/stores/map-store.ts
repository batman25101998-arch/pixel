import { create } from "zustand";

export type SelectedHex = {
  h3Index: string;
  lng: number;
  lat: number;
  purchased?: {
    id: string;
    ownerName: string;
    ownerImage?: string | null;
    ownerFounderNumber?: number | null;
    ownerKingdomUnlocked?: boolean;
    title?: string;
    message?: string;
    imageUrl?: string | null;
    externalLink?: string | null;
    status?: string;
    priceCents?: number;
  };
};

type MapStore = {
  selectedHex: SelectedHex | null;
  setSelectedHex: (hex: SelectedHex | null) => void;
  refreshToken: number;
  refresh: () => void;
  focusTarget: { lng: number; lat: number; nonce: number } | null;
  focusMap: (lng: number, lat: number) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  selectedHex: null,
  setSelectedHex: (selectedHex) => set({ selectedHex }),
  refreshToken: 0,
  refresh: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
  focusTarget: null,
  focusMap: (lng, lat) => set({ focusTarget: { lng, lat, nonce: Date.now() } })
}));
