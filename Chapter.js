// ===============================
// Chapter.js (Powder-blue target verse + robust)
// ===============================

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const book = params.get("book");
  const chapter = Number(params.get("chapter"));
  const verse = Number(params.get("verse"));
  return { book, chapter, verse };
}

function cleanText(t) {
  if (t == null) return "";
  return String(t).replace(/\s+/g, " ").trim();
}

async function safeFetchJson(path, defaultBook) {
  try {
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
  } catch (e) {
    console.warn("Skipping:", path, e);
    return [];
  }
}

async function loadChapter() {
  const resultsDiv =
    document.getElementById("chapterContent") ||
    document.getElementById("results");

  if (!resultsDiv) {
    console.error("Missing chapter container div (need id='chapterContent' or id='results').");
    return;
  }

  resultsDiv.textContent = "Loading…";

  const { book, chapter, verse } = getQueryParams();
  if (!book || !chapter) {
    resultsDiv.textContent = "Missing URL info (book/chapter).";
    return;
  }

  const [jubileesRaw, jasherRaw, enochRaw] = await Promise.all([
    safeFetchJson("jubilees_clean.json", "Jubilees"),
    safeFetchJson("jasher.json", "Jasher"),
    safeFetchJson("enoch.json", "Enoch")
  ]);

  const allData = [...jubileesRaw, ...jasherRaw, ...enochRaw];

  const chapterData = allData.filter(v =>
    v.book === book &&
    v.chapter === chapter
  );

  if (!chapterData.length) {
    resultsDiv.textContent = `Chapter not found: ${book} ${chapter}`;
    return;
  }

  chapterData.sort((a, b) => a.verse - b.verse);

  resultsDiv.innerHTML = "";

  for (const v of chapterData) {
    const verseDiv = document.createElement("div");
    verseDiv.className = "verse";

    if (v.verse === verse) verseDiv.classList.add("verseTarget");

    verseDiv.innerHTML = `<strong>${book} ${chapter}:${v.verse}</strong> ${cleanText(v.text)}`;
    resultsDiv.appendChild(verseDiv);
  }
}

document.addEventListener("DOMContentLoaded", loadChapter);