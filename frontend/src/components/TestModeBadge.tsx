'use client';

export default function TestModeBadge() {
  // Debug: always show to test if component renders
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  console.log('[TestModeBadge] Rendering, API URL:', apiUrl);

  const isLocal = apiUrl.includes('localhost') ||
                  apiUrl.includes('127.0.0.1') ||
                  /192\.168\.\d+\.\d+/.test(apiUrl) ||
                  /10\.\d+\.\d+\.\d+/.test(apiUrl);

  // Temporarily always show for debugging
  // if (!isLocal) return null;

  return (
    <div
      id="test-mode-badge"
      style={{
        position: 'fixed',
        top: 100,
        right: 100,
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '20px 40px',
        borderRadius: 8,
        fontSize: 24,
        fontWeight: 'bold',
        zIndex: 999999,
        border: '4px solid black',
      }}
    >
      TEST MODE - DEBUG
    </div>
  );
}
