/**
 * lens health — Knowledge graph health report.
 *
 * Computes graph-level health metrics:
 * - Connectivity: orphan rate, components, giant component, avg degree
 * - Cross-source linking: % of links between notes from different sources
 * - Contradiction consistency: bidirectional contradicts links
 * - Role and link type distribution
 */

import { ensureInitialized, listObjects, readObject, getForwardLinks, getBacklinks } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function showHealth(opts: CommandOptions) {
  ensureInitialized();

  const noteIds = listObjects("note");
  const total = noteIds.length;

  if (total === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ command: "health", total_notes: 0 }, null, 2));
    } else {
      console.log("No notes in the knowledge base.");
    }
    return;
  }

  // Build source map
  const noteSourceMap = new Map<string, string>();
  for (const id of noteIds) {
    const obj = readObject(id);
    if (obj) noteSourceMap.set(id, obj.data.source || "");
  }

  // Compute per-note metrics
  let orphans = 0;
  let totalInDegree = 0;
  let crossSourceLinks = 0;
  let totalNoteLinks = 0;
  const inDegrees: number[] = [];
  const orphanIds: string[] = [];

  for (const id of noteIds) {
    const fwd = getForwardLinks(id).filter(l => l.to_id.startsWith("note_"));
    const bck = getBacklinks(id).filter(l => l.from_id.startsWith("note_"));
    const outDeg = fwd.length;
    const inDeg = bck.length;
    inDegrees.push(inDeg);
    totalInDegree += inDeg;

    if (outDeg === 0 && inDeg === 0) {
      orphans++;
      orphanIds.push(id);
    }

    const mySource = noteSourceMap.get(id) || "";
    for (const link of fwd) {
      if (!link.to_id.startsWith("note_")) continue;
      totalNoteLinks++;
      const targetSource = noteSourceMap.get(link.to_id) || "";
      if (mySource && targetSource && mySource !== targetSource) crossSourceLinks++;
    }
  }

  // Contradiction reciprocity
  const contradictPairs = new Set<string>();
  let reciprocalContradicts = 0;
  let totalContradicts = 0;
  for (const id of noteIds) {
    const fwd = getForwardLinks(id).filter(l => l.rel === "contradicts");
    for (const link of fwd) {
      totalContradicts++;
      const key = [id, link.to_id].sort().join("|");
      if (contradictPairs.has(key)) reciprocalContradicts += 2;
      contradictPairs.add(key);
    }
  }

  // Connected components (BFS)
  const visited = new Set<string>();
  let componentCount = 0;
  let largestComponent = 0;
  for (const id of noteIds) {
    if (visited.has(id)) continue;
    componentCount++;
    let size = 0;
    const queue = [id];
    while (queue.length > 0) {
      const curr = queue.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      size++;
      const neighbors = [
        ...getForwardLinks(curr).filter(l => l.to_id.startsWith("note_")).map(l => l.to_id),
        ...getBacklinks(curr).filter(l => l.from_id.startsWith("note_")).map(l => l.from_id),
      ];
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push(n);
      }
    }
    if (size > largestComponent) largestComponent = size;
  }

  // Role distribution
  const roles: Record<string, number> = {};
  for (const id of noteIds) {
    const obj = readObject(id);
    const role = obj?.data.role || "observation";
    roles[role] = (roles[role] || 0) + 1;
  }

  // Link type distribution
  const linkTypes: Record<string, number> = {};
  for (const id of noteIds) {
    for (const l of getForwardLinks(id).filter(l => l.to_id.startsWith("note_"))) {
      linkTypes[l.rel] = (linkTypes[l.rel] || 0) + 1;
    }
  }

  // In-degree Gini coefficient
  const sorted = [...inDegrees].sort((a, b) => a - b);
  const degreeSum = sorted.reduce((a, b) => a + b, 0);
  let giniNumerator = 0;
  for (let i = 0; i < sorted.length; i++) {
    giniNumerator += (2 * (i + 1) - sorted.length - 1) * sorted[i];
  }
  const gini = degreeSum > 0 ? giniNumerator / (sorted.length * degreeSum) : 0;

  // Avg in-degree
  const avgInDegree = totalInDegree / total;

  // Status helpers
  const check = (ok: boolean) => ok ? "OK" : "!!";
  const pct = (n: number, d: number) => d > 0 ? (n / d * 100).toFixed(1) : "0";

  if (opts.json) {
    console.log(JSON.stringify({
      total_notes: total,
      connectivity: {
        orphan_count: orphans,
        orphan_rate: parseFloat(pct(orphans, total)),
        connected_components: componentCount,
        giant_component_size: largestComponent,
        giant_component_pct: parseFloat(pct(largestComponent, total)),
        avg_in_degree: parseFloat(avgInDegree.toFixed(2)),
        in_degree_gini: parseFloat(gini.toFixed(3)),
      },
      cross_source: {
        total_note_links: totalNoteLinks,
        cross_source_links: crossSourceLinks,
        cross_source_pct: parseFloat(pct(crossSourceLinks, totalNoteLinks)),
      },
      contradictions: {
        total: totalContradicts,
        reciprocal: reciprocalContradicts,
        reciprocal_pct: totalContradicts > 0 ? parseFloat((reciprocalContradicts / totalContradicts * 100).toFixed(0)) : 100,
      },
      roles,
      link_types: linkTypes,
      orphan_ids: orphanIds.slice(0, 20),
    }, null, 2));
    return;
  }

  // Human-readable output
  console.log(`Knowledge Graph Health Report`);
  console.log(`${"━".repeat(50)}`);
  console.log(`Notes: ${total}\n`);

  console.log(`Connectivity`);
  console.log(`  ${check(orphans / total < 0.1)} Orphan notes:     ${orphans} (${pct(orphans, total)}%)  target: <10%`);
  console.log(`  ${check(componentCount <= 5)} Components:       ${componentCount}  target: 1`);
  console.log(`  ${check(largestComponent / total > 0.9)} Giant component:  ${largestComponent} (${pct(largestComponent, total)}%)  target: >90%`);
  console.log(`  ${check(avgInDegree >= 1.5)} Avg in-degree:    ${avgInDegree.toFixed(2)}  target: >=1.5`);
  console.log(`  ${check(gini >= 0.4 && gini <= 0.7)} In-degree Gini:   ${gini.toFixed(3)}  target: 0.4-0.7`);
  console.log();

  console.log(`Cross-Source Linking`);
  console.log(`  ${check(totalNoteLinks > 0 && crossSourceLinks / totalNoteLinks > 0.4)} Cross-source:     ${crossSourceLinks}/${totalNoteLinks} (${pct(crossSourceLinks, totalNoteLinks)}%)  target: >40%`);
  console.log();

  console.log(`Contradiction Consistency`);
  const recipPct = totalContradicts > 0 ? reciprocalContradicts / totalContradicts * 100 : 100;
  console.log(`  ${check(recipPct >= 100)} Bidirectional:    ${reciprocalContradicts}/${totalContradicts} (${recipPct.toFixed(0)}%)  target: 100%`);
  const contradictRatio = totalNoteLinks > 0 ? (linkTypes.contradicts || 0) / totalNoteLinks * 100 : 0;
  console.log(`  ${check(contradictRatio >= 5)} Contradicts ratio: ${contradictRatio.toFixed(1)}%  target: >5%`);
  console.log();

  console.log(`Role Distribution`);
  for (const [role, count] of Object.entries(roles).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${role}: ${count} (${pct(count, total)}%)`);
  }
  console.log();

  console.log(`Link Types`);
  for (const [rel, count] of Object.entries(linkTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rel}: ${count}`);
  }

  // Summary
  console.log();
  const issues: string[] = [];
  if (orphans / total >= 0.1) issues.push(`${orphans} orphan notes need linking`);
  if (componentCount > 5) issues.push(`${componentCount} disconnected components (graph is fragmented)`);
  if (avgInDegree < 1.5) issues.push(`avg in-degree ${avgInDegree.toFixed(2)} is low (notes under-linked)`);
  if (contradictRatio < 5) issues.push(`contradicts ratio ${contradictRatio.toFixed(1)}% is low (tensions under-discovered)`);

  if (issues.length === 0) {
    console.log(`Health: GOOD`);
  } else {
    console.log(`Issues (${issues.length}):`);
    for (const issue of issues) {
      console.log(`  !! ${issue}`);
    }
    console.log();
    console.log(`Use an agent to curate: search for related notes and add links via \`lens write\`.`);
  }
}
