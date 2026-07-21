export type JsNode =
  | { kind: 'prim'; val: string }
  | { kind: 'obj'; entries: { key: string; node: JsNode }[] }
  | { kind: 'arr'; items: JsNode[] }

export function toJsNode(data: unknown): JsNode {
  if (data === null || data === undefined) return { kind: 'prim', val: String(data) }
  if (typeof data === 'string') return { kind: 'prim', val: JSON.stringify(data) }
  if (typeof data !== 'object') return { kind: 'prim', val: String(data) }
  if (Array.isArray(data)) {
    return { kind: 'arr', items: data.map(toJsNode) }
  }
  return {
    kind: 'obj',
    entries: Object.entries(data as Record<string, unknown>).map(([k, v]) => ({ key: k, node: toJsNode(v) })),
  }
}

export function nodeSummary(n: JsNode): string {
  if (n.kind === 'prim') return n.val
  if (n.kind === 'arr') return `Array[${n.items.length}]`
  return `{${n.entries.length} ${n.entries.length === 1 ? 'key' : 'keys'}}`
}
