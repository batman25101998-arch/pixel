export const GA_MEASUREMENT_ID = "G-FY3R58WSPY";

type GtagCommand = "config" | "event";

declare global {
  interface Window {
    gtag?: (command: GtagCommand, targetId: string, params?: Record<string, unknown>) => void;
  }
}

export function isGoogleAnalyticsEnabled() {
  return process.env.NODE_ENV === "production";
}

export function trackPageView(path: string) {
  if (!isGoogleAnalyticsEnabled() || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title
  });
}

export function trackGaEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (!isGoogleAnalyticsEnabled() || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, {
    transport_type: "beacon",
    ...params
  });
}
