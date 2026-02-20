
// ===============================
// Search.js (Neon word highlight + stable globals)
// ===============================

let data = [];
let isLoaded = false;

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function cleanText(t) {
  if (t == null) return "";
  return String(t).replace(/\s+/g, " ").trim();
}

function highlightHits(text, termRaw) {
  const textSafe = escapeHtml(text);
  const term = (termRaw || "").trim();
  if (!term) return textSafe;

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escapedTerm, "ig");
  return textSafe.replace(re, m => `<mark class="hit">${escapeHtml(m)}</mark>`);
}
function populateChaptersForBook(book) {
  const sel = document.getElementById("chapterSelect");
  if (!sel) return;

  // Find max chapter available for that book from loaded data
  const chapters = new Set(
    data
      .filter(v => (book === "ALL" ? true : v.book === book))
      .map(v => Number(v.chapter))
      .filter(n => Number.isFinite(n) && n > 0)
  );

  const sorted = [...chapters].sort((a, b) => a - b);

  sel.innerHTML = "";
  if (!sorted.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "—";
    sel.appendChild(opt);
    return;
  }

  for (const ch of sorted) {
    const opt = document.createElement("option");
    opt.value = String(ch);
    opt.textContent = String(ch);
    sel.appendChild(opt);
  }
}

function goToChapter() {
  const book = (document.getElementById("bookFilter")?.value || "ALL");
  const chapter = (document.getElementById("chapterSelect")?.value || "").trim();

  if (book === "ALL") {
    alert("Please choose a Book first.");
    return;
  }
  if (!chapter) {
    alert("Please choose a Chapter.");
    return;
  }

  window.location.href =
    `chapter.html?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`;
}

async function safeFetchJson(path, defaultBook) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} HTTP ${r.status}`);
  const json = await r.json();
  const arr = Array.isArray(json) ? json : [];
  for (const v of arr) {
    if (!v.book) v.book = defaultBook;
    v.chapter = Number(v.chapter);
    v.verse = Number(v.verse);
    v.text = cleanText(v.text);
  }
  return arr;
}

async function loadAllBooks() {
  const resultsEl = $("results");
  if (resultsEl) resultsEl.textContent = "Loading…";

  try {
    const [jub, jas, eno] = await Promise.all([
      safeFetchJson("jubilees_clean.json", "Jubilees"),
      safeFetchJson("jasher.json", "Jasher"),
      safeFetchJson("enoch.json", "Enoch")
    ]);

    data = [...jub, ...jas, ...eno];
    isLoaded = true;
// Initialize chapter dropdown to the current book selection
const bookSel = document.getElementById("bookFilter");
populateChaptersForBook(bookSel ? bookSel.value : "Jubilees");

const bookSel = document.getElementById("bookFilter");
if (bookSel) {
  bookSel.addEventListener("change", () => populateChaptersForBook(bookSel.value));
}

    if (resultsEl) resultsEl.textContent = ""; // clear "Loading…"
    console.log("✅ Loaded verses:", data.length);
  } catch (err) {
    console.error("❌ Failed loading JSON:", err);
    if (resultsEl) resultsEl.textContent = "Failed to load book data files.";
  }
}

function makeLink(v, termRaw) {
  const a = document.createElement("a");
  a.href =
    `chapter.html?book=${encodeURIComponent(v.book)}` +
    `&chapter=${v.chapter}` +
    `&verse=${v.verse}` +
    `&q=${encodeURIComponent(termRaw || "")}`;
  a.textContent = `${v.book} ${v.chapter}:${v.verse}`;
  a.className = "refLink";
  return a;
}

function searchText() {
  const input = $("searchTerm");
  const resultsEl = $("results");
  if (!resultsEl) return;

  const termRaw = (input?.value || "").trim();
  const term = termRaw.toLowerCase();
const bookFilter = (document.getElementById("bookFilter")?.value || "ALL");

  if (!term) {
    resultsEl.textContent = "Type a word or phrase, then click Search.";
    return;
  }

  if (!isLoaded) {
    resultsEl.textContent = "Loading… (try again in a moment)";
    return;
  }

  const matches = data.filter(v => {
  if (!(v.text || "").toLowerCase().includes(term)) return false;
  if (bookFilter === "ALL") return true;
  return (v.book || "") === bookFilter;
});

  resultsEl.innerHTML = "";

  if (!matches.length) {
    resultsEl.textContent = "No results found.";
    return;
  }

  for (const v of matches.slice(0, 500)) {
    const row = document.createElement("div");
    row.className = "resultRow";

    const ref = makeLink(v, termRaw);

    const snippet = document.createElement("span");
    snippet.className = "snippet";
    snippet.innerHTML = " — " + highlightHits(v.text, termRaw);

    row.appendChild(ref);
    row.appendChild(snippet);
    resultsEl.appendChild(row);
  }
}

function clearSearch() {
  const input = $("searchTerm");
  const resultsEl = $("results");
  if (input) input.value = "";
  if (resultsEl) resultsEl.innerHTML = "";
}

// 👇 CRITICAL: make functions available to onclick= handlers even if script is type="module"
window.searchText = searchText;
window.clearSearch = clearSearch;
window.goToChapter = goToChapter;

// Load data
document.addEventListener("DOMContentLoaded", loadAllBooks);