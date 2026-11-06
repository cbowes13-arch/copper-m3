import type { EmbeddingModelId } from "@/lib/ai/models";
import type { Passage } from "@/lib/copper/docs/passages";

export type IndexedPassage = Passage & { embedding: number[] };

/** The shape of lib/copper/data/docs-index.json. */
export type DocsIndex = {
  model: EmbeddingModelId;
  dimensions: number;
  passages: IndexedPassage[];
};
