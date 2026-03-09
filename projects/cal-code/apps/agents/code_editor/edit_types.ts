export interface CodePatch {
  file: string;
  operation: "replace" | "append";
  target?: string;
  content: string;
}
