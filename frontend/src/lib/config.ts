
export const BACKEND_URL = (() => {
  // In development/build-time, check process.env
  try {
    const url = process?.env?.BUN_PUBLIC_BACKEND_URL;
    if (url) return url;
  } catch {}

  // Browser fallback: use same origin or localhost
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3001";
})().replace(/\/$/, "");