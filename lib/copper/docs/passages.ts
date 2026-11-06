// Module 3: cuts each page of a support PDF into passages of a few sentences.
// Each passage keeps its document title, page and section, and its text starts
// with them, so the passage still makes sense when it's found on its own.

export type PassageSource = {
  docId: string;
  title: string;
  page: number;
  /** The section heading the passage sits under, when there is one. */
  section?: string;
};

export type Passage = PassageSource & {
  /** Unique id, like "copper-home-user-guide-p9-2". */
  id: string;
  /** "Copper Home User Guide, p. 9, Troubleshooting and error codes: ..." */
  text: string;
};

/** A passage stops growing once it's this long and a sentence ends... */
const TARGET_CHARS = 450;
/** ...and is cut at the next line once it's this long, sentence or not. */
const MAX_CHARS = 800;
/** Shorter pieces are joined to the next one instead of standing alone. */
const MIN_CHARS = 200;

/** Every page starts with a running header, the document code and this line. */
const COPYRIGHT_LINE = /Fictional company and documents/;

/** "8 Troubleshooting and error codes" or "8.1 Common problems", but not "1 Place Copper Notes on its puck." */
const HEADING = /^(\d+(?:\.\d+)*)\s+([A-Z][^.!?]{1,58})$/;

/** A question in the FAQ, like "Q Can I choose Refined for a question?" */
const QUESTION = /^Q\s+\S/;

const ENDS_SENTENCE = /[.!?)"”]$/;

/** The page's lines without its header (everything up to the copyright line). */
export function bodyLines(pageText: string): string[] {
  const lines = pageText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const header = lines.findIndex((line) => COPYRIGHT_LINE.test(line));
  return header === -1 || header > 4 ? lines : lines.slice(header + 1);
}

type Piece = { section?: string; lines: string[] };

const length = (lines: string[]) => lines.join(" ").length;

/**
 * Splits one page into passages. `section` is the heading the previous page
 * ended under; the return value says which heading this page ends under.
 */
export function splitPage(
  doc: { id: string; title: string },
  page: number,
  pageText: string,
  section?: string,
): { passages: Passage[]; section?: string } {
  // 1. Cut at headings and FAQ questions, and inside long runs of text.
  const pieces: Piece[] = [];
  let current: Piece = { section, lines: [] };
  const flush = () => {
    if (current.lines.length) pieces.push(current);
    current = { section, lines: [] };
  };
  for (const line of bodyLines(pageText)) {
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      section = heading[2].trim();
      current = { section, lines: [] };
      continue;
    }
    if (QUESTION.test(line)) flush();
    current.lines.push(line);
    const size = length(current.lines);
    if (
      size >= MAX_CHARS ||
      (size >= TARGET_CHARS && ENDS_SENTENCE.test(line))
    ) {
      flush();
    }
  }
  flush();

  // 2. Join pieces that are too short to stand alone (a one-line intro, a
  //    short FAQ answer) onto the next piece.
  const merged: Piece[] = [];
  for (const piece of pieces) {
    const previous = merged.at(-1);
    if (
      previous &&
      length(previous.lines) < MIN_CHARS &&
      length(previous.lines) + length(piece.lines) <= MAX_CHARS
    ) {
      previous.lines.push(...piece.lines);
    } else {
      merged.push({ section: piece.section, lines: [...piece.lines] });
    }
  }

  const passages = merged.map((piece, i): Passage => {
    const label = [`${doc.title}, p. ${page}`, piece.section]
      .filter(Boolean)
      .join(", ");
    return {
      id: `${doc.id}-p${page}-${i + 1}`,
      docId: doc.id,
      title: doc.title,
      page,
      ...(piece.section ? { section: piece.section } : {}),
      text: `${label}: ${piece.lines.join(" ")}`,
    };
  });
  return { passages, section };
}

/** Splits every page of a document, carrying the section across pages. */
export function splitDocument(
  doc: { id: string; title: string },
  pages: string[],
): Passage[] {
  const passages: Passage[] = [];
  let section: string | undefined;
  pages.forEach((pageText, i) => {
    const result = splitPage(doc, i + 1, pageText, section);
    passages.push(...result.passages);
    section = result.section;
  });
  return passages;
}
