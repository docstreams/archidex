import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "./MessageBubble";
import { Footer } from "./Footer";
import { WogLogo } from "./WogLogo";
import type { DisplayMessage } from "@/hooks/useChat";

interface ChatWindowProps {
  messages: DisplayMessage[];
  loading: boolean;
  error: string | null;
  onSend: (message: string) => void;
  hasDocuments: boolean;
}

export function ChatWindow({
  messages,
  loading,
  error,
  onSend,
  hasDocuments,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages / streaming chunks
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Re-focus textarea when loading finishes (disabled removes focus)
  const prevLoading = useRef(loading);
  useEffect(() => {
    if (prevLoading.current && !loading) {
      textareaRef.current?.focus();
    }
    prevLoading.current = loading;
  }, [loading]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput("");
  }, [input, loading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Messages area */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {isEmpty ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="flex items-center justify-center flex-col gap-4">
                <WogLogo height={32} />
                <p className="mt-1 text-sm text-muted-foreground italic">
                  {hasDocuments
                    ? "Once told me the world was gonna roll me, I ain't the sharpest tool in the shed..."
                    : "Завантажте документ, щоб почати"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  sources={"sources" in msg ? msg.sources : undefined}
                  enhancedQuery={
                    "enhancedQuery" in msg ? msg.enhancedQuery : undefined
                  }
                />
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="flex gap-1">
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Scroll sentinel */}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-t bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasDocuments
                ? "Задайте питання про ваші документи..."
                : "Спочатку завантажте документ..."
            }
            disabled={loading || !hasDocuments}
            rows={1}
            className="max-h-32 min-h-[40px] resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading || !hasDocuments}
            size="lg"
          >
            Надіслати
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
