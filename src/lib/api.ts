// Token'ı otomatik olarak tüm isteklerde ekle
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}); 