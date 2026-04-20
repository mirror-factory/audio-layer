import type { TranscribeUtterance } from "@/lib/assemblyai/types";
import type { MeetingSummary } from "@/lib/assemblyai/schema";

interface TranscriptViewProps {
  utterances: TranscribeUtterance[];
  summary: MeetingSummary | null;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptView({ utterances, summary }: TranscriptViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Utterances */}
      <div className="bg-[#171717] rounded-xl p-4 lg:p-6">
        <h3 className="text-sm font-semibold text-[#e5e5e5] mb-4 uppercase tracking-wider">
          Transcript
        </h3>
        {utterances.length === 0 ? (
          <p className="text-sm text-[#525252]">No utterances available.</p>
        ) : (
          <div className="space-y-3">
            {utterances.map((u, i) => (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 mt-0.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#262626] text-xs font-semibold text-[#a3a3a3]">
                    {u.speaker ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-[#737373] font-medium">
                      {u.speaker ? `Speaker ${u.speaker}` : "Unknown"}
                    </span>
                    <span className="text-xs text-[#525252]">
                      {formatTime(u.start)}
                    </span>
                  </div>
                  <p className="text-sm text-[#d4d4d4] leading-relaxed">
                    {u.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-[#171717] rounded-xl p-4 lg:p-6">
        <h3 className="text-sm font-semibold text-[#e5e5e5] mb-4 uppercase tracking-wider">
          Summary
        </h3>
        {!summary ? (
          <p className="text-sm text-[#525252]">No summary available.</p>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-[#d4d4d4] leading-relaxed">
              {summary.summary}
            </p>

            {summary.keyPoints.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
                  Key Points
                </h4>
                <ul className="space-y-1.5">
                  {summary.keyPoints.map((kp, i) => (
                    <li
                      key={i}
                      className="text-sm text-[#a3a3a3] pl-3 border-l-2 border-[#14b8a6]/30"
                    >
                      {kp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.actionItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
                  Action Items
                </h4>
                <ul className="space-y-1.5">
                  {summary.actionItems.map((ai, i) => (
                    <li key={i} className="text-sm text-[#a3a3a3]">
                      <span className="text-[#14b8a6]">
                        {ai.assignee ?? "Unassigned"}:
                      </span>{" "}
                      {ai.task}
                      {ai.dueDate && (
                        <span className="text-xs text-[#525252] ml-2">
                          (due {ai.dueDate})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.decisions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
                  Decisions
                </h4>
                <ul className="space-y-1.5">
                  {summary.decisions.map((d, i) => (
                    <li
                      key={i}
                      className="text-sm text-[#a3a3a3] pl-3 border-l-2 border-[#14b8a6]/30"
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.participants.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
                  Participants
                </h4>
                <div className="flex flex-wrap gap-2">
                  {summary.participants.map((p, i) => (
                    <span
                      key={i}
                      className="text-xs bg-[#262626] text-[#a3a3a3] px-2 py-1 rounded-md"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
