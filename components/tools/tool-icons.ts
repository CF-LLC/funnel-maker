import { Box, ClipboardList, FileCheck, LayoutTemplate, Link2, Receipt, Star, Zap, CalendarDays, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import type { ToolIcon } from '@/tools/types'
export const TOOL_ICONS: Record<ToolIcon, LucideIcon> = { zap: Zap, 'layout-template': LayoutTemplate, receipt: Receipt, link: Link2, box: Box, clipboard: ClipboardList, 'file-check': FileCheck, star: Star, calendar: CalendarDays, shield: ShieldCheck, users: Users }
