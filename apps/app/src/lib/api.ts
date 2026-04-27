import axios from "axios";
import type {
  Document,
  ChatResponse,
  ChatSource,
  SessionResponse,
  SessionListItem,
  SessionHistoryResponse,
  DocumentUploadResponse,
  HealthResponse,
  UsageResponse,
} from "./types";

const api = axios.create({
  baseURL: "/api",
});

// ── Documents ─────────────────────────────────────────────────────────────

export async function uploadDocument(
  file: File,
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<DocumentUploadResponse>(
    "/documents/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
}

export async function getDocuments(): Promise<Document[]> {
  const { data } = await api.get<Document[]>("/documents");
  return data;
}

export async function getDocumentStatus(documentId: string): Promise<Document> {
  const { data } = await api.get<Document>(`/documents/${documentId}/status`);
  return data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}`);
}

// ── Chat ──────────────────────────────────────────────────────────────────

export async function createSession(): Promise<SessionResponse> {
  const { data } = await api.post<SessionResponse>("/chat/sessions");
  return data;
}

export async function listSessions(): Promise<SessionListItem[]> {
  const { data } = await api.get<SessionListItem[]>("/chat/sessions");
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/chat/sessions/${sessionId}`);
}

export async function getSessionHistoryFull(
  sessionId: string,
): Promise<SessionHistoryResponse> {
  const { data } = await api.get<SessionHistoryResponse>(
    `/chat/sessions/${sessionId}/history`,
  );
  return data;
}

export async function sendMessage(
  sessionId: string,
  message: string,
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>("/chat", {
    session_id: sessionId,
    message,
  });
  return data;
}

export interface StreamCallbacks {
  onEnhancedQuery: (query: string) => void;
  onSources: (sources: ChatSource[]) => void;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  /** Called when the server detects a system-prompt leak in the streamed output. */
  onLeakDetected?: (replacement: string) => void;
}

export async function sendMessageStream(
  sessionId: string,
  message: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });

  if (!response.ok) {
    const err = await response.text();
    callbacks.onError(err || `HTTP ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("Відповідь не отримано");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse complete SSE events from buffer
    const parts = buffer.split("\n\n");
    // Keep the last part as it may be incomplete
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventType = "";
      let data = "";

      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ")) {
          data = line.slice(6);
        }
      }

      if (!eventType || !data) continue;

      try {
        const parsed = JSON.parse(data);
        switch (eventType) {
          case "enhanced_query":
            callbacks.onEnhancedQuery(parsed.query);
            break;
          case "sources":
            callbacks.onSources(parsed);
            break;
          case "chunk":
            callbacks.onChunk(parsed.text);
            break;
          case "done":
            callbacks.onDone();
            break;
          case "leak_detected":
            callbacks.onLeakDetected?.(parsed.replacement ?? "");
            break;
          case "error":
            callbacks.onError(parsed.detail || "Помилка потоку");
            break;
        }
      } catch {
        // Skip malformed events
      }
    }
  }
}

// ── Usage ──────────────────────────────────────────────────────────────────

export async function getUsage(): Promise<UsageResponse> {
  const { data } = await api.get<UsageResponse>("/usage");
  return data;
}

// ── Health ─────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}
