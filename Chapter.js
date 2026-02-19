
 // ===============================
// Chapter.js (Clean Stable Version)
// ===============================

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    book: params.get("book"),
    chapter: parseInt(params.get("chapter"), 10),
    verse: parseInt(params.get("verse"), 10)
  };
}

function cleanText(t) {
  if (t == null) return "";

  t = String(t)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\[[^\]]{1,250}\]/g, " ")
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

async function loadChapter() {
  const resultsDiv =
    document.getElementById("chapterContent") ||
    document.getElementById("results") ||
    document.getElementById("content");

  if (!resultsDiv) {
    console.error("Chapter page is missing a content div. Expected id='chapterContent' or id='results'.");
    return;
  }

  resultsDiv.textContent = "Loading...";

  const { book, chapter, verse } = getQueryParams();

  const [jubileesRaw, jasherRaw, enochRaw] = await Promise.all([
    safeFetchJson("jubilees_clean.json", "Jubilees"),
    safeFetchJson("jasher.json", "Jasher"),
    safeFetchJson("enoch.json", "Enoch")
  ]);

  const allData = [...jubileesRaw, ...jasherRaw, ...enochRaw];

  const chapterData = allData.filter(v =>
    (v.book || v._defaultBook) === book &&
    v.chapter === chapter
  );

  if (!chapterData.length) {
    resultsDiv.textContent = "Chapter not found.";
    return;
  }

  chapterData.sort((a, b) => a.verse - b.verse);

  resultsDiv.innerHTML = "";

  for (const v of chapterData) {
    const verseDiv = document.createElement("div");
    verseDiv.className = "verse";

    if (v.verse === verse) {
      verseDiv.style.backgroundColor = "#ffffcc";
      verseDiv.style.padding = "6px";
      verseDiv.style.borderRadius = "4px";
    }

    verseDiv.innerHTML = `<strong>${book} ${chapter}:${v.verse}</strong> ${cleanText(v.text)}`;
    resultsDiv.appendChild(verseDiv);
  }
}

document.addEventListener("DOMContentLoaded", loadChapter);