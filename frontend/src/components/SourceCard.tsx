import React from "react";
import { ExternalLink } from "lucide-react";

interface SourceCardProps {
  url: string;
  index: number;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function getTitle(url: string): string {
  try {
    const path = new URL(url).pathname;
    const segment = path.split("/").filter(Boolean).pop() ?? "";
    return segment.replace(/[-_]/g, " ").replace(/\.\w+$/, "").slice(0, 60) || getDomain(url);
  } catch { return url; }
}

// Source URLs come from web-search results, so restrict them to http(s).
function safeUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

export default function SourceCard({ url, index }: SourceCardProps) {
  const href = safeUrl(url);
  const domain = getDomain(url);
  const title  = getTitle(url);

  if (!href) return null;
  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 p-3 rounded-[10px] min-w-[180px] max-w-[220px] flex-shrink-0 transition-all duration-150 hover:-translate-y-px"
      style={{
        background: "#1B1B1F",
        border: "1px solid #26262B",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(94,234,212,0.3)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(94,234,212,0.06)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#26262B";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 text-[9px] font-bold font-mono"
          style={{
            background: "rgba(94,234,212,0.1)",
            border: "1px solid rgba(94,234,212,0.2)",
            color: "#5EEAD4",
          }}
        >
          {index}
        </span>
        <img
          src={favicon}
          alt=""
          className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span className="text-[10px] font-mono text-[#5D5D66] truncate uppercase tracking-wide">{domain}</span>
      </div>

      <p className="text-[11px] text-[#9C9CA3] leading-4 line-clamp-2 capitalize">{title}</p>

      <div className="flex items-center gap-1 mt-auto">
        <ExternalLink className="w-2.5 h-2.5 text-[#5D5D66] group-hover:text-primary transition-colors duration-150" />
      </div>
    </a>
  );
}
