import type { User } from "@supabase/supabase-js";

export function getGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function getInitials(user: User): string {
  const name = user.user_metadata?.full_name as string | undefined;
  if (name) return name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  return (user.email?.[0] ?? "U").toUpperCase();
}

/** Extract profile picture URL from Supabase OAuth user_metadata.
 *  Google sets avatar_url; GitHub sets avatar_url too (their CDN).
 *  Falls back to null so the initials badge is shown instead.
 */
export function getAvatarUrl(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const url = meta?.avatar_url ?? meta?.picture ?? null;
  return typeof url === "string" && url.length > 0 ? url : null;
}
