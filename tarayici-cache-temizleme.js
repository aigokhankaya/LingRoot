// Tarayıcı konsolunda çalıştırın:

// 1. LocalStorage'dan token'ı temizle
localStorage.removeItem('lingroot_token');

// 2. API base URL'yi güncelle
const updateApiUrl = () => {
  // Global değişkeni güncelle (varsa)
  if (typeof window.API_BASE_URL !== 'undefined') {
    window.API_BASE_URL = 'http://localhost:5001';
    console.log('Global API_BASE_URL değişkeni güncellendi');
  }
  
  console.log('Token temizlendi ve API URL güncellendi');
  console.log('Şimdi sayfayı tamamen yenileyin (Ctrl+F5 veya Cmd+Shift+R)');
};

updateApiUrl(); 