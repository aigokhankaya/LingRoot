const fs = typeof window === 'undefined' ? require('fs') : null;
const path = typeof window === 'undefined' ? require('path') : null;
const { v4: uuidv4 } = typeof window === 'undefined' ? require('uuid') : { v4: () => '' };

/**
 * Frontend logunu localde dosyaya kaydeder (sadece Node ortamında çalışır)
 * @param {string} type Log tipi (örn: 'login')
 * @param {object} data Loglanacak veri
 */
function logFrontendRequest(type, data) {
  if (!fs || !path) return; // Sadece Node ortamında çalışır
  try {
    const logDir = path.join(__dirname, '../logs/requests');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, `${uuidv4()}.json`);
    fs.writeFileSync(logFile, JSON.stringify({ type, ...data, timestamp: new Date().toISOString() }, null, 2));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Frontend log dosyasına yazılamadı:', err);
  }
}

module.exports = { logFrontendRequest }; 