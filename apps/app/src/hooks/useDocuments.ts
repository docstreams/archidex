import { useState, useEffect, useCallback, useRef } from "react";
import type { Document } from "@/lib/types";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentStatus,
} from "@/lib/api";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const pollingIds = useRef<Set<string>>(new Set());

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      return docs;
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      return [];
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll processing documents
  useEffect(() => {
    const processingDocs = documents.filter((d) => d.status === "processing");

    for (const doc of processingDocs) {
      if (pollingIds.current.has(doc.document_id)) continue;
      pollingIds.current.add(doc.document_id);

      const poll = async () => {
        try {
          const status = await getDocumentStatus(doc.document_id);
          if (status.status !== "processing") {
            pollingIds.current.delete(doc.document_id);
            setDocuments((prev) =>
              prev.map((d) =>
                d.document_id === doc.document_id ? { ...d, ...status } : d,
              ),
            );
          } else {
            setTimeout(poll, 2000);
          }
        } catch {
          pollingIds.current.delete(doc.document_id);
        }
      };

      setTimeout(poll, 2000);
    }
  }, [documents]);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadDocument(file);
      setDocuments((prev) => [
        {
          document_id: result.document_id,
          document_name: result.document_name,
          version: result.version,
          status: "processing",
          chunk_count: 0,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      return result;
    } finally {
      setUploading(false);
    }
  }, []);

  const remove = useCallback(async (documentId: string) => {
    await deleteDocument(documentId);
    setDocuments((prev) => prev.filter((d) => d.document_id !== documentId));
  }, []);

  return {
    documents,
    uploading,
    upload,
    remove,
    refresh: fetchDocuments,
  };
}
