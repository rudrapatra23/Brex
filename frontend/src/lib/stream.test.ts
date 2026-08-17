import { describe, expect, it } from "bun:test";
import { parseStreamChunk } from "./stream";

describe("parseStreamChunk", () => {
  it("returns raw text as the answer when no tags are present", () => {
    expect(parseStreamChunk("plain streamed text")).toEqual({
      answer: "plain streamed text",
      sources: [],
      conversationId: null,
      followUps: [],
    });
  });

  it("keeps only the text inside ANSWER tags", () => {
    expect(parseStreamChunk("junk<ANSWER>the answer</ANSWER>more").answer).toBe("the answer");
  });

  it("handles a partial stream that has an opening tag only", () => {
    expect(parseStreamChunk("<ANSWER>partial ans").answer).toBe("partial ans");
  });

  it("parses sources, follow ups and the conversation id", () => {
    const raw = [
      "<ANSWER>done</ANSWER>",
      "\n<SOURCES>\n" + JSON.stringify([{ url: "https://a.dev" }]) + "\n</SOURCES>\n",
      "\n<FOLLOW_UPS>\n" + JSON.stringify(["next?"]) + "\n</FOLLOW_UPS>\n",
      "\n<CONVERSATION_ID> conv_1 </CONVERSATION_ID>\n",
    ].join("");

    expect(parseStreamChunk(raw)).toEqual({
      answer: "done",
      sources: [{ url: "https://a.dev" }],
      followUps: ["next?"],
      conversationId: "conv_1",
    });
  });

  it("stops the answer at the first metadata tag even without an ANSWER tag", () => {
    const raw = "tagless answer\n<SOURCES>\n[]\n</SOURCES>\n";
    expect(parseStreamChunk(raw).answer).toBe("tagless answer");
  });

  it("ignores malformed source and follow-up JSON", () => {
    const raw = "<ANSWER>a</ANSWER>\n<SOURCES>\n{oops\n</SOURCES>\n\n<FOLLOW_UPS>\nnope\n</FOLLOW_UPS>\n";
    const parsed = parseStreamChunk(raw);
    expect(parsed.sources).toEqual([]);
    expect(parsed.followUps).toEqual([]);
  });

  it("ignores non-array metadata payloads", () => {
    const raw = '<ANSWER>a</ANSWER>\n<SOURCES>\n{"url":"https://a.dev"}\n</SOURCES>\n';
    expect(parseStreamChunk(raw).sources).toEqual([]);
  });

  it("drops non-string follow ups", () => {
    const raw = "<ANSWER>a</ANSWER>\n<FOLLOW_UPS>\n" + JSON.stringify(["ok", 3, null]) + "\n</FOLLOW_UPS>\n";
    expect(parseStreamChunk(raw).followUps).toEqual(["ok"]);
  });

  it("returns a null conversation id when the tag is empty", () => {
    expect(parseStreamChunk("a<CONVERSATION_ID></CONVERSATION_ID>").conversationId).toBeNull();
  });

  it("strips control tags leaked into the answer body", () => {
    expect(parseStreamChunk("leaked </ANSWER> tag").answer).toBe("leaked  tag");
  });

  it("matches tags case-insensitively", () => {
    expect(parseStreamChunk("<answer>lower</answer>").answer).toBe("lower");
  });

  it("accepts CRLF line endings around metadata blocks", () => {
    const raw = '<ANSWER>a</ANSWER>\r\n<SOURCES>\r\n[{"url":"https://a.dev"}]\r\n</SOURCES>\r\n';
    expect(parseStreamChunk(raw).sources).toEqual([{ url: "https://a.dev" }]);
  });

  it("trims trailing whitespace but keeps leading whitespace of the answer", () => {
    expect(parseStreamChunk("<ANSWER>  spaced  </ANSWER>").answer).toBe("  spaced");
  });

  it("returns empty results for an empty stream", () => {
    expect(parseStreamChunk("")).toEqual({
      answer: "",
      sources: [],
      conversationId: null,
      followUps: [],
    });
  });
});
