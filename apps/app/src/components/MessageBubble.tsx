import { useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatSource } from "@/lib/types";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  enhancedQuery?: string;
}

/**
 * Build a map from source index (1-based) to its download URL.
 * Used to turn inline "(Source N: …)" citations into clickable links.
 */
function buildSourceMap(sources: ChatSource[]): Map<number, ChatSource> {
  const map = new Map<number, ChatSource>();
  sources.forEach((s, i) => map.set(i + 1, s));
  return map;
}

/**
 * Try to find a source by fuzzy-matching a description string against
 * document_name or section_title. Used for unnumbered "Source: desc" patterns.
 */
function findSourceByDesc(
  desc: string,
  sources: ChatSource[],
): ChatSource | null {
  if (!desc) return null;
  const lower = desc.toLowerCase();
  // Exact document_name match (with or without the section part after " – ")
  for (const s of sources) {
    if (lower.includes(s.document_name.toLowerCase())) return s;
  }
  // Try matching section_title
  for (const s of sources) {
    if (s.section_title && lower.includes(s.section_title.toLowerCase()))
      return s;
  }
  // Fallback: if there's only one source, assume it's that one
  if (sources.length === 1) return sources[0];
  return null;
}

/**
 * Turn a single "Source N" (with optional description) into a markdown link.
 * Also handles unnumbered "Source: description" via fuzzy matching.
 */
function sourceToLink(
  num: string | undefined,
  desc: string | undefined,
  sourceMap: Map<number, ChatSource>,
  allSources: ChatSource[],
): string | null {
  let source: ChatSource | null = null;
  let idx: number | null = null;

  if (num) {
    idx = parseInt(num, 10);
    source = sourceMap.get(idx) ?? null;
  }

  // Unnumbered or numbered but not found — try fuzzy match on description
  if (!source && desc?.trim()) {
    source = findSourceByDesc(desc.trim(), allSources);
  }

  if (!source) return null;

  const url = `/api/documents/${source.document_id}/download`;
  const label = desc?.trim()
    ? idx
      ? `Джерело ${idx}: ${desc.trim()}`
      : `Джерело: ${desc.trim()}`
    : idx
      ? `Джерело ${idx}: ${source.document_name}`
      : `Джерело: ${source.document_name}`;
  return `[${label}](${url})`;
}

// Pattern to match "Source N: desc" / "Джерело N: desc" (numbered) or without number.
// Description capture allows balanced () to handle filenames like "NDA (WOG).docx".
const SOURCE_WORD = "(?:Source|Джерело)";
const DESC_CHAR = `(?:[^,;()\\]\\n]|\\([^)]*\\))`;
const SOURCE_TOKEN_RE = new RegExp(
  `${SOURCE_WORD}(?:\\s+(\\d+))?\\s*:\\s*(${DESC_CHAR}*?)(?=\\s*(?:[,;)\\]]|\\band\\b|${SOURCE_WORD}|$))`,
  "gi",
);

// Pattern to match bare "Source N" / "Джерело N" without description
const SOURCE_BARE_RE = new RegExp(
  `${SOURCE_WORD}\\s+(\\d+)(?=\\s*(?:[,;)\\]]|\\band\\b|${SOURCE_WORD}|$))`,
  "gi",
);

/**
 * Replace inline source citation patterns with markdown links.
 *
 * Handles grouped and standalone patterns (case-insensitive):
 *   (Source 1: file.pdf – Title, Source 2: other.pdf – Section)
 *   (Source 1, Source 2)
 *   (Source 1)
 *   Source 1: file.pdf – Title
 *   Source 1
 */
function linkifySources(
  text: string,
  sourceMap: Map<number, ChatSource>,
  allSources: ChatSource[],
): string {
  // Collect replacements with placeholder tokens, then apply all at once.
  // This avoids double-matching when link text itself contains "Source N".
  const placeholders: string[] = [];

  function makePlaceholder(link: string): string {
    const idx = placeholders.length;
    placeholders.push(link);
    return `\x00SRC${idx}\x00`;
  }

  // Combined pattern matching grouped citations inside parens/brackets.
  // INNER allows balanced () to handle filenames like "NDA (WOG).docx".
  const INNER = `(?:[^()\\[\\]]|\\([^)]*\\))`;
  const GROUP_RE = new RegExp(
    `[(\\[](${INNER}*${SOURCE_WORD}[\\s\\d:]${INNER}*)[)\\]]`,
    "gi",
  );

  // Step 1: Handle grouped sources inside parens/brackets
  let result = text.replace(GROUP_RE, (groupMatch, inner: string) => {
    const links: string[] = [];
    let anyReplaced = false;

    // First pass: "Source N: desc" and "Source: desc"
    let m: RegExpExecArray | null;
    const re1 = new RegExp(SOURCE_TOKEN_RE.source, SOURCE_TOKEN_RE.flags);
    const consumed = new Set<number>();
    while ((m = re1.exec(inner)) !== null) {
      const link = sourceToLink(m[1], m[2], sourceMap, allSources);
      if (link) {
        links.push(makePlaceholder(link));
        anyReplaced = true;
      } else {
        links.push(m[0]);
      }
      // Mark character range as consumed so bare pass doesn't double-match
      for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
    }

    // Second pass: bare "Source N" (no colon) that weren't already consumed
    const re2 = new RegExp(SOURCE_BARE_RE.source, SOURCE_BARE_RE.flags);
    while ((m = re2.exec(inner)) !== null) {
      if (consumed.has(m.index)) continue;
      const link = sourceToLink(m[1], undefined, sourceMap, allSources);
      if (link) {
        links.push(makePlaceholder(link));
        anyReplaced = true;
      } else {
        links.push(m[0]);
      }
    }

    if (!anyReplaced) return groupMatch;
    return links.join(" ");
  });

  // Step 2: Handle standalone "Source N: desc" / "Source: desc" not already replaced
  result = result.replace(
    new RegExp(SOURCE_TOKEN_RE.source, SOURCE_TOKEN_RE.flags),
    (match, num?: string, desc?: string) => {
      const link = sourceToLink(num, desc, sourceMap, allSources);
      return link ? makePlaceholder(link) : match;
    },
  );

  // Step 3: Handle standalone bare "Source N"
  result = result.replace(
    new RegExp(SOURCE_BARE_RE.source, SOURCE_BARE_RE.flags),
    (match, num: string) => {
      const link = sourceToLink(num, undefined, sourceMap, allSources);
      return link ? makePlaceholder(link) : match;
    },
  );

  // Step 4: Restore placeholders
  result = result.replace(
    /\x00SRC(\d+)\x00/g,
    (_, idx) => placeholders[parseInt(idx, 10)],
  );

  // Step 5: Clean up extra whitespace left from removed delimiters
  return result.replace(/ {2,}/g, " ").trim();
}

export function MessageBubble({
  role,
  content,
  sources,
  enhancedQuery,
}: MessageBubbleProps) {
  const isUser = role === "user";

  const processedContent = useMemo(() => {
    if (isUser || !sources || sources.length === 0) return content;
    const sourceMap = buildSourceMap(sources);
    return linkifySources(content, sourceMap, sources);
  }, [content, sources, isUser]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] space-y-2`}>
        {/* Enhanced query indicator (assistant only, for demo transparency) */}
        {!isUser && enhancedQuery && (
          <p className="px-1 text-xs italic text-muted-foreground/70">
            Пошук: &ldquo;{enhancedQuery}&rdquo;
          </p>
        )}

        <div
          className={`space-y-2 ${
            isUser
              ? "rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground"
              : "rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5"
          }`}
        >
          {/* Message content */}
          {isUser ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          ) : (
            <div className="bubble-markdown text-sm leading-relaxed">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children, ...props }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {processedContent}
              </Markdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
