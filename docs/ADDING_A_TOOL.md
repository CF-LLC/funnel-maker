# Adding a tool to SaaS Nation

All tools live in this repo and share one core. A new tool needs exactly three things.

## Shared core (don't copy, just use)
| Concern | Where |
|---|---|
| Tool list (single source of truth) | `tools/registry.ts` |
| Auth helpers / Supabase clients | `lib/supabase.ts`, `lib/server/admin-client.ts`, `middleware.ts` |
| Manual approval | `users.approved`, `app/api/admin/approve`, `lib/server/access-admin.ts` (`syncApproval`) |
| Per-tool access | `public.app_access`, `lib/access.ts` (`hasAccess(user, toolId)`; an active `all` row covers every tool) |
| Stripe webhook + price map | `app/api/stripe/webhook`, `lib/stripe-webhook.ts`, env `STRIPE_PRICE_MAP` (`{"price_or_plink_id": {"tool": "<toolId>"}}`) |
| Pricing page tool list | `components/tools/tools-list.tsx` (reads the registry) |
| Dashboard home ("Your tools", active/locked) | `components/tools/your-tools.tsx` |
| Sidebar | `app/dashboard/layout.tsx` (reads `nav` from the registry) |
| Admin access page | `app/dashboard/admin/access` (tool tabs from the registry) |
| Turnstile, footer | `components/turnstile.tsx`, `lib/turnstile.ts`, `components/nav/footer.tsx` |

## The three steps
1. **Module folder** `tools/<id>/tool.ts` exporting a `ToolDef` (`tools/types.ts`):
   `id`, `name`, `tagline`, `route`, `nav` (sidebar entries; icons from `ToolIcon`), `accessKey` (= id),
   `protectedPaths` (sign-in required, enforced by middleware), `priceLabel`.
   Put the tool's pages under its own route (e.g. `app/<route>/...`), its components in `components/<id>/`,
   its logic in `lib/<id>/`. Gate the tool layout with `hasAccess(user, '<id>')` and show a locked state linking to `/pricing`
   (copy `app/invoices/layout.tsx`).
2. **Registry entry**: import it in `tools/registry.ts` and append it to `TOOL_REGISTRY`.
   Types (`ToolId`, `MapTool`), pricing, dashboard home, sidebar, middleware and admin tabs update automatically.
3. **app_access tool id**: a migration that extends the `app_access.tool` check constraint to include the id
   (take a backup of `app_access` first, see the repo rules), e.g.
   ```sql
   alter table public.app_access drop constraint app_access_tool_check;
   alter table public.app_access add constraint app_access_tool_check check (tool in ('funnels','invoices','<id>','all'));
   ```
   Tables for the tool use a short prefix (`inv_`, `lib_`, ...) with owner-only RLS, plus a
   `<prefix>_has_access()` SQL helper that checks `app_access` for `<id>` or `all`.

Then, when Stripe prices exist, add them to `STRIPE_PRICE_MAP` with `"tool": "<id>"`.

## Checklist
- Existing URLs untouched; new tool under its own route.
- `npx tsc --noEmit && npm run build && npm test` (tests/tool-registry.test.cjs checks registry invariants).
