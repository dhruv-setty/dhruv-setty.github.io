// Text extraction for the Journal "Listen" player. Reads the rendered article DOM at runtime,
// so whatever the post shows is what gets spoken. Pure DOM and string work; no speech here.

export interface Chunk {
  text: string; // what is passed to SpeechSynthesisUtterance
  el: HTMLElement; // the block highlighted while this chunk is spoken
}

// Symbols spoken as words, in prose and in code.
const SYMBOLS: Array<[RegExp, string]> = [
  [/≤/g, " less than or equal to "],
  [/≥/g, " greater than or equal to "],
  [/≠/g, " not equal to "],
  [/≈/g, " approximately "],
  [/∝/g, " proportional to "],
  [/→|⟶|⇒/g, " to "],
  [/←/g, " from "],
  [/×/g, " by "],
  [/÷/g, " divided by "],
  [/±/g, " plus or minus "],
  [/∞/g, " infinity "],
  [/∈/g, " in "],
  [/√/g, " square root of "],
  [/∑|Σ/g, " sigma "],
  [/∏|Π/g, " pi "],
  [/Δ/g, " delta "],
  [/∇/g, " nabla "],
  [/Ω/g, " omega "],
  [/Θ/g, " theta "],
  [/Λ/g, " lambda "],
  [/Φ/g, " phi "],
  [/α/g, " alpha "],
  [/β/g, " beta "],
  [/γ/g, " gamma "],
  [/δ/g, " delta "],
  [/ε|ϵ/g, " epsilon "],
  [/ζ/g, " zeta "],
  [/η/g, " eta "],
  [/θ/g, " theta "],
  [/ι/g, " iota "],
  [/κ/g, " kappa "],
  [/λ/g, " lambda "],
  [/μ|µ/g, " mu "],
  [/ν/g, " nu "],
  [/ξ/g, " xi "],
  [/π/g, " pi "],
  [/ρ/g, " rho "],
  [/σ/g, " sigma "],
  [/τ/g, " tau "],
  [/φ|ϕ/g, " phi "],
  [/χ/g, " chi "],
  [/ψ/g, " psi "],
  [/ω/g, " omega "],
  [/ᵀ/g, " transpose "],
  [/⁻¹/g, " inverse "],
  [/²/g, " squared "],
  [/³/g, " cubed "],
  [/%+/g, " percent "],
];

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0", "¹": "1", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};

// Short words left alone after an underscore (calm_to_panic), where a spelled-out subscript would sound wrong.
const WORDS = new Set(["to", "in", "on", "of", "is", "at", "by", "or", "if", "no", "up", "as", "do", "be", "go", "it", "an", "my", "we"]);

const DIGIT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function marks(text: string, math: boolean): string {
  // A combining hat is a word (θ̂ is "theta hat"); a bar is a word in code (x̄) and dropped in prose (IĀTŌ reads as IATO).
  const t = text.normalize("NFD");
  return t.replace(/\u0302/g, " hat ").replace(/\u0304/g, math ? " bar " : "").normalize("NFC");
}

function symbols(text: string, math = false): string {
  let t = marks(text, math);
  for (const [re, word] of SYMBOLS) t = t.replace(re, word);
  t = t.replace(/⁻?[⁰¹⁴-⁹]+/g, (m) => {
    const neg = m.startsWith("⁻") ? "minus " : "";
    const digits = [...m.replace("⁻", "")].map((c) => SUPERSCRIPT_DIGITS[c] ?? "").join("");
    return ` to the power ${neg}${digits} `;
  });
  return t;
}

/** Inline code read as words: a_14 is "a one four", cfg_space is "cfg space", Assert.DoesNotContain is "Assert dot Does Not Contain". */
export function speakCode(code: string): string {
  let t = symbols(code, true);
  // Subscripts: a short run after an underscore is spelled out (a_14, a_jk, MAX_RD); digits become words.
  t = t.replace(/_([A-Za-z0-9]+)/g, (_m, run: string) => {
    if (/^\d+$/.test(run) || (run.length <= 2 && !WORDS.has(run.toLowerCase()))) {
      return " " + [...run].map((c) => (/\d/.test(c) ? DIGIT_WORDS[Number(c)] : c)).join(" ");
    }
    return " " + run;
  });
  t = t.replace(/_/g, " ");
  t = t.replace(/([a-z])([A-Z])/g, "$1 $2"); // camelCase
  t = t.replace(/(\d)\.(?=\d)/g, "$1\u0000"); // keep decimals such as 4.5744
  t = t.replace(/(\w)\.(?=\w)/g, "$1 dot ").replace(/\u0000/g, ".");
  t = t.replace(/(^|[\s(])-(?=\d)/g, "$1minus ");
  t = t.replace(/(^|[^A-Za-z0-9])([A-Za-z0-9])\s*-\s*(?=\d)/g, "$1$2 minus "); // t-1, not ubuntu-24.04
  t = t.replace(/-+/g, " ");
  t = t.replace(/(\w)\/(?=\w)/g, "$1 slash ");
  t = t.replace(/\s*==\s*/g, " equals ");
  t = t.replace(/\s*=\s*/g, " equals ");
  t = t.replace(/\s*\+\s*/g, " plus ");
  t = t.replace(/\s*<\s*/g, " less than ");
  t = t.replace(/\s*>\s*/g, " greater than ");
  t = t.replace(/\s*&&?\s*/g, " and ");
  t = t.replace(/\^/g, " to the power ");
  t = t.replace(/[()[\]{}|`'"*#:;\\]/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

function prose(text: string): string {
  return symbols(text)
    .replace(/(?:\s*,?\s*\[\d+(?:\s*[,–-]\s*\d+)*\])+/g, "") // footnote markers such as [1], [2, 3] or [1], [2], [5]
    .replace(/[^\s()]*[A-Za-z0-9]_[A-Za-z0-9][^\s(),;:]*/g, (m) => speakCode(m)) // identifiers in plain text, such as DONE_CNT
    .replace(/(\d)\s*–\s*(?=\d)/g, "$1 to ") // 465–484
    .replace(/\s*[·–—]\s*/g, ", ");
}

const SKIP = "figure, figcaption, pre, img, svg, picture, video, audio, script, style, sup.footnote-ref, .footnotes, [aria-hidden='true'], hr";

/** Spoken text of an inline run: link text only, code as words, footnote markers and figures dropped. */
export function speakInline(root: Node): string {
  let out = "";
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      out += prose(n.textContent ?? "");
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as Element;
    if (el.matches(SKIP) || el.matches("ul, ol, table")) return;
    if (el.matches("code, kbd, samp")) {
      out += " " + speakCode(el.textContent ?? "") + " ";
      return;
    }
    if (el.matches("br")) {
      out += " ";
      return;
    }
    el.childNodes.forEach(walk);
  };
  walk(root);
  return out
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/(\w)-\s+(?=\w)/g, "$1-")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(text: string): string {
  return /[.!?:]$/.test(text) ? text : text + ".";
}

/** Splits a long block at sentence ends so no single utterance runs long (Chrome stops long utterances). */
function split(text: string, max = 240): string[] {
  if (text.length <= max) return [text];
  const parts = text.replace(/([.!?;])\s+(?=\S)/g, "$1\u0001").split("\u0001").map((p) => p + " ");
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && (cur + p).length > max) {
      out.push(cur.trim());
      cur = "";
    }
    cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function figureLabel(fig: Element): string {
  const label = fig.querySelector(".cs-figure__label");
  return label ? speakInline(label) : "";
}

function tableRows(table: HTMLTableElement, push: (text: string, el: HTMLElement) => void) {
  const headRow = table.tHead?.rows[0];
  const headers = headRow ? Array.from(headRow.cells).map((c) => speakInline(c)) : [];
  const bodies = table.tBodies.length ? Array.from(table.tBodies) : [table];
  for (const body of bodies) {
    for (const row of Array.from((body as HTMLTableSectionElement).rows)) {
      if (row.parentElement?.tagName === "THEAD") continue;
      const cells = Array.from(row.cells).map((c) => speakInline(c));
      const text = cells
        .map((v, i) => (!v ? "" : headers[i] ? `${headers[i]}: ${v}` : v))
        .filter(Boolean)
        .join(", ");
      if (text) push(sentence(text), row);
    }
  }
}

/**
 * Builds the reading order for an article: the title, then headings, paragraphs, list items and
 * table rows in document order. Figures (their label only), code blocks, ASCII diagrams and the
 * References list are left out.
 */
export function extractChunks(article: HTMLElement): Chunk[] {
  const chunks: Chunk[] = [];
  const push = (text: string, el: HTMLElement) => {
    for (const part of split(text)) if (part.replace(/[\s.,]/g, "")) chunks.push({ text: part, el });
  };

  const h1 = article.querySelector("h1");
  if (h1) push(sentence(speakInline(h1)), h1 as HTMLElement);

  const body = article.querySelector<HTMLElement>(".post-body") ?? article;
  let skipping = false; // inside the References section

  const visit = (el: HTMLElement) => {
    const tag = el.tagName;
    if (/^H[2-6]$/.test(tag)) {
      const text = speakInline(el);
      if (/^(references|bibliography|footnotes)$/i.test(text)) {
        skipping = true;
        push("References omitted.", el);
        return;
      }
      if (tag === "H2") skipping = false;
      if (!skipping && text) push(sentence(text), el);
      return;
    }
    if (skipping) return;
    if (el.matches("figure")) {
      const label = figureLabel(el);
      if (label) push(sentence(label), el);
      return;
    }
    if (el.matches(SKIP)) return;
    if (tag === "P" || tag === "DT" || tag === "DD") {
      const text = speakInline(el);
      if (text) push(sentence(text), el);
      return;
    }
    if (tag === "LI") {
      const text = speakInline(el);
      if (text) push(sentence(text), el);
      el.querySelectorAll<HTMLElement>(":scope > ul, :scope > ol").forEach(visit);
      return;
    }
    if (tag === "TABLE") {
      tableRows(el as HTMLTableElement, push);
      return;
    }
    Array.from(el.children).forEach((c) => visit(c as HTMLElement));
  };
  Array.from(body.children).forEach((c) => visit(c as HTMLElement));
  return chunks;
}
