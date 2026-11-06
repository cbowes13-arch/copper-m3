// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EMBEDDING_MODEL } from "@/lib/ai/models";
import { DOCS_INDEX } from "@/lib/copper/docs/index";
import { bodyLines, splitPage } from "@/lib/copper/docs/passages";
import { closestPassages, TOP_K } from "@/lib/copper/docs/search";
import { DOCUMENTS } from "@/lib/copper/documents";

const PAGE = [
  "Copper Home User Guide Troubleshooting and error codes",
  "CSL-UG-0101-EN Rev. C 9",
  "© 2026 Copper State Labs, Inc. · Fictional company and documents, for educational use only.",
  "8 Troubleshooting and error codes",
  "When the light ring flashes red, Copper Home has a problem.",
  "8.2 Factory reset",
  "A factory reset erases your settings.",
].join("\n");

describe("splitPage", () => {
  it("drops the page header", () => {
    expect(bodyLines(PAGE)[0]).toBe("8 Troubleshooting and error codes");
  });

  it("starts every passage with the document title, page and section", () => {
    const { passages, section } = splitPage(
      { id: "copper-home-user-guide", title: "Copper Home User Guide" },
      9,
      PAGE,
    );
    expect(passages[0].text).toMatch(
      /^Copper Home User Guide, p\. 9, Troubleshooting and error codes: When the light ring/,
    );
    expect(passages.every((p) => p.page === 9)).toBe(true);
    expect(section).toBe("Factory reset");
  });
});

describe("closestPassages", () => {
  it("returns the 5 closest passages, best first, with a link to their page", () => {
    // Searching with a passage's own embedding must find that passage first.
    const target = DOCS_INDEX.passages.find(
      (p) => p.docId === "copper-home-user-guide" && p.page === 9,
    )!;
    const results = closestPassages(target.embedding);
    expect(results).toHaveLength(TOP_K);
    expect(results[0]).toMatchObject({
      title: "Copper Home User Guide",
      page: 9,
      url: "/docs/copper-home-user-guide.pdf#page=9",
    });
    expect(results[0].score).toBeCloseTo(1, 2);
    expect(results[0].text.startsWith("Copper Home User Guide")).toBe(false);
    const scores = results.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});

describe("search_docs tool", () => {
  it("is one of Ask Copper's tools and is labelled for the panel", async () => {
    const { copperTools } = await import("@/lib/copper/assistant/tools");
    const { TOOL_LABELS } = await import("@/lib/copper/assistant/progress");
    expect(copperTools.search_docs.description).toMatch(/support docs/);
    expect(TOOL_LABELS.search_docs).toBeDefined();
  });
});

describe("DOCS_INDEX", () => {
  it("was built with the current embedding model and size", () => {
    expect(DOCS_INDEX.model).toBe(EMBEDDING_MODEL.id);
    expect(DOCS_INDEX.dimensions).toBe(EMBEDDING_MODEL.dimensions);
    for (const p of DOCS_INDEX.passages) {
      expect(p.embedding).toHaveLength(EMBEDDING_MODEL.dimensions);
    }
  });

  it("has passages from every document, each starting with its title", () => {
    for (const doc of DOCUMENTS) {
      const passages = DOCS_INDEX.passages.filter((p) => p.docId === doc.id);
      expect(passages.length, doc.id).toBeGreaterThan(0);
      for (const p of passages) expect(p.text.startsWith(doc.title)).toBe(true);
    }
  });
});
