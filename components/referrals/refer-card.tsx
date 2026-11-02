import { Card, CardContent } from '@/components/ui/card'
import type { Stats } from '@/lib/referrals/core'

/** Dashboard "Refer a friend". No reward is promised unless rewards are enabled (they are off). */
export function ReferCard({ link, stats, rewardsOn }: { link: string; stats: Stats; rewardsOn: boolean }) {
  return (
    <Card data-refer-card>
      <CardContent className="space-y-3 py-5">
        <h2 className="text-lg font-bold">Refer a friend</h2>
        <p className="text-sm text-muted-foreground">
          {rewardsOn ? 'Give a month, get a month: when a friend you refer pays for a plan, you both get a month free.' : 'Share your link. Referral tracking is on, and referral rewards are coming soon. We will tell you before they start.'}
        </p>
        <input readOnly value={link} aria-label="Your referral link" className="w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm" />
        <p className="text-sm" data-refer-counts>Signed up with your link: <strong>{stats.signups}</strong> · On a paid plan: <strong>{stats.paid}</strong></p>
      </CardContent>
    </Card>
  )
}
