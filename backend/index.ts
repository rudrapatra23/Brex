// ---------------------------------------------------------------------------
// Prisma schema additions required for this file (add to schema.prisma,
// then `bunx prisma migrate dev --name add_credits`):
//
// model User {
//   ...
//   credits            Int       @default(100)
//   lastCreditRefillAt DateTime?
// }
// ---------------------------------------------------------------------------

import express from "express";
import type { NextFunction, Request, Response } from "express";
import { tavily } from "@tavily/core";
import { SYSTEM_PROMPT } from "./prompt";
import { streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { prisma } from "./db";
import { middleware } from "./middleware";
import cors from "cors";
import { pumpStreamToClient, writeFollowUps, writeSources } from "./lib/stream";
import { computeCostCredits, extractTokenUsage, REFILL_INTERVAL_MS } from "./lib/credits";
import { deriveTitle, slugifyQuery, toChatHistory } from "./lib/conversation";
import { buildPrompt, trimSearchResults } from "./lib/search";
import { askSchema, deleteConversationSchema, followUpSchema } from "./lib/schemas";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000,http://localhost:5173").split(",").map((origin) => origin.trim()).filter(Boolean);

app.set("trust proxy", 1);
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            // Allow deploys where the frontend is a different host, while still keeping
            // localhost behavior intact by default.
            callback(null, true);
        },
        credentials: true,
    }),
);

function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<any>>(
    fn: T,
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

app.use(express.json());

const DAILY_REFILL_CREDITS = Number(process.env.DAILY_REFILL_CREDITS) || 50;

app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, service: "brex-backend", timestamp: new Date().toISOString() });
});

async function refillDailyCreditsIfEligible(userId: string) {
    const cutoff = new Date(Date.now() - REFILL_INTERVAL_MS);

    const { count } = await prisma.user.updateMany({
        where: {
            id: userId,
            OR: [{ lastCreditRefillAt: null }, { lastCreditRefillAt: { lte: cutoff } }],
        },
        data: {
            credits: { increment: DAILY_REFILL_CREDITS },
            lastCreditRefillAt: new Date(),
        },
    });

    if (count > 0) {
        console.log(`[Credits] Refilled ${DAILY_REFILL_CREDITS} credits for user ${userId}`);
    }
}

const PORT = Number(process.env.PORT) || 3001;
const MODEL_TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS) || 30_000;

// ---------- shared helpers ----------

async function searchAndTrim(query: string) {
    const webSearchResponse = await client.search(query, { searchDepth: "advanced" });
    const results = webSearchResponse.results;
    return { results, trimmed: trimSearchResults(results) };
}

type StreamInput =
    | { mode: "prompt"; prompt: string }
    | { mode: "messages"; messages: { role: "user" | "assistant"; content: string }[] };

async function streamResponse(
    res: Response,
    input: StreamInput,
): Promise<{ started: boolean; cleanAnswer: string; followUps: string[]; costCredits: number }> {
    try {
        const candidateStream = streamText({
            model: groq("llama-3.3-70b-versatile"),
            system: SYSTEM_PROMPT,
            ...(input.mode === "prompt"
                ? { prompt: input.prompt }
                : { messages: input.messages }),
        });

        const { cleanAnswer, followUps } = await pumpStreamToClient(
            candidateStream.textStream,
            res,
            MODEL_TIMEOUT_MS,
        );

        const costCredits = computeCostCredits(extractTokenUsage(await candidateStream.usage));

        return { started: true, cleanAnswer, followUps, costCredits };
    } catch (error) {
        console.error(`[AI Stream Error] ${(error as Error).message}`);
        return { started: false, cleanAnswer: "", followUps: [], costCredits: 0 };
    }
}

async function ensureHasCredits(userId: string) {
    await refillDailyCreditsIfEligible(userId);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
    });
    if (!user || user.credits <= 0) {
        const err = new Error("Insufficient credits");
        (err as any).code = "INSUFFICIENT_CREDITS";
        throw err;
    }
}

async function debitCredits(userId: string, costCredits: number) {
    await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: costCredits } },
    });
}

// ---------- routes ----------

app.get(
    "/conversation_history",
    middleware,
    asyncHandler(async (req, res) => {
        const conversations = await prisma.conversation.findMany({
            where: { userId: req.userId! },
            orderBy: { id: "desc" },
            select: { id: true, title: true, slug: true },
        });
        res.json({ conversations });
    }),
);

app.post(
    "/conversation_history/:conversationId",
    middleware,
    asyncHandler(async (req, res) => {
        const conversationId = req.params.conversationId;

        if (typeof conversationId !== "string" || conversationId.length === 0) {
            return res.status(400).json({ message: "Invalid conversationId" });
        }

        const conversation = await prisma.conversation.findFirst({
            where: { id: conversationId, userId: req.userId! },
            include: {
                messages: {
                    orderBy: { id: "asc" },
                    select: { id: true, content: true, role: true, createdAt: true },
                },
            },
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        res.json({ conversation });
    }),
);

app.get(
    "/credits/balance",
    middleware,
    asyncHandler(async (req, res) => {
        await refillDailyCreditsIfEligible(req.userId!);
        const user = await prisma.user.findUnique({
            where: { id: req.userId! },
            select: { credits: true },
        });
        res.json({ credits: user?.credits ?? 0 });
    }),
);

app.post(
    "/brex_ask",
    middleware,
    asyncHandler(async (req, res) => {
        const parsed = askSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid request", issues: parsed.error.issues });
        }
        const { query } = parsed.data;

        try {
            await ensureHasCredits(req.userId!);
        } catch (error) {
            if ((error as any).code === "INSUFFICIENT_CREDITS") {
                return res.status(402).json({ message: "Insufficient credits" });
            }
            console.error("[Credits Error]", error);
            return res.status(500).json({ message: "Could not verify credits" });
        }

        let searchData;
        try {
            searchData = await searchAndTrim(query);
        } catch (error) {
            console.error("[Search Error]", error);
            return res.status(502).send("Web search failed");
        }

        const prompt = buildPrompt(searchData.trimmed, query);

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");

        const { started, cleanAnswer, followUps, costCredits } = await streamResponse(res, {
            mode: "prompt",
            prompt,
        });

        if (!started) {
            if (!res.headersSent) {
                return res.status(503).send("AI service is currently unavailable. Please try again.");
            } else {
                res.write("\n[An error occurred while streaming the response.]\n");
                return res.end();
            }
        }

        try {
            await debitCredits(req.userId!, costCredits);
        } catch (e) {
            console.error("[Credits Error] Failed to debit credits:", e);
        }

        const sourceUrls = searchData.results.map((r) => ({ url: r.url }));
        writeSources(res, searchData.results);
        writeFollowUps(res, followUps);

        try {
            const slug = slugifyQuery(query);
            const title = deriveTitle(query);

            const conversation = await prisma.conversation.create({
                data: {
                    title,
                    slug,
                    userId: req.userId!,
                    messages: {
                        create: [
                            { content: query, role: "User" },
                            {
                                content: cleanAnswer,
                                role: "Assistant",
                                sources: sourceUrls,
                                followUps,
                            },
                        ],
                    },
                },
            });

            res.write(`\n<CONVERSATION_ID>${conversation.id}</CONVERSATION_ID>\n`);
        } catch (e) {
            console.error("[DB Error] Failed to save conversation:", e);
        }

        res.end();
    }),
);

app.post(
    "/brex_ask/follow_up",
    middleware,
    asyncHandler(async (req, res) => {
        const parsed = followUpSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid request", issues: parsed.error.issues });
        }
        const { query, conversationId } = parsed.data;

        const conversation = await prisma.conversation.findFirst({
            where: { id: conversationId, userId: req.userId! },
            include: { messages: { orderBy: { id: "asc" } } },
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        try {
            await ensureHasCredits(req.userId!);
        } catch (error) {
            if ((error as any).code === "INSUFFICIENT_CREDITS") {
                return res.status(402).json({ message: "Insufficient credits" });
            }
            console.error("[Credits Error]", error);
            return res.status(500).json({ message: "Could not verify credits" });
        }

        const history = toChatHistory(conversation.messages);

        let searchData;
        try {
            searchData = await searchAndTrim(query);
        } catch (error) {
            console.error("[Search Error]", error);
            return res.status(502).send("Web search failed");
        }

        const followUpPrompt = buildPrompt(searchData.trimmed, query);

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");

        const { started, cleanAnswer, followUps, costCredits } = await streamResponse(res, {
            mode: "messages",
            messages: [...history, { role: "user", content: followUpPrompt }],
        });

        if (!started) {
            if (!res.headersSent) {
                return res.status(503).send("AI service is currently unavailable. Please try again.");
            } else {
                res.write("\n[An error occurred while streaming the response.]\n");
                return res.end();
            }
        }

        try {
            await debitCredits(req.userId!, costCredits);
        } catch (e) {
            console.error("[Credits Error] Failed to debit credits:", e);
        }

        const sourceUrls = searchData.results.map((r) => ({ url: r.url }));
        writeSources(res, searchData.results);
        writeFollowUps(res, followUps);

        try {
            await prisma.message.createMany({
                data: [
                    { conversationId, content: query, role: "User" },
                    {
                        conversationId,
                        content: cleanAnswer,
                        role: "Assistant",
                        sources: sourceUrls,
                        followUps,
                    },
                ],
            });
        } catch (e) {
            console.error("[DB Error] Failed to save follow-up messages:", e);
        }

        res.end();
    }),
);

// ---------- delete conversation ----------

app.delete(
    "/conversation/:conversationId",
    middleware,
    asyncHandler(async (req, res) => {
        // 1. Validate param
        const parsed = deleteConversationSchema.safeParse({
            conversationId: req.params.conversationId,
        });
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid conversationId" });
        }
        const { conversationId } = parsed.data;

        // 2. Ownership check — NEVER skip this.
        //    We look up the conversation filtered by BOTH id AND the authenticated userId.
        //    If the conversation belongs to someone else, findFirst returns null → 404.
        //    This prevents IDOR: an attacker cannot delete another user's conversation
        //    even if they know its ID.
        const conversation = await prisma.conversation.findFirst({
            where: { id: conversationId, userId: req.userId! },
            select: { id: true },
        });

        if (!conversation) {
            // Return 404 (not 403) so we don't reveal whether the resource exists
            return res.status(404).json({ message: "Conversation not found" });
        }

        // 3. Delete messages first, then the conversation (atomic transaction)
        await prisma.$transaction([
            prisma.message.deleteMany({ where: { conversationId } }),
            prisma.conversation.delete({ where: { id: conversationId } }),
        ]);

        return res.status(200).json({ message: "Deleted" });
    }),
);

// ---------- global error handler ----------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("[Unhandled Error]", err);
    if (res.headersSent) {
        return res.end();
    }
    res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Listening on :${PORT}`));