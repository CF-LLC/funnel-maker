// Free-tool "email me tips" capture. Pure helpers (tested). Capture only: nothing here sends email.
import { FREE_TOOLS } from '@/lib/free-tools/registry'
export { normalizeSignupEmail as normalizeEmail } from '@/lib/updates/signup'

export const CAPTURE_CONSENT_TEXT = 'Optional. Save my email so SaaS Nation can send me occasional tips about this tool and related SaaS Nation tools. No spam, never shared or sold, unsubscribe any time.'

export const cleanSourceTool = (v: unknown): string | null => (typeof v === 'string' && FREE_TOOLS.some((t) => t.slug === v) ? v : null)
