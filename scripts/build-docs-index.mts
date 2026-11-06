// npm run docs:index: builds the search index for Ask Copper's search_docs tool.
// Reads every PDF in public/docs, cuts each page into passages, embeds each
// passage with Gemini and saves them all to lib/copper/data/docs-index.json,
// which the app loads into memory. Run it again whenever a PDF changes.
// Add --dry-run to see the passages without calling Gemini.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { callEmbedMany } from "@/lib/ai/call";
import { EMBEDDING_MODEL } from "@/lib/ai/models";
import type { DocsIndex } from "@/lib/copper/docs/index-types";
import { splitDocument, type Passage } from "@/lib/copper/docs/passages";
import { readPdfPages } from "@/lib/copper/docs/pdf-text";
import { DOCUMENTS } from "@/lib/copper/documents";

const OUT = "lib/copper/data/docs-index.json";
const dryRun = process.argv.includes("--dry-run");

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const passages: Passage[] = [];
for (const doc of DOCUMENTS) {
  const path = `public${doc.file}`;
  if (!existsSync(path)) {
    console.error(
      `Missing ${path}. Add the PDF from Canvas, then run this again.`,
    );
    process.exit(1);
  }
  const pages = await readPdfPages(new Uint8Array(readFileSync(path)));
  const docPassages = splitDocument(doc, pages);
  passages.push(...docPassages);
  console.log(
    `${doc.title}: ${pages.length} pages → ${docPassages.length} passages`,
  );
}

if (dryRun) {
  for (const p of passages)
    console.log(`\n[${p.id}] (${p.text.length} chars)\n${p.text}`);
  process.exit(0);
}

console.log(
  `\nEmbedding ${passages.length} passages with ${EMBEDDING_MODEL.id}...`,
);
const embeddings = await callEmbedMany(
  { module: 3, feature: "docs-index" },
  passages.map((p) => p.text),
  "document",
);

// Five decimal places is plenty for comparing meanings and keeps the file small.
const round = (n: number) => Math.round(n * 1e5) / 1e5;
const index: DocsIndex = {
  model: EMBEDDING_MODEL.id,
  dimensions: EMBEDDING_MODEL.dimensions,
  passages: passages.map((p, i) => ({
    ...p,
    embedding: embeddings[i].map(round),
  })),
};
writeFileSync(OUT, JSON.stringify(index) + "\n");
console.log(`Saved ${passages.length} passages to ${OUT}.`);
