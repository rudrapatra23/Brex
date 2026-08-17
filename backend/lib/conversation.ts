export const SLUG_MAX_LENGTH = 60;
export const TITLE_MAX_LENGTH = 100;

export function slugifyQuery(query: string): string {
    return query
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, SLUG_MAX_LENGTH);
}

export function deriveTitle(query: string): string {
    return query.slice(0, TITLE_MAX_LENGTH);
}

export type MessageRole = "User" | "Assistant";

/** Converts stored conversation messages into ai-sdk chat history. */
export function toChatHistory(
    messages: { role: MessageRole; content: string }[],
): { role: "user" | "assistant"; content: string }[] {
    return messages.map((msg) => ({
        role: msg.role === "User" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
    }));
}
