"use client";

import { useState } from "react";
import { processTts, submitContent, ProcessInputData, TtsResponseData, ApiResponse, getUsageSummary } from "../lib/api";

interface InputFormProps {
  onSuccess?: (data: {
    message: string;
    mp3_url: string;
    vtt_url: string;
    level: string;
  }) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onSuccess }) => {
  const [inputType, setInputType] = useState<"text" | "youtube" | "podcast" | "file">("text");
  const [text, setText] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [podcastLink, setPodcastLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState("A1");
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage("");
    setIsSuccess(false);
    const startTime = Date.now(); // Track processing duration

    const data: ProcessInputData = {
      type: inputType,
      level: level,
      SesHızı: speakingRate,
      text: inputType === "text" ? text : undefined,
      input: inputType === "youtube" ? youtubeLink : (inputType === "podcast" ? podcastLink : undefined),
      file: inputType === "file" ? (file || undefined) : undefined,
    };

    if ((inputType === "text" && !data.text?.trim()) ||
      ((inputType === "youtube" || inputType === "podcast") && !data.input?.trim()) ||
      (inputType === "file" && !data.file)) {
      setIsError(true);
      setErrorMessage("Please provide the required input for the selected type.");
      setIsLoading(false);
      return;
    }

    try {
      // Kullanım limiti kontrolü (client-side ön kontrol)
      try {
        const summary = await getUsageSummary();
        if (summary?.success && summary.data?.isExceeded) {
          setIsError(true);
          setErrorMessage('Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin veya dönemi bekleyin.');
          setIsLoading(false);
          return;
        }
      } catch { }

      const result: TtsResponseData = await processTts(data);
      if (result.mp3_url) {
        setIsSuccess(true);
        if (onSuccess) {
          onSuccess({
            message: result.message || "",
            mp3_url: result.mp3_url,
            vtt_url: result.vtt_url || "",
            level: result.level || level,
          });
        }
        try {
          const logInput = data.text || data.input || data.file?.name || "unknown_input";
          await submitContent(
            logInput,
            inputType,
            result.level || level,
            result.mp3_url,
            result.translated_text || result.translatedText || '',
            result.adapted_text || result.adaptedText || '',
            undefined, // chapterId
            undefined, // timepoints
            undefined, // words
            undefined, // detectedMood
            Date.now() - startTime // processingDurationMs
          );
          console.log("Content submission logged successfully.");
        } catch (logError) {
          console.error("Error logging content submission:", logError);
        }
      } else {
        throw new Error(result.message || "API call succeeded but returned no audio URL.");
      }
    } catch (err: any) {
      console.error("Error during TTS processing:", err);
      setIsError(true);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full pt-10 px-6 md:px-12 lg:px-32">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">Try it Yourself</h2>
        <div className="space-y-2">
          <label className="block font-medium">Input Type</label>
          <select
            className="w-full border border-gray-300 rounded p-2"
            value={inputType}
            onChange={(e) => setInputType(e.target.value as typeof inputType)}
          >
            <option value="text">Plain Text</option>
            <option value="youtube">YouTube Link</option>
            <option value="podcast">Podcast Link</option>
            <option value="file">Upload File (PDF/Word)</option>
          </select>
        </div>
        {inputType === "text" && (
          <div className="space-y-2">
            <label className="block font-medium">Enter your text</label>
            <textarea
              className="w-full border border-gray-300 rounded p-3 h-32"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your English text here..."
            />
          </div>
        )}
        {inputType === "youtube" && (
          <div className="space-y-2">
            <label className="block font-medium">YouTube Link</label>
            <input
              type="url"
              className="w-full border border-gray-300 rounded p-3"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        )}
        {inputType === "podcast" && (
          <div className="space-y-2">
            <label className="block font-medium">Podcast Link</label>
            <input
              type="url"
              className="w-full border border-gray-300 rounded p-3"
              value={podcastLink}
              onChange={(e) => setPodcastLink(e.target.value)}
              placeholder="https://open.spotify.com/episode/..."
            />
          </div>
        )}
        {inputType === "file" && (
          <div className="space-y-2">
            <label className="block font-medium">Upload File (PDF or DOCX)</label>
            <input
              type="file"
              className="w-full border border-gray-300 rounded p-3 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              accept=".pdf, .docx, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <p className="text-xs text-amber-700 mt-1">
              Bu alana yüklediğiniz dosyaların (PDF/DOCX) içeriğinin hukuka ve telif haklarına uygunluğundan tamamen siz sorumlusunuz.
              LingRoot, kullanıcılar tarafından yüklenen dosya içeriklerinden doğabilecek hiçbir hukuki, idari veya cezai sorumluluğu üstlenmez.
            </p>
          </div>
        )}
        <div className="space-y-2">
          <label className="block font-medium">Target English Level</label>
          <select
            className="w-full border border-gray-300 rounded p-2"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="speakingRate" className="block font-medium">Speaking Rate ({speakingRate.toFixed(1)})</label>
          <input
            id="speakingRate"
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={speakingRate}
            onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
        {isLoading && <p className="text-primary">Preparing audio...</p>}
        {isError && (
          <div className="text-red-600 bg-red-100 border border-red-400 rounded p-3 space-y-2">
            <p className="font-semibold">Error:</p>
            <p>{errorMessage}</p>
          </div>
        )}
        {isSuccess && <p className="text-green-600">✅ Audio generated successfully!</p>}
        <button
          onClick={handleSubmit}
          className="bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || (inputType === 'file' && !file) || (inputType === 'text' && !text.trim()) || (inputType === 'youtube' && !youtubeLink.trim()) || (inputType === 'podcast' && !podcastLink.trim())}
        >
          {isLoading ? "Preparing..." : "Generate Audio"}
        </button>
      </div>
    </div>
  );
};

export default InputForm; 