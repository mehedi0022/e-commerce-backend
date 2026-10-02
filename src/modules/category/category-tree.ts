type Node = { id: number; parentId: number | null; name: string };

export function descendantCategoryIds(nodes: Node[], rootId: number): number[] {
  const found = new Set<number>([rootId]);
  const children = new Map<number, number[]>();
  for (const node of nodes) if (node.parentId !== null) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
  const queue = [rootId];
  for (let index = 0; index < queue.length; index++) {
    for (const child of children.get(queue[index]) ?? []) if (!found.has(child)) { found.add(child); queue.push(child); }
  }
  return [...found];
}

export function categoryMetadata(nodes: Node[]) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const parents = new Set(nodes.map(node => node.parentId));
  return new Map(nodes.map(node => {
    const names = [node.name]; const visited = new Set([node.id]); let parentId = node.parentId;
    while (parentId !== null && !visited.has(parentId)) {
      visited.add(parentId); const parent = byId.get(parentId); if (!parent) break;
      names.unshift(parent.name); parentId = parent.parentId;
    }
    return [node.id, { isLeaf: !parents.has(node.id), path: names.join(" / ") }];
  }));
}
