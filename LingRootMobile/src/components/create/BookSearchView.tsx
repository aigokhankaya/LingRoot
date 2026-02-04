import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as bookService from '../../services/bookService';
import { COLORS } from '../../theme/colors';

interface BookSearchViewProps {
  onBookSelect: (book: BookData) => void;
  onChapterSelect: (chapterId: number, chapterText: string) => void;
  onError: (title: string, message: string) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

interface BookData {
  id: number;
  title: string;
  authors: string;
}

interface ChapterData {
  id: number;
  chapter_index: number;
  chapter_title: string;
  chapter_text: string;
}

export const BookSearchView: React.FC<BookSearchViewProps> = ({
  onBookSelect,
  onChapterSelect,
  onError,
  t,
}) => {
  const [bookQ, setBookQ] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookResults, setBookResults] = useState<BookData[]>([]);
  const [bookPage, setBookPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
  const [bookChapters, setBookChapters] = useState<ChapterData[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  const handleSearchBooks = async (nextPage?: number) => {
    const hasCriteria = bookQ.trim() || bookTitle.trim() || bookAuthor.trim();
    if (!hasCriteria) return;
    setIsSearchingBooks(true);
    try {
      const res = await bookService.searchBooks({
        q: bookQ,
        title: bookTitle,
        author: bookAuthor,
        page: nextPage || 1,
        per_page: 10
      });
      setBookResults(res.books || []);
      setBookPage(res.page || 1);
      setBookTotalPages(res.total_pages || 1);
      setSelectedBook(null);
      setBookChapters([]);
      setSelectedChapterId(null);
    } catch (e: unknown) {
      const error = e as { message?: string };
      onError(t('common.error'), error.message || t('Arama başarısız'));
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const handleLoadChapters = async (book: BookData) => {
    setSelectedBook(book);
    onBookSelect(book);
    setIsLoadingChapters(true);
    try {
      const list = await bookService.getBookChapters(book.id);
      // Convert BookChapter[] to ChapterData[] format
      const chapters: ChapterData[] = (list || []).map(chapter => ({
        id: chapter.id,
        chapter_index: chapter.chapter_index,
        chapter_title: chapter.chapter_title,
        chapter_text: chapter.chapter_text || '',
      }));
      setBookChapters(chapters);
      // Auto-select first chapter text if available
      if (chapters.length > 0) {
        const first = chapters[0];
        setSelectedChapterId(first.id);
        onChapterSelect(first.id, first.chapter_text || '');
      } else {
        setSelectedChapterId(null);
      }
    } catch (e: unknown) {
      const error = e as { message?: string };
      onError(t('common.error'), error.message || t('Bölümler alınamadı'));
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const handleBackToResults = () => {
    setSelectedBook(null);
    setBookChapters([]);
    setSelectedChapterId(null);
  };

  const handleSelectChapter = (chapter: ChapterData) => {
    setSelectedChapterId(chapter.id);
    onChapterSelect(chapter.id, chapter.chapter_text || '');
  };

  return (
    <View style={styles.inputSection}>
      <Text style={styles.sectionTitle}>{t('create.book.title')}</Text>
      <View style={styles.bookSearchRow}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={[styles.textField]}
          placeholder={t('create.book.inputs.qPlaceholder')}
          value={bookQ}
          onChangeText={setBookQ}
          returnKeyType="search"
          onSubmitEditing={() => handleSearchBooks(1)}
        />
      </View>
      <View style={styles.bookSearchRow}>
        <Icon name="title" size={20} color="#666" />
        <TextInput
          style={[styles.textField]}
          placeholder={t('create.book.inputs.titlePlaceholder')}
          value={bookTitle}
          onChangeText={setBookTitle}
          returnKeyType="search"
          onSubmitEditing={() => handleSearchBooks(1)}
        />
      </View>
      <View style={styles.bookSearchRow}>
        <Icon name="person" size={20} color="#666" />
        <TextInput
          style={[styles.textField]}
          placeholder={t('create.book.inputs.authorPlaceholder')}
          value={bookAuthor}
          onChangeText={setBookAuthor}
          returnKeyType="search"
          onSubmitEditing={() => handleSearchBooks(1)}
        />
      </View>
      <TouchableOpacity
        style={[styles.searchButton, !(bookQ.trim() || bookTitle.trim() || bookAuthor.trim()) && styles.createButtonDisabled]}
        onPress={() => handleSearchBooks(1)}
        disabled={isSearchingBooks || !(bookQ.trim() || bookTitle.trim() || bookAuthor.trim())}
      >
        {isSearchingBooks ? <ActivityIndicator color="white" size="small" /> : (
          <>
            <Icon name="search" size={20} color="#fff" />
            <Text style={styles.createButtonText}>{t('create.book.buttons.search')}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Results */}
      {!selectedBook ? (
        <View style={{ marginTop: 12 }}>
          {bookResults.map((b) => (
            <TouchableOpacity key={b.id} style={styles.bookCard} onPress={() => handleLoadChapters(b)}>
              <View style={{ marginRight: 10 }}><Icon name="menu-book" size={24} color="#3f51b5" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookTitle}>{b.title}</Text>
                <Text style={styles.bookAuthor}>{b.authors}</Text>
              </View>
              <Icon name="chevron-right" size={18} color="#999" />
            </TouchableOpacity>
          ))}
          {bookResults.length === 0 && !isSearchingBooks && (
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>{t('create.book.emptyResults')}</Text>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity onPress={handleBackToResults}>
              <Icon name="arrow-back" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={[styles.bookTitle, { marginLeft: 8 }]} numberOfLines={1}>{selectedBook.title}</Text>
          </View>
          {isLoadingChapters ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {bookChapters.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chapterItem, selectedChapterId === c.id && styles.chapterItemActive]}
                  onPress={() => handleSelectChapter(c)}
                >
                  <View style={styles.chapterIndex}><Text style={styles.chapterIndexText}>{c.chapter_index}</Text></View>
                  <Text style={styles.chapterTitle} numberOfLines={2}>{c.chapter_title}</Text>
                  {selectedChapterId === c.id && <Icon name="check" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
              {bookChapters.length === 0 && (
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>{t('create.book.noChapters')}</Text>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputSection: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 32,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  bookSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  textField: {
    flex: 1,
    fontSize: 15,
    color: COLORS.slate700,
    paddingVertical: 0,
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandTeal,
    padding: 14,
    borderRadius: 16,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.slate200,
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 10,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.brandIndigo,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  bookAuthor: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.brandTeal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
    gap: 12,
  },
  chapterItemActive: {
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    backgroundColor: 'rgba(39, 190, 170, 0.05)',
  },
  chapterIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterIndexText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  chapterTitle: {
    flex: 1,
    fontSize: 14,
    color: COLORS.slate700,
    fontWeight: '600',
  },
});
