// npm run docs:search -- "your question": shows the 5 passages search_docs
// would hand to Copper, with how close each one is in meaning.
import { existsSync } from "node:fs";
import { searchDocs } from "@/lib/copper/docs/search";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const queries = process.argv.slice(2);
if (queries.length === 0) {
  console.error('Usage: npm run docs:search -- "C-47" "annual refund"');
  process.exit(1);
}
for (const query of queries) {
  const { results } = await searchDocs(query);
  console.log(`\n"${query}"`);
  for (const r of results) {
    console.log(
      `  ${r.score.toFixed(3)}  ${r.title}, p. ${r.page}${r.section ? ` (${r.section})` : ""}  ${r.url}`,
    );
  }
}
