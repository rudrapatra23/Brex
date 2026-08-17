import type { Source } from "@/components/ChatView";

export interface ParsedStream {
  answer: string;
  sources: Source[];
  conversationId: string | null;
  followUps: string[];
}

/** Splits a (possibly partial) backend stream into answer text and metadata. */
export function parseStreamChunk(raw: string): ParsedStream {
  const metadataStarts = [
    raw.search(/<SOURCES>/i),
    raw.search(/<FOLLOW_UPS>/i),
    raw.search(/<CONVERSATION_ID>/i),
  ].filter((i) => i !== -1);

  let answerBlock = raw.slice(0, metadataStarts.length > 0 ? Math.min(...metadataStarts) : undefined);

  const answerOpen = answerBlock.match(/<ANSWER>/i);
  if (answerOpen?.index !== undefined) {
    const start = answerOpen.index + answerOpen[0].length;
    const end = answerBlock.search(/<\/ANSWER>/i);
    answerBlock = answerBlock.slice(start, end !== -1 ? end : undefined);
  }

  let sources: Source[] = [];
  const sm = raw.match(/<SOURCES>\r?\n([\s\S]*?)\r?\n<\/SOURCES>/i);
  if (sm?.[1]) { try { const p = JSON.parse(sm[1]); if (Array.isArray(p)) sources = p as Source[]; } catch {} }

  let followUps: string[] = [];
  const fm = raw.match(/<FOLLOW_UPS>\r?\n([\s\S]*?)\r?\n<\/FOLLOW_UPS>/i);
  if (fm?.[1]) { try { const p = JSON.parse(fm[1]); if (Array.isArray(p)) followUps = p.filter((x): x is string => typeof x === "string"); } catch {} }

  const conversationId = raw.match(/<CONVERSATION_ID>([^<]*)<\/CONVERSATION_ID>/i)?.[1]?.trim() || null;

  // Safety net: strip any XML control tags the model leaked into the answer text.
  // The backend strips these server-side but timing/chunking can cause leaks.
  const cleaned = answerBlock
    .replace(/<\/ANSWER>/gi, "")
    .replace(/<ANSWER>/gi, "")
    .replace(/<\/?SOURCES>/gi, "")
    .replace(/<\/?FOLLOW_UPS>/gi, "")
    .replace(/<\/?CONVERSATION_ID>/gi, "")
    .trimEnd();

  return { answer: cleaned, sources, conversationId, followUps };
}
