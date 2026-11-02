import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ogCards, ogCardForSegments, ogImagePath } from '@/lib/og/pages'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return ogCards().map((c) => ({ path: ogImagePath(c.path).replace(/^\/og\//, '').split('/') }))
}

// 1200x630 share card, rendered once at build time.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const card = ogCardForSegments((await params).path)
  if (!card) return new Response('Not found', { status: 404 })
  const logo = `data:image/png;base64,${(await readFile(path.join(process.cwd(), 'public/og-logo.png'))).toString('base64')}`
  const [a, b] = card.colors
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: `linear-gradient(135deg, #09090b 0%, #09090b 45%, ${a}66 80%, ${b}88 100%)`, color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={72} height={72} style={{ borderRadius: 16 }} alt="" />
          <div style={{ fontSize: 36, fontWeight: 800 }}>SaaS Nation</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 28, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 2 }}>{card.eyebrow}</div>
          <div style={{ fontSize: card.title.length > 48 ? 58 : 70, fontWeight: 800, lineHeight: 1.08, maxWidth: 1050 }}>{card.title}</div>
          <div style={{ fontSize: 30, color: '#d4d4d8', lineHeight: 1.35, maxWidth: 1000 }}>{card.subtitle}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#a1a1aa' }}>saasnation.site</div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
