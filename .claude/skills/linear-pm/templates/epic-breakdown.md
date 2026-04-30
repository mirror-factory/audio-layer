# Epic Breakdown template

INVEST gate + Humanizing Work's 9 splitting patterns. Use to decompose a parent issue into stories.

## Inputs

- Parent issue: `{ID}`
- Title, description, acceptance criteria, priority, labels, target

## Output shape

```
EPIC: {parent.identifier} {parent.title}
──────────────────────────────────────────────────────────────────────────────────
INVEST gate
  Independent  ✓/✗   {reason if ✗}
  Negotiable   ✓/✗   {reason if ✗}
  Valuable     ✓/✗   {reason if ✗}
  Estimable    ✓/✗   {reason if ✗}
  Small        ✓/✗   {reason if ✗}
  Testable     ✓/✗   {reason if ✗}
Pass: {n}/6 → {proceed | block & ask}

Pattern matched: {one of 9} — {one-line rationale}

Proposed children:
──────────────────────────────────────────────────────────────────────────────────
1. {child.title}
   Description: {one paragraph}
   AC:
     - [ ] {item 1}
     - [ ] {item 2}
     - [ ] {item 3}
   Estimate: {S/M/L or hours}
   Labels: {inherited theme + assigned owner}
2. {child.title}
   ...
──────────────────────────────────────────────────────────────────────────────────
Re-INVEST per child: all ✓? {yes | reasons}

Deferrable (cut if low value): {child indices or "none"}
```

## INVEST checklist

| Letter | Question |
|---|---|
| **I**ndependent | Can this story ship without waiting on the others? |
| **N**egotiable | Is the AC flexible — can scope be cut and still deliver value? |
| **V**aluable | Does it deliver visible value to the user (not just engineers)? |
| **E**stimable | Can the team estimate it within ±50%? |
| **S**mall | Can a single dev finish it in ≤1 sprint? |
| **T**estable | Can pass/fail be verified objectively? |

If <2 of 6 pass, **block** the decomposition and ask the user to clarify before splitting.

## The 9 splitting patterns (try in order, stop on first match)

| # | Pattern | When it fits |
|---|---|---|
| 1 | **Workflow Steps** | The story is a multi-step process; split at step boundaries |
| 2 | **Operations (CRUD)** | Story includes Create + Read + Update + Delete; split per operation |
| 3 | **Business Rule Variations** | Different rules per role/tier/region; split per variation |
| 4 | **Data Variations** | Same logic, different inputs (file types, locales, sizes) |
| 5 | **Data Entry Methods** | Multiple ways to provide input (form, upload, API) |
| 6 | **Major Effort** | One sub-task is much larger than others; pull it out |
| 7 | **Simple/Complex** | Split happy-path from edge cases |
| 8 | **Defer Performance** | Ship correctness first, optimize later |
| 9 | **Spike (Break Out)** | Uncertainty too high; produce a short investigation first |

## Quality gate

A decomposition passes when:

- Each child is INVEST-compliant on its own.
- Children are roughly equal-sized (no child >2× another).
- The split reveals at least one cuttable item.
- Each child is a vertical slice (touches end-to-end), not a layer (frontend/backend).

If none of those are true, the chosen pattern was wrong. Try the next one.

## Worked example (PROD-224 Supabase prod migration)

```
EPIC: PROD-224 Production Supabase migration
──────────────────────────────────────────────────────────────────────────────────
INVEST gate
  Independent  ✓
  Negotiable   ✓
  Valuable     ✓
  Estimable    ✗   No time box; depends on number of migrations
  Small        ✗   5 acceptance criteria; multi-step
  Testable     ✓
Pass: 4/6 → proceed (>= 2 of 6)

Pattern matched: 1. Workflow Steps — AC is already a 5-step sequence.

Proposed children:
──────────────────────────────────────────────────────────────────────────────────
1. Create production Supabase project + apply migrations
   AC:
     - [ ] Create production Supabase project
     - [ ] Apply 18 migrations cleanly
     - [ ] Confirm pgvector extension enabled
   Estimate: M  ·  Labels: theme:install · theme:platform · owner:human

2. Verify HNSW indexes + RLS policies
   AC:
     - [ ] Verify HNSW vector indexes
     - [ ] Confirm RLS policies active on all tables
     - [ ] Run anonymized seed data for sanity check
   Estimate: S  ·  Labels: theme:install · theme:platform · owner:agent

3. Validate all RPC functions in production
   AC:
     - [ ] Test each RPC function with mock client
     - [ ] Confirm no missing functions vs local schema
   Estimate: S  ·  Labels: theme:install · theme:test · owner:agent

4. Cut over .env to production Supabase URL
   AC:
     - [ ] Update Vercel env vars
     - [ ] Smoke test /api/health and /api/meetings
     - [ ] Roll back plan documented
   Estimate: S  ·  Labels: theme:install · theme:platform · owner:human
──────────────────────────────────────────────────────────────────────────────────
Re-INVEST per child: all ✓
Deferrable: child 3 if migrations are confirmed identical to local
```

## Tooling

```
get_issue(parentId)
emit INVEST gate
choose pattern, propose children
wait for confirmation
save_issue parent (label kind:epic)
save_issue children (parentId set, labels inherited)
save_comment on parent: "Decomposed into N stories on YYYY-MM-DD."
```
