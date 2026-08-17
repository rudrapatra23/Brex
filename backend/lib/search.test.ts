import { describe, expect, it } from "bun:test";
import { buildPrompt, CONTENT_TRIM_LENGTH, trimSearchResults } from "./search";

describe("trimSearchResults", () => {
    it("keeps title and url and trims long content", () => {
        const [result] = trimSearchResults([
            { title: "t", url: "https://a.dev", content: "c".repeat(CONTENT_TRIM_LENGTH + 50) },
        ]);

        expect(result).toEqual({
            title: "t",
            url: "https://a.dev",
            content: "c".repeat(CONTENT_TRIM_LENGTH),
        });
    });

    it("leaves short content untouched and tolerates missing fields", () => {
        expect(trimSearchResults([{ url: "https://a.dev" }, { url: "https://b.dev", content: "x" }])).toEqual([
            { title: undefined, url: "https://a.dev", content: undefined },
            { title: undefined, url: "https://b.dev", content: "x" },
        ]);
    });

    it("returns an empty list when there are no results", () => {
        expect(trimSearchResults([])).toEqual([]);
    });
});

describe("buildPrompt", () => {
    it("substitutes both placeholders", () => {
        const prompt = buildPrompt([{ url: "https://a.dev" }], "why is the sky blue?");

        expect(prompt).toContain(JSON.stringify([{ url: "https://a.dev" }]));
        expect(prompt).toContain("why is the sky blue?");
        expect(prompt).not.toContain("{{WEB_SEARCH_RESULTS}}");
        expect(prompt).not.toContain("{{USER_QUERY}}");
    });

    it("places the results before the query", () => {
        const prompt = buildPrompt([], "query text");
        expect(prompt.indexOf("<WebSearchResults>")).toBeLessThan(prompt.indexOf("query text"));
    });
});
