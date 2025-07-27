// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import * as echarts from 'echarts';
const App: React.FC = () => {
// Add animation styles
useEffect(() => {
const style = document.createElement('style');
style.textContent = `
@keyframes feedbackAnimation {
0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}
.animate-feedback {
animation: feedbackAnimation 1s ease-out forwards;
}
`;
document.head.appendChild(style);
return () => {
document.head.removeChild(style);
};
}, []);
const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
const [activeTab, setActiveTab] = useState<string>("dashboard");
const [isNewContentModalOpen, setIsNewContentModalOpen] = useState<boolean>(false);
const [contentType, setContentType] = useState<string>("video");
const [isAIChatActive, setIsAIChatActive] = useState<boolean>(false);
const [aiMessages, setAiMessages] = useState<Array<{type: 'ai' | 'user', message: string}>>([]);
const [isPersonalRecommendationsOpen, setIsPersonalRecommendationsOpen] = useState<boolean>(false);
// Personal recommendations data
const personalRecommendations = {
words: [
{ word: "accomplish", meaning: "başarmak", example: "She accomplished her goals." },
{ word: "venture", meaning: "girişim", example: "Starting a new business venture." },
{ word: "nevertheless", meaning: "yine de", example: "It was difficult; nevertheless, she succeeded." }
],
content: [
{
title: "Business English Podcast",
type: "podcast",
duration: "25 dakika",
level: "B1",
description: "İş görüşmelerinde sık kullanılan ifadeler"
},
{
title: "Travel Vocabulary",
type: "video",
duration: "15 dakika",
level: "B1",
description: "Seyahat ederken kullanabileceğiniz temel kelimeler"
}
],
exercises: [
{
title: "Present Perfect Practice",
type: "grammar",
duration: "20 dakika",
difficulty: "Orta",
completion: "0/10"
},
{
title: "Listening Comprehension",
type: "listening",
duration: "15 dakika",
difficulty: "Orta",
completion: "0/5"
}
],
learningPlan: {
daily: [
{ time: "09:00", activity: "Kelime Tekrarı", duration: "10 dakika" },
{ time: "14:00", activity: "Podcast Dinleme", duration: "20 dakika" },
{ time: "19:00", activity: "Gramer Alıştırması", duration: "15 dakika" }
],
weekly: [
"Pazartesi: Konuşma Pratiği",
"Çarşamba: Yazma Alıştırması",
"Cuma: Quiz"
]
}
};
const [userInput, setUserInput] = useState<string>('');
const [isRecording, setIsRecording] = useState<boolean>(false);
const [languageLevel, setLanguageLevel] = useState<string>("b1");
const [contentTags, setContentTags] = useState<string[]>([]);
const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
const [dailyGoalProgress, setDailyGoalProgress] = useState<number>(75);
const [weeklyProgress, setWeeklyProgress] = useState<number>(60);
const [currentStreak, setCurrentStreak] = useState<number>(12);
const [totalLearningTime, setTotalLearningTime] = useState<number>(1250);
const [completedLessons, setCompletedLessons] = useState<number>(48);
const [totalLessons, setTotalLessons] = useState<number>(120);
const [activeCourses, setActiveCourses] = useState<number>(3);
const [earnedBadges, setEarnedBadges] = useState<number>(14);
const [isVocabReviewModalOpen, setIsVocabReviewModalOpen] = useState<boolean>(false);
const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
const [isWordGamesModalOpen, setIsWordGamesModalOpen] = useState<boolean>(false);
const [selectedGame, setSelectedGame] = useState<string | null>(null);
const [isSentencePracticeModalOpen, setIsSentencePracticeModalOpen] = useState<boolean>(false);
const [currentPracticeWord, setCurrentPracticeWord] = useState<any>(null);
const [userSentence, setUserSentence] = useState<string>('');
const [sentenceFeedback, setSentenceFeedback] = useState<any>(null);
const wordGames = [
{
id: 'matching',
title: 'Eşleştirme Oyunu',
description: 'İngilizce kelimeleri Türkçe anlamlarıyla eşleştirin',
difficulty: 'Kolay',
duration: '5-10 dakika',
icon: 'fas fa-equals'
},
{
id: 'wordSearch',
title: 'Kelime Avı',
description: 'Karışık harfler arasında gizlenmiş kelimeleri bulun',
difficulty: 'Orta',
duration: '10-15 dakika',
icon: 'fas fa-search'
},
{
id: 'anagram',
title: 'Anagram Çözme',
description: 'Karışık harflerden anlamlı kelimeler oluşturun',
difficulty: 'Zor',
duration: '5-10 dakika',
icon: 'fas fa-random'
},
{
id: 'flashcards',
title: 'Kelime Hafıza Kartları',
description: 'Hafıza kartlarıyla kelime öğrenin ve tekrar edin',
difficulty: 'Kolay',
duration: '10-15 dakika',
icon: 'fas fa-clone'
}
];
const [reviewSettings, setReviewSettings] = useState({
difficulty: 'all',
category: 'all',
knownWords: new Set<number>(),
unknownWords: new Set<number>()
});
const sampleWords = [
{
id: 1,
word: 'accomplish',
pronunciation: '/əˈkʌm.plɪʃ/',
meaning: 'başarmak, gerçekleştirmek',
example: 'She accomplished all her goals for the year.',
category: 'business',
difficulty: 'B1'
},
{
id: 2,
word: 'venture',
pronunciation: '/ˈven.tʃər/',
meaning: 'girişim, risk almak',
example: 'Starting a new business is always a risky venture.',
category: 'business',
difficulty: 'B2'
},
{
id: 3,
word: 'nevertheless',
pronunciation: '/ˌnev.ə.ðəˈles/',
meaning: 'yine de, buna rağmen',
example: 'The task was difficult; nevertheless, she persisted.',
category: 'academic',
difficulty: 'B2'
}
];
const playWordAudio = (word: string) => {
const utterance = new SpeechSynthesisUtterance(word);
utterance.lang = 'en-US';
window.speechSynthesis.speak(utterance);
};
const [showFeedback, setShowFeedback] = useState<boolean>(false);
const handleWordResponse = (known: boolean) => {
if (known) {
setShowFeedback(true);
setReviewSettings(prev => ({
...prev,
knownWords: new Set(prev.knownWords).add(sampleWords[currentWordIndex].id)
}));
// Show feedback animation
const feedbackElement = document.createElement('div');
feedbackElement.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
feedbackElement.innerHTML = `
<div class="bg-green-500 text-white rounded-full p-4 shadow-lg animate-feedback">
<i class="fas fa-check text-2xl"></i>
</div>
`;
document.body.appendChild(feedbackElement);
// Remove feedback after animation
setTimeout(() => {
document.body.removeChild(feedbackElement);
setShowFeedback(false);
// Save progress
const progress = {
knownWords: Array.from(reviewSettings.knownWords),
unknownWords: Array.from(reviewSettings.unknownWords),
lastPosition: currentWordIndex
};
localStorage.setItem('vocabularyProgress', JSON.stringify(progress));
// Move to next word or summary
if (currentWordIndex < sampleWords.length - 1) {
setCurrentWordIndex(prev => prev + 1);
}
}, 1000);
} else {
// Show feedback for unknown word
const feedbackElement = document.createElement('div');
feedbackElement.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
feedbackElement.innerHTML = `
<div class="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
<div class="flex items-center justify-between mb-4">
<h3 class="text-lg font-bold text-gray-800">Öğrenme İpucu</h3>
<button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
<i class="fas fa-times"></i>
</button>
</div>
<div class="mb-4">
<p class="text-gray-600 mb-2">${sampleWords[currentWordIndex].word} kelimesini hatırlamak için:</p>
<ul class="list-disc list-inside text-gray-600 space-y-1">
<li>Örnek cümle: ${sampleWords[currentWordIndex].example}</li>
<li>Benzer kelimeler: ${getSimilarWords(sampleWords[currentWordIndex].word)}</li>
<li>Görsel hafıza: ${getVisualTip(sampleWords[currentWordIndex].word)}</li>
</ul>
</div>
<div class="flex justify-end">
<button class="text-blue-600 hover:text-blue-700 text-sm" onclick="this.parentElement.parentElement.remove()">
Anladım, devam et
</button>
</div>
</div>
`;
document.body.appendChild(feedbackElement);
setReviewSettings(prev => ({
...prev,
unknownWords: new Set(prev.unknownWords).add(sampleWords[currentWordIndex].id)
}));
// Save progress
const progress = {
knownWords: Array.from(reviewSettings.knownWords),
unknownWords: Array.from(reviewSettings.unknownWords),
lastPosition: currentWordIndex,
needsReview: Array.from(new Set([...progress?.needsReview || [], sampleWords[currentWordIndex].word]))
};
localStorage.setItem('vocabularyProgress', JSON.stringify(progress));
// Move to next word after 3 seconds
setTimeout(() => {
const feedback = document.querySelector('.fixed.top-1/2.left-1/2');
if (feedback) {
feedback.remove();
}
if (currentWordIndex < sampleWords.length - 1) {
setCurrentWordIndex(prev => prev + 1);
}
}, 3000);
}
};
// Helper functions for word learning tips
const getSimilarWords = (word: string) => {
const similarWords = {
'accomplish': 'achieve, complete, fulfill',
'venture': 'undertaking, enterprise, endeavor',
'nevertheless': 'however, nonetheless, still',
// Add more similar words for other vocabulary
};
return similarWords[word] || 'Loading...';
};
const getVisualTip = (word: string) => {
const visualTips = {
'accomplish': 'Bir hedefe ulaşan bir koşucu düşünün',
'venture': 'Yeni bir iş kuran girişimci düşünün',
'nevertheless': 'Yağmura rağmen yürüyen biri düşünün',
// Add more visual tips for other vocabulary
};
return visualTips[word] || 'Loading...';
};
const profileImageUrl = 'https://readdy.ai/api/search-image?query=Professional%2520headshot%2520of%2520a%2520Turkish%2520man%2520in%2520his%252030s%2520with%2520short%2520dark%2520hair%2520and%2520a%2520friendly%2520smile%252C%2520business%2520casual%2520attire%252C%2520neutral%2520background%252C%2520high%2520quality%2520portrait&width=200&height=200&seq=profile1&orientation=squarish';
const backgroundImageUrl = 'https://readdy.ai/api/search-image?query=Abstract%2520professional%2520background%2520with%2520soft%2520blue%2520gradient%252C%2520subtle%2520geometric%2520patterns%252C%2520clean%2520modern%2520design%252C%2520perfect%2520for%2520profile%2520page%2520header%252C%2520light%2520tech%2520elements%252C%2520minimalist%2520aesthetic%252C%2520high%2520quality%2520digital%2520art&width=1440&height=300&seq=bg1&orientation=landscape';
const handleProfileClick = () => {
setIsProfileMenuOpen(!isProfileMenuOpen);
};
const handleClickOutside = (event: MouseEvent) => {
const target = event.target as HTMLElement;
if (!target.closest('#profileDropdown') && !target.closest('#profileButton')) {
setIsProfileMenuOpen(false);
}
if (!target.closest('[id^="contentDropdown"]') && !target.closest('[id^="contentMenuButton"]')) {
setActiveDropdownId(null);
}
};
useEffect(() => {
document.addEventListener('mousedown', handleClickOutside);
return () => {
document.removeEventListener('mousedown', handleClickOutside);
};
}, []);
useEffect(() => {
// Weekly Activity Chart
const weeklyActivityChart = echarts.init(document.getElementById('weeklyActivityChart'));
const weeklyActivityOption = {
animation: false,
tooltip: {
trigger: 'axis',
formatter: '{b}: {c} dakika'
},
xAxis: {
type: 'category',
data: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
axisLine: {
lineStyle: {
color: '#ddd'
}
}
},
yAxis: {
type: 'value',
axisLine: {
lineStyle: {
color: '#ddd'
}
},
splitLine: {
lineStyle: {
color: '#eee'
}
}
},
series: [{
data: [30, 45, 25, 60, 35, 50, 40],
type: 'bar',
itemStyle: {
color: '#3b82f6'
},
emphasis: {
itemStyle: {
color: '#2563eb'
}
}
}]
};
weeklyActivityChart.setOption(weeklyActivityOption);
// Progress Chart
const progressChart = echarts.init(document.getElementById('progressChart'));
const progressOption = {
animation: false,
tooltip: {
trigger: 'item',
formatter: '{b}: {c}%'
},
radar: {
indicator: [
{ name: 'Dinleme', max: 100 },
{ name: 'Konuşma', max: 100 },
{ name: 'Okuma', max: 100 },
{ name: 'Yazma', max: 100 },
{ name: 'Kelime', max: 100 },
{ name: 'Dilbilgisi', max: 100 }
],
radius: '65%',
splitNumber: 4,
axisName: {
color: '#333'
},
splitLine: {
lineStyle: {
color: '#ddd'
}
},
splitArea: {
show: false
},
axisLine: {
lineStyle: {
color: '#ddd'
}
}
},
series: [{
type: 'radar',
data: [{
value: [70, 55, 80, 65, 75, 60],
name: 'Beceriler',
areaStyle: {
color: 'rgba(59, 130, 246, 0.3)'
},
lineStyle: {
color: '#3b82f6'
},
itemStyle: {
color: '#3b82f6'
}
}]
}]
};
progressChart.setOption(progressOption);
// Vocabulary Growth Chart
const vocabularyChart = echarts.init(document.getElementById('vocabularyChart'));
const vocabularyOption = {
animation: false,
tooltip: {
trigger: 'axis',
formatter: '{b}: {c} kelime'
},
xAxis: {
type: 'category',
data: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz'],
axisLine: {
lineStyle: {
color: '#ddd'
}
}
},
yAxis: {
type: 'value',
axisLine: {
lineStyle: {
color: '#ddd'
}
},
splitLine: {
lineStyle: {
color: '#eee'
}
}
},
series: [{
data: [150, 230, 320, 390, 450, 520],
type: 'line',
smooth: true,
itemStyle: {
color: '#8b5cf6'
},
lineStyle: {
color: '#8b5cf6'
},
areaStyle: {
color: 'rgba(139, 92, 246, 0.2)'
}
}]
};
vocabularyChart.setOption(vocabularyOption);
// Resize charts on window resize
const handleResize = () => {
weeklyActivityChart.resize();
progressChart.resize();
vocabularyChart.resize();
};
window.addEventListener('resize', handleResize);
return () => {
weeklyActivityChart.dispose();
progressChart.dispose();
vocabularyChart.dispose();
window.removeEventListener('resize', handleResize);
};
}, []);
return (
<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
{/* Top Navigation */}
<div className="bg-white shadow-sm border-b">
<div className="container mx-auto px-4">
<div className="flex justify-between items-center h-16">
<div className="flex items-center space-x-4">
<a href="https://readdy.ai/home/11d28807-c376-4c34-ad7f-2622a9d675a0/f8129b5e-b7ee-4374-9cd1-561da9acd6af" data-readdy="true">
<Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-home mr-2"></i>
Ana Sayfa
</Button>
</a>
<Button variant="default" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-user mr-2"></i>
Kullanıcı Paneli
</Button>
</div>
<div className="flex items-center space-x-4">
<Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-bell"></i>
</Button>
<div className="relative">
<div
id="profileButton"
className="flex items-center space-x-3 cursor-pointer"
onClick={handleProfileClick}
>
<img
src={profileImageUrl}
alt="Profile"
className="w-10 h-10 rounded-full object-cover"
/>
<div className="text-sm">
<div className="font-medium">Mehmet Kaya</div>
<div className="text-gray-500 text-xs">mehmet@example.com</div>
</div>
<i className={`fas fa-chevron-${isProfileMenuOpen ? 'up' : 'down'} ml-2 text-gray-500 transition-transform duration-200`}></i>
</div>
<div
id="profileDropdown"
className={`absolute right-0 w-48 mt-2 bg-white rounded-lg shadow-lg py-2 ${isProfileMenuOpen ? 'block' : 'hidden'} z-10`}
>
<a href="https://readdy.ai/home/11d28807-c376-4c34-ad7f-2622a9d675a0/3e0a7ecb-c377-4683-bc29-b362cfea4b14" data-readdy="true" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
<i className="fas fa-user-circle mr-2"></i>
Profil Bilgilerim
</a>
<a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
<i className="fas fa-cog mr-2"></i>
Hesap Ayarları
</a>
<a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
<i className="fas fa-history mr-2"></i>
Okuma Geçmişim
</a>
<a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
<i className="fas fa-heart mr-2"></i>
Favorilerim
</a>
<a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
<i className="fas fa-globe mr-2"></i>
Dil Ayarları
</a>
<a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
<i className="fas fa-question-circle mr-2"></i>
Yardım ve Destek
</a>
<div className="border-t border-gray-100 mt-2 pt-2">
<a href="#" className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer">
<i className="fas fa-sign-out-alt mr-2"></i>
Çıkış Yap
</a>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
{/* Profile Header */}
<div className="relative w-full h-[250px] overflow-hidden">
<div
className="absolute inset-0 bg-cover bg-center"
style={{ backgroundImage: `url(${backgroundImageUrl})` }}
></div>
<div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-blue-600/30"></div>
<div className="container mx-auto px-6 relative h-full flex items-end pb-6">
<div className="flex items-end">
<div className="relative mr-6">
<Avatar className="w-32 h-32 border-4 border-white shadow-lg">
<AvatarImage src={profileImageUrl} alt="Mehmet Kaya" />
<AvatarFallback>MK</AvatarFallback>
</Avatar>
</div>
<div className="mb-4 text-white">
<h1 className="text-3xl font-bold">Mehmet Kaya</h1>
<p className="text-blue-100">mehmet@example.com</p>
<div className="flex mt-2">
<Badge className="bg-blue-500 mr-2">B1 İngilizce</Badge>
<Badge className="bg-green-500">2 Dil</Badge>
</div>
</div>
</div>
</div>
</div>
{/* Main Content */}
<div className="container mx-auto px-4 py-8">
<Tabs defaultValue="dashboard" className="w-full">
<TabsList className="flex justify-start mb-6 bg-white p-1 rounded-lg shadow-sm border overflow-x-auto">
<TabsTrigger value="dashboard" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-chart-line mr-2"></i>
Dashboard
</TabsTrigger>
<TabsTrigger value="courses" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-book mr-2"></i>
Kurslarım
</TabsTrigger>
<TabsTrigger value="content" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-file-alt mr-2"></i>
İçerik Yönetimi
</TabsTrigger>
<TabsTrigger value="vocabulary" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-language mr-2"></i>
Kelimelerim
</TabsTrigger>
<TabsTrigger value="achievements" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-trophy mr-2"></i>
Başarılar
</TabsTrigger>
<TabsTrigger value="ai-features" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-robot mr-2"></i>
AI Özellikleri
</TabsTrigger>
</TabsList>
{/* Dashboard Tab */}
<TabsContent value="dashboard" className="mt-0">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{/* Quick Stats */}
<div className="col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
<Card className="border-none shadow-md">
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm text-gray-500">Günlük Hedef</p>
<h3 className="text-2xl font-bold text-blue-600">{dailyGoalProgress}%</h3>
<p className="text-xs text-gray-500 mt-1">Hedef: 30 dakika</p>
</div>
<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
<i className="fas fa-bullseye text-xl"></i>
</div>
</div>
<Progress value={dailyGoalProgress} className="h-2 mt-4" />
</CardContent>
</Card>
<Card className="border-none shadow-md">
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm text-gray-500">Mevcut Seri</p>
<h3 className="text-2xl font-bold text-green-600">{currentStreak} gün</h3>
<p className="text-xs text-gray-500 mt-1">En uzun: 21 gün</p>
</div>
<div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
<i className="fas fa-fire text-xl"></i>
</div>
</div>
<div className="flex space-x-1 mt-4">
{Array.from({ length: 7 }).map((_, index) => (
<div
key={index}
className={`h-2 flex-1 rounded-full ${index < 5 ? 'bg-green-500' : 'bg-gray-200'}`}
></div>
))}
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm text-gray-500">Toplam Öğrenme</p>
<h3 className="text-2xl font-bold text-purple-600">{totalLearningTime} dk</h3>
<p className="text-xs text-gray-500 mt-1">Bu ay: 250 dakika</p>
</div>
<div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
<i className="fas fa-clock text-xl"></i>
</div>
</div>
<div className="mt-4 grid grid-cols-7 gap-1">
{Array.from({ length: 7 }).map((_, index) => {
const height = [3, 5, 2, 6, 4, 7, 5][index];
return (
<div key={index} className="flex flex-col items-center">
<div
className={`w-full bg-purple-500 rounded-t-sm`}
style={{ height: `${height * 4}px` }}
></div>
</div>
);
})}
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm text-gray-500">Tamamlanan Dersler</p>
<h3 className="text-2xl font-bold text-amber-600">{completedLessons}/{totalLessons}</h3>
<p className="text-xs text-gray-500 mt-1">İlerleme: {Math.round((completedLessons/totalLessons)*100)}%</p>
</div>
<div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
<i className="fas fa-graduation-cap text-xl"></i>
</div>
</div>
<Progress value={(completedLessons/totalLessons)*100} className="h-2 mt-4" />
</CardContent>
</Card>
</div>
{/* Weekly Activity Chart */}
<Card className="border-none shadow-md col-span-3 md:col-span-2">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Haftalık Aktivite</CardTitle>
<CardDescription>Son 7 günde öğrenme süreniz</CardDescription>
</CardHeader>
<CardContent>
<div id="weeklyActivityChart" style={{ width: '100%', height: '300px' }}></div>
</CardContent>
</Card>
{/* Today's Tasks */}
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Bugünkü Görevler</CardTitle>
<CardDescription>6 Haziran 2025, Cuma</CardDescription>
</CardHeader>
<CardContent>
<ScrollArea className="h-[300px] pr-4">
<div className="space-y-4">
<div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-100">
<div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3 flex-shrink-0">
<i className="fas fa-headphones"></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">Günlük Dinleme Pratiği</h4>
<p className="text-sm text-gray-600">10 dakika podcast dinle</p>
</div>
<Badge className="bg-green-500 ml-2">Tamamlandı</Badge>
</div>
<div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
<i className="fas fa-book-open"></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">Okuma Alıştırması</h4>
<p className="text-sm text-gray-600">B1 seviyesinde bir makale oku</p>
</div>
<Button size="sm" variant="outline" className="ml-2 !rounded-button whitespace-nowrap cursor-pointer">
Başla
</Button>
</div>
<div className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
<div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3 flex-shrink-0">
<i className="fas fa-comment"></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">Konuşma Pratiği</h4>
<p className="text-sm text-gray-600">AI asistan ile 5 dakika konuş</p>
</div>
<Button size="sm" variant="outline" className="ml-2 !rounded-button whitespace-nowrap cursor-pointer">
Başla
</Button>
</div>
<div className="flex items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
<div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-3 flex-shrink-0">
<i className="fas fa-pen"></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">Yazma Alıştırması</h4>
<p className="text-sm text-gray-600">Günlük rutininiz hakkında kısa bir paragraf yazın</p>
</div>
<Button size="sm" variant="outline" className="ml-2 !rounded-button whitespace-nowrap cursor-pointer">
Başla
</Button>
</div>
<div className="flex items-center p-3 bg-red-50 rounded-lg border border-red-100">
<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-3 flex-shrink-0">
<i className="fas fa-brain"></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">Kelime Tekrarı</h4>
<p className="text-sm text-gray-600">Bugün için 15 kelime tekrarı yapın</p>
</div>
<Button size="sm" variant="outline" className="ml-2 !rounded-button whitespace-nowrap cursor-pointer">
Başla
</Button>
</div>
</div>
</ScrollArea>
</CardContent>
</Card>
{/* Skills Progress */}
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Beceri İlerlemesi</CardTitle>
<CardDescription>Dil becerilerinizin gelişimi</CardDescription>
</CardHeader>
<CardContent>
<div id="progressChart" style={{ width: '100%', height: '300px' }}></div>
</CardContent>
</Card>
{/* Vocabulary Growth */}
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Kelime Gelişimi</CardTitle>
<CardDescription>Öğrenilen kelime sayısı</CardDescription>
</CardHeader>
<CardContent>
<div id="vocabularyChart" style={{ width: '100%', height: '300px' }}></div>
</CardContent>
</Card>
{/* Upcoming Events */}
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Yaklaşan Etkinlikler</CardTitle>
<CardDescription>Katılabileceğiniz öğrenme etkinlikleri</CardDescription>
</CardHeader>
<CardContent>
<ScrollArea className="h-[300px] pr-4">
<div className="space-y-4">
<div className="flex p-3 bg-blue-50 rounded-lg border border-blue-100">
<div className="w-12 text-center mr-3">
<div className="bg-white rounded-md p-1 border border-blue-200">
<div className="text-xs font-bold text-blue-600">HAZ</div>
<div className="text-lg font-bold">10</div>
</div>
</div>
<div>
<h4 className="font-medium text-gray-800">Konuşma Kulübü</h4>
<p className="text-sm text-gray-600">Pazartesi, 19:00 - 20:30</p>
<p className="text-xs text-gray-500 mt-1">Günlük konular hakkında İngilizce pratik yapın</p>
<div className="mt-2">
<Button size="sm" variant="outline" className="text-blue-600 border-blue-600 !rounded-button whitespace-nowrap cursor-pointer">
Katıl
</Button>
</div>
</div>
</div>
<div className="flex p-3 bg-purple-50 rounded-lg border border-purple-100">
<div className="w-12 text-center mr-3">
<div className="bg-white rounded-md p-1 border border-purple-200">
<div className="text-xs font-bold text-purple-600">HAZ</div>
<div className="text-lg font-bold">15</div>
</div>
</div>
<div>
<h4 className="font-medium text-gray-800">İngilizce Film Kulübü</h4>
<p className="text-sm text-gray-600">Cumartesi, 16:00 - 18:30</p>
<p className="text-xs text-gray-500 mt-1">İngilizce film izleyip tartışma</p>
<div className="mt-2">
<Button size="sm" variant="outline" className="text-purple-600 border-purple-600 !rounded-button whitespace-nowrap cursor-pointer">
Katıl
</Button>
</div>
</div>
</div>
<div className="flex p-3 bg-green-50 rounded-lg border border-green-100">
<div className="w-12 text-center mr-3">
<div className="bg-white rounded-md p-1 border border-green-200">
<div className="text-xs font-bold text-green-600">HAZ</div>
<div className="text-lg font-bold">22</div>
</div>
</div>
<div>
<h4 className="font-medium text-gray-800">İş İngilizcesi Webinarı</h4>
<p className="text-sm text-gray-600">Perşembe, 20:00 - 21:00</p>
<p className="text-xs text-gray-500 mt-1">İş görüşmelerinde İngilizce ipuçları</p>
<div className="mt-2">
<Button size="sm" variant="outline" className="text-green-600 border-green-600 !rounded-button whitespace-nowrap cursor-pointer">
Katıl
</Button>
</div>
</div>
</div>
</div>
</ScrollArea>
</CardContent>
</Card>
</div>
</TabsContent>
{/* Courses Tab */}
<TabsContent value="courses" className="mt-0">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="col-span-3">
<div className="flex justify-between items-center mb-6">
<h2 className="text-2xl font-bold text-gray-800">Aktif Kurslarım</h2>
<Button className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-plus mr-2"></i>
Yeni Kurs Keşfet
</Button>
</div>
</div>
{/* Active Courses */}
<Card className="border-none shadow-md col-span-3 md:col-span-2">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Devam Ettiğim Kurslar</CardTitle>
<CardDescription>Şu anda öğrenmekte olduğunuz kurslar</CardDescription>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
<div className="flex flex-col md:flex-row md:items-center">
<div className="w-full md:w-1/4 mb-4 md:mb-0 md:mr-4">
<img
src="https://readdy.ai/api/search-image?query=English%2520conversation%2520course%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520people%2520talking%2520in%2520a%2520modern%2520setting%252C%2520clean%2520layout%2520with%2520blue%2520accent%2520colors%252C%2520high%2520quality%2520educational%2520content%2520presentation%252C%2520minimalist%2520style&width=300&height=200&seq=course1&orientation=landscape"
alt="İngilizce Konuşma Kursu"
className="w-full h-40 object-cover rounded-lg"
/>
</div>
<div className="flex-1">
<div className="flex justify-between items-start">
<div>
<h3 className="text-lg font-bold text-gray-800">İngilizce Günlük Konuşma Kursu</h3>
<p className="text-sm text-gray-600 mt-1">B1 Seviye - 24 ders</p>
</div>
<Badge className="bg-blue-500">Devam Ediyor</Badge>
</div>
<Progress value={65} className="h-2 mt-4" />
<div className="flex justify-between items-center text-xs text-gray-500 mt-1">
<span>İlerleme: %65</span>
<span>16/24 ders tamamlandı</span>
</div>
<div className="mt-4 flex flex-wrap gap-2">
<Badge variant="outline" className="bg-blue-50 text-blue-700">Konuşma</Badge>
<Badge variant="outline" className="bg-blue-50 text-blue-700">Günlük İngilizce</Badge>
<Badge variant="outline" className="bg-blue-50 text-blue-700">Pratik</Badge>
</div>
<div className="mt-4 flex justify-between items-center">
<div className="text-sm text-gray-600">
<i className="fas fa-clock mr-1"></i> Son erişim: 2 saat önce
</div>
<Button className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer">
Devam Et
</Button>
</div>
</div>
</div>
</div>
<div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
<div className="flex flex-col md:flex-row md:items-center">
<div className="w-full md:w-1/4 mb-4 md:mb-0 md:mr-4">
<img
src="https://readdy.ai/api/search-image?query=Business%2520English%2520course%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520office%2520setting%2520with%2520business%2520people%252C%2520modern%2520corporate%2520environment%252C%2520clean%2520layout%2520with%2520blue%2520and%2520gray%2520colors%252C%2520high%2520quality%2520educational%2520content%2520presentation&width=300&height=200&seq=course2&orientation=landscape"
alt="İş İngilizcesi Kursu"
className="w-full h-40 object-cover rounded-lg"
/>
</div>
<div className="flex-1">
<div className="flex justify-between items-start">
<div>
<h3 className="text-lg font-bold text-gray-800">İş İngilizcesi ve Profesyonel İletişim</h3>
<p className="text-sm text-gray-600 mt-1">B1-B2 Seviye - 18 ders</p>
</div>
<Badge className="bg-blue-500">Devam Ediyor</Badge>
</div>
<Progress value={30} className="h-2 mt-4" />
<div className="flex justify-between items-center text-xs text-gray-500 mt-1">
<span>İlerleme: %30</span>
<span>6/18 ders tamamlandı</span>
</div>
<div className="mt-4 flex flex-wrap gap-2">
<Badge variant="outline" className="bg-blue-50 text-blue-700">İş İngilizcesi</Badge>
<Badge variant="outline" className="bg-blue-50 text-blue-700">Toplantılar</Badge>
<Badge variant="outline" className="bg-blue-50 text-blue-700">E-posta</Badge>
</div>
<div className="mt-4 flex justify-between items-center">
<div className="text-sm text-gray-600">
<i className="fas fa-clock mr-1"></i> Son erişim: 1 gün önce
</div>
<Button className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer">
Devam Et
</Button>
</div>
</div>
</div>
</div>
<div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
<div className="flex flex-col md:flex-row md:items-center">
<div className="w-full md:w-1/4 mb-4 md:mb-0 md:mr-4">
<img
src="https://readdy.ai/api/search-image?query=English%2520grammar%2520course%2520thumbnail%2520with%2520professional%2520design%252C%2520educational%2520concept%2520with%2520grammar%2520rules%2520visualization%252C%2520books%2520and%2520learning%2520materials%252C%2520clean%2520layout%2520with%2520green%2520accent%2520colors%252C%2520high%2520quality%2520educational%2520content%2520presentation&width=300&height=200&seq=course3&orientation=landscape"
alt="İngilizce Dilbilgisi Kursu"
className="w-full h-40 object-cover rounded-lg"
/>
</div>
<div className="flex-1">
<div className="flex justify-between items-start">
<div>
<h3 className="text-lg font-bold text-gray-800">Temel İngilizce Dilbilgisi</h3>
<p className="text-sm text-gray-600 mt-1">A2-B1 Seviye - 20 ders</p>
</div>
<Badge className="bg-blue-500">Devam Ediyor</Badge>
</div>
<Progress value={45} className="h-2 mt-4" />
<div className="flex justify-between items-center text-xs text-gray-500 mt-1">
<span>İlerleme: %45</span>
<span>9/20 ders tamamlandı</span>
</div>
<div className="mt-4 flex flex-wrap gap-2">
<Badge variant="outline" className="bg-blue-50 text-blue-700">Dilbilgisi</Badge>
<Badge variant="outline" className="bg-blue-50 text-blue-700">Zamanlar</Badge>
<Badge variant="outline" className="bg-blue-50 text-blue-700">Yapılar</Badge>
</div>
<div className="mt-4 flex justify-between items-center">
<div className="text-sm text-gray-600">
<i className="fas fa-clock mr-1"></i> Son erişim: 3 gün önce
</div>
<Button className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer">
Devam Et
</Button>
</div>
</div>
</div>
</div>
</div>
</CardContent>
</Card>
{/* Course Recommendations */}
<div className="col-span-3 md:col-span-1">
<Card className="border-none shadow-md mb-6">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Önerilen Kurslar</CardTitle>
<CardDescription>Seviyenize ve ilgi alanlarınıza göre</CardDescription>
</CardHeader>
<CardContent>
<ScrollArea className="h-[400px] pr-4">
<div className="space-y-4">
<div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
<div className="relative h-32 mb-3">
<img
src="https://readdy.ai/api/search-image?query=Travel%2520English%2520course%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520travel%2520destinations%2520and%2520tourists%252C%2520clean%2520layout%2520with%2520orange%2520accent%2520colors%252C%2520high%2520quality%2520educational%2520content%2520presentation%252C%2520minimalist%2520style&width=300&height=150&seq=course4&orientation=landscape"
alt="Seyahat İngilizcesi"
className="w-full h-full object-cover rounded-lg"
/>
<Badge className="absolute top-2 right-2 bg-amber-500">Yeni</Badge>
</div>
<h4 className="font-medium text-gray-800">Seyahat İngilizcesi</h4>
<p className="text-xs text-gray-500 mt-1">A2-B1 Seviye • 15 ders</p>
<div className="mt-2 flex justify-between items-center">
<div className="flex">
<Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">Seyahat</Badge>
</div>
<Button size="sm" variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
İncele
</Button>
</div>
</div>
<div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
<div className="relative h-32 mb-3">
<img
src="https://readdy.ai/api/search-image?query=English%2520pronunciation%2520course%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520speech%2520and%2520phonetics%2520concept%252C%2520clean%2520layout%2520with%2520purple%2520accent%2520colors%252C%2520high%2520quality%2520educational%2520content%2520presentation%252C%2520minimalist%2520style&width=300&height=150&seq=course5&orientation=landscape"
alt="İngilizce Telaffuz"
className="w-full h-full object-cover rounded-lg"
/>
</div>
<h4 className="font-medium text-gray-800">İngilizce Telaffuz Kursu</h4>
<p className="text-xs text-gray-500 mt-1">B1 Seviye • 12 ders</p>
<div className="mt-2 flex justify-between items-center">
<div className="flex">
<Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Telaffuz</Badge>
</div>
<Button size="sm" variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
İncele
</Button>
</div>
</div>
<div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
<div className="relative h-32 mb-3">
<img
src="https://readdy.ai/api/search-image?query=English%2520idioms%2520and%2520expressions%2520course%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520speech%2520bubbles%2520with%2520expressions%252C%2520clean%2520layout%2520with%2520teal%2520accent%2520colors%252C%2520high%2520quality%2520educational%2520content%2520presentation%252C%2520minimalist%2520style&width=300&height=150&seq=course6&orientation=landscape"
alt="Deyimler ve İfadeler"
className="w-full h-full object-cover rounded-lg"
/>
<Badge className="absolute top-2 right-2 bg-teal-500">Popüler</Badge>
</div>
<h4 className="font-medium text-gray-800">İngilizce Deyimler ve İfadeler</h4>
<p className="text-xs text-gray-500 mt-1">B1-B2 Seviye • 20 ders</p>
<div className="mt-2 flex justify-between items-center">
<div className="flex">
<Badge variant="outline" className="text-xs bg-teal-50 text-teal-700">Deyimler</Badge>
</div>
<Button size="sm" variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
İncele
</Button>
</div>
</div>
</div>
</ScrollArea>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Kurs İstatistikleri</CardTitle>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Aktif Kurslar</span>
<span className="text-sm font-medium text-blue-600">{activeCourses}</span>
</div>
<Progress value={activeCourses * 33.3} className="h-2" />
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Tamamlanan Kurslar</span>
<span className="text-sm font-medium text-green-600">5</span>
</div>
<Progress value={50} className="h-2 bg-gray-200">
<div className="h-full bg-green-600 rounded-full"></div>
</Progress>
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Toplam Öğrenme Saati</span>
<span className="text-sm font-medium text-purple-600">42 saat</span>
</div>
<Progress value={70} className="h-2 bg-gray-200">
<div className="h-full bg-purple-600 rounded-full"></div>
</Progress>
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Quiz Başarı Oranı</span>
<span className="text-sm font-medium text-amber-600">78%</span>
</div>
<Progress value={78} className="h-2 bg-gray-200">
<div className="h-full bg-amber-600 rounded-full"></div>
</Progress>
</div>
</div>
<Button variant="outline" className="w-full mt-4 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-chart-line mr-2"></i>
Detaylı İstatistikler
</Button>
</CardContent>
</Card>
</div>
</div>
</TabsContent>
{/* Content Management Tab */}
<TabsContent value="content" className="mt-0">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="col-span-3">
<div className="flex justify-between items-center mb-6">
<h2 className="text-2xl font-bold text-gray-800">İçerik Yönetimi</h2>
<div className="flex space-x-2">
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-filter mr-2"></i>
Filtrele
</Button>
<Button
id="newContentButton"
onClick={() => setIsNewContentModalOpen(true)}
className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer"
>
<i className="fas fa-plus mr-2"></i>
Yeni İçerik Ekle
</Button>
</div>
</div>
</div>
{/* Content Tabs */}
<div className="col-span-3">
<Tabs defaultValue="saved" className="w-full">
<TabsList className="flex justify-start mb-6 bg-white p-1 rounded-lg shadow-sm border overflow-x-auto">
<TabsTrigger value="saved" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-bookmark mr-2"></i>
Kaydedilenler
</TabsTrigger>
<TabsTrigger value="history" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-history mr-2"></i>
Geçmiş
</TabsTrigger>
<TabsTrigger value="recommended" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-star mr-2"></i>
Öneriler
</TabsTrigger>
<TabsTrigger value="listen-later" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-headphones mr-2"></i>
Daha Sonra Dinle
</TabsTrigger>
</TabsList>
{/* Content Filter Buttons */}
<div className="flex flex-wrap gap-2 mb-6">
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fab fa-youtube text-red-600 mr-2"></i>
YouTube
</Button>
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fab fa-spotify text-green-600 mr-2"></i>
Spotify
</Button>
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-rss text-orange-600 mr-2"></i>
Blog
</Button>
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-newspaper text-blue-600 mr-2"></i>
Haberler
</Button>
<div className="flex-1"></div>
<div className="relative">
<Input
placeholder="İçerik ara..."
className="pl-10 border-gray-300"
/>
<i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
</div>
</div>
{/* Saved Content Tab */}
<TabsContent value="saved" className="mt-0">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<Card className="border-none shadow-md">
<div className="relative">
<img
src="https://readdy.ai/api/search-image?query=English%2520podcast%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520microphone%2520and%2520audio%2520waves%252C%2520clean%2520layout%2520with%2520blue%2520accent%2520colors%252C%2520high%2520quality%2520media%2520content%2520presentation%252C%2520minimalist%2520style&width=400&height=200&seq=content1&orientation=landscape"
alt="İngilizce Podcast"
className="w-full h-48 object-cover rounded-t-lg"
/>
<div className="absolute top-2 right-2 flex space-x-1">
<Button size="sm" variant="outline" className="w-8 h-8 p-0 bg-white bg-opacity-80 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-bookmark text-blue-600"></i>
</Button>
<div className="relative">
<Button
id={`contentMenuButton-1`}
size="sm"
variant="outline"
className="w-8 h-8 p-0 bg-white bg-opacity-80 !rounded-button whitespace-nowrap cursor-pointer"
onClick={(e) => {
e.stopPropagation();
setActiveDropdownId(activeDropdownId === 'contentDropdown-1' ? null : 'contentDropdown-1');
}}
>
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
{activeDropdownId === 'contentDropdown-1' && (
<div
id="contentDropdown-1"
className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-share-alt mr-2"></i>
Paylaş
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-clock mr-2"></i>
Daha Sonra İzle
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-download mr-2"></i>
İndirme Seçenekleri
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-heart mr-2"></i>
Favorilere Ekle
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-list mr-2"></i>
Listeye Ekle
</button>
<div className="border-t border-gray-100 my-1"></div>
<button className="w-full px-4 py-2 text-sm text-left text-yellow-600 hover:bg-gray-100 flex items-center">
<i className="fas fa-flag mr-2"></i>
Rapor Et
</button>
<button className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 flex items-center">
<i className="fas fa-trash-alt mr-2"></i>
Kaldır
</button>
</div>
)}
</div>
</div>
<div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
B1 Seviye
</div>
<div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
<i className="fab fa-spotify mr-1"></i> Podcast
</div>
</div>
<CardContent className="p-4">
<h3 className="font-bold text-gray-800 mb-1">İş Hayatında İngilizce Konuşmalar</h3>
<p className="text-sm text-gray-600 mb-3">Profesyonel ortamlarda kullanabileceğiniz İngilizce ifadeler ve diyaloglar</p>
<div className="flex justify-between items-center">
<div className="text-xs text-gray-500">
<i className="fas fa-clock mr-1"></i> 28 dakika
</div>
<Button size="sm" className="bg-green-600 hover:bg-green-700 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-play mr-1"></i> Dinle
</Button>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<div className="relative">
<img
src="https://readdy.ai/api/search-image?query=English%2520learning%2520video%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520educational%2520content%2520about%2520grammar%2520or%2520vocabulary%252C%2520clean%2520layout%2520with%2520red%2520accent%2520colors%252C%2520high%2520quality%2520media%2520content%2520presentation%252C%2520minimalist%2520style&width=400&height=200&seq=content2&orientation=landscape"
alt="İngilizce Video"
className="w-full h-48 object-cover rounded-t-lg"
/>
<div className="absolute top-2 right-2 flex space-x-1">
<Button size="sm" variant="outline" className="w-8 h-8 p-0 bg-white bg-opacity-80 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-bookmark text-blue-600"></i>
</Button>
<div className="relative">
<Button
id={`contentMenuButton-1`}
size="sm"
variant="outline"
className="w-8 h-8 p-0 bg-white bg-opacity-80 !rounded-button whitespace-nowrap cursor-pointer"
onClick={(e) => {
e.stopPropagation();
setActiveDropdownId(activeDropdownId === 'contentDropdown-1' ? null : 'contentDropdown-1');
}}
>
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
{activeDropdownId === 'contentDropdown-1' && (
<div
id="contentDropdown-1"
className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-share-alt mr-2"></i>
Paylaş
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-clock mr-2"></i>
Daha Sonra İzle
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-download mr-2"></i>
İndirme Seçenekleri
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-heart mr-2"></i>
Favorilere Ekle
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-list mr-2"></i>
Listeye Ekle
</button>
<div className="border-t border-gray-100 my-1"></div>
<button className="w-full px-4 py-2 text-sm text-left text-yellow-600 hover:bg-gray-100 flex items-center">
<i className="fas fa-flag mr-2"></i>
Rapor Et
</button>
<button className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 flex items-center">
<i className="fas fa-trash-alt mr-2"></i>
Kaldır
</button>
</div>
)}
</div>
</div>
<div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
A2-B1 Seviye
</div>
<div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
<i className="fab fa-youtube mr-1"></i> Video
</div>
</div>
<CardContent className="p-4">
<h3 className="font-bold text-gray-800 mb-1">İngilizce Zamanlar: Present Perfect</h3>
<p className="text-sm text-gray-600 mb-3">Present Perfect zamanının kullanımı ve örnek cümleler</p>
<div className="flex justify-between items-center">
<div className="text-xs text-gray-500">
<i className="fas fa-clock mr-1"></i> 15 dakika
</div>
<Button size="sm" className="bg-red-600 hover:bg-red-700 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-play mr-1"></i> İzle
</Button>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<div className="relative">
<img
src="https://readdy.ai/api/search-image?query=English%2520news%2520article%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520newspaper%2520or%2520digital%2520news%2520layout%252C%2520clean%2520design%2520with%2520blue%2520accent%2520colors%252C%2520high%2520quality%2520media%2520content%2520presentation%252C%2520minimalist%2520style&width=400&height=200&seq=content3&orientation=landscape"
alt="İngilizce Haber"
className="w-full h-48 object-cover rounded-t-lg"
/>
<div className="absolute top-2 right-2 flex space-x-1">
<Button size="sm" variant="outline" className="w-8 h-8 p-0 bg-white bg-opacity-80 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-bookmark text-blue-600"></i>
</Button>
<div className="relative">
<Button
id={`contentMenuButton-1`}
size="sm"
variant="outline"
className="w-8 h-8 p-0 bg-white bg-opacity-80 !rounded-button whitespace-nowrap cursor-pointer"
onClick={(e) => {
e.stopPropagation();
setActiveDropdownId(activeDropdownId === 'contentDropdown-1' ? null : 'contentDropdown-1');
}}
>
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
{activeDropdownId === 'contentDropdown-1' && (
<div
id="contentDropdown-1"
className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-share-alt mr-2"></i>
Paylaş
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-clock mr-2"></i>
Daha Sonra İzle
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-download mr-2"></i>
İndirme Seçenekleri
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-heart mr-2"></i>
Favorilere Ekle
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-list mr-2"></i>
Listeye Ekle
</button>
<div className="border-t border-gray-100 my-1"></div>
<button className="w-full px-4 py-2 text-sm text-left text-yellow-600 hover:bg-gray-100 flex items-center">
<i className="fas fa-flag mr-2"></i>
Rapor Et
</button>
<button className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 flex items-center">
<i className="fas fa-trash-alt mr-2"></i>
Kaldır
</button>
</div>
)}
</div>
</div>
<div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
B1-B2 Seviye
</div>
<div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
<i className="fas fa-newspaper mr-1"></i> Haber
</div>
</div>
<CardContent className="p-4">
<h3 className="font-bold text-gray-800 mb-1">Teknoloji Dünyasındaki Son Gelişmeler</h3>
<p className="text-sm text-gray-600 mb-3">Yapay zeka ve teknoloji alanındaki yenilikler hakkında İngilizce makale</p>
<div className="flex justify-between items-center">
<div className="text-xs text-gray-500">
<i className="fas fa-clock mr-1"></i> 10 dakika okuma
</div>
<Button size="sm" className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-book-open mr-1"></i> Oku
</Button>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<div className="relative">
<img
src="https://readdy.ai/api/search-image?query=English%2520blog%2520article%2520thumbnail%2520with%2520professional%2520design%252C%2520showing%2520travel%2520or%2520lifestyle%2520content%252C%2520clean%2520layout%2520with%2520orange%2520accent%2520colors%252C%2520high%2520quality%2520media%2520content%2520presentation%252C%2520minimalist%2520style&width=400&height=200&seq=content4&orientation=landscape"
alt="İngilizce Blog"
className="w-full h-48 object-cover rounded-t-lg"
/>
<div className="absolute top-2 right-2 flex space-x-1">
<Button size="sm" variant="outline" className="w-8 h-8 p-0 bg-white bg-opacity-80 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-bookmark text-blue-600"></i>
</Button>
<div className="relative">
<Button
id={`contentMenuButton-1`}
size="sm"
variant="outline"
className="w-8 h-8 p-0 bg-white bg-opacity-80 !rounded-button whitespace-nowrap cursor-pointer"
onClick={(e) => {
e.stopPropagation();
setActiveDropdownId(activeDropdownId === 'contentDropdown-1' ? null : 'contentDropdown-1');
}}
>
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
{activeDropdownId === 'contentDropdown-1' && (
<div
id="contentDropdown-1"
className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-share-alt mr-2"></i>
Paylaş
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-clock mr-2"></i>
Daha Sonra İzle
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-download mr-2"></i>
İndirme Seçenekleri
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-heart mr-2"></i>
Favorilere Ekle
</button>
<button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center">
<i className="fas fa-list mr-2"></i>
Listeye Ekle
</button>
<div className="border-t border-gray-100 my-1"></div>
<button className="w-full px-4 py-2 text-sm text-left text-yellow-600 hover:bg-gray-100 flex items-center">
<i className="fas fa-flag mr-2"></i>
Rapor Et
</button>
<button className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 flex items-center">
<i className="fas fa-trash-alt mr-2"></i>
Kaldır
</button>
</div>
)}
</div>
</div>
<div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
B1 Seviye
</div>
<div className="absolute top-2 left-2 bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
<i className="fas fa-rss mr-1"></i> Blog
</div>
</div>
<CardContent className="p-4">
<h3 className="font-bold text-gray-800 mb-1">Londra'da Bir Hafta Sonu</h3>
<p className="text-sm text-gray-600 mb-3">Londra'da gezilecek yerler ve kültürel ipuçları hakkında İngilizce blog yazısı</p>
<div className="flex justify-between items-center">
<div className="text-xs text-gray-500">
<i className="fas fa-clock mr-1"></i> 8 dakika okuma
</div>
<Button size="sm" className="bg-orange-600 hover:bg-orange-700 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-book-open mr-1"></i> Oku
</Button>
</div>
</CardContent>
</Card>
</div>
</TabsContent>
{/* Other Content Tabs (Placeholders) */}
<TabsContent value="history" className="mt-0">
<div className="text-center py-8">
<i className="fas fa-history text-4xl text-gray-300 mb-2"></i>
<h3 className="text-lg font-medium text-gray-700">Geçmiş içerikleriniz burada görünecek</h3>
<p className="text-sm text-gray-500">İçerik izlediğinizde veya dinlediğinizde burada listelenecek</p>
</div>
</TabsContent>
<TabsContent value="recommended" className="mt-0">
<div className="text-center py-8">
<i className="fas fa-star text-4xl text-gray-300 mb-2"></i>
<h3 className="text-lg font-medium text-gray-700">Önerilen içerikler yükleniyor</h3>
<p className="text-sm text-gray-500">İlgi alanlarınıza ve seviyenize göre içerikler hazırlanıyor</p>
</div>
</TabsContent>
<TabsContent value="listen-later" className="mt-0">
<div className="text-center py-8">
<i className="fas fa-headphones text-4xl text-gray-300 mb-2"></i>
<h3 className="text-lg font-medium text-gray-700">"Daha Sonra Dinle" listeniz boş</h3>
<p className="text-sm text-gray-500">İçerikleri "Daha Sonra Dinle" olarak işaretlediğinizde burada görünecek</p>
</div>
</TabsContent>
</Tabs>
</div>
</div>
</TabsContent>
{/* Language Development Tools Tab */}
<TabsContent value="vocabulary" className="mt-0">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="col-span-3">
<div className="flex justify-between items-center mb-6">
<h2 className="text-2xl font-bold text-gray-800">Dil Gelişim Araçları</h2>
<Button className="bg-purple-600 hover:bg-purple-700 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-plus mr-2"></i>
Yeni Kelime Ekle
</Button>
</div>
</div>
{/* Vocabulary Notebook */}
<Card className="border-none shadow-md col-span-3 md:col-span-2">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Kelime Defterim</CardTitle>
<CardDescription>Öğrendiğiniz ve öğrenmekte olduğunuz kelimeler</CardDescription>
</CardHeader>
<CardContent>
<div className="flex flex-wrap gap-2 mb-4">
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer bg-purple-50 text-purple-700 border-purple-200">
Tüm Kelimeler
</Button>
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
Öğrenilen
</Button>
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
Öğrenilmekte
</Button>
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
Zor Kelimeler
</Button>
<div className="flex-1"></div>
<div className="relative">
<Input
placeholder="Kelime ara..."
className="pl-10 border-gray-300"
/>
<i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
</div>
</div>
<div className="overflow-x-auto">
<table className="min-w-full bg-white">
<thead className="bg-gray-50">
<tr>
<th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelime</th>
<th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anlam</th>
<th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seviye</th>
<th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
<th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
</tr>
</thead>
<tbody className="divide-y divide-gray-200">
<tr>
<td className="py-3 px-4">
<div>
<span className="font-medium">accomplish</span>
<div className="text-xs text-gray-500">/əˈkʌm.plɪʃ/</div>
</div>
</td>
<td className="py-3 px-4">
<span>başarmak, gerçekleştirmek</span>
</td>
<td className="py-3 px-4">
<Badge className="bg-blue-500">B1</Badge>
</td>
<td className="py-3 px-4">
<Badge className="bg-green-500">Öğrenildi</Badge>
</td>
<td className="py-3 px-4">
<div className="flex space-x-2">
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-volume-up text-blue-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-edit text-gray-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
</div>
</td>
</tr>
<tr>
<td className="py-3 px-4">
<div>
<span className="font-medium">venture</span>
<div className="text-xs text-gray-500">/ˈven.tʃər/</div>
</div>
</td>
<td className="py-3 px-4">
<span>girişim, risk almak</span>
</td>
<td className="py-3 px-4">
<Badge className="bg-blue-500">B2</Badge>
</td>
<td className="py-3 px-4">
<Badge className="bg-amber-500">Öğrenilmekte</Badge>
</td>
<td className="py-3 px-4">
<div className="flex space-x-2">
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-volume-up text-blue-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-edit text-gray-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
</div>
</td>
</tr>
<tr>
<td className="py-3 px-4">
<div>
<span className="font-medium">nevertheless</span>
<div className="text-xs text-gray-500">/ˌnev.ə.ðəˈles/</div>
</div>
</td>
<td className="py-3 px-4">
<span>yine de, buna rağmen</span>
</td>
<td className="py-3 px-4">
<Badge className="bg-blue-500">B2</Badge>
</td>
<td className="py-3 px-4">
<Badge className="bg-amber-500">Öğrenilmekte</Badge>
</td>
<td className="py-3 px-4">
<div className="flex space-x-2">
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-volume-up text-blue-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-edit text-gray-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
</div>
</td>
</tr>
<tr>
<td className="py-3 px-4">
<div>
<span className="font-medium">ambiguous</span>
<div className="text-xs text-gray-500">/æmˈbɪɡ.ju.əs/</div>
</div>
</td>
<td className="py-3 px-4">
<span>belirsiz, muğlak</span>
</td>
<td className="py-3 px-4">
<Badge className="bg-indigo-500">C1</Badge>
</td>
<td className="py-3 px-4">
<Badge className="bg-red-500">Zor</Badge>
</td>
<td className="py-3 px-4">
<div className="flex space-x-2">
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-volume-up text-blue-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-edit text-gray-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
</div>
</td>
</tr>
<tr>
<td className="py-3 px-4">
<div>
<span className="font-medium">diverse</span>
<div className="text-xs text-gray-500">/daɪˈvɜːs/</div>
</div>
</td>
<td className="py-3 px-4">
<span>çeşitli, farklı</span>
</td>
<td className="py-3 px-4">
<Badge className="bg-blue-500">B1</Badge>
</td>
<td className="py-3 px-4">
<Badge className="bg-green-500">Öğrenildi</Badge>
</td>
<td className="py-3 px-4">
<div className="flex space-x-2">
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-volume-up text-blue-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-edit text-gray-600"></i>
</Button>
<Button size="sm" variant="ghost" className="w-8 h-8 p-0 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-ellipsis-h text-gray-600"></i>
</Button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
</CardContent>
</Card>
{/* Language Tools Sidebar */}
<div className="col-span-3 md:col-span-1">
<Card className="border-none shadow-md mb-6">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Kelime İstatistikleri</CardTitle>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Toplam Kelime</span>
<span className="text-sm font-medium text-blue-600">520</span>
</div>
<Progress value={52} className="h-2" />
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Öğrenilen</span>
<span className="text-sm font-medium text-green-600">320</span>
</div>
<Progress value={62} className="h-2 bg-gray-200">
<div className="h-full bg-green-600 rounded-full"></div>
</Progress>
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Öğrenilmekte</span>
<span className="text-sm font-medium text-amber-600">150</span>
</div>
<Progress value={29} className="h-2 bg-gray-200">
<div className="h-full bg-amber-600 rounded-full"></div>
</Progress>
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Zor Kelimeler</span>
<span className="text-sm font-medium text-red-600">50</span>
</div>
<Progress value={10} className="h-2 bg-gray-200">
<div className="h-full bg-red-600 rounded-full"></div>
</Progress>
</div>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md mb-6">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Pratik Araçları</CardTitle>
</CardHeader>
<CardContent>
<div className="space-y-3">
<Button
variant="outline"
id="vocabReviewButton"
onClick={() => setIsVocabReviewModalOpen(true)}
className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-sync-alt mr-2 text-purple-600"></i>
Kelime Tekrarı
</Button>
<Button variant="outline" className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-microphone mr-2 text-blue-600"></i>
Telaffuz Pratiği
</Button>
<Button
id="wordGamesButton"
variant="outline"
className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
onClick={() => setIsWordGamesModalOpen(true)}
>
<i className="fas fa-puzzle-piece mr-2 text-green-600"></i>
Kelime Oyunları
</Button>
<Button
id="sentencePracticeButton"
variant="outline"
className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
onClick={() => setIsSentencePracticeModalOpen(true)}
>
<i className="fas fa-pen-fancy mr-2 text-amber-600"></i>
Cümle Kurma Alıştırması
</Button>
<Button variant="outline" className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-check-circle mr-2 text-red-600"></i>
Mini Quiz
</Button>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Dil Kaynakları</CardTitle>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div className="p-3 bg-blue-50 rounded-lg">
<h4 className="font-medium text-blue-800 mb-1">Seviye Bazlı Kelime Listeleri</h4>
<p className="text-sm text-gray-600 mb-2">CEFR seviyelerine göre öğrenmeniz gereken kelimeler</p>
<div className="flex flex-wrap gap-2 mb-3">
<Badge variant="outline" className="bg-white cursor-pointer hover:bg-blue-100">A1</Badge>
<Badge variant="outline" className="bg-white cursor-pointer hover:bg-blue-100">A2</Badge>
<Badge variant="outline" className="bg-white cursor-pointer hover:bg-blue-100">B1</Badge>
<Badge variant="outline" className="bg-white cursor-pointer hover:bg-blue-100">B2</Badge>
<Badge variant="outline" className="bg-white cursor-pointer hover:bg-blue-100">C1</Badge>
<Badge variant="outline" className="bg-white cursor-pointer hover:bg-blue-100">C2</Badge>
</div>
<a href="https://readdy.ai/home/11d28807-c376-4c34-ad7f-2622a9d675a0/9a48ade0-867f-41c7-95f9-11ddb3f32016" data-readdy="true">
<Button
variant="outline"
className="w-full justify-center !rounded-button whitespace-nowrap cursor-pointer"
>
<i className="fas fa-list-ul mr-2"></i>
Kelime Listelerine Git
</Button>
</a>
</div>
<div className="p-3 bg-purple-50 rounded-lg">
<h4 className="font-medium text-purple-800 mb-1">Deyimler ve Kalıplar</h4>
<p className="text-sm text-gray-600 mb-2">Günlük konuşmada sık kullanılan ifadeler</p>
<Button size="sm" variant="outline" className="w-full justify-center !rounded-button whitespace-nowrap cursor-pointer">
Deyimler Arşivine Git
</Button>
</div>
<div className="p-3 bg-green-50 rounded-lg">
<h4 className="font-medium text-green-800 mb-1">Örnek Cümle Bankası</h4>
<p className="text-sm text-gray-600 mb-2">Kelimelerin gerçek kullanımlarını görün</p>
<Button size="sm" variant="outline" className="w-full justify-center !rounded-button whitespace-nowrap cursor-pointer">
Örnek Cümlelere Git
</Button>
</div>
</div>
</CardContent>
</Card>
</div>
</div>
</TabsContent>
{/* Achievements Tab */}
<TabsContent value="achievements" className="mt-0">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="col-span-3">
<div className="flex justify-between items-center mb-6">
<h2 className="text-2xl font-bold text-gray-800">Başarılar ve Rozetler</h2>
<div className="flex items-center">
<Badge className="bg-blue-600 mr-2">
<i className="fas fa-trophy mr-1"></i>
{earnedBadges} / 30 Rozet Kazanıldı
</Badge>
<Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-share-alt mr-2"></i>
Paylaş
</Button>
</div>
</div>
</div>
{/* Badges Grid */}
<div className="col-span-3 md:col-span-2">
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Rozetlerim</CardTitle>
<CardDescription>Öğrenme yolculuğunuzda kazandığınız başarılar</CardDescription>
</CardHeader>
<CardContent>
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
<div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
<div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
<i className="fas fa-fire text-2xl"></i>
</div>
<h4 className="font-medium text-gray-800 text-center">7 Gün Serisi</h4>
<p className="text-xs text-gray-500 text-center mt-1">7 gün üst üste çalışma</p>
</div>
<div className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-100">
<div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
<i className="fas fa-book text-2xl"></i>
</div>
<h4 className="font-medium text-gray-800 text-center">Kelime Ustası</h4>
<p className="text-xs text-gray-500 text-center mt-1">100 kelime öğrenildi</p>
</div>
<div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-100">
<div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
<i className="fas fa-headphones text-2xl"></i>
</div>
<h4 className="font-medium text-gray-800 text-center">Dinleme Uzmanı</h4>
<p className="text-xs text-gray-500 text-center mt-1">10 saat dinleme</p>
</div>
<div className="flex flex-col items-center p-4 bg-amber-50 rounded-lg border border-amber-100">
<div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-2">
<i className="fas fa-graduation-cap text-2xl"></i>
</div>
<h4 className="font-medium text-gray-800 text-center">İlk Kurs</h4>
<p className="text-xs text-gray-500 text-center mt-1">Bir kursu tamamladınız</p>
</div>
<div className="flex flex-col items-center p-4 bg-red-50 rounded-lg border border-red-100">
<div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
<i className="fas fa-comment text-2xl"></i>
</div>
<h4 className="font-medium text-gray-800 text-center">Konuşma Pratiği</h4>
<p className="text-xs text-gray-500 text-center mt-1">5 konuşma pratiği</p>
</div>
<div className="flex flex-col items-center p-4 bg-teal-50 rounded-lg border border-teal-100">
<div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-2">
<i className="fas fa-pen text-2xl"></i>
</div>
<h4 className="font-medium text-gray-800 text-center">Yazma Ustası</h4>
<p className="text-xs text-gray-500 text-center mt-1">10 yazma alıştırması</p>
</div>
<div className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg border border-indigo-100">
<div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-2">
<i className="fas fa-star text-2xl"></i>
</div>
<h4 className="font-medium text-gray-800 text-center">Mükemmel Quiz</h4>
<p className="text-xs text-gray-500 text-center mt-1">%100 doğru cevap</p>
</div>
<div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
<div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2">
<i className="fas fa-lock text-2xl"></i>
</div>
<h4 className="font-medium text-gray-400 text-center">???</h4>
<p className="text-xs text-gray-400 text-center mt-1">Henüz kilidi açılmadı</p>
</div>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md mt-6">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Yakın Zamanda Kazanılanlar</CardTitle>
<CardDescription>Son kazandığınız başarılar</CardDescription>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
<div className="flex items-center">
<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
<i className="fas fa-fire text-xl"></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">12 Gün Serisi</h4>
<p className="text-sm text-gray-600">12 gün üst üste öğrenme aktivitesi gerçekleştirdiniz</p>
</div>
<div className="text-xs text-gray-500">
2 gün önce
</div>
</div>
</div>
<div className="p-4 bg-green-50 rounded-lg border border-green-100">
<div className="flex items-center">
<div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
<i className="fas fa-book text-xl"></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">500 Kelime</h4>
<p className="text-sm text-gray-600">500 kelime öğrenme hedefine ulaştınız</p>
</div>
<div className="text-xs text-gray-500">
1 hafta önce
</div>
</div>
</div>
<div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
<div className="flex items-center">
<div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-4">
<i className="fas fa-headphones text-xl"></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">20 Saat Dinleme</h4>
<p className="text-sm text-gray-600">Toplam 20 saat İngilizce içerik dinlediniz</p>
</div>
<div className="text-xs text-gray-500">
2 hafta önce
</div>
</div>
</div>
</div>
</CardContent>
</Card>
</div>
{/* Achievements Sidebar */}
<div className="col-span-3 md:col-span-1">
<Card className="border-none shadow-md mb-6">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Seviye İlerlemesi</CardTitle>
</CardHeader>
<CardContent>
<div className="p-4 bg-blue-50 rounded-lg mb-4">
<div className="flex justify-between items-center mb-2">
<h3 className="font-bold text-blue-800">B1 Seviye</h3>
<Badge className="bg-blue-600">Mevcut</Badge>
</div>
<Progress value={65} className="h-2 mb-2" />
<div className="flex justify-between text-xs text-gray-600">
<span>B1 Başlangıç</span>
<span>B1 Orta</span>
<span>B1 İleri</span>
</div>
<p className="text-sm text-gray-600 mt-3">
B1 seviyesinin %65'ini tamamladınız. B2 seviyesine geçmek için 35% daha ilerlemeniz gerekiyor.
</p>
</div>
<div className="flex flex-col space-y-2">
<div className="flex items-center p-3 bg-gray-50 rounded-lg">
<div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
A1
</div>
<div className="flex-1">
<div className="flex justify-between">
<span className="text-sm font-medium">Temel Seviye</span>
<Badge className="bg-green-500">Tamamlandı</Badge>
</div>
<Progress value={100} className="h-1 mt-1" />
</div>
</div>
<div className="flex items-center p-3 bg-gray-50 rounded-lg">
<div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
A2
</div>
<div className="flex-1">
<div className="flex justify-between">
<span className="text-sm font-medium">Temel Seviye</span>
<Badge className="bg-green-500">Tamamlandı</Badge>
</div>
<Progress value={100} className="h-1 mt-1" />
</div>
</div>
<div className="flex items-center p-3 bg-blue-50 rounded-lg">
<div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 mr-3">
B1
</div>
<div className="flex-1">
<div className="flex justify-between">
<span className="text-sm font-medium">Orta Seviye</span>
<Badge className="bg-blue-500">Devam Ediyor</Badge>
</div>
<Progress value={65} className="h-1 mt-1" />
</div>
</div>
<div className="flex items-center p-3 bg-gray-50 rounded-lg">
<div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
B2
</div>
<div className="flex-1">
<div className="flex justify-between">
<span className="text-sm font-medium">Orta-Üstü Seviye</span>
<Badge variant="outline">Kilitli</Badge>
</div>
<Progress value={0} className="h-1 mt-1" />
</div>
</div>
<div className="flex items-center p-3 bg-gray-50 rounded-lg">
<div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
C1
</div>
<div className="flex-1">
<div className="flex justify-between">
<span className="text-sm font-medium">İleri Seviye</span>
<Badge variant="outline">Kilitli</Badge>
</div>
<Progress value={0} className="h-1 mt-1" />
</div>
</div>
<div className="flex items-center p-3 bg-gray-50 rounded-lg">
<div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
C2
</div>
<div className="flex-1">
<div className="flex justify-between">
<span className="text-sm font-medium">Ustalık Seviyesi</span>
<Badge variant="outline">Kilitli</Badge>
</div>
<Progress value={0} className="h-1 mt-1" />
</div>
</div>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Yaklaşan Hedefler</CardTitle>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div className="p-3 bg-blue-50 rounded-lg">
<h4 className="font-medium text-blue-800 mb-1">15 Gün Serisi</h4>
<p className="text-sm text-gray-600 mb-2">15 gün üst üste öğrenme aktivitesi</p>
<Progress value={80} className="h-2 mb-1" />
<div className="text-xs text-gray-500">12/15 gün tamamlandı</div>
</div>
<div className="p-3 bg-purple-50 rounded-lg">
<h4 className="font-medium text-purple-800 mb-1">30 Saat Dinleme</h4>
<p className="text-sm text-gray-600 mb-2">Toplam 30 saat İngilizce içerik dinleme</p>
<Progress value={70} className="h-2 mb-1" />
<div className="text-xs text-gray-500">21/30 saat tamamlandı</div>
</div>
<div className="p-3 bg-green-50 rounded-lg">
<h4 className="font-medium text-green-800 mb-1">750 Kelime</h4>
<p className="text-sm text-gray-600 mb-2">750 kelime öğrenme hedefi</p>
<Progress value={69} className="h-2 mb-1" />
<div className="text-xs text-gray-500">520/750 kelime öğrenildi</div>
</div>
<div className="p-3 bg-amber-50 rounded-lg">
<h4 className="font-medium text-amber-800 mb-1">5 Kurs Tamamlama</h4>
<p className="text-sm text-gray-600 mb-2">5 farklı kursu bitirme hedefi</p>
<Progress value={60} className="h-2 mb-1" />
<div className="text-xs text-gray-500">3/5 kurs tamamlandı</div>
</div>
</div>
</CardContent>
</Card>
</div>
</div>
</TabsContent>
{/* AI Features Tab */}
<TabsContent value="ai-features" className="mt-0">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="col-span-3">
<div className="flex justify-between items-center mb-6">
<h2 className="text-2xl font-bold text-gray-800">AI Destekli Özellikler</h2>
<Button
id="aiChatButton"
className="bg-indigo-600 hover:bg-indigo-700 !rounded-button whitespace-nowrap cursor-pointer"
onClick={() => {
setIsAIChatActive(true);
setActiveTab('ai-features');
setAiMessages([{
type: 'ai',
message: 'Merhaba! Size nasıl yardımcı olabilirim? İngilizce pratik yapmak istediğiniz konuyu seçebilirsiniz.'
}]);
setTimeout(() => {
const inputElement = document.getElementById('aiChatInput');
if (inputElement) {
inputElement.focus();
}
}, 100);
}}
>
<i className="fas fa-robot mr-2"></i>
AI Asistanla Konuş
</Button>
</div>
</div>
{/* AI Assistant */}
<Card className="border-none shadow-md col-span-3 md:col-span-2">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">AI Konuşma Asistanı</CardTitle>
<CardDescription>Gerçek konuşma pratiği için AI asistanla sohbet edin</CardDescription>
</CardHeader>
<CardContent>
<div className="bg-gray-50 rounded-lg p-4 mb-4">
<div className="h-[300px] overflow-y-auto" id="chatMessages">
{aiMessages.map((message, index) => (
message.type === 'ai' ? (
<div key={index} className="flex items-start mb-4">
<div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3 flex-shrink-0">
<i className="fas fa-robot"></i>
</div>
<div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
<p className="text-gray-800">{message.message}</p>
</div>
</div>
) : (
<div key={index} className="flex items-start justify-end mb-4">
<div className="bg-blue-600 p-3 rounded-lg shadow-sm max-w-[80%]">
<p className="text-white">{message.message}</p>
</div>
<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 ml-3 flex-shrink-0">
<i className="fas fa-user"></i>
</div>
</div>
)
))}
</div>
</div>
<div className="flex space-x-2">
<div className="relative flex-1">
<Input
id="aiChatInput"
value={userInput}
onChange={(e) => setUserInput(e.target.value)}
placeholder="İngilizce mesajınızı yazın..."
className="pl-10 pr-10 border-gray-300"
onKeyPress={(e) => {
if (e.key === 'Enter' && userInput.trim()) {
const newMessage = { type: 'user' as const, message: userInput };
setAiMessages([...aiMessages, newMessage]);
setUserInput('');
// Simulate AI response
setTimeout(() => {
const aiResponse = {
type: 'ai' as const,
message: "I understand. Let's practice English conversation. Could you tell me more about your interests?"
};
setAiMessages(prev => [...prev, aiResponse]);
}, 1000);
}
}}
/>
<i className="fas fa-keyboard absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
<Button
size="sm"
variant="ghost"
className="absolute right-2 top-1/2 transform -translate-y-1/2 !rounded-button whitespace-nowrap cursor-pointer"
onClick={() => {
setIsRecording(!isRecording);
// Here you would implement actual speech recognition
if (!isRecording) {
// Start recording
} else {
// Stop recording
}
}}
>
<i className={`fas fa-microphone ${isRecording ? 'text-red-600' : 'text-blue-600'}`}></i>
</Button>
</div>
<Button
className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer"
onClick={() => {
if (userInput.trim()) {
const newMessage = { type: 'user' as const, message: userInput };
setAiMessages([...aiMessages, newMessage]);
setUserInput('');
// Simulate AI response
setTimeout(() => {
const aiResponse = {
type: 'ai' as const,
message: "I understand. Let's practice English conversation. Could you tell me more about your interests?"
};
setAiMessages(prev => [...prev, aiResponse]);
}, 1000);
}
}}
>
<i className="fas fa-paper-plane"></i>
</Button>
</div>
<div className="mt-6">
<h3 className="text-lg font-bold text-gray-800 mb-3">Konuşma Özellikleri</h3>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-3 bg-blue-50 rounded-lg">
<div className="flex items-center mb-2">
<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
<i className="fas fa-comment-dots"></i>
</div>
<h4 className="font-medium text-blue-800">Konuşma Modu</h4>
</div>
<div className="flex justify-between text-sm">
<span>Günlük Konuşma</span>
<i className="fas fa-chevron-down text-gray-500"></i>
</div>
</div>
<div className="p-3 bg-purple-50 rounded-lg">
<div className="flex items-center mb-2">
<div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-2">
<i className="fas fa-globe"></i>
</div>
<h4 className="font-medium text-purple-800">Aksan</h4>
</div>
<div className="flex justify-between text-sm">
<span>Amerikan İngilizcesi</span>
<i className="fas fa-chevron-down text-gray-500"></i>
</div>
</div>
<div className="p-3 bg-green-50 rounded-lg">
<div className="flex items-center mb-2">
<div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-2">
<i className="fas fa-sliders-h"></i>
</div>
<h4 className="font-medium text-green-800">Zorluk</h4>
</div>
<div className="flex justify-between text-sm">
<span>B1 Seviye</span>
<i className="fas fa-chevron-down text-gray-500"></i>
</div>
</div>
</div>
</div>
</CardContent>
</Card>
{/* AI Features Sidebar */}
<div className="col-span-3 md:col-span-1">
<Card className="border-none shadow-md mb-6">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">AI Özellikler</CardTitle>
</CardHeader>
<CardContent>
<div className="space-y-4">
<Button variant="outline" className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-comment-alt mr-2 text-indigo-600"></i>
Konuşma Pratiği
</Button>
<Button variant="outline" className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-file-alt mr-2 text-blue-600"></i>
İçerik Özetleme
</Button>
<Button
id="personalRecommendationsBtn"
variant="outline"
className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
onClick={() => setIsPersonalRecommendationsOpen(true)}
>
<i className="fas fa-lightbulb mr-2 text-amber-600"></i>
Kişisel Öneriler
</Button>
<Button variant="outline" className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-spell-check mr-2 text-green-600"></i>
Yazım Kontrolü
</Button>
<Button variant="outline" className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-brain mr-2 text-purple-600"></i>
Kelime Çıkarımı
</Button>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md mb-6">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Konuşma Konuları</CardTitle>
</CardHeader>
<CardContent>
<div className="space-y-3">
<div className="p-3 bg-blue-50 rounded-lg cursor-pointer">
<h4 className="font-medium text-blue-800">Günlük Konuşmalar</h4>
<p className="text-xs text-gray-600 mt-1">Selamlaşma, tanışma, sohbet</p>
</div>
<div className="p-3 bg-green-50 rounded-lg cursor-pointer">
<h4 className="font-medium text-green-800">Seyahat</h4>
<p className="text-xs text-gray-600 mt-1">Otel, restoran, yön sorma</p>
</div>
<div className="p-3 bg-amber-50 rounded-lg cursor-pointer">
<h4 className="font-medium text-amber-800">İş Hayatı</h4>
<p className="text-xs text-gray-600 mt-1">Toplantılar, sunumlar, e-postalar</p>
</div>
<div 
id="hobbiesTopicBtn"
className="p-3 bg-purple-50 rounded-lg cursor-pointer"
onClick={() => {
  setIsAIChatActive(true);
  setActiveTab('ai-features');
  setAiMessages(prev => [...prev, {
    type: 'ai',
    message: "Let's talk about hobbies and interests! What sports do you like? What's your favorite type of music, movie, or book? You can tell me in English. Here are some example phrases you can use:\n\n• I enjoy playing/watching...\n• My favorite sport is...\n• I love listening to... music\n• I'm currently reading...\n• The best movie I've seen recently is..."
  }]);
  setTimeout(() => {
    const inputElement = document.getElementById('aiChatInput');
    if (inputElement) {
      inputElement.focus();
    }
  }, 100);
}}
>
<h4 className="font-medium text-purple-800">Hobiler ve İlgi Alanları</h4>
<p className="text-xs text-gray-600 mt-1">Spor, müzik, film, kitaplar</p>
</div>
<div className="p-3 bg-red-50 rounded-lg cursor-pointer">
<h4 className="font-medium text-red-800">Güncel Konular</h4>
<p className="text-xs text-gray-600 mt-1">Haberler, teknoloji, çevre</p>
</div>
</div>
</CardContent>
</Card>
<Card className="border-none shadow-md">
<CardHeader className="pb-2">
<CardTitle className="text-xl font-bold text-gray-800">Konuşma İstatistikleri</CardTitle>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Toplam Konuşma</span>
<span className="text-sm font-medium text-blue-600">45 dakika</span>
</div>
<Progress value={45} className="h-2" />
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Doğru Telaffuz</span>
<span className="text-sm font-medium text-green-600">78%</span>
</div>
<Progress value={78} className="h-2 bg-gray-200">
<div className="h-full bg-green-600 rounded-full"></div>
</Progress>
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Akıcılık</span>
<span className="text-sm font-medium text-amber-600">65%</span>
</div>
<Progress value={65} className="h-2 bg-gray-200">
<div className="h-full bg-amber-600 rounded-full"></div>
</Progress>
</div>
<div>
<div className="flex justify-between mb-1">
<span className="text-sm font-medium text-gray-700">Kelime Çeşitliliği</span>
<span className="text-sm font-medium text-purple-600">70%</span>
</div>
<Progress value={70} className="h-2 bg-gray-200">
<div className="h-full bg-purple-600 rounded-full"></div>
</Progress>
</div>
</div>
<Button variant="outline" className="w-full mt-4 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-chart-line mr-2"></i>
Detaylı Analiz
</Button>
</CardContent>
</Card>
</div>
</div>
</TabsContent>
</Tabs>
</div>
{/* New Content Modal */}
{isNewContentModalOpen && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
<div className="bg-white rounded-lg w-full max-w-2xl p-6">
<div className="flex justify-between items-center mb-6">
<h3 className="text-xl font-bold text-gray-800">Yeni İçerik Ekle</h3>
<Button
variant="ghost"
size="sm"
className="!rounded-button"
onClick={() => setIsNewContentModalOpen(false)}
>
<i className="fas fa-times"></i>
</Button>
</div>
<div className="space-y-4">
<div>
<Label htmlFor="contentTitle">İçerik Başlığı</Label>
<Input id="contentTitle" placeholder="İçerik başlığını girin" className="mt-1" />
</div>
<div>
<Label htmlFor="contentType">İçerik Türü</Label>
<select
id="contentType"
value={contentType}
onChange={(e) => setContentType(e.target.value)}
className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
>
<option value="video">Video</option>
<option value="podcast">Podcast</option>
<option value="article">Makale</option>
<option value="document">Doküman</option>
</select>
</div>
<div>
<Label htmlFor="languageLevel">Dil Seviyesi</Label>
<select
id="languageLevel"
value={languageLevel}
onChange={(e) => setLanguageLevel(e.target.value)}
className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
>
<option value="a1">A1 - Başlangıç</option>
<option value="a2">A2 - Temel</option>
<option value="b1">B1 - Orta</option>
<option value="b2">B2 - Orta Üstü</option>
<option value="c1">C1 - İleri</option>
<option value="c2">C2 - Ustalık</option>
</select>
</div>
<div>
<Label htmlFor="contentDescription">Açıklama</Label>
<textarea
id="contentDescription"
className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md h-24"
placeholder="İçerik hakkında açıklama yazın"
></textarea>
</div>
<div>
<Label htmlFor="contentUrl">İçerik URL veya Dosya</Label>
<div className="flex gap-2 mt-1">
<Input id="contentUrl" placeholder="URL girin veya dosya yükleyin" className="flex-1" />
<Button variant="outline" className="!rounded-button whitespace-nowrap">
<i className="fas fa-upload mr-2"></i>
Dosya Seç
</Button>
</div>
</div>
<div>
<Label htmlFor="contentTags">Etiketler</Label>
<Input
id="contentTags"
placeholder="Etiketleri virgülle ayırarak girin"
className="mt-1"
/>
</div>
<div className="flex justify-end space-x-2 mt-6">
<Button
variant="outline"
onClick={() => setIsNewContentModalOpen(false)}
className="!rounded-button whitespace-nowrap"
>
İptal
</Button>
<Button
className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap"
onClick={() => {
// Handle save logic here
setIsNewContentModalOpen(false);
}}
>
Kaydet
</Button>
</div>
</div>
</div>
</div>
)}
{/* Vocabulary Review Modal */}
{isVocabReviewModalOpen && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
<div className="bg-white rounded-lg w-full max-w-3xl p-6">
<div className="flex justify-between items-center mb-6">
<h3 className="text-xl font-bold text-gray-800">Kelime Tekrarı</h3>
<Button
variant="ghost"
size="sm"
className="!rounded-button"
onClick={() => {
setIsVocabReviewModalOpen(false);
setCurrentWordIndex(0);
}}
>
<i className="fas fa-times"></i>
</Button>
</div>
<div className="mb-6">
<div className="flex space-x-4 mb-4">
<select
className="px-3 py-2 border border-gray-300 rounded-md"
value={reviewSettings.difficulty}
onChange={(e) => setReviewSettings(prev => ({...prev, difficulty: e.target.value}))}
>
<option value="all">Tüm Seviyeler</option>
<option value="A1">A1</option>
<option value="A2">A2</option>
<option value="B1">B1</option>
<option value="B2">B2</option>
</select>
<select
className="px-3 py-2 border border-gray-300 rounded-md"
value={reviewSettings.category}
onChange={(e) => setReviewSettings(prev => ({...prev, category: e.target.value}))}
>
<option value="all">Tüm Kategoriler</option>
<option value="business">İş İngilizcesi</option>
<option value="academic">Akademik</option>
<option value="daily">Günlük Konuşma</option>
</select>
</div>
</div>
{currentWordIndex < sampleWords.length ? (
<div className="text-center">
<div className="mb-8">
<div className="flex items-center justify-center gap-3 mb-4">
<h2 className="text-3xl font-bold text-gray-800">{sampleWords[currentWordIndex].word}</h2>
<Button
variant="ghost"
size="sm"
className="w-8 h-8 rounded-full"
onClick={() => playWordAudio(sampleWords[currentWordIndex].word)}
>
<i className="fas fa-volume-up text-blue-600"></i>
</Button>
</div>
<p className="text-gray-500 mb-4">{sampleWords[currentWordIndex].pronunciation}</p>
<p className="text-xl text-gray-700 mb-4">{sampleWords[currentWordIndex].meaning}</p>
<div className="bg-blue-50 p-4 rounded-lg mb-4">
<p className="text-gray-700 italic">{sampleWords[currentWordIndex].example}</p>
<Button
variant="ghost"
size="sm"
className="mt-2"
onClick={() => playWordAudio(sampleWords[currentWordIndex].example)}
>
<i className="fas fa-play mr-2"></i>
Örnek Cümleyi Dinle
</Button>
</div>
<div className="flex justify-center gap-2 mb-4">
<Badge className="bg-blue-500">{sampleWords[currentWordIndex].difficulty}</Badge>
<Badge className="bg-purple-500">{sampleWords[currentWordIndex].category}</Badge>
</div>
<Progress
value={(currentWordIndex / sampleWords.length) * 100}
className="w-full h-2 mb-2"
/>
<p className="text-sm text-gray-500">
İlerleme: {currentWordIndex + 1} / {sampleWords.length} kelime
</p>
</div>
<div className="flex justify-center space-x-4 mb-6">
<Button
variant="outline"
className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 !rounded-button whitespace-nowrap"
onClick={() => handleWordResponse(false)}
>
<i className="fas fa-times mr-2"></i>
Bilmiyorum
</Button>
<Button
id="knowWordButton"
className={`bg-green-600 hover:bg-green-700 !rounded-button whitespace-nowrap ${showFeedback ? 'opacity-50 cursor-not-allowed' : ''}`}
onClick={() => !showFeedback && handleWordResponse(true)}
disabled={showFeedback}
>
<i className="fas fa-check mr-2"></i>
Biliyorum
</Button>
</div>
<div className="flex justify-between text-sm text-gray-500">
<span>Kelime {currentWordIndex + 1}/{sampleWords.length}</span>
<Button
variant="ghost"
size="sm"
onClick={() => {
if (currentWordIndex < sampleWords.length - 1) {
setCurrentWordIndex(prev => prev + 1);
}
}}
>
<i className="fas fa-forward"></i>
</Button>
</div>
</div>
) : (
<div className="text-center">
<div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-4">
<i className="fas fa-check text-2xl"></i>
</div>
<h3 className="text-xl font-bold text-gray-800 mb-2">Tekrar Tamamlandı!</h3>
<p className="text-gray-600 mb-6">
Toplam {sampleWords.length} kelimeden:
<br />
{reviewSettings.knownWords.size} kelimeyi biliyorsunuz
<br />
{reviewSettings.unknownWords.size} kelimeyi tekrar çalışmanız gerekiyor
</p>
<div className="flex justify-center space-x-4">
<Button
variant="outline"
onClick={() => {
setCurrentWordIndex(0);
setReviewSettings(prev => ({...prev, knownWords: new Set(), unknownWords: new Set()}));
}}
className="!rounded-button whitespace-nowrap"
>
Tekrar Başla
</Button>
<Button
className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap"
onClick={() => {
setIsVocabReviewModalOpen(false);
setCurrentWordIndex(0);
setReviewSettings(prev => ({...prev, knownWords: new Set(), unknownWords: new Set()}));
}}
>
Kapat
</Button>
</div>
</div>
)}
</div>
</div>
)}
{/* Word Games Modal */}
{isWordGamesModalOpen && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
<div className="bg-white rounded-lg w-full max-w-4xl p-6">
<div className="flex justify-between items-center mb-6">
<h3 className="text-xl font-bold text-gray-800">Kelime Oyunları</h3>
<Button
variant="ghost"
size="sm"
className="!rounded-button"
onClick={() => {
setIsWordGamesModalOpen(false);
setSelectedGame(null);
}}
>
<i className="fas fa-times"></i>
</Button>
</div>
{!selectedGame ? (
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{wordGames.map((game) => (
<div
key={game.id}
className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-500 cursor-pointer transition-all"
onClick={() => setSelectedGame(game.id)}
>
<div className="flex items-start">
<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
<i className={`${game.icon} text-xl`}></i>
</div>
<div className="flex-1">
<h4 className="font-medium text-gray-800">{game.title}</h4>
<p className="text-sm text-gray-600 mt-1">{game.description}</p>
<div className="flex items-center mt-2 space-x-2">
<Badge className="bg-blue-100 text-blue-700">{game.difficulty}</Badge>
<Badge className="bg-gray-100 text-gray-700">
<i className="fas fa-clock mr-1"></i>
{game.duration}
</Badge>
</div>
</div>
</div>
</div>
))}
</div>
) : (
<div className="text-center py-8">
<div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
<i className={`${wordGames.find(g => g.id === selectedGame)?.icon} text-2xl`}></i>
</div>
<h3 className="text-xl font-bold text-gray-800 mb-4">
{wordGames.find(g => g.id === selectedGame)?.title}
</h3>
<p className="text-gray-600 mb-6">Oyun yükleniyor...</p>
<Button
variant="outline"
onClick={() => setSelectedGame(null)}
className="!rounded-button whitespace-nowrap"
>
<i className="fas fa-arrow-left mr-2"></i>
Oyunlara Dön
</Button>
</div>
)}
</div>
</div>
)}
{/* Sentence Practice Modal */}
{isSentencePracticeModalOpen && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
<div className="bg-white rounded-lg w-full max-w-3xl p-6">
<div className="flex justify-between items-center mb-6">
<h3 className="text-xl font-bold text-gray-800">Cümle Kurma Alıştırması</h3>
<Button
variant="ghost"
size="sm"
className="!rounded-button"
onClick={() => {
setIsSentencePracticeModalOpen(false);
setCurrentPracticeWord(null);
setUserSentence('');
setSentenceFeedback(null);
}}
>
<i className="fas fa-times"></i>
</Button>
</div>
{!currentPracticeWord ? (
<div className="text-center py-8">
<div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
<i className="fas fa-pen-fancy text-2xl"></i>
</div>
<h3 className="text-lg font-medium text-gray-800 mb-2">Cümle Kurma Alıştırmasına Hoş Geldiniz!</h3>
<p className="text-gray-600 mb-6">Kelime defterinizdeki kelimeleri kullanarak cümle kurma pratiği yapın.</p>
<Button
className="bg-amber-600 hover:bg-amber-700 !rounded-button whitespace-nowrap"
onClick={() => {
const randomWord = sampleWords[Math.floor(Math.random() * sampleWords.length)];
setCurrentPracticeWord(randomWord);
}}
>
Başla
</Button>
</div>
) : (
<div>
<div className="bg-amber-50 p-4 rounded-lg mb-6">
<div className="flex items-center gap-3 mb-2">
<h4 className="text-lg font-medium text-gray-800">Kelime: <span className="text-amber-700">{currentPracticeWord.word}</span></h4>
<Button
variant="ghost"
size="sm"
className="w-8 h-8 rounded-full"
onClick={() => playWordAudio(currentPracticeWord.word)}
>
<i className="fas fa-volume-up text-amber-600"></i>
</Button>
</div>
<p className="text-gray-600">{currentPracticeWord.meaning}</p>
</div>
<div className="mb-6">
<Label htmlFor="sentenceInput">Bu kelimeyi kullanarak bir cümle yazın:</Label>
<div className="flex gap-2 mt-2">
<Input
id="sentenceInput"
value={userSentence}
onChange={(e) => setUserSentence(e.target.value)}
placeholder="Cümlenizi buraya yazın..."
className="flex-1"
/>
<Button
className="bg-amber-600 hover:bg-amber-700 !rounded-button whitespace-nowrap"
onClick={() => {
setSentenceFeedback({
isCorrect: true,
grammar: "Cümleniz dilbilgisi açısından doğru.",
usage: "Kelimeyi doğru bir şekilde kullandınız.",
suggestions: "Alternatif olarak şu cümleleri de kurabilirsiniz:",
examples: [
currentPracticeWord.example,
"Another example sentence using the word.",
"One more example with different context."
]
});
}}
>
Kontrol Et
</Button>
</div>
</div>
{sentenceFeedback && (
<div className="space-y-4">
<div className={`p-4 rounded-lg ${sentenceFeedback.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
<h5 className="font-medium text-gray-800 mb-2">Değerlendirme</h5>
<p className="text-gray-600 mb-2">{sentenceFeedback.grammar}</p>
<p className="text-gray-600">{sentenceFeedback.usage}</p>
</div>
<div className="bg-blue-50 p-4 rounded-lg">
<h5 className="font-medium text-gray-800 mb-2">{sentenceFeedback.suggestions}</h5>
<ul className="space-y-2">
{sentenceFeedback.examples.map((example: string, index: number) => (
<li key={index} className="text-gray-600">• {example}</li>
))}
</ul>
</div>
<div className="flex justify-end space-x-2 mt-6">
<Button
variant="outline"
onClick={() => {
const randomWord = sampleWords[Math.floor(Math.random() * sampleWords.length)];
setCurrentPracticeWord(randomWord);
setUserSentence('');
setSentenceFeedback(null);
}}
className="!rounded-button whitespace-nowrap"
>
<i className="fas fa-sync-alt mr-2"></i>
Yeni Kelime
</Button>
<Button
className="bg-amber-600 hover:bg-amber-700 !rounded-button whitespace-nowrap"
onClick={() => {
setIsSentencePracticeModalOpen(false);
setCurrentPracticeWord(null);
setUserSentence('');
setSentenceFeedback(null);
}}
>
Bitir
</Button>
</div>
</div>
)}
</div>
)}
</div>
</div>
)}
{/* Personal Recommendations Dialog */}
{isPersonalRecommendationsOpen && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
<div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
<div className="flex justify-between items-center mb-6">
<h3 className="text-xl font-bold text-gray-800">Kişiselleştirilmiş Öneriler</h3>
<Button
variant="ghost"
size="sm"
className="!rounded-button"
onClick={() => setIsPersonalRecommendationsOpen(false)}
>
<i className="fas fa-times"></i>
</Button>
</div>
{/* Words Section */}
<div className="mb-8">
<h4 className="text-lg font-semibold text-gray-800 mb-4">
<i className="fas fa-book text-blue-600 mr-2"></i>
Önerilen Kelimeler
</h4>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
{personalRecommendations.words.map((word, index) => (
<div key={index} className="p-4 bg-blue-50 rounded-lg">
<h5 className="font-medium text-blue-800">{word.word}</h5>
<p className="text-sm text-gray-600 mt-1">{word.meaning}</p>
<p className="text-xs text-gray-500 mt-2 italic">{word.example}</p>
</div>
))}
</div>
</div>
{/* Content Section */}
<div className="mb-8">
<h4 className="text-lg font-semibold text-gray-800 mb-4">
<i className="fas fa-play-circle text-green-600 mr-2"></i>
Önerilen İçerikler
</h4>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{personalRecommendations.content.map((content, index) => (
<div key={index} className="p-4 bg-green-50 rounded-lg">
<div className="flex justify-between items-start">
<div>
<h5 className="font-medium text-green-800">{content.title}</h5>
<p className="text-sm text-gray-600 mt-1">{content.description}</p>
</div>
<Badge className="bg-green-600">{content.level}</Badge>
</div>
<div className="flex items-center mt-3 text-sm text-gray-600">
<i className="fas fa-clock mr-1"></i>
{content.duration}
</div>
</div>
))}
</div>
</div>
{/* Exercises Section */}
<div className="mb-8">
<h4 className="text-lg font-semibold text-gray-800 mb-4">
<i className="fas fa-tasks text-purple-600 mr-2"></i>
Önerilen Alıştırmalar
</h4>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{personalRecommendations.exercises.map((exercise, index) => (
<div key={index} className="p-4 bg-purple-50 rounded-lg">
<div className="flex justify-between items-start">
<div>
<h5 className="font-medium text-purple-800">{exercise.title}</h5>
<p className="text-sm text-gray-600 mt-1">{exercise.type}</p>
</div>
<Badge className="bg-purple-600">{exercise.difficulty}</Badge>
</div>
<div className="flex items-center justify-between mt-3">
<span className="text-sm text-gray-600">
<i className="fas fa-clock mr-1"></i>
{exercise.duration}
</span>
<span className="text-sm text-gray-600">{exercise.completion}</span>
</div>
</div>
))}
</div>
</div>
{/* Learning Plan Section */}
<div className="mb-8">
<h4 className="text-lg font-semibold text-gray-800 mb-4">
<i className="fas fa-calendar-alt text-amber-600 mr-2"></i>
Öğrenme Planı
</h4>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="p-4 bg-amber-50 rounded-lg">
<h5 className="font-medium text-amber-800 mb-3">Günlük Plan</h5>
<div className="space-y-3">
{personalRecommendations.learningPlan.daily.map((activity, index) => (
<div key={index} className="flex items-center justify-between">
<div className="flex items-center">
<span className="text-amber-700 font-medium">{activity.time}</span>
<span className="mx-2">-</span>
<span className="text-gray-600">{activity.activity}</span>
</div>
<span className="text-sm text-gray-500">{activity.duration}</span>
</div>
))}
</div>
</div>
<div className="p-4 bg-amber-50 rounded-lg">
<h5 className="font-medium text-amber-800 mb-3">Haftalık Plan</h5>
<div className="space-y-2">
{personalRecommendations.learningPlan.weekly.map((plan, index) => (
<div key={index} className="text-gray-600">{plan}</div>
))}
</div>
</div>
</div>
</div>
{/* Action Buttons */}
<div className="flex justify-end space-x-3">
<Button
variant="outline"
className="!rounded-button whitespace-nowrap"
onClick={() => {
// Add to calendar logic here
setIsPersonalRecommendationsOpen(false);
}}
>
<i className="fas fa-calendar-plus mr-2"></i>
Takvimime Ekle
</Button>
<Button
className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap"
onClick={() => {
// Start learning logic here
setIsPersonalRecommendationsOpen(false);
}}
>
<i className="fas fa-play mr-2"></i>
Şimdi Başla
</Button>
</div>
</div>
</div>
)}
{/* Footer */}
<footer className="bg-gray-900 text-white py-12 mt-12">
<div className="container mx-auto px-4">
<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
<div>
<h3 className="text-xl font-bold mb-4">AI İngilizce</h3>
<p className="text-gray-400">
Yapay zeka destekli İngilizce öğrenme platformu ile dil öğrenme deneyiminizi kişiselleştirin.
</p>
<div className="flex space-x-4 mt-4">
<a href="#" className="text-gray-400 hover:text-white cursor-pointer">
<i className="fab fa-facebook-f"></i>
</a>
<a href="#" className="text-gray-400 hover:text-white cursor-pointer">
<i className="fab fa-twitter"></i>
</a>
<a href="#" className="text-gray-400 hover:text-white cursor-pointer">
<i className="fab fa-instagram"></i>
</a>
<a href="#" className="text-gray-400 hover:text-white cursor-pointer">
<i className="fab fa-linkedin-in"></i>
</a>
</div>
</div>
<div>
<h4 className="text-lg font-medium mb-4">Özellikler</h4>
<ul className="space-y-2">
<li><a href="#" className="text-gray-400 hover:text-white cursor-pointer">Ses Dönüşümü</a></li>
<li><a href="#" className="text-gray-400 hover:text-white cursor-pointer">Aksan Seçenekleri</a></li>
<li><a href="#" className="text-gray-400 hover:text-white cursor-pointer">Kişiselleştirilmiş İçerik</a></li>
<li><a href="#" className="text-gray-400 hover:text-white cursor-pointer">Seviye Testleri</a></li>
</ul>
</div>
<div>
<h4 className="text-lg font-medium mb-4">Kaynaklar</h4>
<ul className="space-y-2">
<li><a href="#" className="text-gray-400 hover:text-white cursor-pointer">Blog</a></li>
<li><a href="#" className="text-gray-400 hover:text-white cursor-pointer">Eğitim Videoları</a></li>
<li><a href="#" className="text-gray-400 hover:text-white cursor-pointer">Sık Sorulan Sorular</a></li>
<li><a href="#" className="text-gray-400 hover:text-white cursor-pointer">Destek</a></li>
</ul>
</div>
<div>
<h4 className="text-lg font-medium mb-4">İletişim</h4>
<ul className="space-y-2">
<li className="flex items-center">
<i className="fas fa-envelope mr-2 text-gray-400"></i>
<a href="mailto:info@aiingilizce.com" className="text-gray-400 hover:text-white cursor-pointer">info@aiingilizce.com</a>
</li>
<li className="flex items-center">
<i className="fas fa-phone-alt mr-2 text-gray-400"></i>
<a href="tel:+902121234567" className="text-gray-400 hover:text-white cursor-pointer">+90 212 123 45 67</a>
</li>
</ul>
<div className="mt-4">
<h5 className="text-sm font-medium mb-2">Bültenimize Abone Olun</h5>
<div className="flex">
<Input
placeholder="E-posta adresiniz"
className="bg-gray-800 border-gray-700 text-white"
/>
<Button className="ml-2 bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer">
<i className="fas fa-paper-plane"></i>
</Button>
</div>
</div>
</div>
</div>
<div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
<p className="text-gray-400 text-sm">
&copy; {new Date().getFullYear()} AI İngilizce. Tüm hakları saklıdır.
</p>
<div className="flex space-x-4 mt-4 md:mt-0">
<a href="#" className="text-gray-400 hover:text-white text-sm cursor-pointer">Gizlilik Politikası</a>
<a href="#" className="text-gray-400 hover:text-white text-sm cursor-pointer">Kullanım Şartları</a>
<a href="#" className="text-gray-400 hover:text-white text-sm cursor-pointer">Çerez Politikası</a>
</div>
</div>
</div>
</footer>
</div>
);
};
export default App