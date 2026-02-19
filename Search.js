
// ===============================
// Search.js (Stable Version)
// ===============================

let data = [];

function cleanText(t) {
  if (t == null) return "";
  return String(t)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

async function safeFetchJson(path, defaultBook) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} HTTP ${r.status}`);
  const json = await r.json();
  const arr = Array.isArray(json) ? json : [];
  for (const v of arr) {
    if (!v.book) v.book = defaultBook;
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
  const term = (document.getElementById("searchTerm").value || "").trim().toLowerCase();
  const resultsEl = document.getElementById("results");
  if (!resultsEl) return;

  if (!term) {
    resultsEl.textContent = "Type a word or phrase, then click Search.";
    return;
  }

  const matches = data.filter(v => cleanText(v.text).toLowerCase().includes(term));

  resultsEl.innerHTML = "";

  if (!matches.length) {
    resultsEl.textContent = "No results found.";
    return;
  }

  for (const v of matches.slice(0, 500)) {
    const row = document.createElement("div");
    row.className = "result";

    const ref = makeLink(v);
    const txt = document.createElement("span");
    txt.textContent = " — " + cleanText(v.text);

    row.appendChild(ref);
    row.appendChild(txt);
    resultsEl.appendChild(row);
  }
}

function clearSearch() {
  const input = document.getElementById("searchTerm");
  const resultsEl = document.getElementById("results");
  if (input) input.value = "";
  if (resultsEl) resultsEl.innerHTML = "";
}

function exportResults() {
  const resultsEl = document.getElementById("results");
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

document.addEventListener("DOMContentLoaded", loadAllBooks);