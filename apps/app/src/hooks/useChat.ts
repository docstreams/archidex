import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatSource, SessionListItem } from "@/lib/types";
import {
  createSession,
  sendMessageStream,
  listSessions,
  deleteSession as apiDeleteSession,
  getSessionHistoryFull,
} from "@/lib/api";

export interface AssistantMessage {
  role: "assistant";
  content: string;
  sources?: ChatSource[];
  enhancedQuery?: string;
}

export interface UserMessage {
  role: "user";
  content: string;
}

export type DisplayMessage = UserMessage | AssistantMessage;

export function useChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamIdxRef = useRef<number>(-1);

  // Fetch session list on mount
  const refreshSessions = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
    } catch {
      // Silently fail — not critical
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Load a past session's messages
  const loadSession = useCallback(async (sid: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await getSessionHistoryFull(sid);
      const loaded: DisplayMessage[] = data.messages.map((msg) => {
        if (msg.role === "assistant") {
          return {
            role: "assistant" as const,
            content: msg.content,
            sources: msg.sources ?? undefined,
            enhancedQuery: msg.enhanced_query ?? undefined,
          };
        }
        return { role: "user" as const, content: msg.content };
      });
      setSessionId(sid);
      setMessages(loaded);
    } catch {
      setError("Не вдалося завантажити розмову");
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    const { session_id } = await createSession();
    setSessionId(session_id);
    return session_id;
  }, [sessionId]);

  const send = useCallback(
    async (message: string) => {
      setError(null);
      setLoading(true);

      const userMsg: UserMessage = { role: "user", content: message };
      const assistantPlaceholder: AssistantMessage = {
        role: "assistant",
        content: "",
      };

      setMessages((prev) => {
        const next = [...prev, userMsg, assistantPlaceholder];
        streamIdxRef.current = next.length - 1;
        return next;
      });

      try {
        const sid = await ensureSession();

        await sendMessageStream(sid, message, {
          onEnhancedQuery: (query) => {
            setMessages((prev) => {
              const next = [...prev];
              const msg = next[streamIdxRef.current] as AssistantMessage;
              next[streamIdxRef.current] = { ...msg, enhancedQuery: query };
              return next;
            });
          },

          onSources: (sources) => {
            setMessages((prev) => {
              const next = [...prev];
              const msg = next[streamIdxRef.current] as AssistantMessage;
              next[streamIdxRef.current] = { ...msg, sources };
              return next;
            });
          },

          onChunk: (text) => {
            setMessages((prev) => {
              const next = [...prev];
              const msg = next[streamIdxRef.current] as AssistantMessage;
              next[streamIdxRef.current] = {
                ...msg,
                content: msg.content + text,
              };
              return next;
            });
          },

          onLeakDetected: (replacement) => {
            // Replace all streamed content with the safe refusal message
            setMessages((prev) => {
              const next = [...prev];
              const msg = next[streamIdxRef.current] as AssistantMessage;
              next[streamIdxRef.current] = {
                ...msg,
                content: replacement,
                sources: [],
              };
              return next;
            });
          },

          onDone: () => {
            setLoading(false);
          },

          onError: (errorMsg) => {
            setError(errorMsg);
            setLoading(false);
          },
        });

        // Refresh sessions list (title and updated_at may have changed)
        await refreshSessions();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Не вдалося отримати відповідь";
        setError(errorMessage);
        setMessages((prev) => prev.slice(0, -2));
        setLoading(false);
      }
    },
    [ensureSession, refreshSessions],
  );

  const newChat = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  const removeSession = useCallback(
    async (sid: string) => {
      try {
        await apiDeleteSession(sid);
        // If we deleted the active session, reset the view
        if (sid === sessionId) {
          setSessionId(null);
          setMessages([]);
          setError(null);
        }
        await refreshSessions();
      } catch {
        setError("Не вдалося видалити розмову");
      }
    },
    [sessionId, refreshSessions],
  );

  return {
    messages,
    loading,
    error,
    send,
    newChat,
    sessions,
    activeSessionId: sessionId,
    loadSession,
    removeSession,
  };
}
