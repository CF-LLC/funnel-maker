const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { storagePathOf, pathOwnedBy, downloadHref, isValidDownload, STORAGE_PREFIX } = jiti('../lib/downloads.ts')
const U = '4ae5bb76-7500-44cc-a768-b7af49606684', F = 'f598cbaf-1111-2222-3333-444444444444'

test('storage refs and legacy public URLs resolve to bucket paths', () => {
  assert.equal(storagePathOf(`${STORAGE_PREFIX}${U}/1-guide.pdf`), `${U}/1-guide.pdf`)
  assert.equal(storagePathOf(`https://nosvgroktxgesolphhyn.supabase.co/storage/v1/object/public/fm-downloads/${U}/1-my%20guide.pdf`), `${U}/1-my guide.pdf`)
  assert.equal(storagePathOf('https://example.com/guide.pdf'), null)
  assert.equal(storagePathOf(`${STORAGE_PREFIX}../etc/passwd`), null)
  assert.equal(storagePathOf(`${STORAGE_PREFIX}/abs`), null)
})

test('only the owner folder is servable', () => {
  assert.equal(pathOwnedBy(`${U}/x.pdf`, U), true)
  assert.equal(pathOwnedBy(`other/${U}/x.pdf`, U), false)
})

test('renderer href: storage -> access-checked route, external https unchanged', () => {
  assert.equal(downloadHref(F, { id: '3', downloadUrl: `${STORAGE_PREFIX}${U}/a.pdf` }), `/api/funnels/${F}/download/3`)
  assert.equal(downloadHref(F, { id: '3', downloadUrl: 'https://example.com/a.pdf' }), 'https://example.com/a.pdf')
  assert.equal(downloadHref(F, { id: '3', downloadUrl: 'javascript:alert(1)' }), undefined)
  assert.equal(isValidDownload(`${STORAGE_PREFIX}${U}/a.pdf`), true)
})

test('download route checks public + owner access, owner folder, short signed URL; migration makes bucket private without deletes', () => {
  const src = fs.readFileSync(path.join(root, 'app/api/funnels/[funnelId]/download/[stepId]/route.ts'), 'utf8')
  assert.match(src, /fm_has_funnels_access/); assert.match(src, /is_public/); assert.match(src, /pathOwnedBy/)
  assert.match(src, /createSignedUrl\(path, SIGNED_TTL_SECONDS/); assert.match(src, /SIGNED_TTL_SECONDS = 60/)
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261024_private_downloads.sql'), 'utf8')
  assert.match(sql, /set public = false where id = 'fm-downloads'/); assert.doesNotMatch(sql, /delete|drop|truncate/i)
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'components/builder/template-fields-editor.tsx'), 'utf8'), /getPublicUrl/)
})
