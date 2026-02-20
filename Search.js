// ===============================
// Search.js (Stable + Book filter + Chapter dropdown)
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
  const safeText = escapeHtml(text);
  const term = (termRaw || "").trim();
  if (!term) return safeText;

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escapedTerm, "ig");
  return safeText.replace(re, m => `<mark class="hit">${escapeHtml(m)}</mark>`);
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

function populateChaptersForBook(book) {
  const sel = $("chapterSelect");
  if (!sel) return;

  const chapters = new Set(
    data
      .filter(v => book === "ALL" ? true : v.book === book)
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

async function loadAllBooks() {
  const resultsEl = $("results");
  if (resultsEl) resultsEl.textContent = "";

  try {
    const [jub, jas, eno] = await Promise.all([
      safeFetchJson("jubilees_clean.json", "Jubilees"),
      safeFetchJson("jasher.json", "Jasher"),
      safeFetchJson("enoch.json", "Enoch")
    ]);

    data = [...jub, ...jas, ...eno];
    isLoaded = true;

    console.log("✅ Loaded verses:", data.length);

    // Hook up the book dropdown to refresh chapters
    const bookSel = $("bookFilter");
    if (bookSel) {
      // Populate chapters immediately
      populateChaptersForBook(bookSel.value || "ALL");

      // Update chapters whenever book changes
      bookSel.addEventListener("change", () => populateChaptersForBook(bookSel.value));
    }
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

  const bookFilter = ($("bookFilter")?.value || "ALL");

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
    return v.book === bookFilter;
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

function exportResults() {
  const resultsEl = $("results");
  if (!resultsEl) return;

  const text = resultsEl.innerText || "";
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "search_results.txt";
  a.click();

  URL.revokeObjectURL(url);
}

function goToChapter() {
  const book = ($("bookFilter")?.value || "ALL");
  const chapter = ($("chapterSelect")?.value || "").trim();

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

// Make functions available to onclick handlers
window.searchText = searchText;
window.clearSearch = clearSearch;
window.exportResults = exportResults;
window.goToChapter = goToChapter;

document.addEventListener("DOMContentLoaded", loadAllBooks);