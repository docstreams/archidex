export interface Document {
  document_id: string;
  document_name: string;
  version: number;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  created_at: string;
  error_message?: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  document_id: string;
  document_name: string;
  section_title: string;
  chunk_index: number;
  snippet: string;
}

export interface ChatResponse {
  response: string;
  sources: ChatSource[];
}

export interface SessionResponse {
  session_id: string;
}

export interface SessionListItem {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[] | null;
  enhanced_query?: string | null;
}

export interface SessionHistoryResponse {
  session_id: string;
  title: string;
  messages: HistoryMessage[];
}

export interface DocumentUploadResponse {
  document_id: string;
  document_name: string;
  version: number;
  status: string;
}

export interface HealthResponse {
  status: string;
  qdrant: string;
  database: string;
}

export interface UsageMetric {
  used: number;
  limit: number;
}

export interface UsageResponse {
  ocr_pages: UsageMetric;
  embedding_tokens: UsageMetric;
  llm_tokens: UsageMetric;
}
