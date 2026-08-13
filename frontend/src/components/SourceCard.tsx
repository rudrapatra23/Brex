import React from "react";
import { ExternalLink } from "lucide-react";

interface SourceCardProps {
  url: string;
  index: number;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getTitle(url: string): string {
  try {
    const path = new URL(url).pathname;
    const segment = path.split("/").filter(Boolean).pop() ?? "";
    return segment
      .replace(/[-_]/g, " ")
      .replace(/\.\w+$/, "")
      .slice(0, 60) || getDomain(url);
  } catch {
    return url;
  }
}

export default function SourceCard({ url, index }: SourceCardProps) {
  const domain = getDomain(url);
  const title = getTitle(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        flex flex-col gap-2 p-3 rounded-xl border border-border
        bg-card hover:bg-muted/60 transition-all duration-200
        hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
        group min-w-[180px] max-w-[220px] flex-shrink-0
      "
    >
      <div className="flex items-center gap-2">
        <span className="
          w-5 h-5 rounded flex items-center justify-center
          text-[10px] font-bold text-primary bg-primary/15 border border-primary/20 flex-shrink-0
        ">
          {index}
        </span>
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 rounded-sm flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span className="text-xs text-muted-foreground truncate">{domain}</span>
      </div>

      <p className="text-xs text-foreground/80 leading-4 line-clamp-2 capitalize">
        {title}
      </p>

      <div className="flex items-center gap-1 mt-auto">
        <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
      </div>
    </a>
  );
}
