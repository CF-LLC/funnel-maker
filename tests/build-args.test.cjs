const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.next', '.git', 'tests']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs|cjs|js)$/.test(e.name)) out.push(p);
  }
  return out;
}
const used = new Set();
for (const f of walk(root)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) used.add(m[0]);
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');

test('code uses the per-tool Stripe links', () => {
  for (const t of ['INVOICES', 'FORMS', 'PROPOSALS', 'TESTIMONIALS', 'ALL', 'BOOKING', 'DATAREMOVAL', 'CRM', 'EMAILLIST', 'DOWNLOADS', 'PORTAL', 'APPROVALS', 'CHANGELOG', 'TIME', 'EXPENSES', 'REPORTS'])
    for (const p of ['MONTHLY', 'YEARLY']) assert.ok(used.has(`NEXT_PUBLIC_STRIPE_LINK_${t}_${p}`), `${t}_${p}`);
});
test('every NEXT_PUBLIC_* used in code is an ARG+ENV in the Dockerfile and a build arg in compose', () => {
  for (const n of used) {
    assert.match(dockerfile, new RegExp(`^ARG ${n}$`, 'm'), `Dockerfile ARG ${n}`);
    assert.match(dockerfile, new RegExp(`${n}=\\$\\{${n}\\}`), `Dockerfile ENV ${n}`);
    assert.match(compose, new RegExp(`^\\s+${n}: \\$\\{${n}(:-)?\\}$`, 'm'), `compose arg ${n}`);
  }
});

test('CRM is in plans and gated in the Single dropdown', () => {
  const plans = fs.readFileSync(path.join(root, 'lib/plans.ts'), 'utf8');
  assert.match(plans, /crm: \{ monthly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_CRM_MONTHLY, yearly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_CRM_YEARLY \}/);
  const pp = fs.readFileSync(path.join(root, 'components/pricing-plans.tsx'), 'utf8');
  assert.match(pp, /GATED: readonly string\[\] = \['crm', 'emaillist', 'downloads', 'portal', 'approvals', 'changelog', 'time', 'expenses', 'reports', 'paid'\]/);
  assert.match(plans, /emaillist: \{ monthly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_EMAILLIST_MONTHLY, yearly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_EMAILLIST_YEARLY \}/);
  assert.match(plans, /downloads: \{ monthly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_DOWNLOADS_MONTHLY, yearly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_DOWNLOADS_YEARLY \}/);
  assert.match(plans, /portal: \{ monthly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_PORTAL_MONTHLY, yearly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_PORTAL_YEARLY \}/);
  assert.match(fs.readFileSync(path.join(root, 'app/pricing/page.tsx'), 'utf8'), /<PricingPlans flags=\{flags\} \/>/);
});

test('Report kit links: build args wired and unset links fall back gracefully', () => {
  for (const v of ['NEXT_PUBLIC_REPORTS_ENABLED', 'NEXT_PUBLIC_STRIPE_LINK_REPORTS_MONTHLY', 'NEXT_PUBLIC_STRIPE_LINK_REPORTS_YEARLY']) {
    assert.match(dockerfile, new RegExp(`^ARG ${v}$`, 'm')); assert.match(compose, new RegExp(`${v}: \\$\\{${v}:-\\}`))
  }
  const jiti = require('jiti')(__filename, { alias: { '@': root } })
  const saved = { m: process.env.NEXT_PUBLIC_STRIPE_LINK_REPORTS_MONTHLY, y: process.env.NEXT_PUBLIC_STRIPE_LINK_REPORTS_YEARLY }
  delete process.env.NEXT_PUBLIC_STRIPE_LINK_REPORTS_MONTHLY; delete process.env.NEXT_PUBLIC_STRIPE_LINK_REPORTS_YEARLY
  const plans = jiti('../lib/plans.ts')
  assert.ok(!plans.PAYMENT_LINKS.reports.monthly); assert.ok(!plans.PAYMENT_LINKS.reports.yearly)
  if (saved.m) process.env.NEXT_PUBLIC_STRIPE_LINK_REPORTS_MONTHLY = saved.m; if (saved.y) process.env.NEXT_PUBLIC_STRIPE_LINK_REPORTS_YEARLY = saved.y
});

test('Paid? links: build args wired and unset links fall back gracefully', () => {
  for (const v of ['NEXT_PUBLIC_PAID_ENABLED', 'NEXT_PUBLIC_STRIPE_LINK_PAID_MONTHLY', 'NEXT_PUBLIC_STRIPE_LINK_PAID_YEARLY']) {
    assert.match(dockerfile, new RegExp(`^ARG ${v}$`, 'm')); assert.match(compose, new RegExp(`${v}: \\$\\{${v}:-\\}`))
  }
  const jiti = require('jiti')(__filename, { alias: { '@': root } })
  const saved = { m: process.env.NEXT_PUBLIC_STRIPE_LINK_PAID_MONTHLY, y: process.env.NEXT_PUBLIC_STRIPE_LINK_PAID_YEARLY }
  delete process.env.NEXT_PUBLIC_STRIPE_LINK_PAID_MONTHLY; delete process.env.NEXT_PUBLIC_STRIPE_LINK_PAID_YEARLY
  const plans = jiti('../lib/plans.ts')
  assert.ok(!plans.PAYMENT_LINKS.paid.monthly); assert.ok(!plans.PAYMENT_LINKS.paid.yearly)
  if (saved.m) process.env.NEXT_PUBLIC_STRIPE_LINK_PAID_MONTHLY = saved.m; if (saved.y) process.env.NEXT_PUBLIC_STRIPE_LINK_PAID_YEARLY = saved.y
});
