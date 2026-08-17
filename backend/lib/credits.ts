// Pricing config — Groq llama-3.3-70b-versatile
export const MODEL_CONFIG = {
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
};

export const REFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
}

/** Normalizes the differently-named token counts returned across ai-sdk versions. */
export function extractTokenUsage(usage: unknown): TokenUsage {
    const u = (usage ?? {}) as Record<string, unknown>;
    const pick = (...keys: string[]) => {
        for (const key of keys) {
            const value = u[key];
            if (typeof value === "number" && Number.isFinite(value)) return value;
        }
        return 0;
    };
    return {
        inputTokens: pick("inputTokens", "promptTokens"),
        outputTokens: pick("outputTokens", "completionTokens"),
    };
}

/** Cost of a completion in credits — always at least 1 credit per request. */
export function computeCostCredits(
    usage: TokenUsage,
    config: typeof MODEL_CONFIG = MODEL_CONFIG,
): number {
    return Math.max(
        1,
        Math.ceil(
            (usage.inputTokens / 1_000_000) * config.inputCostPer1M +
                (usage.outputTokens / 1_000_000) * config.outputCostPer1M,
        ),
    );
}

export function isRefillEligible(
    lastCreditRefillAt: Date | null | undefined,
    now: Date = new Date(),
): boolean {
    if (!lastCreditRefillAt) return true;
    return now.getTime() - lastCreditRefillAt.getTime() >= REFILL_INTERVAL_MS;
}
