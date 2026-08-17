export const ANSWER_OPEN = "<ANSWER>";
export const ANSWER_CLOSE = "</ANSWER>";
export const SOURCES_OPEN = "\n<SOURCES>\n";
export const SOURCES_CLOSE = "\n</SOURCES>\n";
export const FOLLOWUPS_OPEN = "\n<FOLLOW_UPS>\n";
export const FOLLOWUPS_CLOSE = "\n</FOLLOW_UPS>\n";

/** Minimal sink the stream pump writes to — `express.Response` satisfies it. */
export interface StreamSink {
    write(chunk: string): unknown;
}

export function extractFollowUps(text: string): string[] {
    return Array.from(text.matchAll(/<question>([\s\S]*?)<\/question>/g)).map((m) =>
        (m[1] ?? "").trim(),
    );
}

export function writeSources(sink: StreamSink, results: { url: string }[]) {
    sink.write(SOURCES_OPEN);
    sink.write(JSON.stringify(results.map((r) => ({ url: r.url }))));
    sink.write(SOURCES_CLOSE);
}

export function writeFollowUps(sink: StreamSink, followUps: string[]) {
    sink.write(FOLLOWUPS_OPEN);
    sink.write(JSON.stringify(followUps));
    sink.write(FOLLOWUPS_CLOSE);
}

/**
 * Length of the longest suffix of `buffer` that is a partial prefix of one of
 * `tags`. Such a suffix must be held back: the rest of the tag arrives in the
 * next chunk, and flushing early would leak the tag into the client stream.
 */
export function pendingTagPrefixLength(buffer: string, tags: string[]): number {
    let longest = 0;
    for (const tag of tags) {
        for (let len = Math.min(tag.length - 1, buffer.length); len > longest; len--) {
            if (buffer.endsWith(tag.slice(0, len))) {
                longest = len;
                break;
            }
        }
    }
    return longest;
}

/**
 * Forwards the model stream to the client, keeping only the text inside
 * `<ANSWER>`, and collecting follow-up questions from the trailing section.
 */
export async function pumpStreamToClient(
    textStream: AsyncIterable<string>,
    sink: StreamSink,
    timeoutMs: number,
): Promise<{ cleanAnswer: string; followUps: string[] }> {
    const iterator = textStream[Symbol.asyncIterator]();
    let buffer = "";
    let cleanAnswer = "";
    let tail = "";
    let insideAnswer = false;
    let sawAnswerTag = false;
    let answerClosed = false;

    const flush = (chunk: string) => {
        if (chunk.length === 0) return;
        sink.write(chunk);
        cleanAnswer += chunk;
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const nextWithTimeout = () =>
        Promise.race([
            iterator.next(),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error("Model stream timed out")), timeoutMs);
            }),
        ]).finally(() => {
            if (timer !== undefined) clearTimeout(timer);
        });

    let result = await nextWithTimeout();

    while (!result.done) {
        if (answerClosed) {
            tail += result.value;
            result = await nextWithTimeout();
            continue;
        }

        buffer += result.value;

        if (!sawAnswerTag) {
            const openIdx = buffer.indexOf(ANSWER_OPEN);
            if (openIdx !== -1) {
                sawAnswerTag = true;
                insideAnswer = true;
                buffer = buffer.slice(openIdx + ANSWER_OPEN.length);
            } else {
                const strayClose = buffer.indexOf(ANSWER_CLOSE);
                if (strayClose !== -1) {
                    // Closing tag without an opening one — treat it as the end of the answer.
                    flush(buffer.slice(0, strayClose));
                    answerClosed = true;
                    tail += buffer.slice(strayClose + ANSWER_CLOSE.length);
                    buffer = "";
                    result = await nextWithTimeout();
                    continue;
                }

                if (buffer.length > ANSWER_OPEN.length * 2) {
                    const hold = pendingTagPrefixLength(buffer, [ANSWER_OPEN, ANSWER_CLOSE]);
                    flush(buffer.slice(0, buffer.length - hold));
                    buffer = hold > 0 ? buffer.slice(buffer.length - hold) : "";
                }
                result = await nextWithTimeout();
                continue;
            }
        }

        if (insideAnswer) {
            const closeIdx = buffer.indexOf(ANSWER_CLOSE);
            if (closeIdx !== -1) {
                flush(buffer.slice(0, closeIdx));
                insideAnswer = false;
                answerClosed = true;
                tail += buffer.slice(closeIdx + ANSWER_CLOSE.length);
                buffer = "";
            } else {
                const hold = pendingTagPrefixLength(buffer, [ANSWER_CLOSE]);
                flush(buffer.slice(0, buffer.length - hold));
                buffer = hold > 0 ? buffer.slice(buffer.length - hold) : "";
            }
        }

        result = await nextWithTimeout();
    }

    if (buffer.length > 0 && !answerClosed) {
        // The stream ended without a closing </ANSWER> tag.
        // Strip it if it somehow ended up in the buffer, then flush.
        const strayClose = buffer.indexOf(ANSWER_CLOSE);
        flush(strayClose !== -1 ? buffer.slice(0, strayClose) : buffer);
    }

    return { cleanAnswer: cleanAnswer.trim(), followUps: extractFollowUps(tail) };
}
