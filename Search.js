
// ===============================
// Search.js (Stable + Highlight)
// ===============================

let data = [];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function cleanText(t) {
  if (t == null) return "";
  return String(t).replace(/\s+/g, " ").trim();
}

function highlight(text, term) {
  if (!term) return escapeHtml(text);
  const safeText = escapeHtml(text);
  const safeTerm = escapeHtml(term);

  // Highlight case-insensitively
  const re = new RegExp(safeTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
  return safeText.replace(re, m => `<mark>${m}</mark>`);
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
  try {
    const [jub, jas, eno] = await Promise.all([
      safeFetchJson("jubilees_clean.json", "Jubilees"),
      safeFetchJson("jasher.json", "Jasher"),
      safeFetchJson("enoch.json", "Enoch")
    ]);
    data = [...jub, ...jas, ...eno];
    console.log("Loaded verses:", data.length);
  } catch (err) {
    console.error("Failed to load JSON files:", err);
    const el = document.getElementById("results");
    if (el) el.textContent = "Failed to load book data files.";
  }
}

function makeLink(v) {
  const a = document.createElement("a");
  a.href = `chapter.html?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`;
  a.textContent = `${v.book} ${v.chapter}:${v.verse}`;
  return a;
}

function searchText() {
  const input = document.getElementById("searchTerm");
  const resultsEl = document.getElementById("results");
  if (!resultsEl) return;

  const termRaw = (input?.value || "").trim();
  const term = termRaw.toLowerCase();

  if (!term) {
    resultsEl.textContent = "Type a word or phrase, then click Search.";
    return;
  }

  const matches = data.filter(v => (v.text || "").toLowerCase().includes(term));

  resultsEl.innerHTML = "";

  if (!matches.length) {
    resultsEl.textContent = "No results found.";
    return;
  }

  for (const v of matches.slice(0, 500)) {
    const row = document.createElement("div");
    row.className = "result";

    const ref = makeLink(v);

    const snippet = document.createElement("span");
    snippet.innerHTML = " — " + highlight(v.text, termRaw);

    row.appendChild(ref);
    row.appendChild(snippet);
    resultsEl.appendChild(row);
  }
}

function clearSearch() {
  const input = document.getElementById("searchTerm");
  const resultsEl = document.getElementById("results");
  if (input) input.value = "";
  if (resultsEl) resultsEl.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", loadAllBooks);