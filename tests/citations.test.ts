// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  COPPER_INSTRUCTIONS,
  NOT_IN_DOCS,
} from "@/lib/copper/assistant/instructions";
import { citedSources, parseCitations } from "@/lib/copper/docs/citations";

describe("parseCitations", () => {
  it("turns [Title, p. N] into a link to that page of the PDF", () => {
    const parts = parseCitations(
      "Unplug it for 30 seconds [Copper Home User Guide, p. 9].",
    );
    expect(parts).toEqual([
      "Unplug it for 30 seconds ",
      {
        raw: "[Copper Home User Guide, p. 9]",
        title: "Copper Home User Guide",
        page: 9,
        url: "/docs/copper-home-user-guide.pdf#page=9",
      },
      ".",
    ]);
  });

  it("matches a shortened document title and 'page N'", () => {
    const [, citation] = parseCitations("Yes [Terms and Conditions, page 2]");
    expect(citation).toMatchObject({
      title: "Copper State Labs Terms and Conditions",
      url: "/docs/copper-terms-and-conditions.pdf#page=2",
    });
  });

  it("doesn't link a title that isn't one of our documents", () => {
    const [, citation] = parseCitations("Hmm [Pizza Menu, p. 1]");
    expect(citation).toMatchObject({ title: "Pizza Menu", url: null });
  });

  it("leaves a reply without citations as it is", () => {
    expect(parseCitations("Hi there!")).toEqual(["Hi there!"]);
  });
});

describe("citedSources", () => {
  it("lists each cited page once, in order", () => {
    const reply =
      "A [Copper Plus FAQ, p. 5]. B [Copper Home User Guide, p. 9]. C [Copper Plus FAQ, p. 5].";
    expect(citedSources(reply).map((s) => `${s.title} p${s.page}`)).toEqual([
      "Copper Plus FAQ p5",
      "Copper Home User Guide p9",
    ]);
  });
});

describe("Copper's instructions", () => {
  it("require search_docs, a citation per sentence, and an honest 'not found'", () => {
    expect(COPPER_INSTRUCTIONS).toContain("search_docs");
    expect(COPPER_INSTRUCTIONS).toContain("[Copper Home User Guide, p. 9]");
    expect(COPPER_INSTRUCTIONS).toContain(NOT_IN_DOCS);
    expect(COPPER_INSTRUCTIONS).toMatch(/Copper Crew/);
  });
});
