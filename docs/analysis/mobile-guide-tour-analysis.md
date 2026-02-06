# Mobile Guide Tour / Onboarding Analizi

> **Created:** 2026-02-02 | **Updated:** 2026-02-02 | **Version:** 1.0

## Amac

Mobil uygulamayi ilk kez yukleyen kullanicilara Home ekranindaki ozellikleri (Text to Speech, Podcast, Konu Agaci vb.) ogretecek bir guide tour sistemi secmek.

## Mevcut Durum

- Mobilde herhangi bir onboarding/tour mekanizmasi **yok**.
- Frontend'de `OnboardingFlow` (gamification) var ama mobilde karsiligi yok.
- HomeScreen'de 6 feature card var: Metin Seslendirme, Dosya Yukle, Podcast, Konu Agacim, Kelime Dagarcigi, Kitap Ara.
- Proje: React Native 0.79.5 (bare workflow, expo-modules-core mevcut).

---

## 3 Yontem Analizi

### 1. react-native-copilot — Spotlight Overlay Tour

| | |
|---|---|
| **GitHub** | [mohebifar/react-native-copilot](https://github.com/mohebifar/react-native-copilot) |
| **Stars** | ~2,400 |
| **Haftalik indirme** | ~8,700 |
| **Son versiyon** | v3.3.3 (aktif bakimda) |
| **Lisans** | MIT |
| **Expo uyumu** | Tam uyumlu |
| **RN New Arch** | v3.0+ ile uyumlu |

**Nasil calisir:**
- Uygulamanin root'unu `<CopilotProvider>` ile sarar.
- Tour'da gosterilecek elemanlar `<CopilotStep>` + `walkthroughable()` HOC ile isaretlenir.
- Ekranin geri kalani karartilir (overlay), sadece hedef eleman spotlight ile aydinlatilir.
- Altta/ustte tooltip baloncugu cikar — aciklama metni + "Ileri/Geri/Bitir" butonlari.
- SVG veya View tabanli iki overlay modu var. SVG modu daha akici animasyon saglar (`react-native-svg` bagimli).

**Avantajlari:**
- Hazir multi-step tour framework: Adim siralama, navigasyon, ilerleme gostergesi dahil.
- Tooltip ve step number bilesenlerini tamamen ozellestirme imkani.
- ScrollView icindeki elemanlara da spotlight atabilir.
- Tum tour akisini `useCopilot()` hook ile kontrol edebilirsin (start, stop, goToStep).

**Dezavantajlari:**
- 100 acik issue (cogu eski, ama bakilmamis bazilari var).
- SVG overlay icin `react-native-svg` ek bagimliligi (projede zaten var).
- Tour adim sayisi artinca performans dikkatli yonetilmeli.

**LingRoot uyumu:**
- HomeScreen'deki her feature card'a `<CopilotStep order={1} text="...">` sarmak yeterli.
- Mevcut `react-native-svg` bagimliligini kullaniyor (ek kurulum yok).
- Expo modulleri ile uyumlu.

**Ornek kullanim:**
```tsx
<CopilotStep order={1} name="tts" text="Metni yazip seslendirme olustur">
  <WalkthroughableView>
    <FeatureCard title="Metin Seslendirme" />
  </WalkthroughableView>
</CopilotStep>
```

---

### 2. react-native-spotlight-tour — Animasyonlu Spotlight

| | |
|---|---|
| **GitHub** | [stackbuilders/react-native-spotlight-tour](https://github.com/stackbuilders/react-native-spotlight-tour) |
| **Stars** | ~468 |
| **Haftalik indirme** | ~2,000 |
| **Son versiyon** | v3.x (paket adi degisti: `react-native-spotlight-tour`) |
| **Lisans** | MIT |
| **Platform** | iOS + Android + Web |
| **Bagimliliklari** | `react-native-svg`, `@floating-ui/react-native` |

**Nasil calisir:**
- `<SpotlightTourProvider>` ile root sarilir, `steps` array'i verilir.
- Her adim bir `<AttachStep>` bilesenine baglanir — hedef eleman ref ile isaretlenir.
- Spotlight dairesel veya dikdortgen kesme ile ekrani karartir.
- Tooltip pozisyonlama Floating UI kutuphanesiyle yapilir (akilli pozisyonlama).
- 4 animasyon modu: bounce, fade, slide, rectangle morph.

**Avantajlari:**
- En akici animasyonlar (native-level, 60fps).
- Floating UI sayesinde tooltip hicbir zaman ekran disina tasmaz.
- `TourBox` hazir tooltip container bilesenini ozellestirme destegi.
- Web platformunu da destekler (gelecekte web guide tour eklenirse kodun bir kismi yeniden kullanilabilir).
- Temiz, modern API tasarimi.

**Dezavantajlari:**
- Copilot'a gore daha kucuk topluluk (~468 star).
- `@floating-ui/react-native` ek bagimliligi (projede yok, eklenmesi gerekir).
- Dokumantasyon Copilot kadar kapsamli degil.
- 23 acik issue.

**LingRoot uyumu:**
- `react-native-svg` zaten var, ama `@floating-ui/react-native` eklenmeli.
- Animasyon kalitesi yuksek — LingRoot'un teal/cyan renk paleti ile guzel gorunur.
- Web destegi, ileride frontend'e de benzer tour eklenmek istenirse avantaj.

**Ornek kullanim:**
```tsx
const steps = [
  ({ next }) => (
    <TourBox>
      <Text>Metni yazip seslendirme olustur</Text>
      <Button onPress={next} title="Sonraki" />
    </TourBox>
  ),
];

<AttachStep index={0}>
  <FeatureCard title="Metin Seslendirme" />
</AttachStep>
```

---

### 3. react-native-walkthrough-tooltip — Minimalist Tooltip

| | |
|---|---|
| **GitHub** | [jasongaare/react-native-walkthrough-tooltip](https://github.com/jasongaare/react-native-walkthrough-tooltip) |
| **Stars** | ~676 |
| **Haftalik indirme** | ~64,000 (en yuksek) |
| **Son versiyon** | v1.6.0 |
| **Lisans** | MIT |
| **Ek bagimliliklari** | Yok (saf JS) |

**Nasil calisir:**
- Gosterilecek elemani `<Tooltip>` bilesenine sarar.
- `isVisible` prop ile kontrol edilir — `true` yapinca fullscreen modal acilir.
- Modal arka plani karartilir, hedef eleman kopyalanarak modal ustunde gosterilir.
- Tooltip ici tamamen ozellestirilebilir (`content` prop).
- Multi-step tour icin kendi sequencing mantigi yazilir.

**Avantajlari:**
- En yuksek adopsyon (64K haftalik indirme) — topluluk destegi genis.
- Sifir ek bagimliligi — saf JS, hicbir native modul gerektirmez.
- Cok hafif (~15KB). Uygulama boyutunu neredeyse etkilemez.
- Basit API: Sadece `<Tooltip isVisible content={...}>` yeterli.
- Eleman etkilesilirligini korur (tooltip acikken bile buton tiklanabilir).

**Dezavantajlari:**
- **Multi-step tour yok.** Adim siralama, ilerleme gostergesi, "ileri/geri" navigasyonu elle yazilmali.
- Animasyon destegi v1.0'da kaldirildi (statik acilir/kapanir).
- Spotlight efekti yok — arka plan uniform karartilir, hedef ozel aydinlatilmaz.
- 54 acik issue.

**LingRoot uyumu:**
- En kolay entegrasyon: Sadece npm install + JSX wrap.
- Ama tour sequencing icin `useState` + step index mantigi yazilmali (~50-80 satir ek kod).
- Spotlight efekti olmadigi icin gorsel olarak diger ikisinden daha az etkileyici.

**Ornek kullanim:**
```tsx
<Tooltip
  isVisible={step === 0}
  content={<Text>Metni yazip seslendirme olustur</Text>}
  placement="bottom"
  onClose={() => setStep(1)}
>
  <FeatureCard title="Metin Seslendirme" />
</Tooltip>
```

---

## Karsilastirma Tablosu

| Kriter | copilot | spotlight-tour | walkthrough-tooltip |
|--------|---------|----------------|---------------------|
| Multi-step tour | Dahil | Dahil | Manuel |
| Spotlight efekti | SVG/View | SVG (animasyonlu) | Yok |
| Animasyon kalitesi | Orta-Iyi | En iyi | Yok (v1.0'da kaldirildi) |
| Haftalik indirme | 8,700 | 2,000 | 64,000 |
| GitHub Stars | 2,400 | 468 | 676 |
| Ek bagimliliklari | react-native-svg (mevcut) | react-native-svg + floating-ui | Yok |
| Kurulum zorlugu | Dusuk | Orta | Cok dusuk |
| Tooltip ozellestirme | Yuksek | Yuksek | Yuksek |
| ScrollView destegi | Var | Var | Sinirli |
| RN New Architecture | v3.0+ uyumlu | Uyumlu | Uyumlu |
| Expo uyumu | Tam | Tam | Tam |
| Bakim durumu | Aktif | Aktif | Aktif |

---

## LingRoot Icin Degerlendirme

### Ideal Tour Akisi (Hedef UX)

```
Kullanici ilk kez giris yapar
  → HomeScreen yuklenir
  → Overlay acilir: "LingRoot'a Hosgeldin! Sana temel ozellikleri gosterelim."
  → Adim 1: "Metin Seslendirme" karti spotlight → "Ingilizce metin yaz, AI seviyene uyarlar ve seslendirir"
  → Adim 2: "Podcast" karti spotlight → "Ilgi alanlarindan podcast olustur ve dinle"
  → Adim 3: "Konu Agacim" karti spotlight → "Ogrenme yolunu planla ve takip et"
  → Adim 4: "Kelime Dagarcigi" karti spotlight → "Ogrendigin kelimeleri buradan takip et"
  → Adim 5: Alt tab bar → "Kutuphane, Olustur ve Profil sayfalarina buradan eris"
  → "Tur tamamlandi! Baslamak icin bir ozellik sec."
  → AsyncStorage'a 'guide_tour_completed' = true yaz
```

### Senaryo Bazli Oneri

| Senaryo | Oneri |
|---------|-------|
| Hizli MVP, minimum is | **walkthrough-tooltip** — sifir bagimliligi, 1 saat entegrasyon |
| Profesyonel, etkileyici UX | **copilot** — hazir tour framework, spotlight, iyi topluluk |
| En iyi animasyon + gelecekte web | **spotlight-tour** — akici animasyonlar, floating-ui, web destegi |

### Tavsiye: `react-native-copilot`

**Neden:**
1. **Hazir multi-step framework** — adim siralama, ilerleme, navigasyon yazilmis. walkthrough-tooltip'te bunlarin hepsi manuel.
2. **Spotlight efekti** — hedef eleman aydinlatilir, geri kalan karartilir. Gorsel olarak cok daha etkili.
3. **react-native-svg zaten projede** — ek native bagimliligi yok.
4. **En buyuk topluluk** (2,400 star) — sorun yasandiginda kaynak bulmak kolay.
5. **Expo + New Arch uyumlu** — LingRoot'un mevcut altyapisiyla tam uyumlu.
6. **Aktif bakim** — v3.3.3 guncel, modern `CopilotProvider` + hooks API.

**spotlight-tour neden degil:** Daha az topluluk, `@floating-ui/react-native` ek bagimlilik, dokumantasyon zayif.
**walkthrough-tooltip neden degil:** Tour framework yok, spotlight yok, animasyon yok. Indirme sayisi yuksek ama bunun nedeni genel tooltip kullanimi (tour degil).

---

## Kaynaklar

- [react-native-copilot GitHub](https://github.com/mohebifar/react-native-copilot)
- [react-native-spotlight-tour GitHub](https://github.com/stackbuilders/react-native-spotlight-tour)
- [react-native-walkthrough-tooltip GitHub](https://github.com/jasongaare/react-native-walkthrough-tooltip)
- [React Native Onboarding Walkthroughs 2026](https://vocal.media/01/react-native-app-onboarding-walkthroughs-and-tooltips-2026)
- [Coachmarks and Spotlight UI in Mobile Apps](https://www.plotline.so/blog/coachmarks-and-spotlight-ui-mobile-apps)
- [npm trends karsilastirma](https://npmtrends.com/react-native-copilot-vs-react-native-walkthrough-tooltip)
