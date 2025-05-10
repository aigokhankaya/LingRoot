'use client';
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useTranslation } from '@/lib/i18n';
import { ProcessInputData } from '../lib/api';

type InputType = ProcessInputData['type'];
type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
type Voice = 'en-GB-Wavenet-B' | 'en-US-Wavenet-D' | 'en-US-Wavenet-F';

interface InputSectionProps {
  onSubmit: (data: ProcessInputData) => void;
  isLoading: boolean;
}

export default function InputSection({ onSubmit, isLoading }: InputSectionProps): React.ReactElement {
  const { t } = useTranslation();
  const [inputType, setInputType] = useState<InputType>('text');
  const [text, setText] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [youtubeLink, setYoutubeLink] = useState<string>('');
  const [webLink, setWebLink] = useState<string>('');
  const [spotifyLink, setSpotifyLink] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [bookName, setBookName] = useState<string>('');
  const [bookChapter, setBookChapter] = useState<string>('');
  const [level, setLevel] = useState<Level>('A1');
  const [voice, setVoice] = useState<Voice>('en-GB-Wavenet-B');
  const [speakingRate, setSpeakingRate] = useState<number>(0.8);
  const [pollyVoices, setPollyVoices] = useState<any[]>([]);

  useEffect(() => {
    setSpeakingRate(level === 'A1' ? 0.8 : 1.0);
  }, [level]);

  useEffect(() => {
    const backendUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:5001/api/tts/polly-voices'
      : '/api/tts/polly-voices';
    fetch(backendUrl)
      .then(res => res.json())
      .then(data => setPollyVoices(data.voices || []))
      .catch(() => setPollyVoices([]));
  }, []);

  // Eski handleSubmit diğer input tipleri için
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const inputData: ProcessInputData = {
      type: inputType,
      text: inputType === 'text' ? text : inputType === 'topic' ? topic : undefined,
      input:
        inputType === 'text' ? text :
        inputType === 'topic' ? topic :
        inputType === 'youtube' ? youtubeLink :
        inputType === 'weblink' ? webLink :
        inputType === 'spotify' ? spotifyLink :
        inputType === 'book' ? bookName :
        undefined,
      file: inputType === 'file' ? file || undefined : undefined,
      level,
      SesHızı: speakingRate,
      voice,
      chapter: inputType === 'book' ? bookChapter : undefined,
    };
    onSubmit(inputData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center mb-8">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold mr-4 shadow-lg">
            1
          </span>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
            {t('content_type_and_input')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* İçerik Türü Seçimi */}
          <div className="space-y-4">
            <label className="block text-lg font-semibold text-gray-800">
              {t('content_type')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setInputType('text')}
                className={`icon-button group ${inputType === 'text' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{t('text')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('topic')}
                className={`icon-button group ${inputType === 'topic' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>{t('topic')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('youtube')}
                className={`icon-button group ${inputType === 'youtube' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('youtube')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('weblink')}
                className={`icon-button group ${inputType === 'weblink' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>{t('web_link')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('file')}
                className={`icon-button group ${inputType === 'file' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>{t('document')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('spotify')}
                className={`icon-button group ${inputType === 'spotify' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>{t('spotify')}</span>
              </button>
            </div>
          </div>

          {/* Giriş Alanları */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6 shadow-inner">
            {inputType === 'text' && (
              <div className="space-y-2">
                <label htmlFor="text-input" className="block text-sm font-semibold text-gray-700">
                  {t('enter_your_text')}
                </label>
                <textarea
                  id="text-input"
                  value={text}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                  className="input-field h-32 resize-y focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('enter_text_placeholder')}
                  required
                />
              </div>
            )}

            {inputType === 'topic' && (
              <div className="space-y-2">
                <label htmlFor="topic-input" className="block text-sm font-semibold text-gray-700">
                  {t('enter_topic')}
                </label>
                <input
                  id="topic-input"
                  type="text"
                  value={topic}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
                  className="input-field focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('enter_topic_placeholder')}
                  required
                />
              </div>
            )}

            {inputType === 'youtube' && (
              <div className="space-y-2">
                <label htmlFor="youtube-input" className="block text-sm font-semibold text-gray-700">
                  {t('youtube_link')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="youtube-input"
                    type="url"
                    value={youtubeLink}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setYoutubeLink(e.target.value)}
                    className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                </div>
              </div>
            )}

            {inputType === 'weblink' && (
              <div className="space-y-2">
                <label htmlFor="weblink-input" className="block text-sm font-semibold text-gray-700">
                  {t('web_link')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <input
                    id="weblink-input"
                    type="url"
                    value={webLink}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setWebLink(e.target.value)}
                    className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://ornek.com/makale..."
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">{t('web_link_description')}</p>
              </div>
            )}

            {inputType === 'spotify' && (
              <div className="space-y-2">
                <label htmlFor="spotify-input" className="block text-sm font-semibold text-gray-700">
                  {t('spotify_link')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <input
                    id="spotify-input"
                    type="url"
                    value={spotifyLink}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSpotifyLink(e.target.value)}
                    className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://open.spotify.com/track/... veya /episode/..."
                    required
                  />
                </div>
              </div>
            )}

            {inputType === 'file' && (
              <div className="space-y-2">
                <label htmlFor="file-input" className="block text-sm font-semibold text-gray-700">
                  {t('select_document')}
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-4h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>{t('upload_file')}</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                          accept=".pdf,.doc,.docx,.txt"
                        />
                      </label>
                      <p className="pl-1">{t('or_drag_and_drop')}</p>
                    </div>
                    <p className="text-xs text-gray-500">{t('supported_file_types')}</p>
                  </div>
                </div>
                {file && (
                  <p className="text-sm text-gray-500">
                    {t('selected_file')}: {file.name}
                  </p>
                )}
              </div>
            )}

            {inputType === 'book' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="book-name" className="block text-sm font-semibold text-gray-700">
                    {t('book_name')}
                  </label>
                  <input
                    id="book-name"
                    type="text"
                    value={bookName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setBookName(e.target.value)}
                    className="input-field focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('enter_book_name')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="book-chapter" className="block text-sm font-semibold text-gray-700">
                    {t('book_chapter')}
                  </label>
                  <input
                    id="book-chapter"
                    type="text"
                    value={bookChapter}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setBookChapter(e.target.value)}
                    className="input-field focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('enter_chapter_number')}
                  />
                </div>
              </div>
            )}

            {/* Seviye Seçimi */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('english_level')}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l as Level)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      level === l
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-200 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Ses Hızı Seçici */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('speaking_rate')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0.7, 0.8, 1, 1.2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSpeakingRate(rate)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      speakingRate === rate
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-200 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Ses Seçimi */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('voice_selection')}
              </label>
              <select
                value={voice}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setVoice(e.target.value as any)}
                className="input-field focus:ring-blue-500 focus:border-blue-500"
              >
                {pollyVoices.length > 0 ? (
                  pollyVoices.map((v) => (
                    <option key={v.Id} value={v.Id}>
                      {v.Name} ({v.LanguageName}, {v.Gender})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="en-GB-Wavenet-B">{t('voice_male_uk')}</option>
                    <option value="en-US-Wavenet-D">{t('voice_male_us')}</option>
                    <option value="en-US-Wavenet-F">{t('voice_female_us')}</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Gönder Butonu */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-primary px-8 py-3 text-lg flex items-center space-x-2 ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('processing')}</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('generate_audio')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 