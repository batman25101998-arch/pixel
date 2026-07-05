export function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as { error?: unknown; details?: unknown };
  const messages: string[] = [];
  if (typeof data.error === "string") messages.push(data.error);
  if (typeof data.details === "string") messages.push(data.details);

  for (const value of [data.error, data.details]) {
    const structured = value && typeof value === "object"
      ? value as { formErrors?: unknown; fieldErrors?: unknown }
      : null;
    messages.push(
      ...(Array.isArray(structured?.formErrors) ? structured.formErrors : []),
      ...Object.values(structured?.fieldErrors && typeof structured.fieldErrors === "object" ? structured.fieldErrors : {}).flat()
    );
  }
  const uniqueMessages = [...new Set(messages.filter((message): message is string => typeof message === "string"))];
  return uniqueMessages.length ? uniqueMessages.join(" ") : fallback;
}
