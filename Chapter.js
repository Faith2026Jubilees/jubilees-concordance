
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

  // Fill in book if missing
  if (!x.book) x.book = x._defaultBook;

  // Support alternate text key names
  if (x.text == null && x.content != null) x.text = x.content;

  // Make sure chapter/verse are numbers
  if (x.chapter != null) x.chapter = Number(x.chapter);
  if (x.verse != null) x.verse = Number(x.verse);

  // If chapter/verse missing but ref exists like "Jubilees 1:4"
  const ref = x.ref || x.reference || x.id || x.verseRef || "";
  if (
    (x.chapter == null || Number.isNaN(x.chapter) || x.verse == null || Number.isNaN(x.verse)) &&
    typeof ref === "string"
  ) {
    const m = ref.match(/^\s*([A-Za-z ]+)\s+(\d+)\s*:\s*(\d+)\s*$/);
    if (m) {
      if (!x.book) x.book = m[1].trim();
      if (x.chapter == null || Number.isNaN(x.chapter)) x.chapter = Number(m[2]);
      if (x.verse == null || Number.isNaN(x.verse)) x.verse = Number(m[3]);
    }
  }

  // Safety defaults
  if (!x.book) x.book = "Unknown";
  if (x.chapter == null || Number.isNaN(x.chapter)) x.chapter = 0;
  if (x.verse == null || Number.isNaN(x.verse)) x.verse = 0;
  if (x.text == null) x.text = "";

  return x;
}

(async function init() {
  const params = new URLSearchParams(location.search);

  // book param should be present, but fallback to Jubilees to be safe
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
    .filter(v => (v.book || "") === book && Number(v.chapter) === chapter)
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

    div.innerHTML = `<span class="vnum">${v.verse}</span>${highlightHtml(v.text, term)}`;
    frag.appendChild(div);
  }

  chapterEl.appendChild(frag);

  const target = document.getElementById(`v${verseToHighlight}`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
})();
