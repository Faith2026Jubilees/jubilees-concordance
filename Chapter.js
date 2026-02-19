
 function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightHtml(text, term) {
  if (!term) return escapeHtml(text);
  const safe = escapeHtml(text);
  const re = new RegExp(escapeRegExp(term), "gi");
  return safe.replace(re, (m) => `<mark>${m}</mark>`);
}

function cleanVerseText(text, verseNum) {
  let t = String(text || "");

  // Remove duplicate verse number when it appears at:
  // - start of the text
  // - start of a new line
  // - start of a new sentence after punctuation
  // Examples removed: "26And ...", "\n26And ...", ". 26And ..."
  if (verseNum != null && verseNum !== 0) {
    const v = String(verseNum);

    // Normalize newlines for consistent matching
    t = t.replace(/\r\n/g, "\n");

    // Remove at start or after newline
    t = t.replace(new RegExp(`(^|\\n)\\s*${v}\\s*(?=[A-Za-z"'(])`, "g"), "$1");

    // Remove after sentence punctuation
    t = t.replace(new RegExp(`([\\.\\!\\?;:])\\s*${v}\\s*(?=[A-Za-z"'(])`, "g"), "$1 ");
  }

  // Fix "3And" -> "3 And" (general cleanup; doesn't affect verse number we removed)
  t = t.replace(/\b(\d)([A-Za-z])/g, "$1 $2");

  // Light-touch removal of common editorial/footnote fragments
  t = t.replace(/\s+\bCf\.\s+[^.]{0,200}\./g, "");
  t = t.replace(/\s+\bRead\s+[^.]{0,200}\./g, "");
  t = t.replace(/\s+\bAccording to\s+[^.]{0,240}\./g, "");
  t = t.replace(/\s+\bText corrupt\.[^.]{0,240}\./g, "");
  t = t.replace(/\s*\[[^\]]{1,120}\]\s*/g, " ");

  // Collapse whitespace (but keep it readable)
  t = t.replace(/\s+/g, " ").trim();

  return t;
}



  // Fix "3And" -> "3 And"
  t = t.replace(/\b(\d)([A-Za-z])/g, "$1 $2");

  // Light-touch removal of common editorial/footnote fragments
  t = t.replace(/\s+\bCf\.\s+[^.]{0,200}\./g, "");
  t = t.replace(/\s+\bRead\s+[^.]{0,200}\./g, "");
  t = t.replace(/\s+\bAccording to\s+[^.]{0,240}\./g, "");
  t = t.replace(/\s+\bText corrupt\.[^.]{0,240}\./g, "");
  t = t.replace(/\s*\[[^\]]{1,120}\]\s*/g, " ");

  // Cleanup whitespace
  t = t.replace(/\s+/g, " ").trim();

  return t;
}

async function safeFetchJson(path, defaultBook) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(`${path} HTTP ${r.status}`);
    const json = await r.json();
    const arr = Array.isArray(json) ? json : [];
    for (const v of arr) v._defaultBook = defaultBook;
    return arr;
  } catch (e) {
    console.warn("Skipping:", path, e);
    return [];
  }
}

function normalizeVerse(v) {
  const x = { ...v };

  if (!x.book) x.book = x._defaultBook || "Jubilees";
  if (x.text == null && x.content != null) x.text = x.content;

  if (x.chapter != null) x.chapter = Number(x.chapter);
  if (x.verse != null) x.verse = Number(x.verse);

  const ref = x.ref || x.reference || x.id || x.verseRef || "";
  if (
    (x.chapter == null || Number.isNaN(x.chapter) || x.verse == null || Number.isNaN(x.verse)) &&
    typeof ref === "string"
  ) {
    const m = ref.match(/^\s*([A-Za-z ]+)\s+(\d+)\s*:\s*(\d+)\s*$/);
    if (m) {
      x.book = x.book || m[1].trim();
      if (x.chapter == null || Number.isNaN(x.chapter)) x.chapter = Number(m[2]);
      if (x.verse == null || Number.isNaN(x.verse)) x.verse = Number(m[3]);
    }
  }

  if (!x.book) x.book = "Jubilees";
  if (x.chapter == null || Number.isNaN(x.chapter)) x.chapter = 0;
  if (x.verse == null || Number.isNaN(x.verse)) x.verse = 0;
  if (x.text == null) x.text = "";

  return x;
}

(async function init() {
  const params = new URLSearchParams(location.search);

  const book = params.get("book") || "Jubilees";
  const chapter = Number(params.get("chapter") || "0");
  const verseToHighlight = Number(params.get("verse") || "0");
  const term = (params.get("term") || "").trim();

  const titleEl = document.getElementById("title");
  const chapterEl = document.getElementById("chapter");

  titleEl.textContent = `${book} ${chapter}`;

  const [jubileesRaw, jasherRaw, enochRaw] = await Promise.all([
    safeFetchJson("jubilees.json", "Jubilees"),
    safeFetchJson("jasher.json", "Jasher"),
    safeFetchJson("enoch.json", "Enoch")
  ]);

  const data = [...jubileesRaw, ...jasherRaw, ...enochRaw].map(normalizeVerse);

  const verses = data
    .filter(v => (v.book || "Jubilees") === book && Number(v.chapter) === chapter)
    .sort((a, b) => Number(a.verse) - Number(b.verse));

  if (verses.length === 0) {
    chapterEl.textContent = "Chapter not found (or JSON not loaded yet).";
    return;
  }

  const frag = document.createDocumentFragment();

  for (const v of verses) {
    const div = document.createElement("div");
    div.className = "verse";
    div.id = `v${v.verse}`;

    if (Number(v.verse) === verseToHighlight) div.classList.add("hit");

    const cleaned = cleanVerseText(v.text || "", v.verse);

    div.innerHTML = `<span class="vnum">${v.verse}</span>${highlightHtml(cleaned, term)}`;
    frag.appendChild(div);
  }

  chapterEl.textContent = "";
  chapterEl.appendChild(frag);

  const target = document.getElementById(`v${verseToHighlight}`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
})();
