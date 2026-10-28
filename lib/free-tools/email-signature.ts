// Email signature builder. Pure functions, email-safe inline-styled <table> HTML, no scripts.
export type SigTemplate = 'classic' | 'sidebar' | 'compact' | 'banner' | 'minimal'
export const SIG_TEMPLATES: [SigTemplate, string][] = [['classic', 'Classic'], ['sidebar', 'Side bar'], ['compact', 'Compact'], ['banner', 'Banner'], ['minimal', 'Minimal']]

export interface SigData {
  name?: string; title?: string; company?: string; phone?: string; email?: string; website?: string; address?: string
  linkedin?: string; x?: string; instagram?: string; customLabel?: string; customUrl?: string; imageUrl?: string
}

export function escapeHtml(s: string | undefined): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function isHexColor(c: string) { return /^#[0-9a-f]{6}$/i.test(c) }

/** Returns a safe href or null. Only http(s), mailto: and tel: are ever produced. */
export function safeUrl(input: string | undefined, kind: 'web' | 'email' | 'tel' = 'web'): string | null {
  const raw = (input || '').trim()
  const check = kind === 'tel' ? raw.replace(/[\s().-]/g, '') : raw
  if (!raw || /[\s<>"'`\\]/.test(check)) return null
  if (kind === 'email') {
    const e = raw.replace(/^mailto:/i, '')
    return /^[^@\s/?#:]+@[^@\s/?#:]+\.[a-z]{2,}$/i.test(e) ? `mailto:${e}` : null
  }
  if (kind === 'tel') {
    const t = raw.replace(/^tel:/i, '').replace(/[^\d+]/g, '')
    return /^\+?\d{4,16}$/.test(t) ? `tel:${t}` : null
  }
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[^:/]+:\d/.test(raw)
  if (hasScheme && !/^https?:\/\//i.test(raw)) return null
  let u: URL
  try { u = new URL(hasScheme ? raw : `https://${raw.replace(/^\/\//, '')}`) } catch { return null }
  if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname.includes('.') || u.username || u.password) return null
  return u.toString()
}

const FONT = 'font-family:Arial,Helvetica,sans-serif;'
const prettyUrl = (u: string) => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

export interface SigOptions { template: SigTemplate; color: string; /** preview-only image src (e.g. blob:) used when no hosted URL */ previewImageSrc?: string }

export function buildSignature(d: SigData, o: SigOptions): string {
  const color = isHexColor(o.color) ? o.color : '#4f46e5'
  const name = escapeHtml(d.name?.trim() || 'Your Name')
  const title = escapeHtml(d.title?.trim())
  const company = escapeHtml(d.company?.trim())
  const role = [title, company].filter(Boolean).join(o.template === 'compact' ? ', ' : ' &middot; ')
  const link = (href: string, text: string, style = `color:${color};text-decoration:none;`) => `<a href="${escapeHtml(href)}" style="${style}">${text}</a>`
  const contacts: string[] = []
  const tel = safeUrl(d.phone, 'tel'); if (tel) contacts.push(link(tel, escapeHtml(d.phone!.trim()), 'color:#333333;text-decoration:none;'))
  const mail = safeUrl(d.email, 'email'); if (mail) contacts.push(link(mail, escapeHtml(mail.slice(7)), 'color:#333333;text-decoration:none;'))
  const web = safeUrl(d.website); if (web) contacts.push(link(web, escapeHtml(prettyUrl(web))))
  const address = d.address?.trim() ? escapeHtml(d.address.trim()) : ''
  const socials: string[] = []
  for (const [k, label] of [['linkedin', 'LinkedIn'], ['x', 'X'], ['instagram', 'Instagram']] as const) { const u = safeUrl(d[k]); if (u) socials.push(link(u, label, `color:${color};text-decoration:none;font-weight:bold;`)) }
  const cu = safeUrl(d.customUrl); if (cu) socials.push(link(cu, escapeHtml(d.customLabel?.trim() || prettyUrl(cu)), `color:${color};text-decoration:none;font-weight:bold;`))
  const hosted = safeUrl(d.imageUrl)
  const imgSrc = hosted || (o.previewImageSrc && /^blob:/.test(o.previewImageSrc) ? o.previewImageSrc : null)
  const round = o.template === 'sidebar' || o.template === 'minimal' ? 'border-radius:50%;' : 'border-radius:6px;'
  const img = (size: number) => imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="${name}" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;${round}border:0;object-fit:cover;">` : ''
  const sep = ' <span style="color:#bbbbbb;">|</span> '
  const line = (html: string, extra = '') => html ? `<tr><td style="${FONT}font-size:13px;line-height:20px;color:#333333;padding:0;${extra}">${html}</td></tr>` : ''
  const nameRow = (size: number, c = '#111111') => `<tr><td style="${FONT}font-size:${size}px;line-height:${size + 6}px;font-weight:bold;color:${c};padding:0;">${name}</td></tr>`
  const roleRow = role ? line(role, `color:#555555;`) : ''
  const body = [contacts.length ? line(contacts.join(sep)) : '', address ? line(address, 'color:#777777;font-size:12px;') : '', socials.length ? line(socials.join(sep), 'padding-top:4px;') : ''].join('')
  const table = (inner: string, extra = '') => `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;${FONT}${extra}">${inner}</table>`
  let html: string
  switch (o.template) {
    case 'sidebar':
      html = table(`<tr>${imgSrc ? `<td valign="top" style="padding:0 14px 0 0;">${img(80)}</td>` : ''}<td valign="top" style="border-left:3px solid ${color};padding:0 0 0 14px;">${table(nameRow(17) + roleRow + `<tr><td style="padding:0;height:6px;line-height:6px;font-size:6px;">&nbsp;</td></tr>` + body)}</td></tr>`)
      break
    case 'compact':
      html = table(`<tr>${imgSrc ? `<td valign="middle" style="padding:0 10px 0 0;">${img(48)}</td>` : ''}<td valign="middle">${table(`<tr><td style="${FONT}font-size:14px;line-height:20px;color:#333333;padding:0;"><b style="color:${color};">${name}</b>${role ? ` &middot; ${role}` : ''}</td></tr>` + body)}</td></tr>`)
      break
    case 'banner':
      html = table(`<tr><td style="background-color:${color};padding:10px 14px;">${table(`<tr>${imgSrc ? `<td valign="middle" style="padding:0 12px 0 0;">${img(56)}</td>` : ''}<td valign="middle">${table(nameRow(18, '#ffffff') + (role ? `<tr><td style="${FONT}font-size:13px;line-height:19px;color:#ffffff;padding:0;">${role}</td></tr>` : ''))}</td>`)}</td></tr><tr><td style="padding:8px 14px 0 14px;">${table(body)}</td></tr>`)
      break
    case 'minimal':
      html = table(nameRow(15) + roleRow + `<tr><td style="padding:6px 0;"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="40" style="border-collapse:collapse;"><tr><td height="2" style="background-color:${color};height:2px;line-height:2px;font-size:2px;">&nbsp;</td></tr></table></td></tr>` + body + (imgSrc ? `<tr><td style="padding:8px 0 0 0;">${img(40)}</td></tr>` : ''))
      break
    default:
      html = table((imgSrc ? `<tr><td style="padding:0 0 8px 0;">${img(64)}</td></tr>` : '') + nameRow(18, color) + roleRow + `<tr><td style="padding:6px 0 0 0;border-top:1px solid #e5e5e5;height:0;line-height:0;font-size:0;">&nbsp;</td></tr>` + body)
  }
  return html
}
