import type { Metadata } from 'next'
import { pageMeta, HOME_TITLE, HOME_DESCRIPTION } from '@/lib/og/pages'
import { getLaunchFlags, isFeatureEnabled } from '@/lib/flags'
import { TRIAL_FLAG } from '@/lib/trial/copy'
import { HomeV2Page } from '@/components/home/v2/page-shell'

// Preview of the job-based homepage (reached via /?hp=2). Never indexed; canonical stays '/'.
export const metadata: Metadata = { ...pageMeta({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: '/', absoluteTitle: true }), robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function HomeV2Preview() {
  return <HomeV2Page flags={await getLaunchFlags()} trial={await isFeatureEnabled(TRIAL_FLAG)} />
}
