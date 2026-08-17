import { z } from "zod";

export const askSchema = z.object({
    query: z.string().trim().min(1).max(2000),
});

export const followUpSchema = z.object({
    query: z.string().trim().min(1).max(2000),
    conversationId: z.string().trim().min(1),
});

export const deleteConversationSchema = z.object({
    conversationId: z.string().trim().min(1).max(128),
});
