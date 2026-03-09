export interface DependencyEdge {
  fromFile: string;
  toFile: string;
  type: "import";
}
