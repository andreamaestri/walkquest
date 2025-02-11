async function loadWalks() {
  try {
    console.debug("walks.js: Calling filterWalks to load walks");
    const walks = await filterWalks();
    console.debug("walks.js: Loaded walks:", walks);
    // ...existing code to update the store...
    return walks;
  } catch (error) {
    console.error("walks.js: Failed to load walks:", error);
    // Optionally rethrow or handle the error further
    throw error;
  }
}
