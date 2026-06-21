import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(value: number | bigint) {
  return numberFormatter.format(value);
}

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}
