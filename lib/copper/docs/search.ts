// Module 3: searching the support docs by meaning. The question is embedded
// (one small Gemini call), compared with every passage in the in-memory index,
// and the closest passages come back with where they're from.
import { cosineSimilarity } from "ai";
import { callEmbed } from "@/lib/ai/call";
import { DOCS_INDEX, type IndexedPassage } from "@/lib/copper/docs/index";
import { DOCUMENTS } from "@/lib/copper/documents";

/** How many passages search_docs hands to Copper. */
export const TOP_K = 5;

export type DocResult = {
  title: string;
  page: number;
  section?: string;
  /** The passage, without the "Title, p. N, Section:" label at its start. */
  text: string;
  /** Opens the PDF at the passage's page. */
  url: string;
  /** How close the passage's meaning is to the question, from 0 to 1. */
  score: number;
};

export type DocsSearch = { query: string; results: DocResult[] };

/** The PDF link for a page: browsers open "file.pdf#page=9" at page 9. */
export function pageUrl(docId: string, page: number): string {
  const doc = DOCUMENTS.find((d) => d.id === docId);
  return `${doc?.file ?? `/docs/${docId}.pdf`}#page=${page}`;
}

function withoutLabel(p: IndexedPassage): string {
  const end = p.text.indexOf(": ");
  return end === -1 ? p.text : p.text.slice(end + 2);
}

/** The `k` passages closest to an already-embedded question, best first. */
export function closestPassages(
  questionEmbedding: number[],
  k = TOP_K,
  passages: IndexedPassage[] = DOCS_INDEX.passages,
): DocResult[] {
  return passages
    .map((p) => ({ p, score: cosineSimilarity(questionEmbedding, p.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ p, score }) => ({
      title: p.title,
      page: p.page,
      ...(p.section ? { section: p.section } : {}),
      text: withoutLabel(p),
      url: pageUrl(p.docId, p.page),
      score: Math.round(score * 1000) / 1000,
    }));
}

/** search_docs: the 5 passages from Copper's support docs closest in meaning. */
export async function searchDocs(query: string): Promise<DocsSearch> {
  const embedding = await callEmbed(
    { module: 3, feature: "search-docs" },
    query,
    "question",
  );
  return { query, results: closestPassages(embedding) };
}
