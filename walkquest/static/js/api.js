async function filterWalks() {
  try {
    console.debug("api.js: Starting fetchWalks");
    console.time("fetchWalks");
    const response = await ky.get("http://localhost:8000/api/walks/walks?").json();
    console.timeEnd("fetchWalks");
    console.debug("api.js: Fetch finished with response:", response);
    // ...existing code to normalize walks...
    console.debug("api.js: Normalized walks:", normalizedWalks);
    return normalizedWalks;
  } catch (error) {
    console.error("api.js: Error during fetchWalks:", error);
    throw error;
  }
}
