import { TokenAction } from '@/components/emaillist/token-action'
export const metadata = { title: 'Unsubscribe', robots: { index: false } }
export default async function Unsub({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ b?: string }> }) {
  return <TokenAction kind="unsubscribe" token={(await params).token} b={(await searchParams).b} />
}
