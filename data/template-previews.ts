import type { TemplateId } from './templates'

/**
 * Picker preview images: real screenshots of each template's first screen, captured from
 * /templates/preview/<id> at 1280x800 (2x) and saved as WebP in public/templates/previews/.
 * Two widths per template (640 for 1x cards, 1280 for sharp screens). Regenerate with
 * scripts/capture-template-previews.cjs and keep the file names stable.
 */
export const PREVIEW_WIDTH = 640
export const PREVIEW_HEIGHT = 400

export const templatePreviewAlt: Record<TemplateId, string> = {
  'book-call': 'Book a call template preview: intro text, a "Book your free call" button and a name, email, phone and message form.',
  'sales-page': 'Sales page template preview: offer text with three bullet points, a $49 price and the thank-you section below.',
  'free-download': 'Free download template preview: free guide intro with a "Get the free guide" button and a name and email form.',
  'aurora-waitlist': 'Aurora waitlist template preview: "Something bright is coming" on a warm gradient with a "Join the waitlist" button.',
  'starfield-launch': 'Starfield launch template preview: "Launch day is almost here" on a starry night sky with a "Get launch access" button.',
  'glass-webinar': 'Glass webinar template preview: "Free live workshop" on a frosted-glass card with a "Save my seat" button.',
  'parallax-story': 'Parallax story template preview: "Your story starts here" over a sunset and layered hills with a "Book a free call" button.',
  'neon-links': 'Neon link hub template preview: "Find me everywhere" with three glowing link buttons on a dark background.',
}

export function templatePreview(id: TemplateId) {
  const base = `/templates/previews/${id}`
  return {
    src: `${base}-640.webp`,
    srcSet: `${base}-640.webp 640w, ${base}-1280.webp 1280w`,
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    alt: templatePreviewAlt[id],
  }
}
