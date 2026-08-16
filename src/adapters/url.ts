export function normalizeIntegrationUrl(value: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Integration URL must use HTTP or HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("Integration URL cannot contain credentials");
  }
  if (url.hash) {
    throw new Error("Integration URL cannot contain a fragment");
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  return url;
}
