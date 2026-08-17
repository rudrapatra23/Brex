import { describe, expect, it } from "bun:test";
import { askSchema, deleteConversationSchema, followUpSchema } from "./schemas";

describe("askSchema", () => {
    it("trims the query", () => {
        expect(askSchema.parse({ query: "  hello  " })).toEqual({ query: "hello" });
    });

    it("rejects empty or whitespace-only queries", () => {
        expect(askSchema.safeParse({ query: "" }).success).toBe(false);
        expect(askSchema.safeParse({ query: "   " }).success).toBe(false);
    });

    it("rejects queries over 2000 characters and accepts the limit", () => {
        expect(askSchema.safeParse({ query: "a".repeat(2001) }).success).toBe(false);
        expect(askSchema.safeParse({ query: "a".repeat(2000) }).success).toBe(true);
    });

    it("rejects a missing or non-string query", () => {
        expect(askSchema.safeParse({}).success).toBe(false);
        expect(askSchema.safeParse({ query: 42 }).success).toBe(false);
    });
});

describe("followUpSchema", () => {
    it("requires both a query and a conversationId", () => {
        expect(followUpSchema.safeParse({ query: "q" }).success).toBe(false);
        expect(followUpSchema.safeParse({ conversationId: "c" }).success).toBe(false);
        expect(followUpSchema.parse({ query: " q ", conversationId: " c " })).toEqual({
            query: "q",
            conversationId: "c",
        });
    });

    it("rejects an empty conversationId", () => {
        expect(followUpSchema.safeParse({ query: "q", conversationId: "  " }).success).toBe(false);
    });
});

describe("deleteConversationSchema", () => {
    it("accepts a normal id", () => {
        expect(deleteConversationSchema.parse({ conversationId: "abc123" })).toEqual({
            conversationId: "abc123",
        });
    });

    it("rejects empty and overly long ids", () => {
        expect(deleteConversationSchema.safeParse({ conversationId: "" }).success).toBe(false);
        expect(deleteConversationSchema.safeParse({ conversationId: "a".repeat(129) }).success).toBe(
            false,
        );
    });
});
