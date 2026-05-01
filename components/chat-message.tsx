"use client";

import type { ComponentProps, ReactNode } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { ToolCard } from "./tool-card";

interface ChatMessageProps {
  message: UIMessage;
  onCitationClick?: (segmentNumber: number) => void;
}

const CITATION_PATTERN = /\[S(\d+)\]/g;

function renderWithCitations(
  text: string,
  onCitationClick?: (segmentNumber: number) => void,
): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  CITATION_PATTERN.lastIndex = 0;

  while ((match = CITATION_PATTERN.exec(text)) !== null) {
    const [token, rawNum] = match;
    const segment = Number(rawNum);
    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index));
    }
    parts.push(
      <button
        key={`cite-${match.index}-${segment}`}
        type="button"
        onClick={() => onCitationClick?.(segment)}
        aria-label={`Jump to transcript segment ${segment}`}
        className="mx-0.5 inline-flex h-5 min-w-[24px] items-center justify-center rounded-full bg-layers-mint-soft/70 px-1.5 text-[10px] font-semibold text-layers-ink ring-1 ring-inset ring-layers-mint/30 transition-colors hover:bg-layers-mint hover:text-layers-ink focus:outline-none focus:ring-2 focus:ring-layers-mint"
      >
        S{segment}
      </button>,
    );
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

interface CitationChildrenProps {
  children?: ReactNode;
  onCitationClick?: (segmentNumber: number) => void;
}

function withCitations({ children, onCitationClick }: CitationChildrenProps): ReactNode {
  if (typeof children === "string") {
    return renderWithCitations(children, onCitationClick);
  }
  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === "string") {
        return (
          <span key={index}>{renderWithCitations(child, onCitationClick)}</span>
        );
      }
      return child;
    });
  }
  return children;
}

interface MarkdownTextProps {
  text: string;
  onCitationClick?: (segmentNumber: number) => void;
}

function MarkdownText({ text, onCitationClick }: MarkdownTextProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        p: ({ children }: ComponentProps<"p">) => (
          <p className="leading-relaxed [&:not(:first-child)]:mt-2">
            {withCitations({ children, onCitationClick })}
          </p>
        ),
        ul: ({ children }: ComponentProps<"ul">) => (
          <ul className="ml-5 mt-2 list-disc space-y-1 marker:text-layers-mint">
            {children}
          </ul>
        ),
        ol: ({ children }: ComponentProps<"ol">) => (
          <ol className="ml-5 mt-2 list-decimal space-y-1 marker:text-layers-mint">
            {children}
          </ol>
        ),
        li: ({ children }: ComponentProps<"li">) => (
          <li className="leading-relaxed">
            {withCitations({ children, onCitationClick })}
          </li>
        ),
        strong: ({ children }: ComponentProps<"strong">) => (
          <strong className="font-semibold">
            {withCitations({ children, onCitationClick })}
          </strong>
        ),
        em: ({ children }: ComponentProps<"em">) => (
          <em className="italic">
            {withCitations({ children, onCitationClick })}
          </em>
        ),
        a: ({ children, href }: ComponentProps<"a">) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-layers-mint underline-offset-2 hover:underline"
          >
            {children}
          </a>
        ),
        code: ({ children, className }: ComponentProps<"code">) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block whitespace-pre rounded-md bg-[var(--bg-secondary)]/70 p-3 text-[12px] font-mono text-[var(--text-primary)]">
                {children}
              </code>
            );
          }
          return (
            <code className="rounded bg-[var(--bg-secondary)]/70 px-1 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          );
        },
        pre: ({ children }: ComponentProps<"pre">) => (
          <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--bg-secondary)]/70 p-3 text-[12px] font-mono text-[var(--text-primary)]">
            {children}
          </pre>
        ),
        h1: ({ children }: ComponentProps<"h1">) => (
          <h1 className="mt-3 text-base font-semibold">
            {withCitations({ children, onCitationClick })}
          </h1>
        ),
        h2: ({ children }: ComponentProps<"h2">) => (
          <h2 className="mt-3 text-[15px] font-semibold">
            {withCitations({ children, onCitationClick })}
          </h2>
        ),
        h3: ({ children }: ComponentProps<"h3">) => (
          <h3 className="mt-2 text-sm font-semibold">
            {withCitations({ children, onCitationClick })}
          </h3>
        ),
        table: ({ children }: ComponentProps<"table">) => (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              {children}
            </table>
          </div>
        ),
        th: ({ children }: ComponentProps<"th">) => (
          <th className="border-b border-[var(--border-subtle)] px-2 py-1 font-semibold">
            {children}
          </th>
        ),
        td: ({ children }: ComponentProps<"td">) => (
          <td className="border-b border-[var(--border-subtle)]/60 px-2 py-1">
            {withCitations({ children, onCitationClick })}
          </td>
        ),
        blockquote: ({ children }: ComponentProps<"blockquote">) => (
          <blockquote className="mt-2 border-l-2 border-layers-mint/40 pl-3 italic text-[var(--text-secondary)]">
            {children}
          </blockquote>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-layers-mint text-layers-ink"
            : "signal-transcript-card rounded-bl-sm text-[var(--text-primary)]"
        }`}
      >
        {message.parts?.map((part, i) => {
          if (part.type === "text") {
            if (isUser) {
              return (
                <span key={i} className="whitespace-pre-wrap">
                  {part.text}
                </span>
              );
            }
            return (
              <div key={i} className="chat-markdown space-y-0">
                <MarkdownText
                  text={part.text}
                  onCitationClick={onCitationClick}
                />
              </div>
            );
          }

          // Tool parts in v6 have type starting with "tool-" or "dynamic-tool"
          const partAny = part as Record<string, unknown>;
          const partType = partAny.type as string;
          if (partType.startsWith("tool-") || partType === "dynamic-tool") {
            const toolName =
              typeof partAny.toolName === "string"
                ? partAny.toolName
                : partType.replace("tool-", "");
            return (
              <ToolCard
                key={i}
                toolName={toolName}
                args={
                  partAny.input && typeof partAny.input === "object"
                    ? (partAny.input as Record<string, unknown>)
                    : {}
                }
                state={String(partAny.state ?? "call")}
                result={partAny.output}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
