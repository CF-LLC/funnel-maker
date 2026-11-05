# SaaS Nation help, email only

Status: design proposal. Not an implementation plan and not a build.

The original request, verified as CTO user position 4175, is a good support option for SaaS Nation if one is not already there. A later relay says the Nov 5, 3:35 PM widget choice was "Build a Help page with email support only." The readable transcript around assistant positions 4187, 4190, and 4191 did not include the raw widget at 4189. That choice is a relay. It is not an independently source-verified widget result, and it is not written spec approval from Cooper. This document drafts the email-only page under the original request and that relay. Implementation waits for Cooper's written review of this file.

## What exists today

`lib/site.ts` defines `SUPPORT_EMAIL` as `process.env.NEXT_PUBLIC_SUPPORT_EMAIL`, and if that is unset, `cooperfeatherstonellc@gmail.com`. A local resolution of the live footer matched that same address. This design does not claim the mailbox is monitored, that mail is delivered, or that the live environment variable was read from production secrets. A parent check of the authorized account is separate. No test message is part of this work.

The public footer, on desktop and in the stacked phone layout, already has a Support `mailto:` to `SUPPORT_EMAIL`. Privacy, terms, and the refund page use the same constant. There is no `/help` route and no `/contact` route. The marketing header and the phone menu list Tools, Templates, Free tools, Pricing, and Guides. They do not list Help. The signed-in dashboard sidebar and phone bar do not list Help. The welcome email says "visit our help center" and does not link a URL. This design does not change the welcome sending pipeline.

Footer items labeled Documentation and Tutorials both go to `/templates`. Those labels are not kept. The only guides that exist are the four pages under `/guides`: client onboarding checklist, how to get client design approval, overdue invoice email templates, and scope-creep email template. Help copy links those four pages with captions taken from their titles. It must not say a documentation site or a tutorial library exists.

Signed-in settings already offers "Download my data" at `/api/me/export`. Signed-in billing offers "Cancel or change plan by email" to `SUPPORT_EMAIL`. "Manage in Stripe" is a link only when `STRIPE_CUSTOMER_PORTAL_URL` is an `https://billing.stripe.com/` URL. Otherwise the control is disabled and says coming soon. The billing page says a cancellation is handled within one business day and confirmed by email. The refund page says a full refund if the person emails within 14 days of the first payment. Terms say cancel by emailing `SUPPORT_EMAIL`. The pricing FAQ sentence that says cancel from the account does not match that behavior. Help text follows billing, terms, and the refund page. It does not promise a Stripe portal, and it does not change prices, refunds, or payment behavior.

## Chosen shape

One public page at `/help`. Email is the only way to reach a person. The page reuses `SUPPORT_EMAIL`. It does not add a form, a database, a ticket, a queue, a thread, a status, a chatbot, a vendor, an account, a paid service, a signup, an upload, a secret field, a contact HTTP endpoint, notifications, or analytics.

`/help` is not added to any tool `protectedPaths` list and is not placed under a feature flag or an entitlement check. Signed-out and signed-in people see the same article. Links that open account pages stay ordinary links to `/dashboard/settings` and `/dashboard/billing`. Those routes already send a signed-out person to sign in and then back. The help page does not embed the export or the billing form.

Copy lives in one small module that imports `SUPPORT_EMAIL` from `lib/site.ts`. The page is a server component with no client state except the copy-address control, which is a tiny client child. The mailto is built as `mailto:` plus `encodeURIComponent` of the address, `?subject=` plus `encodeURIComponent` of a fixed subject `Help with SaaS Nation`, and `&body=` plus `encodeURIComponent` of a short body. The body asks what they were trying to do and which page they were on. It tells them not to include a password, a card number, or any other secret.

The address is also visible as text. A button labeled "Copy address" calls `navigator.clipboard.writeText` with the address only. If that call is missing or rejects, the button moves focus to the address and selects it so the person can copy it by hand. The address element is a read-only text control with an accessible name "Support email address".

## Page content

One `h1`: Help. Then `h2` sections, in this order:

1. Contact. The mailto, the visible address, and the copy button. One sentence: there is no promised reply time. Do not write "we monitor this inbox", "you will receive a reply", or a clock time.
2. Your data. Link label "Download my data" to `/dashboard/settings`. Say that deletion of an account is requested by email to the same address, which is what the privacy page says. Do not add a delete button.
3. Billing and refunds. Link "Billing" to `/dashboard/billing` and "Refund policy" to `/refund`. State the current facts in the same words as those pages: cancel or change a plan by email; a cancellation is handled within one business day and confirmed by email; Stripe self-serve management appears on the billing page only when it is configured, and it is not promised here; a full refund is available by email within 14 days of the first payment, as the refund page states. Do not say the person can cancel entirely inside the product with no email.
4. How to start. Link to `/pricing` and `/dashboard`. Say that which tools appear depends on the plan and on which tools are turned on. Do not list all registry tools as available, and do not say every tool has been verified.
5. Guides. Link only the four existing guide paths, each caption equal to that guide's title. No other guide, doc, or tutorial links.

No section describes a feature that has no page. One line under How to start links to `/crm/tasks` with the caption "Tasks". It does not describe task behavior and it does not say that every tool is turned on.

## Where Help shows

Use one link component: visible text `Help`, `href="/help"`.

- Marketing header: add it to `MOBILE_MENU_LINKS` in `components/nav/navbar.tsx`, which is also the desktop list, so the two cannot drift.
- Phone menu: the same list. The sticky two-button bar (Free tools, and Sign in or Dashboard) stays two buttons so a third control is not required for the 390px bar.
- Footer: add Help to `/help` beside the existing Support mailto. Remove the Documentation and Tutorials links that point at `/templates`. Do not replace them with a claim that docs or tutorials exist. The Product column already links to Templates.
- Signed-in dashboard sidebar: add Help with the account links (not inside a tool's locked row).
- Signed-in phone bar: add Help next to Home.
- Each of these layouts gets the same Help link in its existing top bar: `app/crm/layout.tsx`, `app/invoices/layout.tsx`, `app/forms/layout.tsx`, `app/proposals/layout.tsx`, `app/booking/layout.tsx`, `app/links/layout.tsx`, `app/testimonials/layout.tsx`, `app/email-list/layout.tsx`, `app/digital-downloads/layout.tsx`, `app/portal/layout.tsx`, `app/approvals/layout.tsx`, `app/change-log/layout.tsx`, `app/time/layout.tsx`, `app/expenses/layout.tsx`, `app/reports/layout.tsx`, `app/paid/layout.tsx`, and `app/data-removal/tracker/layout.tsx`. No tool route is wrapped in a new gate.
- Funnels has no layout file. Put the same Help link on the title row of `app/funnels/page.tsx`, and beside the existing back link in `app/funnels/[funnelId]/page.tsx`. Do not add a new toolbar.

Admin layouts are unchanged.

## Accessibility

The page has one `h1` and the `h2` sections above, in that order, with no skipped level. Every control is a native button or link. Tab order is the contact link, the copy button, the address control, then the remaining links. Focus is visible on those controls. The copy button's accessible name is "Copy support email address". After a successful copy, its text becomes "Copied" and is not the only indication: `aria-live="polite"` on a status span says "Address copied". After a failed copy, focus is on the address control. The page does not trap focus.

## Tests, when implementation is allowed

Not written now.

- `GET /help` is 200 and contains one `h1` of Help. `GET /contact` stays 404.
- The mailto `href` decodes to the `SUPPORT_EMAIL` value, the subject `Help with SaaS Nation`, and a body that does not ask for a password or a card number.
- Every non-mailto `href` on the page is one of `/dashboard/settings`, `/dashboard/billing`, `/refund`, `/pricing`, `/dashboard`, `/crm/tasks`, and the four `/guides/...` paths that exist as files.
- Rendered billing and refund sentences match the current billing and refund pages and do not say a Stripe portal is always available.
- The page does not contain the words Documentation or Tutorials.
- Keyboard: tab reaches the mailto, the copy button, and the address; focus is visible.
- Clipboard rejection selects the address text.
- Signed-out and signed-in renders of `/help` are the same article.
- At 1366px and at 390px the help page, the marketing header, the footer, the dashboard sidebar, and one tool header (Clients) show Help and do not scroll horizontally.
- Help is present for a signed-out visitor and for a signed-in visitor. It does not depend on a feature flag.

## Out of scope

Automatic email, a support form, any new table, ticket, queue, thread, or status, a chatbot, a vendor or paid account, a new signup, uploads, secrets in the form, a contact POST route, notifications, analytics, changes to the welcome sender, changes to Stripe, prices, or the refund policy, and any later feature list. The broad tool QA inventory stays a separate effort and is not implemented here.

## Stop

This file is the design. It is waiting for Cooper's written review. Do not write an implementation plan, and do not change app code, config, schema, or tests, until that review says to.
