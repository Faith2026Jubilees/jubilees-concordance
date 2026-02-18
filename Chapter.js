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
  } catch {
    return [];
  }
}

(async function init() {
  const params = new URLSearchParams(location.search);
  const book = params.get("book") || "";
  const chapter = Number(params.get("chapter") || "0");
  const verseToHighlight = Number(params.get("verse") || "0");
  const term = (params.get("term") || "").trim();

  const titleEl = document.getElementById("title");
  const chapterEl = document.getElementById("chapter");

  titleEl.textContent = `${book} ${chapter}`;

  const [jubilees, jasher, enoch] = await Promise.all([
    safeFetchJson("jubilees.json"),
    safeFetchJson("jasher.json"),
    safeFetchJson("enoch.json")
  ]);
  const data = [...jubilees, ...jasher, ...enoch];

  const verses = data
    .filter(v => v.book === book && Number(v.chapter) === chapter)
    .sort((a,b) => Number(a.verse) - Number(b.verse));

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

    div.innerHTML = `<span class="vnum">${v.verse}</span>${highlightHtml(v.text || "", term)}`;
    frag.appendChild(div);
  }

  chapterEl.appendChild(frag);

  const target = document.getElementById(`v${verseToHighlight}`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
})();
