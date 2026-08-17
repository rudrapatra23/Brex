import { PROMPT_TEMPLATE } from "../prompt";

export const CONTENT_TRIM_LENGTH = 500;

export interface SearchResult {
    title?: string;
    url: string;
    content?: string;
}

export interface TrimmedSearchResult {
    title: string | undefined;
    url: string;
    content: string | undefined;
}

/** Keeps prompts small by trimming each result's body text. */
export function trimSearchResults(results: SearchResult[]): TrimmedSearchResult[] {
    return results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, CONTENT_TRIM_LENGTH),
    }));
}

export function buildPrompt(trimmedResults: unknown, query: string): string {
    return PROMPT_TEMPLATE.replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(trimmedResults)).replace(
        "{{USER_QUERY}}",
        query,
    );
}
