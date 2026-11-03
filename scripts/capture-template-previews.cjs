// Regenerates public/templates/previews/<id>-{640,1280}.webp from the real preview route.
// Usage: [IDS=a,b] BASE=http://localhost:3000 node scripts/capture-template-previews.cjs  (needs playwright + python3 Pillow)
const { chromium } = require(process.env.PW || 'playwright')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os')
const BASE = process.env.BASE || 'http://localhost:3000'
const ALL = ['book-call', 'sales-page', 'free-download', 'aurora-waitlist', 'starfield-launch', 'glass-webinar', 'parallax-story', 'neon-links']
// IDS=glass-webinar,neon-links to regenerate only some previews.
const ids = process.env.IDS ? process.env.IDS.split(',').filter((id) => ALL.includes(id)) : ALL
const out = path.join(__dirname, '..', 'public', 'templates', 'previews')
;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tplprev-'))
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  for (const id of ids) {
    const p = await ctx.newPage()
    await p.goto(`${BASE}/templates/preview/${id}`, { waitUntil: 'networkidle' })
    // Hide the preview bar so the shot shows only the template, then let reveal effects settle.
    await p.addStyleTag({ content: '.sticky{display:none!important} [data-reveal]{opacity:1!important;transform:none!important}' })
    await p.waitForTimeout(1500)
    const png = path.join(tmp, `${id}.png`)
    await p.screenshot({ path: png })
    execFileSync('python3', ['-c', `
from PIL import Image
im=Image.open(${JSON.stringify(png)}).convert('RGB')
for w,q in ((1280,72),(640,78)):
    im.resize((w,w*10//16),Image.LANCZOS).save(${JSON.stringify(out)}+'/${id}-%d.webp'%w,'WEBP',quality=q,method=6)
`])
    await p.close()
  }
  await b.close()
})()
