export function safeAuthCallbackUrl(value?: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /^\/api\/auth(?:\/|\?|$)/i.test(value)
  ) {
    return "/";
  }

  return value;
}
