import React, { useState } from 'react';
import Header from "../src/components/Header";
import Footer from "../src/components/Footer";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function HomePage() {
  const [selectedLevel, setSelectedLevel] = useState("B1");
  const [input, setInput] = useState("");

  return (
    <>
      <Header />
      <main className="bg-[#f8fafc] min-h-screen">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 mt-32 pt-32 pb-12">
          <div className="w-full text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-light">  </h2>
            <h2 className="text-gray-800"></h2>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start gap-16">
            {/* Sol Kutu */}
            <div className="flex-1 min-w-0 max-w-xl">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-center md:text-left">
                <span className="text-gray-800">Yapay Zeka ile </span>
                <span className="text-blue-600">İngilizceyi</span>
                <span className="text-gray-800"> Keşfet, </span>
                <span className="text-yellow-400">Akıcı Konuş!</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 text-center md:text-left">
                En sevdiğin videoları, makaleleri veya podcastleri anında kendi İngilizce seviyene uygun sesli derslere dönüştür. LingRoot ile öğrenmek hem eğlenceli hem de etkili!
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                <input
                  type="text"
                  className="w-full sm:w-2/3 px-4 py-3 rounded-xl border-2 border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base shadow-sm"
                  placeholder="Bir YouTube linki yapıştırın veya metin girin..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all text-base">
                  Öğrenmeye Başla!
                </button>
              </div>
              <div className="text-gray-400 text-xs text-center md:text-left">
                Desteklenenler: YouTube, Metin, .txt, .pdf (yakında: Spotify, .docx)
              </div>
            </div>

            {/* Sağ Kutu */}
            <div className="flex-1 min-w-0 max-w-xl bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center justify-center">
              <div className="w-full aspect-video bg-gray-100 rounded-xl flex flex-col items-center justify-center mb-6 border border-gray-200">
                <video
                  className="w-full h-full rounded-xl"
                  controls
                  poster="/video_placeholder.png"
                >
                  <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                  Tarayıcınız video etiketini desteklemiyor.
                </video>
              </div>
              <div className="font-semibold text-gray-700 mb-2">Hedef Seviyeniz:</div>
              <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                {levels.map(lvl => (
                  <button
                    key={lvl}
                    className={`py-2 rounded-xl font-bold border text-base transition-all ${
                      selectedLevel === lvl
                        ? 'bg-yellow-400 text-white border-yellow-400 shadow'
                        : 'bg-white text-blue-600 border-blue-400 hover:bg-blue-50'
                    }`}
                    onClick={() => setSelectedLevel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-[#f4f6fa] py-12">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">1</div>
                <div className="text-gray-700">Paste YouTube, Spotify, Text, or File</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">2</div>
                <div className="text-gray-700">Choose your English level</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">3</div>
                <div className="text-gray-700">Listen as English audio</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}