import type { Meeting, MeetingListItem } from "@/lib/meetings/types";
import { fixtureUsers, type FixtureUserKey } from "./users";

/**
 * Deterministic meeting fixtures for integration + RLS tests.
 *
 * Each user owns three meetings. Titles + transcript text intentionally
 * overlap on keywords like "design review", "kickoff", and "Q3 roadmap" so
 * that search/RLS leakage bugs surface as cross-user matches instead of
 * silently returning the right shape with the wrong owner.
 *
 * Backwards-compat:
 *   `fixtureMeetingListItems.ownerPlanning`     -> first owner meeting
 *   `fixtureMeetingListItems.intruderPlanning`  -> first intruder meeting
 *   `fixtureMeetings.ownerPlanning`             -> hydrated owner meeting #1
 * These keys are still exposed for `tests/api-route-behavior.test.ts` and
 * any other callers that imported the original two-item layout.
 */

export interface FixtureMeetingListItem extends MeetingListItem {
  userId: string;
}

export interface FixtureMeeting extends Meeting {
  userId: string;
}

interface RawMeeting {
  id: string;
  user: FixtureUserKey;
  title: string;
  text: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

const RAW_MEETINGS: ReadonlyArray<RawMeeting> = [
  // ---- Owner ----------------------------------------------------------------
  {
    id: "meeting_owner_planning",
    user: "owner",
    // NOTE: title text is asserted exact-match by existing
    // tests/api-route-behavior.test.ts ("Product planning"). Don't rename.
    title: "Product planning",
    text: "Owner-only roadmap decisions, Q3 roadmap, and design review prep, launch sequencing, kickoff agenda.",
    durationSeconds: 1800,
    createdAt: "2026-05-01T15:00:00.000Z",
    updatedAt: "2026-05-01T15:30:00.000Z",
  },
  {
    id: "meeting_owner_kickoff",
    user: "owner",
    title: "Q3 kickoff with platform team",
    text: "Owner kickoff covering staffing, design review cadence, and OKRs.",
    durationSeconds: 2700,
    createdAt: "2026-05-02T15:00:00.000Z",
    updatedAt: "2026-05-02T15:45:00.000Z",
  },
  {
    id: "meeting_owner_retro",
    user: "owner",
    title: "Sprint retro - design review follow-ups",
    text: "Owner retro on Q3 roadmap risks and launch blockers from kickoff.",
    durationSeconds: 1500,
    createdAt: "2026-05-03T15:00:00.000Z",
    updatedAt: "2026-05-03T15:25:00.000Z",
  },
  // ---- Intruder -------------------------------------------------------------
  // NOTE: intruder titles deliberately reuse owner keywords ("design review",
  // "kickoff", "Q3 roadmap") so that any leak shows up as a wrong-owner row,
  // not a "no match" false-negative.
  {
    id: "meeting_intruder_planning",
    user: "intruder",
    // Same title as the owner counterpart so a leaky list/search returns both.
    title: "Product planning",
    text: "Intruder-only competitive analysis, Q3 roadmap, design review concerns, and kickoff scoping.",
    durationSeconds: 2400,
    createdAt: "2026-05-01T16:00:00.000Z",
    updatedAt: "2026-05-01T16:40:00.000Z",
  },
  {
    id: "meeting_intruder_kickoff",
    user: "intruder",
    title: "External kickoff with vendor",
    text: "Intruder kickoff covering NDA, design review approvals, and pricing.",
    durationSeconds: 2100,
    createdAt: "2026-05-02T16:00:00.000Z",
    updatedAt: "2026-05-02T16:35:00.000Z",
  },
  {
    id: "meeting_intruder_secrets",
    user: "intruder",
    title: "Confidential Q3 roadmap session",
    text: "Intruder-only acquisition discussion that owner must never see.",
    durationSeconds: 3000,
    createdAt: "2026-05-03T16:00:00.000Z",
    updatedAt: "2026-05-03T16:50:00.000Z",
  },
];

function toListItem(raw: RawMeeting): FixtureMeetingListItem {
  return {
    id: raw.id,
    userId: fixtureUsers[raw.user].id,
    title: raw.title,
    status: "completed",
    durationSeconds: raw.durationSeconds,
    createdAt: raw.createdAt,
  };
}

function toMeeting(raw: RawMeeting): FixtureMeeting {
  return {
    id: raw.id,
    userId: fixtureUsers[raw.user].id,
    title: raw.title,
    status: "completed",
    durationSeconds: raw.durationSeconds,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    text: raw.text,
    utterances: [
      {
        speaker: fixtureUsers[raw.user].displayName,
        text: raw.text,
        start: 0,
        end: Math.max(1000, raw.durationSeconds * 10),
        confidence: 0.97,
      },
    ],
    summary: null,
    intakeForm: null,
    costBreakdown: null,
    error: null,
  };
}

/** Flat list of every fixture meeting (3 per user, 2 users = 6 total). */
export const fixtureMeetingList: ReadonlyArray<FixtureMeeting> =
  RAW_MEETINGS.map(toMeeting);

/** Flat list as the lighter `MeetingListItem` shape. */
export const fixtureMeetingListItemList: ReadonlyArray<FixtureMeetingListItem> =
  RAW_MEETINGS.map(toListItem);

/** Convenience: all meetings owned by a fixture user, in createdAt asc order. */
export function meetingsForUser(
  user: FixtureUserKey,
): ReadonlyArray<FixtureMeeting> {
  return fixtureMeetingList.filter(
    (meeting) => meeting.userId === fixtureUsers[user].id,
  );
}

/**
 * Backwards-compat keyed records. `ownerPlanning` and `intruderPlanning` map
 * to the first meeting per user so existing tests keep working.
 */
export const fixtureMeetingListItems: Record<
  | "ownerPlanning"
  | "ownerKickoff"
  | "ownerRetro"
  | "intruderPlanning"
  | "intruderKickoff"
  | "intruderSecrets",
  FixtureMeetingListItem
> = {
  ownerPlanning: toListItem(RAW_MEETINGS[0]!),
  ownerKickoff: toListItem(RAW_MEETINGS[1]!),
  ownerRetro: toListItem(RAW_MEETINGS[2]!),
  intruderPlanning: toListItem(RAW_MEETINGS[3]!),
  intruderKickoff: toListItem(RAW_MEETINGS[4]!),
  intruderSecrets: toListItem(RAW_MEETINGS[5]!),
};

export const fixtureMeetings: Record<
  | "ownerPlanning"
  | "ownerKickoff"
  | "ownerRetro"
  | "intruderPlanning"
  | "intruderKickoff"
  | "intruderSecrets",
  FixtureMeeting
> = {
  ownerPlanning: toMeeting(RAW_MEETINGS[0]!),
  ownerKickoff: toMeeting(RAW_MEETINGS[1]!),
  ownerRetro: toMeeting(RAW_MEETINGS[2]!),
  intruderPlanning: toMeeting(RAW_MEETINGS[3]!),
  intruderKickoff: toMeeting(RAW_MEETINGS[4]!),
  intruderSecrets: toMeeting(RAW_MEETINGS[5]!),
};
