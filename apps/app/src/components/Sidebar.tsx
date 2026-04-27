import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentList } from "./DocumentList";
import { ChatHistory } from "./ChatHistory";
import { UsagePanel } from "./UsagePanel";
import { WogLogo } from "./WogLogo";
import type { Document, SessionListItem, UsageResponse } from "@/lib/types";

interface SidebarProps {
  documents: Document[];
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onNewChat: () => void;
  sessions: SessionListItem[];
  activeSessionId: string | null;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  usage: UsageResponse | null;
}

export function Sidebar({
  documents,
  uploading,
  onUpload,
  onDelete,
  onNewChat,
  sessions,
  activeSessionId,
  onLoadSession,
  onDeleteSession,
  usage,
}: SidebarProps) {
  return (
    <div className="flex h-full w-72 flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <WogLogo height={24} />
        <Button variant="outline" size="sm" onClick={onNewChat}>
          Новий чат
        </Button>
      </div>

      <Separator />

      {/* Chat history */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-3 pt-3 pb-1">
          <p className="text-xs font-medium text-muted-foreground">Розмови</p>
        </div>
        <ScrollArea className="flex-1 overflow-hidden px-3 pb-2">
          <ChatHistory
            sessions={sessions}
            activeSessionId={activeSessionId}
            onLoad={onLoadSession}
            onDelete={onDeleteSession}
          />
        </ScrollArea>
      </div>

      <Separator />

      {/* Documents section */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-3 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Документи
          </p>
          <DocumentUpload onUpload={onUpload} uploading={uploading} />
        </div>

        <ScrollArea className="flex-1 px-3 pb-2">
          <DocumentList documents={documents} onDelete={onDelete} />
        </ScrollArea>
      </div>

      <Separator />

      {/* Usage stats */}
      <UsagePanel usage={usage} />
    </div>
  );
}
