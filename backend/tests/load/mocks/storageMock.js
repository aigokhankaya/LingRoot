/**
 * Supabase Storage Mock for Load Testing
 *
 * Returns a deterministic fake URL instead of uploading to real storage.
 */

let uploadCounter = 0;

/**
 * Generate a mock storage URL
 * @param {string} filename - Original filename
 * @returns {string} Fake public URL
 */
function getMockStorageUrl(filename) {
  uploadCounter++;
  const cleanName = (filename || 'file').replace(/\s+/g, '_');
  return `https://mock-storage.example.com/audio/${cleanName}_${uploadCounter}`;
}

/**
 * Reset the upload counter (for test isolation)
 */
function resetCounter() {
  uploadCounter = 0;
}

module.exports = {
  getMockStorageUrl,
  resetCounter,
};
