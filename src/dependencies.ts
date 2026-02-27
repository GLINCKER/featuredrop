import type { FeatureEntry, FeatureManifest } from "./types";

function getDirectDependencies(feature: FeatureEntry): string[] {
  const dependsOn = feature.dependsOn;
  if (!dependsOn) return [];
  const seen = dependsOn.seen ?? [];
  const clicked = dependsOn.clicked ?? [];
  const dismissed = dependsOn.dismissed ?? [];
  const unique = new Set<string>();
  for (const id of [...seen, ...clicked, ...dismissed]) {
    if (id) unique.add(id);
  }
  return Array.from(unique);
}

export function resolveDependencyOrder(manifest: FeatureManifest): string[] {
  const ids = new Set(manifest.map((feature) => feature.id));
  const outgoing = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  for (const feature of manifest) {
    outgoing.set(feature.id, new Set());
    indegree.set(feature.id, 0);
  }

  for (const feature of manifest) {
    for (const dependencyId of getDirectDependencies(feature)) {
      if (!ids.has(dependencyId)) continue;
      const edges = outgoing.get(dependencyId);
      if (!edges || edges.has(feature.id)) continue;
      edges.add(feature.id);
      indegree.set(feature.id, (indegree.get(feature.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const feature of manifest) {
    if ((indegree.get(feature.id) ?? 0) === 0) queue.push(feature.id);
  }

  const ordered: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) continue;
    ordered.push(id);
    const edges = outgoing.get(id);
    if (!edges) continue;
    for (const nextId of edges) {
      const nextDegree = (indegree.get(nextId) ?? 0) - 1;
      indegree.set(nextId, nextDegree);
      if (nextDegree === 0) queue.push(nextId);
    }
  }

  // On cycles, append remaining IDs in original order to keep behavior stable.
  if (ordered.length < manifest.length) {
    const included = new Set(ordered);
    for (const feature of manifest) {
      if (included.has(feature.id)) continue;
      ordered.push(feature.id);
    }
  }

  return ordered;
}

export function hasDependencyCycle(manifest: FeatureManifest): boolean {
  const ids = new Set(manifest.map((feature) => feature.id));
  const outgoing = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  for (const feature of manifest) {
    outgoing.set(feature.id, new Set());
    indegree.set(feature.id, 0);
  }

  for (const feature of manifest) {
    for (const dependencyId of getDirectDependencies(feature)) {
      if (!ids.has(dependencyId)) continue;
      const edges = outgoing.get(dependencyId);
      if (!edges || edges.has(feature.id)) continue;
      edges.add(feature.id);
      indegree.set(feature.id, (indegree.get(feature.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const feature of manifest) {
    if ((indegree.get(feature.id) ?? 0) === 0) queue.push(feature.id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) continue;
    visited += 1;
    const edges = outgoing.get(id);
    if (!edges) continue;
    for (const nextId of edges) {
      const nextDegree = (indegree.get(nextId) ?? 0) - 1;
      indegree.set(nextId, nextDegree);
      if (nextDegree === 0) queue.push(nextId);
    }
  }

  return visited !== manifest.length;
}

export function sortFeaturesByDependencies(features: FeatureEntry[]): FeatureEntry[] {
  if (features.length <= 1) return [...features];
  const order = resolveDependencyOrder(features);
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...features].sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra === undefined || rb === undefined) return 0;
    return ra - rb;
  });
}
