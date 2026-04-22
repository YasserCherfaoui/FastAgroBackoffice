import type { Brand } from "#/lib/api"

export function isBrandAncestorOf(
  ancestorId: number,
  nodeId: number,
  byId: Map<number, Brand>,
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

export function filterParentBrandOptions(items: Brand[], currentId: number): Brand[] {
  const byId = new Map(items.map((b) => [b.id, b]))
  return items.filter((b) => {
    if (b.id === currentId) return false
    if (isBrandAncestorOf(currentId, b.id, byId)) return false
    return true
  })
}
