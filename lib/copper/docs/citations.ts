// Module 3: finds citations like [Copper Home User Guide, p. 9] in Copper's
// replies, so the chat panel can turn each one into a link to that PDF page.
// Safe to import from client components: it only reads the document list.
import { DOCUMENTS } from "@/lib/copper/documents";

export type Citation = {
  /** Exactly as written in the reply, brackets included. */
  raw: string;
  title: string;
  page: number;
  /** Link to the PDF at that page, or null if the title isn't one of our documents. */
  url: string | null;
};

export type ReplyPart = string | Citation;

/** [Title, p. 9] or [Title, page 9]. */
const CITATION = /\[([^[\]]+?),\s*(?:p\.|page)\s*(\d+)\]/gi;

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function documentFor(title: string) {
  const wanted = normalize(title);
  return (
    DOCUMENTS.find((d) => normalize(d.title) === wanted) ??
    // "Terms and Conditions" for "Copper State Labs Terms and Conditions".
    DOCUMENTS.find((d) => normalize(d.title).endsWith(wanted))
  );
}

/** Splits a reply into plain text and citations, in order. */
export function parseCitations(reply: string): ReplyPart[] {
  const parts: ReplyPart[] = [];
  let last = 0;
  for (const match of reply.matchAll(CITATION)) {
    if (match.index > last) parts.push(reply.slice(last, match.index));
    const page = Number(match[2]);
    const doc = documentFor(match[1]);
    parts.push({
      raw: match[0],
      title: doc?.title ?? match[1].trim(),
      page,
      url: doc ? `${doc.file}#page=${page}` : null,
    });
    last = match.index + match[0].length;
  }
  if (last < reply.length) parts.push(reply.slice(last));
  return parts;
}

/** Each page cited in a reply, once, in the order first cited. */
export function citedSources(reply: string): Citation[] {
  const seen = new Set<string>();
  return parseCitations(reply).filter((part): part is Citation => {
    if (typeof part === "string" || !part.url || seen.has(part.url))
      return false;
    seen.add(part.url);
    return true;
  });
}
