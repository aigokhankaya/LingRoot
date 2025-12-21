
import React, { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";

interface TTSOverlayProps {
  onClose: () => void;
}

const TTSOverlay: React.FC<TTSOverlayProps> = ({ onClose }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  const handleGenerateTTS = async () => {
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read this clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const dataInt16 = new Int16Array(bytes.buffer);
        const numChannels = 1;
        const frameCount = dataInt16.length / numChannels;
        const buffer = audioContext.createBuffer(numChannels, frameCount, 24000);

        for (let channel = 0; channel < numChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
          }
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => setPlaying(false);
        setPlaying(true);
        source.start();
      }
    } catch (error) {
      console.error("TTS Generation Error:", error);
      alert("Failed to generate speech. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-scale-up relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600"
        >
          <span className="material-icons-round">close</span>
        </button>

        <h2 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
          <span className="material-icons-round text-blue-500">volume_up</span>
          Text to Speech
        </h2>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something to hear it read aloud..."
          className="w-full h-40 p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-700 resize-none mb-6"
        />

        <button
          onClick={handleGenerateTTS}
          disabled={loading || !text.trim()}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
            ${loading ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 
              'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/20 hover:scale-105 active:scale-95'}
          `}
        >
          {loading ? (
            <>
              <span className="material-icons-round animate-spin">refresh</span>
              Generating...
            </>
          ) : playing ? (
            <>
              <span className="material-icons-round animate-pulse">hearing</span>
              Playing Audio...
            </>
          ) : (
            <>
              <span className="material-icons-round">play_arrow</span>
              Listen Now
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
          Powered by Gemini AI
        </p>
      </div>
    </div>
  );
};

export default TTSOverlay;
