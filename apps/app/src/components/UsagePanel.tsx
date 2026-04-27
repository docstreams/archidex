import type { UsageResponse, UsageMetric } from "@/lib/types";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function barColor(ratio: number): string {
  if (ratio >= 0.95) return "bg-red-500";
  if (ratio >= 0.8) return "bg-amber-500";
  return "bg-primary";
}

function MiniBar({ metric, label }: { metric: UsageMetric; label: string }) {
  const ratio = metric.limit > 0 ? metric.used / metric.limit : 0;
  const pct = Math.min(ratio * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>
          {formatNumber(metric.used)}/{formatNumber(metric.limit)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barColor(ratio)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface UsagePanelProps {
  usage: UsageResponse | null;
}

export function UsagePanel({ usage }: UsagePanelProps) {
  if (!usage) return null;

  return (
    <div className="space-y-2 px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">Використання</p>
      <MiniBar metric={usage.ocr_pages} label="OCR сторінки" />
      <MiniBar metric={usage.embedding_tokens} label="Ембединги" />
      <MiniBar metric={usage.llm_tokens} label="LLM токени" />
    </div>
  );
}
