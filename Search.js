

  let data = [];
let prepared = false;

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
async function safeFetchJson(path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(`${path} HTTP ${r.status}`);
    const json = await r.json();
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.warn("Skipping:", path, e);
    return [];
  }
}
function prepareDataOnce() {
  if (prepared) return;
  for (const v of data) v._search = (v.text || "").toLowerCase();
  prepared = true;
}
function populateBookFilter() {
  const sel = document.getElementById("bookFilter");
  const books = [...new Set(data.map(x => x.book).filter(Boolean))].sort();
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
  const p = new URLSearchParams({
    book: v.book,
    chapter: String(v.chapter),
    verse: String(v.verse),
    term: term || ""
  });
  return `chapter.html?${p.toString()}`;
}
function renderResults(matches, term) {
  const el = document.getElementById("results");
  el.innerHTML = "";
  if (!matches.length) {
    el.textContent = "No results found.";
    return;
  }
  const frag = document.createDocumentFragment();
  for (const v of matches) {
    const row = document.createElement("div");
    row.className = "result";

    const ref = document.createElement("div");
    ref.className = "ref";
    const a = document.createElement("a");
    a.href = makeChapterLink(v, term);
    a.textContent = `${v.book} ${v.chapter}:${v.verse}`;
    ref.appendChild(a);

    const txt = document.createElement("div");
    txt.className = "text";
    txt.innerHTML = highlightHtml(v.text || "", term);

    row.appendChild(ref);
    row.appendChild(txt);
    frag.appendChild(row);
  }
  el.appendChild(frag);
}

function searchText() {
  const raw = (document.getElementById("searchTerm").value || "").trim();
  const status = document.getElementById("status");
  if (!raw) {
    document.getElementById("results").textContent = "Type a word or phrase, then click Search.";
    status.textContent = "";
    return;
  }

  prepareDataOnce();
  const termLower = raw.toLowerCase();
  const filter = currentBookFilter();

  let matches = data.filter(v => {
    if (filter !== "ALL" && v.book !== filter) return false;
    return (v._search || "").includes(termLower);
  });

  const MAX = 500;
  const capped = matches.length > MAX;
  if (capped) matches = matches.slice(0, MAX);

  status.textContent = `Found ${matches.length}${capped ? "+" : ""} result(s).`;
  renderResults(matches, raw);
}

function clearSearch() {
  document.getElementById("searchTerm").value = "";
  document.getElementById("results").innerHTML = "";
  document.getElementById("status").textContent = "";
}

function exportResults() {
  const text = document.getElementById("results").innerText.trim();
  if (!text) return alert("Nothing to export yet. Run a search first.");
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

(async function init() {
  const status = document.getElementById("status");
  status.textContent = "Loading books…";

  const [jubilees, jasher, enoch] = await Promise.all([
    safeFetchJson("jubilees.json"),
    safeFetchJson("jasher.json"),
    safeFetchJson("enoch.json")
  ]);

  data = [...jubilees, ...jasher, ...enoch];
  status.textContent = `Loaded ${data.length} verses.`;
  populateBookFilter();

  document.getElementById("searchTerm").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchText();
  });
})();
