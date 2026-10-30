'use client'
import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { matrixToRgba } from '@/lib/free-tools/qr'
import { absoluteUrl, QR_STYLE, qrFileStem, qrMatrixFor, qrSvgFor } from '@/lib/free-tools/qr-download'

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Owner-facing QR download (PNG + SVG) for one public path. Built in the browser, nothing is uploaded. */
export function DownloadQr({ path, label = 'QR code', compact = false }: { path: string; label?: string; compact?: boolean }) {
  const [err, setErr] = useState('')
  const url = absoluteUrl(path), stem = qrFileStem(path)
  const svg = () => { try { save(new Blob([qrSvgFor(url)], { type: 'image/svg+xml' }), `${stem}.svg`) } catch { setErr('Could not make the QR code.') } }
  const png = () => {
    try {
      const img = matrixToRgba(qrMatrixFor(url), QR_STYLE)
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      c.getContext('2d')!.putImageData(new ImageData(img.data, img.width, img.height), 0, 0)
      c.toBlob((b) => (b ? save(b, `${stem}.png`) : setErr('Could not make the PNG.')), 'image/png')
    } catch { setErr('Could not make the QR code.') }
  }
  const btn = 'inline-flex min-h-9 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted'
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-qr-download={path}>
      {!compact && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><QrCode className="h-4 w-4" aria-hidden />{label}</span>}
      <button type="button" onClick={png} className={btn} aria-label={`Download ${label} as PNG`}>{compact && <QrCode className="h-3.5 w-3.5" aria-hidden />}PNG</button>
      <button type="button" onClick={svg} className={btn} aria-label={`Download ${label} as SVG`}>SVG</button>
      {err && <span role="alert" className="text-xs text-red-500">{err}</span>}
    </span>
  )
}
