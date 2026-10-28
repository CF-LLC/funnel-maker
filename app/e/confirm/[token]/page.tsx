import { TokenAction } from '@/components/emaillist/token-action'
export const metadata = { title: 'Confirm your subscription', robots: { index: false } }
export default async function Confirm({ params }: { params: Promise<{ token: string }> }) {
  return <TokenAction kind="confirm" token={(await params).token} />
}
