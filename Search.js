let data = [];

// Load the JSON data file
fetch("jubilees.json")
  .then(r => r.json())
  .then(json => { data = json; })
  .catch(err => {
    console.error("Failed to load Jubilees.json:", err);
    document.getElementById("results").textContent =
      "Error: could not load Jubilees.json. Check filename and server.";
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
    `${item.ref || "(no ref)"}\n${item.text || ""}\n`
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
