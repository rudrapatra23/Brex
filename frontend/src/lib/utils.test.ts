import { describe, expect, it } from "bun:test";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("lets the last conflicting tailwind class win", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("supports conditional object and array syntax", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });

  it("returns an empty string with no input", () => {
    expect(cn()).toBe("");
  });
});
