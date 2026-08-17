import { describe, expect, it } from "bun:test";
import {
    computeCostCredits,
    extractTokenUsage,
    isRefillEligible,
    MODEL_CONFIG,
    REFILL_INTERVAL_MS,
} from "./credits";

describe("extractTokenUsage", () => {
    it("reads the ai-sdk v5 field names", () => {
        expect(extractTokenUsage({ inputTokens: 10, outputTokens: 20 })).toEqual({
            inputTokens: 10,
            outputTokens: 20,
        });
    });

    it("falls back to the legacy prompt/completion field names", () => {
        expect(extractTokenUsage({ promptTokens: 5, completionTokens: 7 })).toEqual({
            inputTokens: 5,
            outputTokens: 7,
        });
    });

    it("prefers the new field names when both are present", () => {
        expect(
            extractTokenUsage({
                inputTokens: 1,
                promptTokens: 99,
                outputTokens: 2,
                completionTokens: 98,
            }),
        ).toEqual({ inputTokens: 1, outputTokens: 2 });
    });

    it("defaults to zero for missing, non-numeric or undefined usage", () => {
        expect(extractTokenUsage(undefined)).toEqual({ inputTokens: 0, outputTokens: 0 });
        expect(extractTokenUsage({})).toEqual({ inputTokens: 0, outputTokens: 0 });
        expect(extractTokenUsage({ inputTokens: "12", outputTokens: NaN })).toEqual({
            inputTokens: 0,
            outputTokens: 0,
        });
    });
});

describe("computeCostCredits", () => {
    it("charges at least one credit for a tiny request", () => {
        expect(computeCostCredits({ inputTokens: 1, outputTokens: 1 })).toBe(1);
        expect(computeCostCredits({ inputTokens: 0, outputTokens: 0 })).toBe(1);
    });

    it("rounds the token cost up to whole credits", () => {
        // 2M input tokens = 1.18, 2M output tokens = 1.58 → 2.76 → 3
        expect(computeCostCredits({ inputTokens: 2_000_000, outputTokens: 2_000_000 })).toBe(3);
    });

    it("prices output tokens above input tokens", () => {
        expect(MODEL_CONFIG.outputCostPer1M).toBeGreaterThan(MODEL_CONFIG.inputCostPer1M);
        const inputHeavy = computeCostCredits({ inputTokens: 10_000_000, outputTokens: 0 });
        const outputHeavy = computeCostCredits({ inputTokens: 0, outputTokens: 10_000_000 });
        expect(outputHeavy).toBeGreaterThan(inputHeavy);
    });

    it("honors an overridden pricing config", () => {
        expect(
            computeCostCredits(
                { inputTokens: 1_000_000, outputTokens: 1_000_000 },
                { inputCostPer1M: 4, outputCostPer1M: 6 },
            ),
        ).toBe(10);
    });
});

describe("isRefillEligible", () => {
    const now = new Date("2026-01-02T00:00:00.000Z");

    it("is eligible when the user was never refilled", () => {
        expect(isRefillEligible(null, now)).toBe(true);
        expect(isRefillEligible(undefined, now)).toBe(true);
    });

    it("is not eligible inside the refill window", () => {
        expect(isRefillEligible(new Date(now.getTime() - REFILL_INTERVAL_MS + 1000), now)).toBe(
            false,
        );
    });

    it("is eligible exactly at and past the refill interval", () => {
        expect(isRefillEligible(new Date(now.getTime() - REFILL_INTERVAL_MS), now)).toBe(true);
        expect(isRefillEligible(new Date(now.getTime() - 3 * REFILL_INTERVAL_MS), now)).toBe(true);
    });
});
