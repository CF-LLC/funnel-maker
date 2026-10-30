const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
// Regression: pdfkit standard fonts were missing from the standalone bundle (500 on /r/demo/pdf in prod).
test('every PDF route ships pdfkit font files in the standalone trace', () => {
  const cfg = fs.readFileSync(path.join(root, fs.readdirSync(root).find((f) => f.startsWith('next.config'))), 'utf8')
  assert.match(cfg, /serverExternalPackages: \['pdfkit'\]/)
  assert.match(cfg, /pdfkit\/js\/standard-fonts\/\*\*\/\*/)
  const routes = []
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => f.isDirectory() ? walk(path.join(d, f.name)) : /^route\.tsx?$/.test(f.name) && /renderToBuffer|@react-pdf/.test(fs.readFileSync(path.join(d, f.name), 'utf8')) && routes.push('/' + path.relative(path.join(root, 'app'), d).split(path.sep).join('/')))
  walk(path.join(root, 'app'))
  assert.ok(routes.length >= 3, routes.join(','))
  for (const r of routes) assert.ok(cfg.includes(`'${r}': PDFKIT_FILES`), `missing tracing include for ${r}`)
  assert.ok(fs.existsSync(path.join(root, 'node_modules/pdfkit/js/standard-fonts/Helvetica.cjs')))
})
test('standalone build (if present) contains the fonts', { skip: !fs.existsSync(path.join(root, '.next/standalone')) }, () => {
  assert.ok(fs.existsSync(path.join(root, '.next/standalone/node_modules/pdfkit/js/standard-fonts/Helvetica.cjs')))
})
