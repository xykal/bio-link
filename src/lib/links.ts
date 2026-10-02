const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "sms:"]);

export function isAllowedLinkUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return false;

  try {
    const parsed = new URL(trimmed);
    return (
      ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase()) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}
