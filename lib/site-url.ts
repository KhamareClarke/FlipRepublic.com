/** Canonical public site URL for emails, redirects, and Stripe return URLs. */
export function getSiteBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://fliprepublic.com";
  return raw.replace(/\/$/, "");
}
