import { buildGraphEdges } from "./graph_builder";
import { DependencyEdge } from "./graph_types";

let edges: DependencyEdge[] = [];
let dependencies = new Map<string, string[]>();
let dependents = new Map<string, string[]>();

function rebuildAdjacency(): void {
  dependencies = new Map<string, string[]>();
  dependents = new Map<string, string[]>();

  for (const edge of edges) {
    const fromDeps = dependencies.get(edge.fromFile) ?? [];
    if (!fromDeps.includes(edge.toFile)) {
      fromDeps.push(edge.toFile);
      dependencies.set(edge.fromFile, fromDeps);
    }

    const toDependents = dependents.get(edge.toFile) ?? [];
    if (!toDependents.includes(edge.fromFile)) {
      toDependents.push(edge.fromFile);
      dependents.set(edge.toFile, toDependents);
    }
  }
}

export async function buildDependencyGraph(rootPath: string): Promise<number> {
  edges = await buildGraphEdges(rootPath);
  rebuildAdjacency();
  return edges.length;
}

export function getDependencies(file: string): string[] {
  return [...(dependencies.get(file) ?? [])];
}

export function getDependents(file: string): string[] {
  return [...(dependents.get(file) ?? [])];
}
