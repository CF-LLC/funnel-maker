export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-56 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-3"><div className="skeleton h-28 rounded-xl" /><div className="skeleton h-28 rounded-xl" /><div className="skeleton h-28 rounded-xl" /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="skeleton h-32 rounded-xl" /><div className="skeleton h-32 rounded-xl" /></div>
    </div>
  )
}
