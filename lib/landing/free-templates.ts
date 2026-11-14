// Free, search-friendly template pages: one per paid SaaS Nation tool (Nov 13, 2026).
// Each page targets a real search phrase, gives a usable free template on the page, then a soft CTA for the tool.
// Honest copy only: tool features come from tools/*/tool.ts taglines; no stats, testimonials, reviews or competitor prices.
import type { Faq } from './registry'

export type TemplateBlock = { heading: string; body: string }
export type FreeTemplate = {
  slug: string
  /** <title>, kept under ~60 chars before the brand suffix. */
  title: string
  h1: string
  /** Meta description, <= 170 chars. */
  description: string
  /** Tool name exactly as on /pricing. */
  tool: string
  /** Tool tagline from tools/<id>/tool.ts. */
  tagline: string
  /** Matching /tools/<slug> landing page, when one exists. */
  landing?: string
  intro: string
  templates: TemplateBlock[]
  tips: string[]
  colors: [string, string]
  faqs: Faq[]
}

export const FREE_TEMPLATES_PATH = '/free-templates'
export const freeTemplatePath = (slug: string) => `${FREE_TEMPLATES_PATH}/${slug}`

export const FREE_TEMPLATES: FreeTemplate[] = [
  {
    slug: 'freelance-timesheet-template',
    title: 'Free freelance timesheet template (copy and paste)',
    h1: 'Freelance timesheet template',
    description: 'A free, copy-paste timesheet for freelancers: log hours by client and project, total them, and turn them into an invoice line. No signup.',
    tool: 'Time tracking',
    tagline: 'Track hours by client and project, then turn unbilled time into an invoice.',
    intro: 'Time tracking for freelancers only has to answer three questions: who was the work for, what was it, and how long did it take. Copy the timesheet below into a spreadsheet or a notes app and fill in one row per block of work.',
    templates: [
      { heading: 'Weekly timesheet', body: `Timesheet: [Your name]   Week of: [date]

Date       | Client       | Project        | Task                    | Start | End   | Hours | Billable?
-----------|--------------|----------------|-------------------------|-------|-------|-------|----------
[Mon date] | [Client A]   | [Website]      | [Homepage layout]       | 09:00 | 11:30 | 2.5   | Yes
[Mon date] | [Client B]   | [Monthly SEO]  | [Keyword research]      | 13:00 | 14:00 | 1.0   | Yes
[Tue date] | [Internal]   | [Admin]        | [Invoicing]             | 16:00 | 16:30 | 0.5   | No

Billable hours this week, Client A: [total]
Billable hours this week, Client B: [total]` },
      { heading: 'Turning hours into an invoice line', body: `[Project] – [task summary], [dates]
[hours] hours × $[rate]/hour = $[amount]` },
    ],
    tips: ['Write the row as soon as you stop, not at the end of the week. Memory rounds everything down.', 'Track non-billable time too. It shows where your week really goes.', 'Use decimal hours (0.25, 0.5) so totals multiply cleanly by your rate.'],
    colors: ['#34d399', '#064e3b'],
    faqs: [{ q: 'Do I need an app to track time?', a: 'No. The timesheet above works in any spreadsheet. A tool helps once you have several clients and want unbilled hours to turn into invoices without retyping.' }],
  },
  {
    slug: 'freelance-scope-change-form',
    title: 'Freelance scope change form (free template)',
    h1: 'Freelance scope change form',
    description: 'A free scope change form for freelancers: describe the extra request, price it, note the deadline impact and get a clear client yes or no in writing.',
    tool: 'Change log',
    tagline: 'Log extra client requests, get a clear OK or no on each, and bill the approved extras.',
    intro: 'A scope change form turns “could you also…” into a clear, priced decision before you start the extra work. Copy the form below and send it whenever a request falls outside what you agreed.',
    templates: [
      { heading: 'Scope change request', body: `SCOPE CHANGE REQUEST #[number]
Project: [project name]          Client: [client name]
Date requested: [date]           Requested by: [name]

1. What is being asked for
[One or two sentences describing the extra work.]

2. Why it is outside the original scope
[e.g. "Not in the agreed list of 5 pages" / "New feature after sign-off".]

3. Estimate
[X] hours × $[rate]/hour = $[amount]   OR   Fixed price: $[amount]

4. Effect on timeline
[No change] / [Delivery moves from (date) to (date)]

5. Decision (client)
[ ] Approved – add it to the project and the next invoice
[ ] Not approved – keep the original scope

Name: ____________________   Date: ____________` },
    ],
    tips: ['Send it before you do the work, never after.', 'Number every change so you can reference it on the invoice.', 'A reply email saying “Approved” counts. Keep it with the project.'],
    colors: ['#c084fc', '#7c3aed'],
    faqs: [{ q: 'Is a reply email enough as approval?', a: 'For most small projects a clear written “yes” is what you need. Keep it with the project so the invoice is never a surprise. For legal questions about your contract, ask a lawyer.' }],
  },
  {
    slug: 'design-approval-form-template',
    title: 'Design approval form template (free)',
    h1: 'Design approval form template',
    description: 'A free design approval form: version number, what is being approved, a clear Approve or Request changes choice and room for comments.',
    tool: 'Approval link',
    tagline: 'Send one private link, get comments and a clear Approve or Request changes on each version.',
    intro: 'Most approval delays come from vague feedback on the wrong version. A short approval form fixes both: it names the exact version and asks for one of two answers.',
    templates: [
      { heading: 'Design approval form', body: `DESIGN APPROVAL
Project: [project]           Client: [client]
Item: [e.g. Homepage design]  Version: v[number]  Date sent: [date]
Link / file: [link]

Please review and choose ONE:
[ ] Approve – this version is final and I'm happy for work to continue
[ ] Request changes – listed below

Changes requested (one per line, be specific):
1.
2.
3.

Approved by: ____________________   Date: ____________

Note: changes requested after approval may be handled as a new scope change.` },
    ],
    tips: ['Only send one version at a time and number it.', 'Ask for all changes in one round, as a numbered list.', 'Keep every approved version so you can point back to it later.'],
    colors: ['#34d399', '#059669'],
    faqs: [],
  },
  {
    slug: 'freelance-proposal-template',
    title: 'Freelance proposal template (free, copy and paste)',
    h1: 'Freelance proposal template',
    description: 'A free freelance proposal template: the problem, your approach, line items with prices, timeline, terms and a clear next step to accept.',
    tool: 'Proposals',
    tagline: 'Proposals with line items, a public accept page, and one-click invoices.',
    intro: 'A good freelance proposal is short. It shows you understood the problem, says exactly what you will deliver and what it costs, and makes it easy to say yes.',
    templates: [
      { heading: 'Proposal', body: `PROPOSAL: [Project name]
Prepared for: [Client]     Prepared by: [You / business]     Date: [date]
Valid until: [date]

1. What you need
[Two or three sentences in the client's own words about the problem or goal.]

2. What I'll do
[Short description of your approach.]

3. Deliverables and price
• [Deliverable 1] ............................ $[price]
• [Deliverable 2] ............................ $[price]
• [Optional extra] ........................... $[price]
Total: $[total]

4. Timeline
Start: [date]   First draft: [date]   Final delivery: [date]

5. Terms
Payment: [e.g. 50% to start, 50% on delivery]
Revisions: [e.g. two rounds included]
Extra requests: quoted separately before any work starts.

6. Next step
Reply "Accepted" (or sign below) and I'll send the first invoice and booking link.

Accepted by: ____________________   Date: ____________` },
    ],
    tips: ['Lead with their problem, not your bio.', 'Price each deliverable so the client can drop an item instead of walking away.', 'Put an expiry date on the proposal.'],
    colors: ['#f472b6', '#7c3aed'],
    faqs: [],
  },
  {
    slug: 'testimonial-request-email-template',
    title: 'Testimonial request email template (free)',
    h1: 'Testimonial request email template',
    description: 'Free, copy-paste emails to ask a happy client for a testimonial, plus three prompts that help them write something specific.',
    tool: 'Testimonials',
    tagline: 'Collect reviews at one link, approve them, and show them on funnels, Link-in-bio and proposals.',
    intro: 'The best time to ask for a testimonial is right after a client says thanks. Make it easy: one short email, a few prompts, and permission to use their name.',
    templates: [
      { heading: 'The ask', body: `Subject: Quick favour?

Hi [Name],

I'm really glad [the result / project] worked out. Would you be up for writing a couple of sentences about working together? It helps other [type of client] decide if I'm a good fit.

A few prompts if helpful (answer any):
• What was going on before we worked together?
• What changed afterwards?
• What would you tell a friend who's thinking about it?

Reply here or use this link: [link]. Let me know how you'd like your name shown (full name, first name only, or anonymous).

Thank you!
[You]` },
      { heading: 'Gentle follow-up (one only)', body: `Hi [Name], just floating this back up in case it got buried. No pressure at all if you're busy. [link]` },
    ],
    tips: ['Ask within a few days of a good result.', 'Always ask how they want to be named, and only publish what they approved.', 'Never write or edit a testimonial for a client beyond fixing typos with their OK.'],
    colors: ['#f59e0b', '#db2777'],
    faqs: [],
  },
  {
    slug: 'freelancer-expense-tracker-template',
    title: 'Freelancer expense tracker template (free)',
    h1: 'Freelancer expense tracker template',
    description: 'A free expense tracker template for freelancers: one row per expense with category, receipt and whether a client should be billed for it.',
    tool: 'Expenses',
    tagline: 'Log business expenses with receipts, see where the money goes, and bill clients for what they owe.',
    intro: 'A simple expense log, kept as you go, saves hours at the end of the month and makes sure you bill clients for costs they agreed to cover. Copy the columns below into a spreadsheet.',
    templates: [
      { heading: 'Expense log', body: `Date       | Vendor        | Description             | Category        | Amount  | Paid with  | Receipt? | Client to bill
-----------|---------------|-------------------------|-----------------|---------|------------|----------|---------------
[date]     | [Vendor]      | [Stock photos]          | [Software/assets] | $[0.00] | [card]   | Yes      | [Client A]
[date]     | [Vendor]      | [Monthly hosting]       | [Software]      | $[0.00] | [card]     | Yes      | –
[date]     | [Vendor]      | [Printer ink]           | [Office]        | $[0.00] | [cash]     | No       | –

Monthly total: $[total]      To bill clients this month: $[total]` },
    ],
    tips: ['Snap the receipt the moment you pay and note which client it was for.', 'Keep your own short list of categories and stick to it.', 'For what counts as deductible, ask a tax professional. This template only keeps the records tidy.'],
    colors: ['#22c55e', '#0f766e'],
    faqs: [],
  },
  {
    slug: 'monthly-client-report-template',
    title: 'Monthly client report template (free)',
    h1: 'Monthly client report template',
    description: 'A free monthly client report template for freelancers and agencies: results, work done, what is next and what you need from the client.',
    tool: 'Report kit',
    tagline: 'Monthly client reports with your numbers, charts and screenshots, on one private link and a PDF.',
    intro: 'Retainer clients stay when they can see what they are paying for. A one-page monthly report does that. Fill in your own real numbers; keep it short.',
    templates: [
      { heading: 'Monthly report', body: `[Client] – Monthly report, [Month Year]
Prepared by: [You]

1. Headline
[One sentence: the most important thing that happened this month.]

2. Numbers (this month vs last month)
• [Metric 1]: [value] (last month: [value])
• [Metric 2]: [value] (last month: [value])
• [Metric 3]: [value] (last month: [value])

3. Work completed
• [Task / deliverable]
• [Task / deliverable]

4. What's next month
• [Planned task]
• [Planned task]

5. What I need from you
• [Approval / content / access] by [date]` },
    ],
    tips: ['Use the same metrics every month so trends are easy to see.', 'Explain any drop honestly and say what you are doing about it.', 'Send it on the same day each month.'],
    colors: ['#60a5fa', '#1e3a8a'],
    faqs: [],
  },
  {
    slug: 'match-bank-payments-to-invoices-checklist',
    title: 'How to match bank payments to invoices (checklist)',
    h1: 'Match bank payments to invoices: a checklist',
    description: 'A free checklist for freelancers to match money in from a bank statement to open invoices, spot what is still unpaid and follow up.',
    tool: 'Paid?',
    tagline: 'Drop in a bank CSV and match money in to your open invoices. Your bank file never leaves your browser.',
    intro: 'If clients pay by bank transfer, it is easy to lose track of which invoice a deposit was for. Run this checklist once a week.',
    templates: [
      { heading: 'Weekly payment check', body: `PAYMENT CHECK – week of [date]

[ ] 1. Export money-in from your bank for the week (CSV or statement).
[ ] 2. List your open invoices: number, client, amount, due date.
[ ] 3. For each deposit, match on amount first, then client name / reference.
[ ] 4. Mark matched invoices as paid, with the payment date.
[ ] 5. Note partial payments: invoice #[ ] paid $[ ] of $[ ].
[ ] 6. List deposits you can't match and ask the payer what they were for.
[ ] 7. List invoices now past due and send a polite reminder.

Unmatched deposits:      Past-due invoices:
• $[ ] on [date]         • #[ ] [client] $[ ] due [date]` },
    ],
    tips: ['Ask clients to put the invoice number in the payment reference.', 'Do it weekly; a month of deposits is much harder to untangle.', 'Keep the reminder friendly the first time. Our overdue invoice email templates can help.'],
    colors: ['#10b981', '#065f46'],
    faqs: [],
  },
  {
    slug: 'people-search-opt-out-checklist',
    title: 'People-search site opt-out checklist (free)',
    h1: 'People-search opt-out checklist',
    description: 'A free checklist for removing your personal listing from people-search sites: what to prepare, how to track each request and when to re-check.',
    tool: 'Data Removal',
    tagline: 'A guided checklist for opting out of people-search sites, with direct links and 60-day re-check reminders.',
    intro: 'People-search sites publish names, past addresses and relatives. Most offer an opt-out, but each works differently and listings can come back. This checklist keeps the process organised.',
    templates: [
      { heading: 'Before you start', body: `[ ] Make a separate email address just for opt-out requests.
[ ] Write down every name you've used (maiden name, nicknames) and past cities.
[ ] Search your name + city on each site you want to check.
[ ] Save the URL of every listing that is you.` },
      { heading: 'Tracking sheet', body: `Site        | Listing URL | Opt-out requested | Confirmation email? | Removed? | Re-check on
------------|-------------|-------------------|---------------------|----------|------------
[site]      | [url]       | [date]            | [Yes/No]            | [date]   | [date + 60 days]
[site]      | [url]       | [date]            | [Yes/No]            | [date]   | [date + 60 days]` },
    ],
    tips: ['Only use each site’s own official opt-out page, never a third-party form asking for payment.', 'Share the minimum needed. Use the opt-out email address, not your main one.', 'Re-check every couple of months, because listings can reappear.'],
    colors: ['#94a3b8', '#334155'],
    faqs: [],
  },
  {
    slug: 'client-follow-up-email-template',
    title: 'Client follow-up email templates (free)',
    h1: 'Client follow-up email templates',
    description: 'Free follow-up emails for freelancers and coaches: after a discovery call, after sending a proposal, and checking in with a past client.',
    tool: 'Clients',
    tagline: 'Everyone who filled a form, booked a call, got a proposal or paid an invoice, in one list with notes and follow-ups.',
    landing: 'client-list',
    intro: 'Most work is won in the follow-up. Keep them short and specific, and write down when you sent each one so nobody falls through the cracks.',
    templates: [
      { heading: 'After a discovery call', body: `Hi [Name],

Thanks for the call today. Here's what I heard: [one-line summary of their goal]. As promised, [next step: proposal / link / info] is [attached / coming by date].

Any questions in the meantime, just reply.
[You]` },
      { heading: 'After sending a proposal (3–5 days later)', body: `Hi [Name], checking you received the proposal for [project]. Happy to jump on a quick call if anything needs adjusting. [You]` },
      { heading: 'Checking in with a past client', body: `Hi [Name], it's been a while since [project]. How's [the result] going? If anything new is coming up, I'd love to help. [You]` },
    ],
    tips: ['Log the date of every follow-up and set the next one straight away.', 'Two follow-ups after a proposal is plenty.', 'Reference something specific they said. It shows you listened.'],
    colors: ['#a855f7', '#ec4899'],
    faqs: [],
  },
  {
    slug: 'welcome-email-template-for-coaches',
    title: 'Welcome email template for coaches (free)',
    h1: 'Welcome email template for coaches and creators',
    description: 'A free welcome email template for a new email subscriber: say thanks, deliver what you promised, set expectations and invite a reply.',
    tool: 'Email list',
    tagline: 'Grow a list of people who asked to hear from you, and send them a beautiful email in a few clicks.',
    landing: 'email-list',
    intro: 'The welcome email is the one most new subscribers actually open. Use it to deliver what they signed up for and tell them what comes next.',
    templates: [
      { heading: 'Welcome email', body: `Subject: You're in – here's your [freebie]

Hi [First name],

Thanks for joining! Here's the [guide / checklist / video] you asked for: [link]

What to expect: I send [one email a week / every other Tuesday] about [topic]. No spam, and you can unsubscribe any time with the link at the bottom.

Quick question: what's the one thing you're stuck on with [topic] right now? Just hit reply. I read every answer.

[Your name]

[Your business name] · [mailing address] · Unsubscribe` },
    ],
    tips: ['Only email people who asked to hear from you.', 'Include a working unsubscribe link and your mailing address in every email.', 'Say how often you will email, then stick to it.'],
    colors: ['#06b6d4', '#6366f1'],
    faqs: [],
  },
  {
    slug: 'digital-product-delivery-email-template',
    title: 'Digital product delivery email template (free)',
    h1: 'Digital product delivery email template',
    description: 'A free delivery email for selling PDFs, courses and files: the download link, how to access it, what to do if it fails and how to get help.',
    tool: 'Digital downloads',
    tagline: 'Sell PDFs, courses and files from your own storefront, paid through your own Stripe, delivered instantly.',
    landing: 'sell-digital-downloads-with-stripe',
    intro: 'A clear delivery email cuts support requests. Tell buyers exactly where their file is and what to do if something goes wrong.',
    templates: [
      { heading: 'Delivery email', body: `Subject: Your [product name] is ready to download

Hi [First name],

Thank you for buying [product name]! Download it here:
[download link]

• Format: [PDF / ZIP / video]
• Size: [size]
• The link works [until date / for X downloads].

Trouble downloading? Try a different browser or a computer instead of a phone. Still stuck? Reply to this email with your order number ([order #]) and I'll sort it out.

Enjoy,
[Your name]` },
    ],
    tips: ['Put the download link at the very top.', 'Include the order number so support is quick.', 'State your refund policy on the sales page, before purchase.'],
    colors: ['#f59e0b', '#ef4444'],
    faqs: [],
  },
  {
    slug: 'coaching-intake-form-template',
    title: 'Coaching intake form template (free questions)',
    h1: 'Coaching intake form template',
    description: 'A free coaching intake form: the questions to ask a new client before the first session, grouped into contact, goals, background and logistics.',
    tool: 'Forms',
    tagline: 'Simple forms with a public page, CSV export, and funnel embeds.',
    landing: 'intake-form-for-coaching-clients',
    intro: 'An intake form lets your first session start with the real conversation instead of basic questions. Copy the questions below into any form tool and trim what you don’t need.',
    templates: [
      { heading: 'Intake questions', body: `CONTACT
1. Full name
2. Email and phone
3. Time zone / location
4. How did you hear about me?

GOALS
5. What would you like to be different in 3 months?
6. Why is now the right time to work on this?
7. How will we know coaching has worked for you?

BACKGROUND
8. What have you already tried?
9. What tends to get in your way?
10. Anything else I should know before we start?

LOGISTICS
11. Best days and times for sessions
12. Preferred format: video call / phone / in person
13. I agree to the coaching terms: [link]   [ ] Yes` },
    ],
    tips: ['Keep it under 15 questions; people abandon long forms.', 'Only ask for information you will actually use.', 'Read the answers before the first session and refer to them.'],
    colors: ['#0891b2', '#7c3aed'],
    faqs: [],
  },
  {
    slug: 'appointment-confirmation-email-template',
    title: 'Appointment confirmation email template (free)',
    h1: 'Appointment confirmation email template',
    description: 'Free appointment confirmation and reminder emails for coaches and freelancers: date, time zone, how to join, how to reschedule.',
    tool: 'Booking',
    tagline: 'Your own booking page: weekly hours, meeting types, no double bookings, .ics invites.',
    landing: 'booking-page-without-calendly',
    intro: 'A good confirmation answers every question before the client has to ask: when, where, how to join and how to change it.',
    templates: [
      { heading: 'Confirmation', body: `Subject: Confirmed: [meeting type] on [day, date] at [time + time zone]

Hi [Name],

You're booked for [meeting type] with [you].

When: [day, date], [start]–[end] [time zone]
Where: [video link / phone number / address]
Before we meet: [anything to prepare, or "nothing needed"]

Need to change it? [Reschedule link] or reply at least [24 hours] before.

See you then,
[You]` },
      { heading: 'Reminder (day before)', body: `Hi [Name], a quick reminder: [meeting type] tomorrow at [time + time zone]. Join here: [link]. Need to move it? [Reschedule link]` },
    ],
    tips: ['Always write the time zone next to the time.', 'Attach a calendar invite so it lands in their calendar.', 'Make rescheduling easy; it beats a no-show.'],
    colors: ['#6366f1', '#06b6d4'],
    faqs: [],
  },
  {
    slug: 'client-welcome-packet-template',
    title: 'Client welcome packet template (free)',
    h1: 'Client welcome packet template',
    description: 'A free client welcome packet for freelancers and coaches: how you work, what happens next, how to reach you and what you need from the client.',
    tool: 'Client portal',
    tagline: 'One private link per client with their invoices, proposals, bookings, files and an onboarding checklist.',
    landing: 'client-portal',
    intro: 'A welcome packet sets expectations on day one. Send it right after a client signs, and keep it to one page.',
    templates: [
      { heading: 'Welcome packet', body: `WELCOME, [CLIENT NAME]

What happens next
1. [Kick-off call on date / booking link]
2. [First draft / first session by date]
3. [Review and feedback]
4. [Final delivery by date]

What I need from you
[ ] [Logins / brand files / content] by [date]
[ ] Signed agreement and first payment
[ ] Intake form: [link]

How we'll communicate
• Best way to reach me: [email / channel]
• I reply within [timeframe] on [working days]
• Meetings: [how to book]

Payments
• [Schedule, e.g. 50% upfront, 50% on delivery]
• Invoices are sent by [method] and due in [X] days

Your links
• Invoices: [link]   • Files: [link]   • Book a call: [link]` },
    ],
    tips: ['Send it the same day the client signs.', 'List everything you need from them, with dates.', 'Keep all their links in one place they can bookmark.'],
    colors: ['#38bdf8', '#0369a1'],
    faqs: [],
  },
  {
    slug: 'sales-page-outline-for-coaches',
    title: 'Sales page outline for coaches (free template)',
    h1: 'Sales page outline for coaches',
    description: 'A free, section-by-section sales page outline for coaches and course creators, from headline to FAQ and a single call to action.',
    tool: 'Funnel Maker',
    tagline: 'Build, preview and publish sales funnels from templates.',
    intro: 'Most sales pages follow the same order because it matches how people decide. Fill in each section below in plain words, then cut anything that doesn’t help the reader decide.',
    templates: [
      { heading: 'Sales page outline', body: `1. HEADLINE
   [The result your client wants] without [the thing they dread]

2. SUBHEAD
   For [who it's for] who [situation].

3. THE PROBLEM
   2–3 short paragraphs describing where they are now, in their words.

4. WHAT CHANGES
   What life looks like after: 3 bullet points.

5. THE OFFER
   Name: [program / product]
   What's included:
   • [Item]
   • [Item]
   • [Item]

6. WHO IT'S FOR / NOT FOR
   For you if… / Not for you if…

7. ABOUT YOU
   Why you can help, in 3–4 sentences. Real credentials only.

8. PROOF
   Real testimonials from real clients, with their permission. Leave this out until you have them.

9. PRICE AND CALL TO ACTION
   $[price] – [Button text: "Join now" / "Book a call"]

10. FAQ
   4–6 real questions people have asked you.` },
    ],
    tips: ['One page, one offer, one button repeated.', 'Never invent testimonials or numbers. Leave the proof section out until you have real ones.', 'Write the FAQ from questions people have actually asked you.'],
    colors: ['#7c3aed', '#db2777'],
    faqs: [],
  },
  {
    slug: 'invoice-payment-terms-template',
    title: 'Invoice payment terms template (free wording)',
    h1: 'Invoice payment terms template',
    description: 'Free, copy-paste payment terms for freelance invoices: due dates, accepted methods, deposits and late payment wording you can adapt.',
    tool: 'Invoices',
    tagline: 'Clients, saved items, shareable invoices with PDF and pay links.',
    landing: 'simple-invoice-tool-for-coaches',
    intro: 'Clear payment terms on every invoice get you paid faster and make follow-ups less awkward. Pick the lines that fit and paste them at the bottom of your invoice.',
    templates: [
      { heading: 'Payment terms (pick and adapt)', body: `PAYMENT TERMS
• Payment is due within [14 / 30] days of the invoice date ([due date]).
• Please include invoice #[number] in your payment reference.
• Accepted: [card via the pay link / bank transfer / other].
• Projects over $[amount]: [50]% deposit before work starts, balance on delivery.
• Late payments: [a late fee of X% per month / $X] may apply after [date], [if allowed where you work].
• Questions about this invoice? Contact [email].

Thank you for your business!` },
    ],
    tips: ['Put the exact due date, not just “Net 30”.', 'Agree terms in writing before the work starts, then repeat them on the invoice.', 'Rules on late fees vary by place. Check what applies to you before charging one.'],
    colors: ['#7c3aed', '#db2777'],
    faqs: [],
  },
]

export const getFreeTemplate = (slug: string) => FREE_TEMPLATES.find((t) => t.slug === slug)
