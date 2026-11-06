// Reads the text of each page of a PDF, one line per line of the page.
// Used only by scripts/build-docs-index.ts, never by the running app.
import { getDocumentProxy } from "unpdf";

type TextItem = { str: string; hasEOL: boolean };

export async function readPdfPages(data: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(data);
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items as TextItem[]) {
      if (typeof item.str !== "string") continue;
      text += item.str;
      if (item.hasEOL) text += "\n";
    }
    pages.push(text);
  }
  await pdf.cleanup();
  return pages;
}
