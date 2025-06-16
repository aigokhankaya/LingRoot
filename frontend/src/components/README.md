# SyncedTextPlayer Component

`SyncedTextPlayer` reusable bir React component'idir. Audio oynatırken metni kelime kelime gerçek zamanlı olarak vurgular ve kullanıcıyla etkileşimli özellikler sunar.

## Özellikler

- 🎵 **Gerçek Zamanlı Kelime Vurgulama**: Audio oynatılırken kelimeler otomatik olarak vurgulanır
- ⚡ **Konuşma Hızı Desteği**: Farklı konuşma hızlarını (0.7x - 1.5x) destekler
- 📝 **VTT Subtitle Desteği**: WebVTT dosyalarını okuyup senkronize eder
- 🎯 **Adaptive Learning**: Kullanıcı tıklamalarından öğrenerek timing'i iyileştirir
- 🔄 **Multiple Timing Methods**: VTT, Backend Timepoints, Adaptive, Linear
- 🎮 **Interactive Controls**: Kelimeye tıklayarak o zamana atlama
- 📊 **Debug Information**: Development modunda detaylı bilgiler

## Kullanım

```tsx
import SyncedTextPlayer from '../src/components/SyncedTextPlayer';

<SyncedTextPlayer
  audioUrl="https://example.com/audio.mp3"
  vttUrl="https://example.com/subtitles.vtt" // Opsiyonel
  words={["Hello", "world", "this", "is", "a", "test"]}
  timepoints={[
    { timeSeconds: 0.0 },
    { timeSeconds: 0.5 },
    { timeSeconds: 1.0 },
    { timeSeconds: 1.5 },
    { timeSeconds: 2.0 },
    { timeSeconds: 2.5 }
  ]}
  originalText="Hello world this is a test"
  speakingRate={1.0}
  className="my-custom-class"
  showControls={true}
  autoHighlight={true}
/>
```

## Props

| Prop | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|-----------|
| `audioUrl` | string | ✅ | - | Oynatılacak audio dosyasının URL'i |
| `vttUrl` | string | ❌ | undefined | VTT subtitle dosyasının URL'i |
| `words` | string[] | ✅ | - | Kelime listesi |
| `timepoints` | Timepoint[] | ✅ | - | Kelime zamanlamaları |
| `originalText` | string | ✅ | - | Tam metin içeriği |
| `speakingRate` | number | ❌ | 1.0 | Konuşma hızı (0.25-4.0) |
| `className` | string | ❌ | '' | Ek CSS sınıfları |
| `showControls` | boolean | ❌ | true | Audio kontrollerini göster/gizle |
| `autoHighlight` | boolean | ❌ | true | Otomatik kelime vurgulamayı aç/kapat |

## Timepoint Interface

```tsx
interface Timepoint {
  timeSeconds: number;
}
```

## Timing Methods

Component otomatik olarak en iyi timing metodunu seçer:

1. **VTT Priority**: VTT dosyası varsa öncelikle onu kullanır
2. **Backend Timepoints**: Backend'den gelen gerçek timing verilerini kullanır
3. **Adaptive Mode**: Kullanıcı etkileşimlerinden öğrenerek timing'i iyileştirir
4. **Linear Mode**: Eşit dağıtım ile varsayılan timing

## Visual States

- 🟡 **Sarı**: Şu an okunmakta olan kelime
- 🟢 **Yeşil**: Daha önce okunmuş kelimeler
- ⚪ **Gri**: Henüz okunmamış kelimeler

## Keyboard & Mouse Events

- **Kelimeye tıklama**: O kelimenin zamanına atlar
- **Play/Pause**: Audio kontrolü
- **Seek**: Zaman çubuğu ile atlama
- **Adaptive Toggle**: Linear/Adaptive mode değiştirme

## Real-World Example

Welcome sayfasından gelen TTS response'u ile kullanım:

```tsx
// Backend'den gelen response
const audioResult = {
  message: "This is an English text adapted for A1 level learners.",
  mp3_url: "/api/tts/audio/12345",
  vtt_url: "/api/tts/vtt/12345",
  words: ["This", "is", "an", "English", "text", "adapted", "for", "A1", "level", "learners."],
  timepoints: [
    { timeSeconds: 0.0 },
    { timeSeconds: 0.4 },
    // ... daha fazla timing
  ],
  speaking_rate: 0.8, // Welcome sayfasından seçilen hız
  original_turkish: "Bu A1 seviyesi öğrenciler için uyarlanmış bir İngilizce metindir."
};

// Component kullanımı
<SyncedTextPlayer
  audioUrl={convertToPlayableUrl(audioResult.mp3_url)}
  vttUrl={convertToPlayableUrl(audioResult.vtt_url)}
  words={audioResult.words}
  timepoints={audioResult.timepoints}
  originalText={audioResult.message}
  speakingRate={audioResult.speaking_rate}
  showControls={true}
  autoHighlight={true}
/>
```

## Backend Integration

Component, backend TTS sisteminden dönen speaking_rate değerini kullanarak:

1. Konuşma hızına göre timing hesaplamaları yapar
2. Adaptive learning'de hız faktörünü dikkate alır
3. VTT timing'lerini gerçek hıza göre ölçekler
4. Visual feedback'te hız bilgisini gösterir

## Performance

- 60 FPS `requestAnimationFrame` ile smooth tracking
- Memory-efficient VTT parsing
- Optimized word matching with tolerance
- Lazy loading ve cleanup

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- HTML5 Audio API support
- ES6+ features
- TypeScript support

## Test

Test sayfası: `/test-synced-player`

Bu sayfada farklı ayarlarla component'i test edebilirsiniz. 