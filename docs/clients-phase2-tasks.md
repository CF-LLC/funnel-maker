# Clients phase 2 — private manual tasks

Account-owned follow-ups for the signed-in user. Not a new product, price, or launch flag. Not the operator `/admin` console. Clients record fields from phase 1 stay as they are.

Old cf-admin `/tasks` (snapshot `7a535bdb`) is a private list: required title, optional due date, done/reopen (`done_at` set or cleared). This slice matches that job. It does not add the old optional client, notes, or archive. Those stay out of this PR on purpose. Today’s count rows and portal checklists (`pt_tasks`) are different jobs and are not changed. Time entries and time projects are not changed.

## Route

`/tasks` is unused as a page. `/api/portal/tasks` is the client portal. A path under `app/crm/[contactId]` would treat the word `tasks` as an email if it were only a dynamic segment. Next.js serves a static `app/crm/tasks/page.tsx` ahead of that dynamic segment, and `/crm` is already the Clients sign-in prefix. The page is `/crm/tasks`.

The Clients header links to it. The Clients tool nav also lists Tasks, so the dashboard sidebar shows it only when Clients itself is shown. No flag is turned on and no new tool id is added.

## Data

Table `public.crm_tasks`, one row per task:

| Column | Meaning |
|---|---|
| `id` | uuid, generated |
| `user_id` | owner, from the session only |
| `title` | required, trimmed, 1–200 characters |
| `due_on` | optional calendar date (`YYYY-MM-DD`), or null |
| `done_at` | null = open. Set when marked done. Cleared on reopen |
| `created_at`, `updated_at` | timestamptz |

Open rows split on the America/Chicago calendar date used by Clients:

- **Overdue:** not done, and `due_on` is before today
- **Upcoming:** not done, and `due_on` is today, later, or empty (“No due date”)
- **Completed:** `done_at` is set

There is no delete API and no delete grant for `authenticated`.

## Access

Same gate as other Clients writes: `crmGuard`. Signed out → 401. No Clients access → 403. Demo account may read sample tasks and cannot write. Inserts and updates set `user_id` from `auth.uid()` / the session. A `user_id` in the body is ignored. RLS: select/update only `user_id = auth.uid()`; insert and update also require `crm_has_access`.

The migration revokes default table grants from `public`, `anon`, and `authenticated`, then grants only `select`, `insert`, and `update` to `authenticated`. No `DELETE`, no `TRUNCATE`. Other tables’ grants are not changed. App routes use the session client, not the service role.

Unit tests of that SQL and of the in-memory guard stub are not live Postgres RLS proof.

## API

- `POST /api/crm/tasks` JSON `{ title, due_on? }` creates a row
- `PATCH /api/crm/tasks/:id` JSON `{ title?, due_on? }` edits title and/or due date
- `POST /api/crm/tasks/:id/done` JSON `{ done: true|false }` sets or clears `done_at`

No email, cron, or third-party calls.

## Rollback

Roll back the application or image only. Keep `crm_tasks` and its rows. The previous app does not read this table, so those rows stay unused until this build returns. Do not drop the table or delete its rows as a rollback. That would lose user data and is not authorized.

## TDD order

1. Pure title, date, and overdue/upcoming/completed grouping (fails until `lib/crm/tasks.ts`).
2. Route auth, access, demo, owner isolation, forged `user_id`, validation, done/reopen (fails until the routes).
3. SQL text checks for RLS and the narrow grant, labeled as not live proof.
4. Then the page, empty state, and header/nav link.

## Self-review

- Parity of this slice is title + optional due + done/reopen only.
- Ownership is the signed-in account, not a sitewide admin.
- Portal tasks and Time stay on their own tables and routes.
- Empty, overdue, upcoming, and completed are visible without a new flag.
