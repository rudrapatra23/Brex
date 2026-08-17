import { describe, expect, it } from "bun:test";
import {
    ANSWER_CLOSE,
    ANSWER_OPEN,
    extractFollowUps,
    FOLLOWUPS_CLOSE,
    FOLLOWUPS_OPEN,
    pendingTagPrefixLength,
    pumpStreamToClient,
    SOURCES_CLOSE,
    SOURCES_OPEN,
    writeFollowUps,
    writeSources,
    type StreamSink,
} from "./stream";

function makeSink() {
    const chunks: string[] = [];
    const sink: StreamSink = { write: (chunk: string) => chunks.push(chunk) };
    return { sink, chunks, text: () => chunks.join("") };
}

async function* stream(...chunks: string[]) {
    for (const chunk of chunks) yield chunk;
}

describe("extractFollowUps", () => {
    it("returns trimmed questions in order", () => {
        expect(
            extractFollowUps("<question> first? </question>\n<question>second?</question>"),
        ).toEqual(["first?", "second?"]);
    });

    it("returns an empty array when there are no questions", () => {
        expect(extractFollowUps("no follow ups here")).toEqual([]);
    });

    it("supports multi-line questions", () => {
        expect(extractFollowUps("<question>a\nb</question>")).toEqual(["a\nb"]);
    });
});

describe("writeSources / writeFollowUps", () => {
    it("wraps only the urls of each source in SOURCES tags", () => {
        const { sink, text } = makeSink();
        writeSources(sink, [{ url: "https://a.dev" }, { url: "https://b.dev", title: "b" } as any]);
        expect(text()).toBe(
            `${SOURCES_OPEN}${JSON.stringify([{ url: "https://a.dev" }, { url: "https://b.dev" }])}${SOURCES_CLOSE}`,
        );
    });

    it("wraps follow ups in FOLLOW_UPS tags", () => {
        const { sink, text } = makeSink();
        writeFollowUps(sink, ["why?"]);
        expect(text()).toBe(`${FOLLOWUPS_OPEN}${JSON.stringify(["why?"])}${FOLLOWUPS_CLOSE}`);
    });
});

describe("pendingTagPrefixLength", () => {
    it("returns the length of a partial trailing tag", () => {
        expect(pendingTagPrefixLength("answer</ANS", [ANSWER_CLOSE])).toBe(5);
        expect(pendingTagPrefixLength("answer<", [ANSWER_OPEN, ANSWER_CLOSE])).toBe(1);
    });

    it("returns 0 when nothing could continue into a tag", () => {
        expect(pendingTagPrefixLength("plain text", [ANSWER_OPEN, ANSWER_CLOSE])).toBe(0);
        expect(pendingTagPrefixLength("", [ANSWER_OPEN])).toBe(0);
    });

    it("never holds back a complete tag", () => {
        expect(pendingTagPrefixLength(`x${ANSWER_CLOSE}`, [ANSWER_CLOSE])).toBe(0);
    });

    it("reports the longest candidate across tags", () => {
        expect(pendingTagPrefixLength("text</A", [ANSWER_OPEN, ANSWER_CLOSE])).toBe(3);
    });
});

describe("pumpStreamToClient", () => {
    it("streams only the text inside the ANSWER tags", async () => {
        const { sink, text } = makeSink();
        const result = await pumpStreamToClient(
            stream(`preamble ${ANSWER_OPEN}hello `, `world${ANSWER_CLOSE} trailing`),
            sink,
            1000,
        );

        expect(text()).toBe("hello world");
        expect(result.cleanAnswer).toBe("hello world");
        expect(result.followUps).toEqual([]);
    });

    it("handles ANSWER tags split across chunks", async () => {
        const { sink, text } = makeSink();
        const result = await pumpStreamToClient(
            stream("<ANS", "WER>chunked", " answer</ANS", "WER>"),
            sink,
            1000,
        );

        expect(text()).toBe("chunked answer");
        expect(result.cleanAnswer).toBe("chunked answer");
    });

    it("collects follow-up questions that trail the answer", async () => {
        const { sink } = makeSink();
        const result = await pumpStreamToClient(
            stream(
                `${ANSWER_OPEN}answer${ANSWER_CLOSE}`,
                "<FOLLOW_UPS><question>one?</question>",
                "<question>two?</question></FOLLOW_UPS>",
            ),
            sink,
            1000,
        );

        expect(result.cleanAnswer).toBe("answer");
        expect(result.followUps).toEqual(["one?", "two?"]);
    });

    it("flushes untagged output once it is longer than the open tag", async () => {
        const { sink, text } = makeSink();
        const result = await pumpStreamToClient(
            stream("a model that forgot to emit any tags at all"),
            sink,
            1000,
        );

        expect(text()).toBe("a model that forgot to emit any tags at all");
        expect(result.cleanAnswer).toBe("a model that forgot to emit any tags at all");
    });

    it("flushes a short untagged stream on completion", async () => {
        const { sink, text } = makeSink();
        const result = await pumpStreamToClient(stream("short"), sink, 1000);

        expect(text()).toBe("short");
        expect(result.cleanAnswer).toBe("short");
    });

    it("strips a stray closing tag when the stream ends without an opening tag", async () => {
        const { sink, text } = makeSink();
        const result = await pumpStreamToClient(
            stream(`dangling answer${ANSWER_CLOSE}garbage`),
            sink,
            1000,
        );

        expect(text()).toBe("dangling answer");
        expect(result.cleanAnswer).toBe("dangling answer");
    });

    it("trims surrounding whitespace from the collected answer", async () => {
        const { sink } = makeSink();
        const result = await pumpStreamToClient(
            stream(`${ANSWER_OPEN}\n  spaced answer  \n${ANSWER_CLOSE}`),
            sink,
            1000,
        );

        expect(result.cleanAnswer).toBe("spaced answer");
    });

    it("rejects when the model stalls longer than the timeout", async () => {
        const { sink } = makeSink();
        const stalling = {
            [Symbol.asyncIterator]() {
                return { next: () => new Promise<IteratorResult<string>>(() => {}) };
            },
        } as AsyncIterable<string>;

        await expect(pumpStreamToClient(stalling, sink, 20)).rejects.toThrow(
            "Model stream timed out",
        );
    });

    it("returns empty output for an empty stream", async () => {
        const { sink, chunks } = makeSink();
        const result = await pumpStreamToClient(stream(), sink, 1000);

        expect(chunks).toEqual([]);
        expect(result).toEqual({ cleanAnswer: "", followUps: [] });
    });
});
