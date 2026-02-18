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
  const term = (document.getElementById("searchTerm").value || "").trim().toLowerCase();
  if (!term) {
    document.getElementById("results").textContent = "Type a word or phrase, then click Search.";
    return;
  }

  // Expecting JSON items shaped like: { "ref": "Jubilees 4:1", "text": "..." }
  const results = data.filter(item =>
    (item.text || "").toLowerCase().includes(term)
  );

  const output = results.map(item =>
  `${item.book} ${item.chapter}:${item.verse}\n${item.text || ""}\n`
).join("\n");

document.getElementById("results").textContent = output || "No results found.";
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
