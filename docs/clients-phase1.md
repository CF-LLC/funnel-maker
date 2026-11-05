# Clients phase 1 — website, Paused, archive

Scope is the existing Clients tool (`/crm`, `crm_contacts`). No new product, price, or tool slug. No billing, email, subscriber, or Stripe changes. `workspace_v2` and homepage flags are untouched. Operator `/admin` is not a store for this data.

Live cf-admin (Web Developer read-only audit, Nov 5 2026, 1:56 PM CT) matches snapshot `7a535bdb` at the file level: all 17 source files in the running container and 12 top-level disk modules, marker `7a535bd subscribers`, image `sha256:3847825b46c913bcdc8a98498aae2d2433f830dead16cd23b4fc617eabd6b508`. No mounts; direct JS. The container has no full revision label, so the file match supports the marker. It is not independent proof the process is that whole commit. `/healthz` was 200 with a healthy DB and Access configured. The uptime checker is enabled and the DB is configured, but sites and checked counts were 0, so the checker has not been shown to run. The CF LLC Stripe restricted key is absent (unconfigured). The Satoshi subscriber key is present, length-valid, and the default URL is used (configured). That configuration was not exercised. Those integrations stay out of this phase. A configured key is not operational parity.

## What this phase stores

| Column | Meaning |
|---|---|
| `name` | Contact person. Unchanged column. Label is “Contact person”. |
| `company` | Company / business. Unchanged column. Not filled from `name`. |
| `website` | Optional http(s) URL. Empty stays null. |
| `status` | `lead`, `active`, `paused`, `past`, `not_a_fit`. The first four existing values stay valid. |
| `archived_at` | Null = on the active list. Set = soft-archived. Restore sets it null. |

Archive is an update. The UI has no client delete. The pre-existing owner DELETE policy from `20261026a_crm.sql` is unchanged and unused by this UI.

Archived rows stay on `/crm/<email>` for that owner. The default list, CSV, and client pickers (Clients, Time, Expenses, Portal) omit them until the Archived filter is on (Clients list and its CSV). Another user’s rows are not updated: every write sets `user_id` from the session and the existing RLS policies require `user_id = auth.uid()`.

## Website

`cleanWebsite` in `lib/crm/core.ts` accepts only `http:` and `https:`. A bare hostname gets `https://`. `javascript:`, `data:`, and URLs with a username or password are rejected. The page puts `href` only on a value that passes that function again, with `rel="noopener noreferrer"`.

## Email-optional leads (not this phase)

Clients are still keyed by `(user_id, email)`. A lead with no email cannot be inserted, and this phase does not invent an email or match by name.

A later change would need a new identifier, not a rewrite of current email URLs:

- Add `id uuid` as the primary key.
- Keep a unique index on `(user_id, email)` where `email` is not null.
- Allow `email` null. Null never equals null, and nothing matches those rows by name.
- Keep `/crm/<email>` for rows that have an email. Add a separate id URL only for rows without one.
- Do not backfill placeholder emails.

That is a key change. It is deferred.

## Migration and rollback

File: `supabase/migrations/20261105195825_clients_website_paused_archive.sql` (created with `supabase migration new`). It is not applied to the live database here.

Apply it before serving this app. The new picker queries filter `archived_at is null` and will error if the column is missing.

Ordinary rollback is an application or image rollback only. Leave the additive columns, the widened status check, and the stored website, Paused, and `archived_at` values in place. The previous app build may not show those fields. It does not erase client records or those columns. Do not drop `website` or `archived_at`, narrow the status check, or clear Paused or website values. That would lose user data and is not authorized.
