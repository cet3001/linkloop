import { indexProjectSymbols } from "../packages/code-intelligence/symbol_store";
import { findSymbolByName, searchSymbols } from "../packages/code-intelligence/symbol_search";

async function test(): Promise<void> {
  const count = await indexProjectSymbols(process.cwd());
  console.log(`Indexed symbols: ${count}`);

  const exact = findSymbolByName("runConversation");
  console.log("findSymbolByName(runConversation):");
  console.log(exact);

  console.log("\nsearchSymbols(runConversation):");
  const matches = searchSymbols("runConversation").slice(0, 10);
  matches.forEach((symbol, index) => {
    console.log(
      `${index + 1}. ${symbol.type} ${symbol.name} -> ${symbol.file}:${symbol.line}`
    );
  });
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Symbol index test failed:");
  console.error(message);
  process.exit(1);
});
