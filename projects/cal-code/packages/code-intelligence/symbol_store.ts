import { extractProjectSymbols } from "./symbol_indexer";
import { CodeSymbol } from "./symbol_types";

let symbolCache: CodeSymbol[] = [];

export async function indexProjectSymbols(rootPath: string): Promise<number> {
  symbolCache = await extractProjectSymbols(rootPath);
  return symbolCache.length;
}

export function getSymbols(): CodeSymbol[] {
  return [...symbolCache];
}

export function clearSymbols(): void {
  symbolCache = [];
}
