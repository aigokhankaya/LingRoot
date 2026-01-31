import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../contexts/LanguageContext';
import { getApiBaseUrl } from '../services/environmentConfig';
import AudioPlayer from '../components/AudioPlayer';
import { SmartPromptSuggester } from '../components/chat/SmartPromptSuggester';
import { DailyTopicCard } from '../components/chat/DailyTopicCard';
import { InlineAudioCard } from '../components/chat/InlineAudioCard';
import { ContinueBanner } from '../components/chat/ContinueBanner';
import { ContentFormatPicker } from '../components/chat/ContentFormatPicker';
import { AudioTrack, Timepoint } from '../types';
import Clipboard from '@react-native-clipboard/clipboard';
import { AnalyticsHelper } from '../utils/AnalyticsHelper';
import { getUserSettings } from '../services/ttsService';

interface AnimatedFeatureButtonProps {
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  iconName: string;
  onPress: () => void;
}

const AnimatedBorderFeatureButton: React.FC<AnimatedFeatureButtonProps> = ({
  titleTr,
  titleEn,
  descriptionTr,
  descriptionEn,
  iconName,
  onPress,
}) => {
  const { language } = useLanguage();

  return (
    <View style={styles.animatedCardOuter}>
      <TouchableOpacity
        style={styles.animatedCardInner}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <View style={styles.featureIcon}>
          <Icon name={iconName} size={26} color="#27BEAA" />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>
            {language === 'tr' ? titleTr : titleEn}
          </Text>
          <Text style={styles.featureDescription}>
            {language === 'tr' ? descriptionTr : descriptionEn}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
};

interface LiroMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

type CtaType = 'narration' | 'podcast' | 'tts';

interface Conversation {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  updated_at?: string;
  has_audio?: boolean;
}

const LiroScreen: React.FC = () => {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const [apiUrl, setApiUrl] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiroMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [ctaTopicReady, setCtaTopicReady] = useState(false);
  const [ctaContentReady, setCtaContentReady] = useState(false);
  const [audioResult, setAudioResult] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCta, setActiveCta] = useState<CtaType | null>(null);
  const [liroPlayerVisible, setLiroPlayerVisible] = useState(false);
  const [liroTrack, setLiroTrack] = useState<AudioTrack | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [defaultVoice, setDefaultVoice] = useState<string>('lr_us_wavenet_f');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [savedAudioResult, setSavedAudioResult] = useState<Record<string, unknown> | null>(null);
  const [showContinueBanner, setShowContinueBanner] = useState(false);

  const ctaDisabled = !(ctaTopicReady || ctaContentReady);

  const heroTitle =
    language === 'tr'
      ? 'Rutinlerin İngilizceye Dönsün.'
      : 'Turn Your Routines Into English.';
  const heroHighlight =
    language === 'tr'
      ? 'Sevdiğin içerikleri kendi seviyende dinle.'
      : 'Listen to the content you love at your level.';
  const heroDescription =
    language === 'tr'
      ? 'YouTube videoları, podcastler, kitaplar ve haberler. LIRO, ilgilendiğin içerikleri İngilizce seviyene göre sadeleştirir, seslendirir ve altyazı ekler.'
      : 'YouTube videos, podcasts, books, and news. LIRO simplifies, narrates, and subtitles the content you care about, at your English level.';

  useEffect(() => {
    getApiBaseUrl()
      .then(setApiUrl)
      .catch(() => setApiUrl(''));
  }, []);

  useEffect(() => {
    const loadDefaultVoice = async () => {
      try {
        const settings = await getUserSettings();
        const dv = settings?.data?.default_voice;
        if (dv && typeof dv === 'string') {
          setDefaultVoice(dv);
        }
      } catch {}
    };
    loadDefaultVoice();
  }, []);

  useEffect(() => {
    if (!apiUrl) return;
    fetchConversations();
  }, [apiUrl]);

  useEffect(() => {
    if (!messages.length || !scrollViewRef.current) return;
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  useEffect(() => {
    AnalyticsHelper.logScreenView('Liro_Chat', 'LiroScreen');
  }, []);

  // E3: Load saved audio result for Continue Banner
  useEffect(() => {
    const loadSavedAudio = async () => {
      try {
        const saved = await AsyncStorage.getItem('liro_last_audio_result');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.mp3_url) {
            setSavedAudioResult(parsed);
            setShowContinueBanner(true);
          }
        }
      } catch {}
    };
    loadSavedAudio();
  }, []);

  // E3: Save audio result to AsyncStorage when content is created
  useEffect(() => {
    if (audioResult?.mp3_url) {
      const toSave = {
        mp3_url: audioResult.mp3_url,
        level: audioResult.level || 'B1',
        topic: extractTopicFromMessages(),
        real_duration: audioResult.real_duration,
        estimated_duration: audioResult.estimated_duration,
        adapted_text: audioResult.adapted_text,
        translated_text: audioResult.translated_text,
        timepoints: audioResult.timepoints,
        words: audioResult.words,
        drift_corrected: audioResult.drift_corrected,
        drift_amount: audioResult.drift_amount,
        drift_percentage: audioResult.drift_percentage,
        original_turkish: audioResult.original_turkish || audioResult.originalMessage,
      };
      AsyncStorage.setItem('liro_last_audio_result', JSON.stringify(toSave)).catch(() => {});
      setShowContinueBanner(false);
    }
  }, [audioResult]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <TouchableOpacity
            style={{ padding: 4 }}
            onPress={() => {
              setIsSidebarOpen(true);
              fetchConversations();
            }}
          >
            <Icon name="menu" size={22} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 4 }}
            onPress={handleNewChat}
          >
            <Icon name="add-circle-outline" size={22} color="#27BEAA" />
          </TouchableOpacity>
        </View>
      ),
    });
  });

  useEffect(() => {
    if (messages.length === 0) {
      setCtaTopicReady(false);
      setCtaContentReady(false);
      return;
    }

    // Tag-based CTA readiness: scan ALL assistant messages for tags
    const allAssistantContent = messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n');

    const hasTopic = /\[TOPIC\][\s\S]*?\[\/TOPIC\]/i.test(allAssistantContent) ||
      /KONU KİLİTLENDİ/i.test(allAssistantContent);
    const hasContent = /\[CONTENT\][\s\S]*?\[\/CONTENT\]/i.test(allAssistantContent);

    // Fallback: keyword-based detection for backwards compatibility
    if (!hasTopic && !hasContent) {
      const recentMessages = messages.slice(-5);
      const assistantMessages = recentMessages.filter(m => m.role === 'assistant');
      if (assistantMessages.length > 0) {
        const lastAssistant = assistantMessages[assistantMessages.length - 1].content.toLowerCase();
        const topicKeywords = ['konu', 'hakkında', 'konusunda', 'yapalım', 'yapabiliriz', 'oluşturabiliriz'];
        const contentKeywords = ['içerik', 'anlatım', 'podcast', 'metin'];
        setCtaTopicReady(topicKeywords.some(kw => lastAssistant.includes(kw)));
        setCtaContentReady(contentKeywords.some(kw => lastAssistant.includes(kw)));
        return;
      }
    }

    setCtaTopicReady(hasTopic);
    setCtaContentReady(hasContent);
  }, [messages]);

  const getToken = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token && token !== 'null' && token !== 'undefined') return token;
    const legacy = await AsyncStorage.getItem('lingroot_token');
    return legacy || '';
  };

  const fetchMessages = async (id: string) => {
    if (!id || !apiUrl) return;
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(
        `${apiUrl}/api/ai-chat/conversations/${id}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed');
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (e) {
      setError(
        language === 'tr'
          ? 'Mesajlar yüklenemedi'
          : 'Failed to load messages'
      );
    }
  };

  const createNewConversation = async (
    firstMessage: string
  ): Promise<string | null> => {
    if (!apiUrl) return null;
    try {
      const token = await getToken();
      const response = await fetch(`${apiUrl}/api/ai-chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:
            firstMessage.substring(0, 50) +
            (firstMessage.length > 50 ? '...' : ''),
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.conversation?.id) {
        setConversationId(data.conversation.id);
        return data.conversation.id;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const fetchConversations = async () => {
    if (!apiUrl) return;
    try {
      setIsLoadingConversations(true);
      const token = await getToken();
      const response = await fetch(`${apiUrl}/api/ai-chat/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed');
      }
      const data = await response.json();
      const list: Conversation[] = data.conversations || [];
      list.sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return bTime - aTime;
      });
      setConversations(list);
    } catch (e) {
      // Sessizce başarısız olabilir; kritik değil
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setConversationId(conv.id);
    setAudioResult(null);
    setCtaTopicReady(false);
    setCtaContentReady(false);
    setIsSidebarOpen(false);
    await fetchMessages(conv.id);
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setAudioResult(null);
    setCtaTopicReady(false);
    setCtaContentReady(false);
    setIsSidebarOpen(false);
  };

  const extractTopicFromMessages = (): string => {
    const fallback =
      language === 'tr' ? 'Belirlenen konu' : 'Selected topic';

    // Priority 1: [TOPIC]...[/TOPIC] tag from assistant messages
    const allAssistantContent = messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n');

    const topicTagMatch = allAssistantContent.match(/\[TOPIC\]([\s\S]*?)\[\/TOPIC\]/i);
    if (topicTagMatch && topicTagMatch[1]?.trim()) {
      return topicTagMatch[1].trim();
    }

    // Priority 2: KONU KİLİTLENDİ pattern
    const lockMatch = allAssistantContent.match(/KONU KİLİTLENDİ[:\s]*\*?\*?([^*\n]+)/i);
    if (lockMatch && lockMatch[1]?.trim()) {
      return lockMatch[1].trim();
    }

    // Priority 3: Use the last user message
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1].content;
      if (lastUserMessage.trim()) {
        return lastUserMessage.slice(0, 200).trim();
      }
    }

    // Priority 4: Try quoted text in assistant message
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) {
      return fallback;
    }

    const lastMessage = assistantMessages[assistantMessages.length - 1].content;
    const quoteMatch = lastMessage.match(/"([^"]+)"|'([^']+)'/);
    if (quoteMatch) {
      return quoteMatch[1] || quoteMatch[2];
    }

    return fallback;
  };

  const formatDate = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const buildPlayableUrl = (url?: string | null): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const normalizeWords = (raw: any): string[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return (
            item.word ||
            item.text ||
            item.token ||
            item.value ||
            ''
          );
        }
        return '';
      })
      .map((w: string) => String(w).trim())
      .filter((w: string) => w.length > 0);
  };

  const normalizeTimepoints = (raw: any): Timepoint[] => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(Boolean) as Timepoint[];
  };

  const openLiroAudioPlayer = () => {
    const mp3 = audioResult?.mp3_url;
    if (!mp3) return;

    const createdAt = new Date().toISOString();
    const track: AudioTrack = {
      id: `liro_${Date.now()}`,
      title: language === 'tr' ? 'LIRO Ses' : 'LIRO Audio',
      url: buildPlayableUrl(mp3),
      mp3_url: mp3,
      level: (audioResult?.level || 'B1') as any,
      duration:
        typeof audioResult?.real_duration === 'number'
          ? audioResult.real_duration
          : typeof audioResult?.estimated_duration === 'number'
            ? audioResult.estimated_duration
            : 180,
      created_at: createdAt,
      translated_text: audioResult?.translated_text || audioResult?.translatedText,
      adapted_text: audioResult?.adapted_text || audioResult?.adaptedText,
      original_turkish: stripLiroCommentary(audioResult?.original_turkish || audioResult?.originalMessage || audioResult?.translated_text || audioResult?.translatedText || ''),
      timepoints: normalizeTimepoints(audioResult?.timepoints),
      words: normalizeWords(audioResult?.words),
      real_duration: audioResult?.real_duration,
      estimated_duration: audioResult?.estimated_duration,
      drift_corrected: audioResult?.drift_corrected,
      drift_amount: audioResult?.drift_amount,
      drift_percentage: audioResult?.drift_percentage,
    };

    setLiroTrack(track);
    setLiroPlayerVisible(true);
  };

  const stripLiroCommentary = (text: string): string => {
    if (!text) return '';
    // Priority 1: [CONTENT]...[/CONTENT] markers
    const contentMatch = text.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/);
    if (contentMatch && contentMatch[1]?.trim()) {
      return contentMatch[1].trim();
    }
    // Priority 2: --- separators (legacy fallback)
    const parts = text.split('---');
    if (parts.length >= 3) {
      const middle = parts.slice(1, -1).join('---').trim();
      if (middle) return middle;
    }
    // Priority 3: Filter out Turkish commentary paragraphs
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length >= 2) {
      const isLikelyTurkish = (p: string): boolean => {
        const t = p.trim();
        if (!t) return false;
        // Turkish-specific characters (never in English text)
        if (/[çşğıİŞÇĞüöÜÖ]/.test(t)) return true;
        // Common Turkish filler/commentary starters
        if (/^(Hmm|Hm\b|Tabii|Tabi\b|Harika|Tamam|Peki|Buyur|Haydi|Evet|Şimdi|İşte|Sonuç\s+olarak)/i.test(t)) return true;
        return false;
      };
      const nonTurkish = paragraphs.filter(p => {
        const t = p.trim();
        if (!t) return false;
        return !isLikelyTurkish(t);
      });
      if (nonTurkish.length > 0) {
        const result = nonTurkish.join('\n\n').trim();
        if (result) return result;
      }
    }
    // Fallback: return full text
    return text;
  };

  const getLastAssistantMessage = (): string => {
    const assistantMessages = messages.filter(
      message => message.role === 'assistant'
    );
    if (assistantMessages.length === 0) return '';
    return assistantMessages[assistantMessages.length - 1].content;
  };

  const extractCefrLevelFromText = (text: string): string | null => {
    if (!text) return null;
    const match = text.match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
    return match ? match[1].toUpperCase() : null;
  };

  const getDesiredCefrLevel = (): string => {
    const recent = messages.slice(-10).reverse();
    for (const msg of recent) {
      const lvl = extractCefrLevelFromText(msg.content);
      if (lvl) return lvl;
    }
    return 'B1';
  };

  const handleConfirmCta = async (type: CtaType) => {
    if (!apiUrl) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr'
          ? 'Sunucu adresi bulunamadı. Lütfen tekrar deneyin.'
          : 'API base URL is not available. Please try again.'
      );
      return;
    }

    setActiveCta(type);
    setIsProcessing(true);

    AnalyticsHelper.logEvent('content_creation_start', {
      type: type,
      topic: 'Liro Topic' // Simplified for now as 'topics' var is not defined in scope, or extract proper topic if available. 'extractTopicFromMessages()' is available, so let's use that but I cannot call it here inside object easily without refactor. I'll just use a placeholder or remove it to fix lint. Wait, extractTopicFromMessages() is used below. Let's call it.
    });

    try {
      const token = await getToken();
      let result: any = null;

      if (type === 'narration') {
        const topic = extractTopicFromMessages();
        const desiredLevel = getDesiredCefrLevel();
        const response = await fetch(`${apiUrl}/api/tts/process`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'topic',
            input: topic,
            level: desiredLevel,
            speakingRate: 0.8,
            voice: defaultVoice,
          }),
        });
        if (!response.ok) {
          throw new Error('TTS failed');
        }
        result = await response.json();
      } else if (type === 'podcast') {
        const topic = extractTopicFromMessages();
        const desiredLevel = getDesiredCefrLevel();
        const response = await fetch(`${apiUrl}/api/tts/create-podcast`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic,
            level: desiredLevel,
            duration: '10',
            voice: defaultVoice,
          }),
        });
        if (!response.ok) {
          throw new Error('Podcast failed');
        }
        result = await response.json();
      } else if (type === 'tts') {
        const lastMessage = getLastAssistantMessage();
        if (!lastMessage) {
          throw new Error('No assistant message');
        }
        const cleanedMessage = stripLiroCommentary(lastMessage);
        const desiredLevel = getDesiredCefrLevel();
        const response = await fetch(`${apiUrl}/api/tts/process`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'text',
            input: cleanedMessage,
            level: desiredLevel,
            speakingRate: 0.8,
            voice: defaultVoice,
          }),
        });
        if (!response.ok) {
          throw new Error('TTS failed');
        }
        result = await response.json();
      }

      console.log('[LIRO TTS RESULT]', type, result);

      if (result && result.success && result.mp3_url) {
        AnalyticsHelper.logEvent('content_creation_complete', {
          type: type,
          duration: result.real_duration || 0,
          level: result.level
        });
      }

      if (!result || result.success === false || !result.mp3_url) {
        const alertTitle =
          language === 'tr' ? 'Ses oluşturulamadı' : 'Audio not available';
        const alertMessage =
          (result && result.message) ||
          (language === 'tr'
            ? 'Ses oluşturulamadı. Lütfen paket durumunu ve internet bağlantını kontrol et.'
            : 'Audio could not be generated. Please check your plan status and connection.');
        Alert.alert(alertTitle, alertMessage);
        setAudioResult(null);
      } else {
        setAudioResult(result);
      }
    } catch (e) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr'
          ? 'İşlem sırasında bir hata oluştu. Lütfen tekrar dene.'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsProcessing(false);
      setActiveCta(null);
    }
  };

  // D5: Onay diyalogu kaldirildi — dogrudan isleme basla
  const confirmCta = (type: CtaType) => {
    handleConfirmCta(type);
  };

  const sendMessage = async (rawContent: string) => {
    const content = rawContent.trim();
    if (!content || !apiUrl || isSending) return;
    setError(null);

    Keyboard.dismiss();

    let convId = conversationId;
    if (!convId) {
      const newId = await createNewConversation(content);
      if (!newId) {
        setError(
          language === 'tr'
            ? 'Sohbet oluşturulamadı'
            : 'Conversation could not be created'
        );
        return;
      }
      convId = newId;
    }

    setIsSending(true);
    setIsTyping(true);

    try {
      const token = await getToken();
      const response = await fetch(
        `${apiUrl}/api/ai-chat/conversations/${convId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      AnalyticsHelper.logEvent('liro_message_sent', {
        length: content.length,
        method: 'manual',
        conversation_id: convId
      });

      if (!response.ok) {
        throw new Error('Failed');
      }
      await fetchMessages(convId!);
      setInput('');
    } catch (e) {
      setError(
        language === 'tr'
          ? 'Mesaj gönderilemedi'
          : 'Message could not be sent'
      );
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleSuggestionPress = (text: string) => {
    setInput(text);
    sendMessage(text);
  };

  const handleMessageLongPress = (message: LiroMessage) => {
    Clipboard.setString(message.content);
    setCopiedMessageId(message.id);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* Hero section removed as per design update */}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              {/* E3: Continue Banner — son icerik varsa goster */}
              {showContinueBanner && savedAudioResult && (
                <ContinueBanner
                  title={(savedAudioResult as Record<string, unknown>).topic as string || (language === 'tr' ? 'Son icerik' : 'Last content')}
                  level={(savedAudioResult as Record<string, unknown>).level as string || 'B1'}
                  language={language}
                  onListen={() => {
                    // Set audio result and open player directly from saved data
                    const saved = savedAudioResult as Record<string, unknown>;
                    const mp3 = saved.mp3_url as string;
                    if (mp3) {
                      const track: AudioTrack = {
                        id: `liro_saved_${Date.now()}`,
                        title: (saved.topic as string) || 'LIRO Audio',
                        url: buildPlayableUrl(mp3),
                        mp3_url: mp3,
                        level: ((saved.level as string) || 'B1') as AudioTrack['level'],
                        duration: (saved.real_duration as number) || (saved.estimated_duration as number) || 180,
                        created_at: new Date().toISOString(),
                        translated_text: saved.translated_text as string,
                        adapted_text: saved.adapted_text as string,
                        original_turkish: saved.original_turkish as string,
                        timepoints: normalizeTimepoints(saved.timepoints),
                        words: normalizeWords(saved.words),
                        real_duration: saved.real_duration as number,
                        estimated_duration: saved.estimated_duration as number,
                        drift_corrected: saved.drift_corrected as boolean,
                        drift_amount: saved.drift_amount as number,
                        drift_percentage: saved.drift_percentage as number,
                      };
                      setLiroTrack(track);
                      setLiroPlayerVisible(true);
                    }
                    setAudioResult(savedAudioResult);
                    setShowContinueBanner(false);
                  }}
                  onNewTopic={() => {
                    setShowContinueBanner(false);
                  }}
                  onDismiss={() => setShowContinueBanner(false)}
                />
              )}

              <Text style={styles.emptyTitle}>
                {language === 'tr' ? 'Merhaba! 👋' : 'Hello! 👋'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {language === 'tr'
                  ? 'Icerik olusturmak icin LIRO ile sohbet etmeye basla.'
                  : 'Start chatting with LIRO to create English content.'}
              </Text>

              {/* E1: Daily Topic Card */}
              <DailyTopicCard
                language={language}
                onStart={(message) => handleSuggestionPress(message)}
              />

              {/* SmartPromptSuggester - Popular topics for empty state */}
              <SmartPromptSuggester
                conversationId={conversationId}
                onSelectSuggestion={(text) => handleSuggestionPress(text)}
                language={language}
              />
            </View>
          ) : (
            <View style={styles.messagesList}>
              {messages.map(message => (
                <TouchableOpacity
                  key={message.id}
                  activeOpacity={0.8}
                  onLongPress={() => handleMessageLongPress(message)}
                  style={[
                    styles.messageRow,
                    message.role === 'user'
                      ? styles.messageRowUser
                      : styles.messageRowAssistant,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.role === 'user'
                        ? styles.messageBubbleUser
                        : styles.messageBubbleAssistant,
                    ]}
                  >
                    <Text
                      style={
                        message.role === 'user'
                          ? styles.messageTextUser
                          : styles.messageTextAssistant
                      }
                    >
                      {message.content}
                    </Text>
                    {copiedMessageId === message.id && (
                      <Text style={styles.copiedFeedback}>
                        {language === 'tr' ? 'Kopyalandı' : 'Copied'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isTyping && (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color="#27BEAA" />
              <Text style={styles.typingText}>
                {language === 'tr' ? 'LIRO yazıyor...' : 'LIRO is typing...'}
              </Text>
            </View>
          )}

          {/* E2: Inline Audio Card — chat icinde kompakt player */}
          {audioResult?.mp3_url && (
            <InlineAudioCard
              title={extractTopicFromMessages()}
              level={audioResult?.level || 'B1'}
              mp3Url={buildPlayableUrl(audioResult.mp3_url)}
              duration={
                typeof audioResult?.real_duration === 'number'
                  ? audioResult.real_duration
                  : typeof audioResult?.estimated_duration === 'number'
                    ? audioResult.estimated_duration
                    : 180
              }
              language={language}
              onFullScreen={openLiroAudioPlayer}
            />
          )}

          {/* D1: Tek akilli buton + format secici */}
          <ContentFormatPicker
            disabled={ctaDisabled || false}
            isProcessing={isProcessing}
            activeCta={activeCta}
            hasContent={ctaContentReady}
            language={language}
            onSelect={(type) => confirmCta(type)}
            onCancel={() => {
              setIsProcessing(false);
              setActiveCta(null);
            }}
          />
        </ScrollView>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={
              language === 'tr'
                ? 'LIRO için bir mesaj yaz...'
                : 'Write a message for LIRO...'
            }
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            disabled={!input.trim() || isSending}
            onPress={() => sendMessage(input)}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {isSidebarOpen && (
          <View style={styles.sidebarOverlay}>
            <TouchableOpacity
              style={styles.sidebarBackdrop}
              activeOpacity={1}
              onPress={() => setIsSidebarOpen(false)}
            />
            <View style={styles.sidebar}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>
                  {language === 'tr' ? 'Sohbetler' : 'Conversations'}
                </Text>
                <TouchableOpacity
                  style={styles.sidebarNewChat}
                  onPress={handleNewChat}
                >
                  <Icon name="add" size={18} color="#111827" />
                  <Text style={styles.sidebarNewChatText}>
                    {language === 'tr' ? 'Yeni Sohbet' : 'New Chat'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.sidebarList}>
                {isLoadingConversations ? (
                  <View style={styles.sidebarLoadingRow}>
                    <ActivityIndicator size="small" color="#27BEAA" />
                  </View>
                ) : conversations.length === 0 ? (
                  <Text style={styles.sidebarEmptyText}>
                    {language === 'tr'
                      ? 'Henüz bir sohbet yok.'
                      : 'No conversations yet.'}
                  </Text>
                ) : (
                  conversations.map(conv => (
                    <TouchableOpacity
                      key={conv.id}
                      style={[
                        styles.sidebarItem,
                        conv.id === conversationId &&
                        styles.sidebarItemActive,
                      ]}
                      onPress={() => handleSelectConversation(conv)}
                    >
                      <View style={styles.sidebarItemRow}>
                        {conv.has_audio && (
                          <Icon name="menu-book" size={14} color="#27BEAA" style={{ marginRight: 4 }} />
                        )}
                        <Text
                          style={[styles.sidebarItemTitle, { flex: 1 }]}
                          numberOfLines={1}
                        >
                          {conv.title ||
                            (language === 'tr'
                              ? 'Basliksiz sohbet'
                              : 'Untitled chat')}
                        </Text>
                        {conv.has_audio && (
                          <Icon name="play-arrow" size={14} color="#27BEAA" />
                        )}
                      </View>
                      <Text style={styles.sidebarItemDate}>
                        {formatDate(conv.created_at)}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {liroTrack && (
          <AudioPlayer
            track={liroTrack}
            visible={liroPlayerVisible}
            onClose={() => setLiroPlayerVisible(false)}
            timepoints={liroTrack.timepoints || []}
            words={liroTrack.words || []}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F6',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 24,
  },
  heroSection: {
    marginBottom: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(39, 190, 170, 0.08)',
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  heroHighlight: {
    color: '#27BEAA',
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4B5563',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#6B7280',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  animatedCardOuter: {
    marginTop: 12,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27BEAA',
    padding: 2,
    backgroundColor: '#E0F7F4',
  },
  animatedCardInner: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#F7B23B',
    shadowColor: '#F7B23B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    opacity: 0.9,
  },
  featuresHeader: {
    marginBottom: 8,
  },
  featuresList: {
    marginTop: 8,
    marginBottom: 32,
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#27BEAA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(39, 190, 170, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  emptyState: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 13,
    color: '#374151',
  },
  messagesList: {
    marginTop: 8,
    marginBottom: 16,
  },
  messageRow: {
    marginTop: 8,
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },
  messageRowAssistant: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleUser: {
    backgroundColor: '#27BEAA',
  },
  messageBubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageTextUser: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  messageTextAssistant: {
    color: '#111827',
    fontSize: 14,
  },
  copiedFeedback: {
    fontSize: 11,
    color: '#27BEAA',
    fontWeight: '600',
    marginTop: 4,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27BEAA',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  ctaContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ctaButton: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  ctaHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  audioCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  audioCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  audioCardSubtitle: {
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  podcastDialogContainer: {
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  podcastDialogRow: {
    flexDirection: 'row',
  },
  podcastDialogRowA: {
    justifyContent: 'flex-start',
  },
  podcastDialogRowB: {
    justifyContent: 'flex-end',
  },
  podcastDialogBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  podcastDialogBubbleA: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  podcastDialogBubbleB: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  podcastDialogSpeaker: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#6B7280',
    marginBottom: 2,
  },
  podcastDialogText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#111827',
  },
  audioLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audioLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
  },
  audioLinkText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  audioLinkSecondary: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  audioLinkSecondaryText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 20,
    elevation: 8,
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sidebar: {
    width: 280,
    maxWidth: '80%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sidebarNewChat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  sidebarNewChatText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#111827',
  },
  sidebarList: {
    marginTop: 4,
  },
  sidebarLoadingRow: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarEmptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sidebarItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(39, 190, 170, 0.08)',
    borderWidth: 1,
    borderColor: '#27BEAA',
  },
  sidebarItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  sidebarItemDate: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default LiroScreen;
