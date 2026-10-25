export function Disclaimer() {
  return (
    <section role="note" className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-5 text-sm text-amber-100/90">
      <h2 className="font-bold text-amber-200">What this tool does and doesn&apos;t do</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>We can&apos;t promise removal. Each site decides what it removes and when, and listings can come back.</li>
        <li>We don&apos;t submit anything for you. You open each site&apos;s opt-out page and send the request yourself.</li>
        <li>We store only your name and the status you set for each site. Never your address, phone number or ID.</li>
      </ul>
    </section>
  )
}
