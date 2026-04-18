# Shared Workspaces — Implementation Spec

## Overview

Shared workspaces let users organize meetings into folders, invite team members, and share individual meetings via link. Every user gets a "Personal" workspace automatically — existing meetings migrate into it.

---

## Database Schema

### New Tables

| Table | Purpose |
|---|---|
| `workspaces` | Shared space with name, slug, creator |
| `workspace_members` | User ↔ workspace association with role (owner/member) |
| `workspace_invites` | Pending invites by email (before user has an account) |
| `folders` | Organize meetings within a workspace |
| `shared_links` | Public or workspace-scoped share links for meetings |

### Changes to Existing Tables

| Table | New Columns |
|---|---|
| `meetings` | `workspace_id uuid` (FK → workspaces), `folder_id uuid` (FK → folders) |

### Permissions Model

| Role | Can do |
|---|---|
| **Owner** | Full control: invite, remove, delete workspace, manage folders, manage share links |
| **Member** | View all workspace meetings, create meetings, move to folders, create share links |
| **Viewer** | Read-only via shared link (no account required for public links) |

### RLS Policies

- Meetings: viewable by owner (`user_id`) OR workspace members
- Workspaces: viewable/editable by members, deletable by owners only
- Folders: viewable by workspace members, deletable by owners only
- Shared links: managed by meeting owner or workspace members
- Public share endpoint bypasses RLS (service-role client)

---

## API Routes

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/workspaces` | List/create workspaces |
| GET/PATCH/DELETE | `/api/workspaces/[id]` | Get/update/delete workspace |
| GET/POST | `/api/workspaces/[id]/members` | List/add members |
| DELETE | `/api/workspaces/[id]/members/[userId]` | Remove member |
| GET/POST | `/api/workspaces/[id]/invites` | List/create invites |
| DELETE | `/api/workspaces/[id]/invites/[inviteId]` | Revoke invite |
| GET/POST | `/api/workspaces/[id]/folders` | List/create folders |
| PATCH/DELETE | `/api/workspaces/[id]/folders/[folderId]` | Rename/delete folder |
| GET | `/api/workspaces/[id]/meetings` | List workspace meetings (with ?folderId=) |
| GET/POST/DELETE | `/api/meetings/[id]/share` | Manage share links |
| GET | `/api/shared/[token]` | Public: fetch meeting by share token |
| POST | `/api/auth/accept-invite` | Claim pending invites after sign-in |

---

## UI Pages

| Path | Purpose |
|---|---|
| `/workspaces` | List user's workspaces |
| `/workspaces/new` | Create workspace form |
| `/workspaces/[slug]` | Workspace dashboard: folders sidebar + meeting list |
| `/workspaces/[slug]/settings` | Workspace settings: rename, members, invites, delete |
| `/shared/[token]` | Public shared meeting view (read-only) |

## New Components

| Component | Purpose |
|---|---|
| `workspace-switcher.tsx` | Dropdown to switch between workspaces |
| `workspace-sidebar.tsx` | Folders list + "All" pseudo-folder |
| `member-list.tsx` | Members with remove button (owners only) |
| `invite-form.tsx` | Email input to invite users |
| `share-meeting-dialog.tsx` | Create/copy/revoke share links |
| `folder-actions.tsx` | Create/rename/delete folders |
| `meeting-move-dialog.tsx` | Move meeting between folders |

---

## Implementation Phases

### Phase 1 — Schema (backward compatible)
1. Create all new tables + RLS policies
2. Add `workspace_id`, `folder_id` columns to meetings
3. Auto-create "Personal" workspace for existing users
4. Assign existing meetings to personal workspaces

### Phase 2 — Type system + store layer
5. Create `lib/workspaces/types.ts`
6. Create `lib/workspaces/store.ts` + `store-supabase.ts`
7. Create `lib/workspaces/ensure-personal.ts`
8. Extend meetings types + store with workspace/folder fields

### Phase 3 — API routes
9. All workspace/member/invite/folder/share routes
10. Public share endpoint (service-role, no auth)
11. Invite acceptance after sign-in

### Phase 4 — UI
12. Workspace pages + components
13. Share button on meeting detail
14. Update nav bar with Workspaces tab
15. Folder sidebar + meeting organization

### Phase 5 — Invite flow
16. Middleware auto-claims invites after auth
17. Invite emails via Resend

---

## Key Decisions

- **Slug-based workspace URLs** (`/workspaces/acme-team`) for clean navigation
- **Personal workspace auto-created** so existing single-user meetings work immediately
- **Invites by email** work even before the invited user has an account
- **`user_id` stays on meetings** — backward compatible, workspace is an organizational layer on top
- **Public share links** use service-role client to bypass RLS for unauthenticated viewers
