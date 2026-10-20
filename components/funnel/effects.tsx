'use client'

import { useEffect, useRef } from 'react'

/** True when the visitor asked the OS for less motion. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Light canvas background: drifting stars ('stars') or floating glow particles ('particles').
 * ~120 points, one rAF loop, paused when the tab is hidden; a single static frame under reduced motion.
 */
export function CanvasField({ variant }: { variant: 'stars' | 'particles' }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = prefersReducedMotion()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, raf = 0
    const count = variant === "stars" ? 140 : 40
    const pts = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2,
      vx: (Math.random() - 0.5) * 0.0004, vy: (Math.random() - 0.5) * 0.0004,
      hue: [190, 280, 320][Math.floor(Math.random() * 3)],
    }))
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of pts) {
        if (!reduce) {
          if (variant === 'stars') { p.y += 0.00025 * p.z; if (p.y > 1) p.y = 0 }
          else { p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1 }
        }
        const x = p.x * w, y = p.y * h
        if (variant === 'stars') {
          ctx.fillStyle = `rgba(255,255,255,${0.35 + p.z * 0.6})`
          ctx.fillRect(x, y, p.z * 1.8, p.z * 1.8)
        } else {
          const r = 2 + p.z * 4
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
          g.addColorStop(0, `hsla(${p.hue},95%,65%,0.55)`); g.addColorStop(1, `hsla(${p.hue},95%,65%,0)`)
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill()
        }
      }
      if (!reduce && !document.hidden) raf = requestAnimationFrame(draw)
    }
    const onVis = () => { if (!document.hidden && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw) } }
    resize(); draw()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis) }
  }, [variant])
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
}

/** Adds .is-visible to [data-reveal] children when they scroll into view (instant under reduced motion). */
export function useScrollReveal(root: React.RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) { items.forEach((i) => i.classList.add('is-visible')); return }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) } }), { threshold: 0.12 })
    items.forEach((i) => io.observe(i))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Writes the scroll offset to --scroll on the element (rAF throttled) for CSS parallax layers. */
export function useParallax(root: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current
    if (!el || !enabled || prefersReducedMotion()) return
    const box = el.closest<HTMLElement>('[data-scroll-root]')
    const scroller: HTMLElement | Window = box ?? window
    let raf = 0
    const read = () => (box ? box.scrollTop : window.scrollY)
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => el.style.setProperty('--scroll', String(read()))) }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { cancelAnimationFrame(raf); scroller.removeEventListener('scroll', onScroll) }
  }, [root, enabled])
}
