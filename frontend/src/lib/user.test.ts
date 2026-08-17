import { describe, expect, it } from "bun:test";
import type { User } from "@supabase/supabase-js";
import { getAvatarUrl, getGreeting, getInitials } from "./user";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

describe("getGreeting", () => {
  it("greets by time of day", () => {
    expect(getGreeting(new Date(2026, 0, 1, 0, 0))).toBe("Good morning");
    expect(getGreeting(new Date(2026, 0, 1, 11, 59))).toBe("Good morning");
    expect(getGreeting(new Date(2026, 0, 1, 12, 0))).toBe("Good afternoon");
    expect(getGreeting(new Date(2026, 0, 1, 16, 59))).toBe("Good afternoon");
    expect(getGreeting(new Date(2026, 0, 1, 17, 0))).toBe("Good evening");
    expect(getGreeting(new Date(2026, 0, 1, 23, 59))).toBe("Good evening");
  });
});

describe("getInitials", () => {
  it("uses the first two words of the full name", () => {
    expect(getInitials(makeUser({ user_metadata: { full_name: "ada lovelace byron" } }))).toBe("AL");
  });

  it("handles a single-word name", () => {
    expect(getInitials(makeUser({ user_metadata: { full_name: "prince" } }))).toBe("P");
  });

  it("falls back to the email initial", () => {
    expect(getInitials(makeUser({ email: "rudra@example.com" }))).toBe("R");
  });

  it("falls back to U with no name and no email", () => {
    expect(getInitials(makeUser())).toBe("U");
  });
});

describe("getAvatarUrl", () => {
  it("prefers avatar_url", () => {
    expect(
      getAvatarUrl(
        makeUser({ user_metadata: { avatar_url: "https://cdn/a.png", picture: "https://cdn/b.png" } }),
      ),
    ).toBe("https://cdn/a.png");
  });

  it("falls back to picture", () => {
    expect(getAvatarUrl(makeUser({ user_metadata: { picture: "https://cdn/b.png" } }))).toBe(
      "https://cdn/b.png",
    );
  });

  it("returns null when absent, empty or not a string", () => {
    expect(getAvatarUrl(makeUser())).toBeNull();
    expect(getAvatarUrl(makeUser({ user_metadata: { avatar_url: "" } }))).toBeNull();
    expect(getAvatarUrl(makeUser({ user_metadata: { avatar_url: 42 } }))).toBeNull();
  });
});
