
let data = [];
let prepared = false;

// ---------- helpers ----------
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

// Normalize any verse object into:
// { book, chapter, verse, text }
function normalizeVerse(v) {
  const x = { ...v };

  // Book
  if (!x.book) x.book = x._defaultBook;

  // Text (some datasets use "content")
  if (x.text == null && x.content != null) x.text = x.content;

  // Chapter/verse may be strings
  if (x.chapter != null) x.chapter = Number(x.chapter);
  if (x.verse != null) x.verse = Number(x.verse);

  // If chapter/verse are missing but a ref-like field exists
  // e.g. "Jubilees 1:4"
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

  // Final safety defaults so UI doesn't show "undefined"
  if (!x.book) x.book = "Unknown";
  if (x.chapter == null || Number.isNaN(x.chapter)) x.chapter = 0;
  if (x.verse == null || Number.isNaN(x.verse)) x.verse = 0;
  if (x.text == null) x.text = "";

  return x;
}

function prepareDataOnce() {
  if (prepared) return;
  for (const v of data) {
    // Index everything we want to match against:
    v._search = `${v.book} ${v.chapter}:${v.verse} ${v.text}`.toLowerCase();
  }
  prepared = true;
}

function populateBookFilter() {
  const sel = document.getElementById("bookFilter");
  if (!sel) return;

  const books = [...new Set(data.map(x => x.book).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  while (sel.options.length > 1) sel.remove(1);

  for (const b of books) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    sel.appendChild(opt);
  }
}

function currentBookFilter() {
  return document.getElementById("bookFilter")?.value || "ALL";
}

function makeChapterLink(v, term) {
  const bookName = v.book || v._defaultBook || "Jubilees";
  const params = new URLSearchParams({
    book: bookName,
    chapter: String(v.chapter),
    verse: String(v.verse),
    term: term || ""
  });
  return `chapter.html?${params.toString()}`;
}


function renderResults(matches, term) {
  const resultsEl = document.getElementById("results");
  resultsEl.innerHTML = "";

  if (!matches.length) {
    resultsEl.textContent = "No results found.";
    return;
  }

  const frag = document.createDocumentFragment();

  for (const v of matches) {
    const row = document.createElement("div");
    row.className = "result";

    const refDiv = document.createElement("div");
    refDiv.className = "ref";

    const a = document.createElement("a");
    a.href = makeChapterLink(v, term);
    const bookName = v.book || v._defaultBook || "Jubilees";
a.textContent = `${bookName} ${v.chapter}:${v.verse}`;

    refDiv.appendChild(a);

    const textDiv = document.createElement("div");
    textDiv.className = "text";
    textDiv.innerHTML = highlightHtml(v.text, term);

    row.appendChild(refDiv);
    row.appendChild(textDiv);

    frag.appendChild(row);
  }

  resultsEl.appendChild(frag);
}

// ---------- UI actions ----------
function searchText() {
  const raw = (document.getElementById("searchTerm").value || "").trim();
  const statusEl = document.getElementById("status");

  if (!raw) {
    document.getElementById("results").textContent = "Type a word or phrase, then click Search.";
    if (statusEl) statusEl.textContent = "";
    return;
  }

  prepareDataOnce();

  const termLower = raw.toLowerCase();
  const filter = currentBookFilter();

  let matches = data.filter(v => {
    if (filter !== "ALL" && v.book !== filter) return false;
    return v._search.includes(termLower);
  });

  // cap results for speed (later when JSON grows)
  const MAX = 500;
  const capped = matches.length > MAX;
  if (capped) matches = matches.slice(0, MAX);

  if (statusEl) statusEl.textContent = `Found ${matches.length}${capped ? "+" : ""} result(s).`;
  renderResults(matches, raw);
}

function clearSearch() {
  document.getElementById("searchTerm").value = "";
  document.getElementById("results").innerHTML = "";
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "";
}

function exportResults() {
  const resultsEl = document.getElementById("results");
  const text = resultsEl.innerText.trim();
  if (!text) {
    alert("Nothing to export yet. Run a search first.");
    return;
  }

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "search-results.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// ---------- init ----------
(async function init() {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "Loading books…";

  const [jubileesRaw, jasherRaw, enochRaw] = await Promise.all([
    safeFetchJson("jubilees_clean.json", "Jubilees")
    safeFetchJson("jasher.json", "Jasher"),
    safeFetchJson("enoch.json", "Enoch")
  ]);

  data = [...jubileesRaw, ...jasherRaw, ...enochRaw].map(normalizeVerse);

  if (statusEl) statusEl.textContent = `Loaded ${data.length} verses.`;

  populateBookFilter();

  // Enter key triggers search
  const input = document.getElementById("searchTerm");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchText();
    });
  }
})();

  

    

