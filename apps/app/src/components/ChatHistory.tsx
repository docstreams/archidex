import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SessionListItem } from "@/lib/types";

interface ChatHistoryProps {
  sessions: SessionListItem[];
  activeSessionId: string | null;
  onLoad: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

const TITLE_MAX = 28;

function truncateTitle(title: string, max = TITLE_MAX): string {
  if (title.length <= max) return title;
  return title.slice(0, max).trimEnd() + "...";
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr + "Z"); // UTC from SQLite
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "щойно";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн тому`;
  return date.toLocaleDateString();
}

export function ChatHistory({
  sessions,
  activeSessionId,
  onLoad,
  onDelete,
}: ChatHistoryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground/60">
        Розмов ще немає
      </p>
    );
  }

  return (
    <div className="w-full space-y-0.5">
      {sessions.map((session) => {
        const isActive = session.session_id === activeSessionId;
        const isHovered = session.session_id === hoveredId;
        const displayTitle = truncateTitle(session.title) || "Нова розмова";
        const isTruncated = session.title.length > TITLE_MAX;

        const row = (
          <div
            className={`group relative flex w-full cursor-pointer items-center overflow-hidden rounded-md px-2 py-1.5 text-sm transition-colors ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
            onClick={() => onLoad(session.session_id)}
            onMouseEnter={() => setHoveredId(session.session_id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-sm leading-snug first-letter:uppercase">
                {displayTitle}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {timeAgo(session.updated_at)}
              </p>
            </div>

            {/* Delete button on hover */}
            {isHovered && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.session_id);
                }}
              >
                <span className="text-xs">&times;</span>
              </Button>
            )}
          </div>
        );

        return isTruncated ? (
          <Tooltip key={session.session_id}>
            <TooltipTrigger asChild>{row}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={4}>
              <span className="first-letter:uppercase">{session.title}</span>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div key={session.session_id}>{row}</div>
        );
      })}
    </div>
  );
}
