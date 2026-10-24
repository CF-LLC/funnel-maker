// Public pages owned by our users' clients and visitors keep the original light look inside the noir app.
export default function PublicLightLayout({ children }: { children: React.ReactNode }) {
  return <div className="light-surface min-h-screen bg-background">{children}</div>
}
