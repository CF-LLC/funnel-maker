// Owner reads with the signed-in session (RLS: own rows only).
import { createServerClient } from '@/lib/supabase'
import { COMMENT_COLS, ITEM_COLS, VERSION_COLS, isUuid, itemStatus, type Comment, type Item, type Status, type Version } from './core'

export type ItemRow = Item & { status: Status | 'empty'; latest: number; comments: number }
export async function loadItems(): Promise<ItemRow[]> {
  const db: any = await createServerClient()
  const [{ data: items }, { data: vs }, { data: cs }] = await Promise.all([
    db.from('ap_items').select(ITEM_COLS).order('updated_at', { ascending: false }).limit(300),
    db.from('ap_versions').select('item_id, number, status').limit(10000),
    db.from('ap_comments').select('item_id').eq('author', 'client').limit(20000),
  ])
  return (items || []).map((i: Item) => {
    const v = (vs || []).filter((x: any) => x.item_id === i.id)
    return { ...i, status: itemStatus(v), latest: v.reduce((m: number, x: any) => Math.max(m, x.number), 0), comments: (cs || []).filter((c: any) => c.item_id === i.id).length }
  })
}
export async function loadItem(id: string) {
  if (!isUuid(id)) return null
  const db: any = await createServerClient()
  const { data: item } = await db.from('ap_items').select(ITEM_COLS).eq('id', id).maybeSingle()
  if (!item) return null
  const [{ data: versions }, { data: comments }, { data: used }] = await Promise.all([
    db.from('ap_versions').select(VERSION_COLS).eq('item_id', id).order('number', { ascending: false }),
    db.from('ap_comments').select(COMMENT_COLS).eq('item_id', id).order('created_at'),
    db.from('ap_versions').select('size_bytes').eq('kind', 'file').limit(10000),
  ])
  const usedBytes = (used || []).reduce((s: number, f: any) => s + Number(f.size_bytes || 0), 0)
  return { item: item as Item, versions: (versions || []) as Version[], comments: (comments || []) as Comment[], usedBytes }
}
