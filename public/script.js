async function fetchComments() {
  const urls = document.getElementById("urls").value.trim().split("\n").filter(u => u);
  if (!urls.length) return alert("Please enter at least one URL.");

  // ✅ Show loading message
  document.getElementById("loading").style.display = "block";
  document.getElementById("time-taken").style.display = "none";

  const startTime = performance.now(); // ⏱ Start timer

  try {
    const response = await fetch("/fetch-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls })
    });

    const data = await response.json();

    // ✅ Group comments by URL
    const grouped = data.reduce((acc, { url, comment, classification }) => {
      if (!acc[url]) acc[url] = [];
      acc[url].push(`[${classification}] ${comment}`);
      return acc;
    }, {});

    const tbody = document.querySelector("#results tbody");
    tbody.innerHTML = "";

    if (Object.keys(grouped).length === 0) {
      tbody.innerHTML = "<tr><td colspan='3'>No results found</td></tr>";
    } else {
      Object.entries(grouped).forEach(([url, comments]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${url}</td>
          <td>${comments.join("<hr>")}</td>
          <td>${
            comments.some(c => c.includes("Does Warrant"))
              ? "Contains Warrant"
              : "Does Not Warrant"
          }</td>`;
        tbody.appendChild(tr);
      });
    }

    // ✅ Show table after data is loaded
    document.getElementById("results").style.display = "table";

  } catch (err) {
    alert("Error fetching comments: " + err.message);
  } finally {
    // ✅ Hide loading and show time
    const endTime = performance.now();
    const seconds = ((endTime - startTime) / 1000).toFixed(2);

    document.getElementById("loading").style.display = "none";
    document.getElementById("time-taken").innerText = `✅ Completed in ${seconds} seconds`;
    document.getElementById("time-taken").style.display = "block";
  }
}

function clearData() {
  // Clear textarea
  document.getElementById("urls").value = "";

  // Clear table content
  document.querySelector("#results tbody").innerHTML = "";

  // Hide table + messages
  document.getElementById("results").style.display = "none";
  document.getElementById("loading").style.display = "none";
  document.getElementById("time-taken").style.display = "none";
}
