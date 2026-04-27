import { useCallback, useState, useRef } from "react";

interface DocumentUploadProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

export function DocumentUpload({ onUpload, uploading }: DocumentUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = useCallback(
    async (file: File) => {
      setError(null);
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      if (
        !ACCEPTED_TYPES.includes(file.type) &&
        !ACCEPTED_EXTENSIONS.includes(ext)
      ) {
        setError("Підтримуються лише файли PDF та DOCX");
        return;
      }

      try {
        await onUpload(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не вдалося завантажити");
      }
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndUpload(file);
    },
    [validateAndUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [validateAndUpload],
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          cursor-pointer rounded-lg border-2 border-dashed p-4 text-center
          transition-colors
          ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
          ${uploading ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">
          {uploading
            ? "Завантаження..."
            : "Перетягніть PDF або DOCX сюди, або натисніть для вибору"}
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
