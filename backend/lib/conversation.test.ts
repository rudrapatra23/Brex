import { describe, expect, it } from "bun:test";
import {
    deriveTitle,
    SLUG_MAX_LENGTH,
    slugifyQuery,
    TITLE_MAX_LENGTH,
    toChatHistory,
} from "./conversation";

describe("slugifyQuery", () => {
    it("lowercases and hyphenates words", () => {
        expect(slugifyQuery("How Does Bun Test Work")).toBe("how-does-bun-test-work");
    });

    it("collapses runs of punctuation and whitespace into a single hyphen", () => {
        expect(slugifyQuery("what?!  is   go++")).toBe("what-is-go-");
    });

    it("keeps digits", () => {
        expect(slugifyQuery("react 19 release")).toBe("react-19-release");
    });

    it("truncates long queries", () => {
        const slug = slugifyQuery("a".repeat(200));
        expect(slug.length).toBe(SLUG_MAX_LENGTH);
    });

    it("returns an empty slug for a query with no alphanumerics", () => {
        expect(slugifyQuery("!!!")).toBe("-");
    });
});

describe("deriveTitle", () => {
    it("keeps short queries intact", () => {
        expect(deriveTitle("hello world")).toBe("hello world");
    });

    it("truncates to the title limit", () => {
        expect(deriveTitle("x".repeat(500))).toBe("x".repeat(TITLE_MAX_LENGTH));
    });
});

describe("toChatHistory", () => {
    it("maps stored roles onto ai-sdk roles", () => {
        expect(
            toChatHistory([
                { role: "User", content: "q" },
                { role: "Assistant", content: "a" },
            ]),
        ).toEqual([
            { role: "user", content: "q" },
            { role: "assistant", content: "a" },
        ]);
    });

    it("returns an empty history for an empty conversation", () => {
        expect(toChatHistory([])).toEqual([]);
    });
});
