import { TOOL_REGISTRY } from '@/tools/registry'
import type { ToolDef } from '@/tools/types'

/** Grantable access keys with display names (every tool incl. CRM, plus All Access). */
export const GRANTABLE: { id: string; name: string }[] = [
  ...(TOOL_REGISTRY as readonly ToolDef[]).map((t) => ({ id: t.accessKey, name: t.name })),
  { id: 'all', name: 'All Access' },
].filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i)
