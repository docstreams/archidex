import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
import { useUsage } from "@/hooks/useUsage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

function App() {
  const { documents, uploading, upload, remove } = useDocuments();
  const {
    messages,
    loading,
    error,
    send,
    newChat,
    sessions,
    activeSessionId,
    loadSession,
    removeSession,
  } = useChat();
  const { usage, refreshUsage } = useUsage();

  const hasReadyDocuments = documents.some((d) => d.status === "ready");

  const handleUpload = async (file: File) => {
    try {
      await upload(file);
      toast.success(`Завантаження "${file.name}"...`);
      refreshUsage();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Не вдалося завантажити",
      );
      throw err;
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await remove(documentId);
      toast.success("Документ видалено");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося видалити");
    }
  };

  const handleSend = async (message: string) => {
    await send(message);
    refreshUsage();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full">
        <Sidebar
          documents={documents}
          uploading={uploading}
          onUpload={handleUpload}
          onDelete={handleDelete}
          onNewChat={newChat}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onLoadSession={loadSession}
          onDeleteSession={removeSession}
          usage={usage}
        />
        <ChatWindow
          messages={messages}
          loading={loading}
          error={error}
          onSend={handleSend}
          hasDocuments={hasReadyDocuments}
        />
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}

export default App;
