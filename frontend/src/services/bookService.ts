// Backend üzerinden kitap arama fonksiyonu
export async function searchBooks(query: string) {
  const url = `/api/books/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

// Backend üzerinden kitap içeriği çekme fonksiyonu
export async function fetchBookContent(bookId: number) {
  const url = `/api/books/content/${bookId}`;
  const res = await fetch(url);
  const data = await res.json();
  return { title: data.title, content: data.content };
} 