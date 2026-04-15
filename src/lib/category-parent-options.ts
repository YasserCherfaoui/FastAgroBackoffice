import type { Category } from "#/lib/api"

/** True if `ancestorId` appears on the parent chain above `nodeId` (i.e. `nodeId` is in the subtree under `ancestorId`). */
export function isAncestorOf(
  ancestorId: number,
  nodeId: number,
  byId: Map<number, Category>,
): boolean {
  let cur: number | null | undefined = byId.get(nodeId)?.parent_id ?? null
  const seen = new Set<number>()
  for (let i = 0; i < 256 && cur != null; i++) {
    if (cur === ancestorId) return true
    if (seen.has(cur)) return false
    seen.add(cur)
    cur = byId.get(cur)?.parent_id ?? null
  }
  return false
}

/** Parent choices for editing `currentId` (excludes self and any category under `currentId`). */
export function filterParentCategoryOptions(
  items: Category[],
  currentId: number,
): Category[] {
  const byId = new Map(items.map((c) => [c.id, c]))
  return items.filter((c) => {
    if (c.id === currentId) return false
    if (isAncestorOf(currentId, c.id, byId)) return false
    return true
  })
}
