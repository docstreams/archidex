import type { Document } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DocumentListProps {
  documents: Document[];
  onDelete: (documentId: string) => Promise<void>;
}

const NAME_MAX = 26;

function truncateName(name: string, max = NAME_MAX): string {
  if (name.length <= max) return name;
  // Keep extension visible: "very-long-name...pdf"
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx > 0) {
    const ext = name.slice(dotIdx); // ".pdf"
    const stem = name.slice(0, dotIdx);
    const available = max - ext.length - 3; // 3 for "..."
    if (available > 4) {
      return stem.slice(0, available).trimEnd() + "..." + ext;
    }
  }
  return name.slice(0, max).trimEnd() + "...";
}

function StatusBadge({ status }: { status: Document["status"] }) {
  switch (status) {
    case "processing":
      return (
        <Badge variant="secondary" className="text-[10px]">
          Обробка
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="default" className="text-[10px]">
          Готово
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-[10px]">
          Помилка
        </Badge>
      );
    default:
      return null;
  }
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        Документів ще не завантажено
      </p>
    );
  }

  return (
    <div className="w-full space-y-0.5">
      {documents.map((doc) => {
        const displayName = truncateName(doc.document_name);
        const isTruncated = doc.document_name.length > NAME_MAX;

        const row = (
          <div className="group relative flex w-full items-center overflow-hidden rounded-md px-2 py-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs font-medium leading-snug">{displayName}</p>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={doc.status} />
                {doc.status === "ready" && (
                  <span className="text-[10px] text-muted-foreground">
                    {doc.chunk_count} фрагм.
                  </span>
                )}
                {doc.version > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    v{doc.version}
                  </span>
                )}
              </div>
              {doc.status === "processing" && (
                <Skeleton className="mt-1 h-1 w-full" />
              )}
            </div>

            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(doc.document_id)}
              title="Видалити документ"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3L9 9M9 3L3 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          </div>
        );

        return isTruncated ? (
          <Tooltip key={doc.document_id}>
            <TooltipTrigger asChild>{row}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={4}>
              {doc.document_name}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div key={doc.document_id}>{row}</div>
        );
      })}
    </div>
  );
}
