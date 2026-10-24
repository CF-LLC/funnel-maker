import { Box, LayoutTemplate, Link2, Receipt, Zap, type LucideIcon } from 'lucide-react'
import type { ToolIcon } from '@/tools/types'
export const TOOL_ICONS: Record<ToolIcon, LucideIcon> = { zap: Zap, 'layout-template': LayoutTemplate, receipt: Receipt, link: Link2, box: Box }
