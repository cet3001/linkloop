import { getSymbols } from "./symbol_store";
import { CodeSymbol } from "./symbol_types";

export function findSymbolByName(name: string): CodeSymbol | null {
  const query = name.toLowerCase();
  return (
    getSymbols().find((symbol) => symbol.name.toLowerCase() === query) ?? null
  );
}

export function findSymbolsInFile(file: string): CodeSymbol[] {
  const query = file.toLowerCase();
  return getSymbols().filter((symbol) => symbol.file.toLowerCase() === query);
}

export function searchSymbols(query: string): CodeSymbol[] {
  const q = query.toLowerCase();
  return getSymbols().filter(
    (symbol) =>
      symbol.name.toLowerCase().includes(q) || symbol.file.toLowerCase().includes(q)
  );
}
