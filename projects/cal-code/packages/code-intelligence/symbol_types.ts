export type SymbolType =
  | "function"
  | "class"
  | "method"
  | "variable"
  | "import"
  | "export";

export interface CodeSymbol {
  name: string;
  type: SymbolType;
  file: string;
  line: number;
}
