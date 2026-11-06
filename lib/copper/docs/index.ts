// Module 3: the support-docs index, loaded into memory once when the app
// starts. Built by `npm run docs:index` from the PDFs in public/docs. Four
// documents fit easily in memory, so there's no database to set up.
import data from "@/lib/copper/data/docs-index.json";
import type { DocsIndex } from "@/lib/copper/docs/index-types";

export type { DocsIndex, IndexedPassage } from "@/lib/copper/docs/index-types";

export const DOCS_INDEX = data as DocsIndex;
