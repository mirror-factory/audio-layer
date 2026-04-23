"use client";

import { useState } from "react";
import type { TranscribeUtterance } from "@/lib/assemblyai/types";
import type { MeetingSummary } from "@/lib/assemblyai/schema";
import { Download, ChevronDown } from "lucide-react";

interface TranscriptViewProps {
  utterances: TranscribeUtterance[];
  summary: MeetingSummary | null;
  meetingId: string;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-[var(--text-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function CappedList({
  items,
  max = 5,
  renderItem,
}: {
  items: string[];
  max?: number;
  renderItem?: (item: string, i: number) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, max);
  const hasMore = items.length > max;

  return (
    <>
      <ul className="space-y-1.5">
        {visible.map((item, i) =>
          renderItem ? (
            <li key={i}>{renderItem(item, i)}</li>
          ) : (
            <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2">
              <span className="text-[#14b8a6] shrink-0">·</span>
              {item}
            </li>
          ),
        )}
      </ul>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#14b8a6] hover:text-[#2dd4bf] mt-2 transition-colors"
        >
          {expanded ? "Show less" : `+${items.length - max} more`}
        </button>
      )}
    </>
  );
}

export function TranscriptView({ utterances, summary, meetingId }: TranscriptViewProps) {
  return (
    <div className="space-y-4">
      {/* Summary — always on top, most valuable */}
      {summary && (
        <CollapsibleSection title="Summary" defaultOpen>
          <div className="space-y-5">
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {summary.summary}
            </p>

            {summary.keyPoints.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Key Points
                </h4>
                <CappedList items={summary.keyPoints} max={6} />
              </div>
            )}

            {summary.actionItems.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Action Items
                </h4>
                <CappedList
                  items={summary.actionItems.map(
                    (ai) =>
                      `${ai.assignee ? `${ai.assignee}: ` : ""}${ai.task}${ai.dueDate ? ` (due ${ai.dueDate})` : ""}`,
                  )}
                  max={5}
                />
              </div>
            )}

            {summary.decisions.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Decisions
                </h4>
                <CappedList items={summary.decisions} max={5} />
              </div>
            )}

            {summary.participants.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Participants
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-hidden relative">
                  {summary.participants.slice(0, 12).map((p, i) => (
                    <span key={i} className="text-xs bg-[var(--bg-card-hover)] text-[var(--text-secondary)] px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                  {summary.participants.length > 12 && (
                    <span className="text-xs text-[var(--text-muted)] px-2 py-0.5">
                      +{summary.participants.length - 12} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Transcript — collapsible, with grid background */}
      <CollapsibleSection
        title="Transcript"
        defaultOpen={!summary}
        badge={utterances.length > 0 ? `${utterances.length} segments` : undefined}
      >
        <div className="flex items-center justify-end gap-1 mb-3">
          <a
            href={`/api/meetings/${meetingId}/export?format=md`}
            className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-md hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <Download size={12} />
            MD
          </a>
          <a
            href={`/api/meetings/${meetingId}/export?format=pdf`}
            className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-md hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <Download size={12} />
            PDF
          </a>
        </div>

        <div className="transcript-grid rounded-lg p-3 max-h-[60dvh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {utterances.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4">No utterances available.</p>
          ) : (
            <div className="space-y-3">
              {utterances.map((u, i) => (
                <div key={i} className="flex gap-3 items-start group">
                  <span className="shrink-0 text-[10px] text-[var(--text-muted)]/60 tabular-nums pt-0.5 w-10 text-right">
                    {formatTime(u.start)}
                  </span>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed flex-1">
                    {u.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
