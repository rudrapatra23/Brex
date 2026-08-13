import React, { useCallback, useEffect, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import SourceCard from "./SourceCard";
import SearchBar from "./SearchBar";
import { ArrowRight, Globe, Sparkles } from "lucide-react";

export interface Source {
  url: string;
}

export interface Message {
  role: "User" | "Assistant";
  content: string;
  sources?: Source[];
  followUps?: string[];
  streaming?: boolean;
}

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  onFollowUp: (query: string) => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground leading-snug mb-4">
        {content}
      </h2>
    </div>
  );
}

function AssistantMessage({
  content,
  sources,
  followUps,
  streaming,
  onFollowUp,
  messageId,
}: {
  content: string;
  sources?: Source[];
  followUps?: string[];
  streaming?: boolean;
  onFollowUp: (q: string) => void;
  messageId: string;
}) {
  const hasSources = Boolean(sources && sources.length > 0);
  const hasFollowUps = Boolean(followUps && followUps.length > 0 && !streaming);
  const [highlightedSource, setHighlightedSource] = useState<number | null>(null);
  const sourceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleCitationClick = useCallback((idx: number) => {
    const el = sourceRefs.current[idx - 1];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setHighlightedSource(idx);
    setTimeout(() => setHighlightedSource(null), 1800);
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-6">
      {/* Sources */}
      {hasSources && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>Sources</span>
            <span className="text-muted-foreground/60 font-mono">({sources!.length})</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-muted">
            {sources!.map((src, i) => (
              <div
                key={i}
                ref={(el) => {
                  sourceRefs.current[i] = el;
                }}
                id={`source-${messageId}-${i + 1}`}
                className={`
                  transition-all duration-300 rounded-xl flex-shrink-0
                  ${
                    highlightedSource === i + 1
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-lg shadow-primary/10"
                      : "hover:scale-[1.02]"
                  }
                `}
              >
                <SourceCard url={src.url} index={i + 1} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer */}
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Answer</span>
        </div>
        <div className="prose-brex text-foreground/90 leading-relaxed">
          {content
            ? renderMarkdown(content, {
                onCitationClick: hasSources ? handleCitationClick : undefined,
              })
            : null}
          {streaming && !content && <TypingIndicator />}
          {streaming && content && (
            <span className="inline-block w-1.5 h-4 bg-primary rounded-full ml-1 animate-pulse align-middle" />
          )}
        </div>
      </div>

      {/* Follow-up suggestions */}
      {hasFollowUps && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-2 space-y-2.5">
          <div className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
            Related Questions
          </div>
          <div className="grid gap-2">
            {followUps!.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(q)}
                className="
                  group w-full flex items-center justify-between gap-3
                  px-4 py-3 rounded-xl text-left text-sm font-medium
                  bg-secondary/40 hover:bg-secondary/80 border border-border/50
                  hover:border-primary/30 text-foreground/80 hover:text-foreground
                  transition-all duration-200 backdrop-blur-sm active:scale-[0.99]
                "
              >
                <span className="line-clamp-2">{q}</span>
                <ArrowRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatView({ messages, isLoading, onFollowUp }: ChatViewProps) {
  // Group messages cleanly into pairs
  const pairs = messages.reduce<Array<{ user: Message; assistant?: Message }>>((acc, curr, idx) => {
    if (curr.role === "User") {
      const next = messages[idx + 1];
      acc.push({
        user: curr,
        assistant: next?.role === "Assistant" ? next : undefined,
      });
    }
    return acc;
  }, []);

  const lastPairRef = useRef<HTMLDivElement>(null);
  const pairCountRef = useRef(0);

  // Auto-scroll logic targeting only new user questions
  useEffect(() => {
    if (pairs.length > pairCountRef.current) {
      pairCountRef.current = pairs.length;
      lastPairRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pairs.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Scrollable conversation stream */}
      <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-12">
          {pairs.map((pair, pairIndex) => {
            const isLastPair = pairIndex === pairs.length - 1;

            return (
              <div
                key={pairIndex}
                ref={isLastPair ? lastPairRef : undefined}
                className="space-y-6 pt-4 border-t border-border/40 first:border-0 first:pt-0"
              >
                <UserMessage content={pair.user.content} />
                {pair.assistant ? (
                  <AssistantMessage
                    content={pair.assistant.content}
                    sources={pair.assistant.sources}
                    followUps={pair.assistant.followUps}
                    streaming={pair.assistant.streaming}
                    onFollowUp={onFollowUp}
                    messageId={`pair-${pairIndex}`}
                  />
                ) : (
                  isLoading &&
                  isLastPair && (
                    <div className="animate-in fade-in duration-300 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <Globe className="w-3.5 h-3.5 animate-spin" />
                        <span>Searching the web...</span>
                      </div>
                      <TypingIndicator />
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-6 pt-3 bg-gradient-to-t from-background via-background/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          <SearchBar
            onSubmit={onFollowUp}
            isLoading={isLoading}
            placeholder="Ask a follow-up..."
            compact
          />
        </div>
      </div>
    </div>
  );
}