import type { EmbeddingModelId, ModelId } from "@/lib/ai/models";

// US dollars per million tokens: Google's list prices as of 2026-10.
// Billing may differ slightly; these are for cost estimates.
export const PRICING: Record<ModelId, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "google/gemini-3-flash": { input: 0.5, output: 3 },
};

/** Embeddings only have input tokens. */
export const EMBEDDING_PRICING: Record<EmbeddingModelId, { input: number }> = {
  "google/gemini-embedding-001": { input: 0.15 },
};

export function costUsd(
  model: ModelId | EmbeddingModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  if (model in EMBEDDING_PRICING) {
    const price = EMBEDDING_PRICING[model as EmbeddingModelId];
    return (inputTokens * price.input) / 1_000_000;
  }
  const price = PRICING[model as ModelId];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
