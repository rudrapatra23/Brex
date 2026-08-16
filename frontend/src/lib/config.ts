
const envBackendUrl =
  (typeof process !== "undefined" &&
    (process.env.BUN_PUBLIC_BACKEND_URL ||
      process.env.VITE_BACKEND_URL ||
      process.env.BACKEND_URL)) ||
  (typeof window !== "undefined" ? `${window.location.origin}` : "http://localhost:3001");

export const BACKEND_URL = envBackendUrl.replace(/\/$/, "");