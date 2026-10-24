/** Demo accounts: comma-separated user ids in DEMO_USER_IDS (server-only env). Their public pages show a demo banner,
 * never charge, and never store visitor submissions. */
export function demoUserIds(env: Record<string, string | undefined> = process.env): Set<string> {
  return new Set((env.DEMO_USER_IDS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
}
export function isDemoUser(userId: string | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  return !!userId && demoUserIds(env).has(userId.toLowerCase())
}
export const DEMO_DONE = 'This is a demo, nothing was sent.'
