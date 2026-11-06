# Architecture

How the Copper State Labs app fits together. Each module adds a section at the
end (see [Adding a module](#adding-a-module)) when it changes how the app
works: new pages, tables or AI calls.

_Fictional — for educational use._

## The starter app (Module 0)

A Next.js app that builds, runs and deploys with **no environment variables**.
A Google AI Studio key is optional until a module needs one.

| Piece | Where | What it does |
|---|---|---|
| Pages | `app/` | `layout.tsx` sets the fonts and theme; `page.tsx` is the placeholder home page |
| Brand components | `components/copper/` | `Logo`, `SiteHeader`, `SiteFooter`, `ModeToggle` |
| UI kit | `components/ui/` (shadcn), `components/ai-elements/` (AI Elements) | The only UI libraries the app uses |
| Setup card | `components/setup-required.tsx` | `<SetupRequired service="ai" />`, shown instead of a page whose service isn't configured |
| Company catalog | `lib/copper/catalog.ts`, `lib/copper/data/catalog.json` | Product, plan and privacy facts from the Product Bible (Sections 3, 4, 8 and 10). Pages read prices and plan details from here instead of typing them (added in the Module 1 starter) |
| AI wrapper | `lib/ai/call.ts` | `callText` and `callObject`: every model call goes through these and is logged to the terminal |
| Models and prices | `lib/ai/models.ts`, `lib/ai/pricing.ts` | The approved Gemini models and their token prices |

## Data flow

1. A user opens a page in `app/`.
2. Server code checks what's configured (`isAiConfigured()`). If the key is
   missing, the page renders `<SetupRequired />` instead of crashing.
3. Data comes from files under `lib/copper/data/`.
4. AI requests go through `callText` / `callObject` in `lib/ai/call.ts`, which
   calls Google and then prints one `[ai_calls]` line: `module`, `feature`,
   `model`, tokens, `cost_usd`, `latency_ms`, `ok`.

```ts
const { text } = await callText(
  { module: 2, feature: "ask-copper" },
  { prompt },
);
```

## Two kinds of "AI tiers"

Don't mix these up:

- **Copper State Labs' product tiers** (On-device, Raw Ore, Refined, the
  Copper Cloud) are part of the fictional company. They are facts in the
  [Product Bible](copper-state-labs/product-bible.md) and rows in the `ai_tiers`
  table.
- **The models this app calls** are real Claude models listed in
  `lib/ai/models.ts`. Their cost is logged in `ai_calls`.

## Decisions

- **No environment variables required.** Every service is optional, so a fresh
  clone builds and deploys before any accounts are set up.
- **One AI wrapper.** Routing every call through `lib/ai/call.ts` gives one
  place to log cost and latency per module and feature.
- **No authentication or row-level security yet.** They arrive in a later
  module.

## Adding a module

When a module changes how the app fits together, add a section here:

```md
## Module N: <feature name>

**Summary:** one or two sentences: what this adds and why.

| Piece | Where | What it does |
|---|---|---|
| Page / route | `app/...` | |
| Components | `components/...` | |
| Data | `lib/copper/data/...` | Data files added |
| AI calls | `lib/ai/call.ts` (module, feature) | Model, prompt purpose, expected cost per call |

**Data flow:** user action → page → server code → database / model → response.

**Decisions and trade-offs:** what you chose, the alternatives, and why.

**Risks and open questions:** cost, privacy, accuracy or safety risks, and how
you handle them.
```

## Module 3 starter: Ask Copper

**Summary:** Ask Copper, the Module 2 shopping chatbot, finished: a floating
chat panel that answers prices, totals and stock with four tools and shows
each step. Module 3 teaches it to answer from the customer documents.

| Piece | Where | What it does |
|---|---|---|
| Component | `components/copper/ask-copper.tsx` | The launcher and chat panel, mounted from `app/page.tsx` and opened by the header's `#ask` link. Draws each answer as stations: the tools on offer, thinking, each tool call, then the reply |
| Server Action | `lib/copper/assistant/ask.ts` | `askCopper()`: streams the conversation with `callStream`, up to 5 steps, and sends each step back as a live `Progress` |
| Tools | `lib/copper/assistant/tools.ts` | `copperTools`: `get_products`, `get_prices`, `calculate_cost`, `check_availability` |
| Instructions | `lib/copper/assistant/instructions.ts` | `COPPER_INSTRUCTIONS`. Copper says it can't help yet with warranty, setup, troubleshooting or privacy |
| Data | `lib/copper/inventory.ts`, `lib/copper/documents.ts` | Stock from `lib/copper/data/inventory.json`; `DOCUMENTS`: the four customer documents and their PDF paths under `public/docs/`. The PDFs are added in class |
| AI calls | `{ module: 2, feature: "ask-copper" }` | One streamed call per question |

## Module 3: Ask Copper reads the docs

**Summary:** Ask Copper answers setup, troubleshooting, warranty and policy
questions from the four support PDFs, cites the page for every sentence, and
says "I couldn't find that in our support docs" when they don't answer it.

| Piece | Where | What it does |
|---|---|---|
| Documents | `public/docs/*.pdf` | The four customer PDFs (names in `lib/copper/documents.ts`), served at `/docs/<id>.pdf` so `#page=N` links open the right page |
| Index build | `scripts/build-docs-index.mts` (`npm run docs:index`), `lib/copper/docs/pdf-text.ts`, `lib/copper/docs/passages.ts` | One-time step: reads each page, cuts it into passages of a few sentences that start with "Title, p. N, Section:", and embeds them. Run again when a PDF changes |
| Index | `lib/copper/data/docs-index.json`, `lib/copper/docs/index.ts` | 72 passages with 768-number embeddings (~0.5 MB), imported once and kept in memory. No database |
| Search | `lib/copper/docs/search.ts` | `searchDocs()`: embeds the question, scores every passage by cosine similarity and returns the top 5 with title, page, section and a PDF page link |
| Tool | `lib/copper/assistant/tools.ts` | `search_docs`, the fifth tool. Its card lists the 5 passages as page links with their scores |
| Citations | `lib/copper/docs/citations.ts`, `components/copper/ask-copper.tsx` | Turns `[Title, p. N]` in a reply into links, and lists the cited pages under the answer |
| Instructions | `lib/copper/assistant/instructions.ts` | Answer only from `search_docs`, cite every sentence, never guess, `NOT_IN_DOCS` when the passages don't answer it |
| AI calls | `{ module: 3, feature: "docs-index" }`, `{ module: 3, feature: "search-docs" }` | `callEmbedMany` / `callEmbed` in `lib/ai/call.ts` with `gemini-embedding-001` (768 dimensions, $0.15 per million tokens). Building the index is one batch call; each search embeds one question |

**Data flow:** question → `askCopper` → model calls `search_docs` → question
embedded → top 5 passages from the in-memory index → model writes a cited
reply → panel links each citation to its PDF page.

**Decisions and trade-offs:**

- **In memory, not a vector database.** Four documents (32 pages) fit easily.
  At thousands of documents this would move to pgvector in Supabase.
- **Passages carry their title, page and section in their text,** so a passage
  makes sense on its own both to the embedding model and to Copper.
- **Questions and passages use different embedding task types**
  (`RETRIEVAL_QUERY` / `RETRIEVAL_DOCUMENT`), which helps a question land near
  its answer.
- **`AI_MODEL=google/gemini-3-flash`:** Gemini 2.5 Flash, the default, isn't
  available to new Google AI Studio keys.

**Risks and open questions:** the free tier allows about 20 chat requests a
day per model per Google project, and each answer uses 2–3. An exact lookup
like "What is C-47?" would be cheaper and safer as a table query than RAG.
