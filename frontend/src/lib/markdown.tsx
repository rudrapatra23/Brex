import React from "react";

// Very lightweight markdown → React renderer
// Handles: headings, bold, italic, code, pre, blockquote, ul/ol, links, [[n]] citations, paragraphs

interface ParsedNode {
  type: string;
  content: string | ParsedNode[];
  level?: number;
  href?: string;
  citationIndex?: number;
}

interface InlineOptions {
  onCitationClick?: (index: number) => void;
}

function parseInline(text: string, opts: InlineOptions = {}): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Added: \[(\d+(?:,\s*\d+)*)\] for plain [1] / [1, 3] style citations
  const pattern = /(\[\[(\d+)\]\]|【(\d+)[††][^】]*】|\[(\d+(?:,\s*\d+)*)\]|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const matchIndex = match.index;

    // Safety guard to prevent infinite loops if regex fails to advance lastIndex
    if (pattern.lastIndex === lastIndex) {
      pattern.lastIndex++;
    }

    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex));
    }

    const m1 = match[1] ?? "";
    const m2 = match[2] ?? "";
    const m3 = match[3] ?? "";
    const m4 = match[4];
    const m5 = match[5];
    const m6 = match[6];
    const m7 = match[7];
    const m8 = match[8];
    const m9 = match[9] ?? "";

    if (m1.startsWith("[[")) {
      const idx = parseInt(m2, 10);
      nodes.push(
        <button key={`cite-${matchIndex}`} type="button" className="citation-badge"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); opts.onCitationClick?.(idx); }}
          title={`Go to source ${idx}`}>
          {m2}
        </button>
      );
    } else if (m1.startsWith("【")) {
      const idx = parseInt(m3, 10);
      nodes.push(
        <button key={`cite-${matchIndex}`} type="button" className="citation-badge"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); opts.onCitationClick?.(idx); }}
          title={`Go to source ${idx}`}>
          {m3}
        </button>
      );
    } else if (m4 !== undefined) {
      // Plain [1] or [1, 3, 5] — render one badge per number
      const indices = m4.split(",").map((s) => parseInt(s.trim(), 10));
      nodes.push(
        <span key={`cite-group-${matchIndex}`} className="citation-group">
          {indices.map((idx, i) => (
            <React.Fragment key={`cite-${matchIndex}-${idx}`}>
              {i > 0 && ", "}
              <button
                type="button"
                className="citation-badge"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); opts.onCitationClick?.(idx); }}
                title={`Go to source ${idx}`}
              >
                {idx}
              </button>
            </React.Fragment>
          ))}
        </span>
      );
    } else if (m5 !== undefined) {
      nodes.push(<strong key={matchIndex}>{m5}</strong>);
    } else if (m6 !== undefined) {
      nodes.push(<em key={matchIndex}>{m6}</em>);
    } else if (m7 !== undefined) {
      nodes.push(<code key={matchIndex}>{m7}</code>);
    } else if (m8 !== undefined) {
      nodes.push(
        <a key={matchIndex} href={m9} target="_blank" rel="noopener noreferrer">
          {m8}
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export interface RenderMarkdownOptions {
  /** Called when a citation badge [n] is clicked. Index is 1-based. */
  onCitationClick?: (index: number) => void;
}

export function renderMarkdown(markdown: string, opts: RenderMarkdownOptions = {}): React.ReactNode {
  if (!markdown) return null;

  const inlineOpts: InlineOptions = { onCitationClick: opts.onCitationClick };

  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let keyCounter = 0;
  const key = () => `md-${keyCounter++}`;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      const Tag = (`h${level}`) as keyof JSX.IntrinsicElements;
      elements.push(<Tag key={key()}>{parseInline(headingMatch[2], inlineOpts)}</Tag>);
      i++;
      continue;
    }

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        const currentLine = lines[i];
        if (currentLine === undefined || currentLine.startsWith("```")) break;
        codeLines.push(currentLine);
        i++;
      }
      elements.push(
        <pre key={key()}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i++; // skip closing ```
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={key()}>{parseInline(line.slice(2), inlineOpts)}</blockquote>
      );
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*+]\s/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        if (!currentLine || !currentLine.match(/^[-*+]\s/)) break;
        items.push(<li key={`li-${i}`}>{parseInline(currentLine.slice(2), inlineOpts)}</li>);
        i++;
      }
      elements.push(<ul key={key()}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        if (!currentLine || !currentLine.match(/^\d+\.\s/)) break;
        items.push(<li key={`li-${i}`}>{parseInline(currentLine.replace(/^\d+\.\s/, ""), inlineOpts)}</li>);
        i++;
      }
      elements.push(<ol key={key()}>{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={key()} className="border-border my-4" />);
      i++;
      continue;
    }

    // Empty line → spacing
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-special lines).
    // The first line is always consumed — a line that looks special but matched no
    // block rule above (e.g. "#### h4") would otherwise loop forever.
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const currentLine = lines[i];
      if (
        !currentLine ||
        currentLine.trim() === "" ||
        currentLine.match(/^(#{1,3}|```|>|[-*+]\s|\d+\.\s|---+)/)
      ) {
        break;
      }
      paraLines.push(currentLine);
      i++;
    }

    if (paraLines.length > 0) {
      elements.push(
        <p key={key()}>{parseInline(paraLines.join(" "), inlineOpts)}</p>
      );
    }
  }

  return <>{elements}</>;
}