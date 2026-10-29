'use client'
import { embedUrl, fmtBytes, type Version } from '@/lib/approvals/core'

/** Shows one version: image inline, PDF in a frame (with open link), YouTube/Vimeo/Loom embedded, other video links as a button. */
export function Preview({ v, url }: { v: Pick<Version, 'kind' | 'mime' | 'name' | 'size_bytes' | 'video_url'>; url: string | null }) {
  const box = 'overflow-hidden rounded-2xl border border-white/10 bg-black'
  if (v.kind === 'video') {
    const e = embedUrl(v.video_url)
    if (e) return <div className={`${box} aspect-video`}><iframe src={e} title="Video" className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
    return <div className={`${box} grid place-items-center p-10 text-center`}><a href={v.video_url || '#'} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full bg-white px-5 py-2 font-semibold text-black">▶ Watch the video</a><p className="mt-3 break-all text-xs text-zinc-500">{v.video_url}</p></div>
  }
  if (!url) return <div className={`${box} grid place-items-center p-10 text-sm text-zinc-400`}>Preview unavailable. Refresh the page.</div>
  if (v.mime === 'application/pdf') return (
    <div className="space-y-2">
      <div className={`${box} h-[70vh] min-h-[360px]`}><iframe src={url} title={v.name || 'PDF'} className="h-full w-full bg-white" /></div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-300 hover:underline">Open the PDF{v.size_bytes ? ` (${fmtBytes(v.size_bytes)})` : ''} ↗</a>
    </div>
  )
  // eslint-disable-next-line @next/next/no-img-element
  return <div className={box}><img src={url} alt={v.name || 'Draft'} className="mx-auto max-h-[80vh] w-auto" /></div>
}
