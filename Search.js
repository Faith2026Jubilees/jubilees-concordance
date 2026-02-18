let data = [];

// Load all books (Jubilees + Jasher + Enoch)
Promise.all([
  fetch("jubilees.json").then(r => r.json()),
  fetch("jasher.json").then(r => r.json()),
  fetch("enoch.json").then(r => r.json())
])
.then(allBooks => {
  data = allBooks.flat();
})
.catch(err => {
  console.error("Failed to load book files:", err);
  const el = document.getElementById("results");
  if (el) el.textContent = "Failed to load book data files.";
});


function searchText() {
  const resultsEl = document.getElementById("results");
  const termRaw = (document.getElementById("searchTerm").value || "").trim();

  if (!termRaw) {
    resultsEl.textContent = "Type a word or phrase, then click Search.";
    return;
  }

  // If data isn't loaded yet, don't show misleading "No results"
  if (!Array.isArray(data) || data.length === 0) {
    resultsEl.textContent = "Still loading book data… please try again in a second.";
    return;
  }

  // Whole-word search for single words; phrase search for multi-word input
  const isSingleWord = !/\s/.test(termRaw);
  const escaped = termRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = isSingleWord ? new RegExp(`\\b${escaped}\\b`, "i") : null;

  const results = data.filter(item => {
    const text = item.text || "";

    if (isSingleWord) {
      // Special case: if searching "test", don't match "Test." (Testaments abbreviation)
      if (/^test$/i.test(termRaw) && /\bTest\./.test(text)) return false;
      return re.test(text);
    } else {
      return text.toLowerCase().includes(termRaw.toLowerCase());
    }
  });

  const output = results.map(item => {
    const book = item.book || "Jubilees";
    const ref = item.ref || `${book} ${item.chapter}:${item.verse}`;
    return `${ref}\n${item.text || ""}\n`;
  }).join("\n");

  resultsEl.textContent = output || "No results found.";
}



function clearSearch() {
  document.getElementById("searchTerm").value = "";
  document.getElementById("results").textContent = "";
  document.getElementById("searchTerm").focus();
}

function exportResults() {
  const content = document.getElementById("results").textContent || "";
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "search_results.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}
