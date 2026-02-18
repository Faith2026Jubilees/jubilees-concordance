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
  const isLettersOnly = /^[A-Za-z]+$/.test(termRaw);   // ONLY letters = safe for whole-word boundaries
const escaped = termRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = isLettersOnly ? new RegExp(`\\b${escaped}\\b`, "i") : null;


  const results = data.filter(item => {
    const text = item.text || "";

    if (isLettersOnly) {
  return re.test(text);
} else {
  // For punctuation searches like "Test." use a normal contains search (case-insensitive)
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
