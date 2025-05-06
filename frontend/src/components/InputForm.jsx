"use client";

import { useState } from "react";
import { processTts, submitContent, ProcessInputData, TtsResponseData, ApiResponse } from "../lib/api"; // Import API functions and types

export default function InputForm({ onSuccess }) {
    const [inputType, setInputType] = useState<"text" | "youtube" | "spotify" | "file">("text");
    const [text, setText] = useState("");
    const [youtubeLink, setYoutubeLink] = useState("");
    const [spotifyLink, setSpotifyLink] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [level, setLevel] = useState("A1");
    const [speakingRate, setSpeakingRate] = useState<number>(1.0); // Added state for speaking rate
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Removed safeParseJson as error/response handling is now in api.ts

    const handleSubmit = async () => {
        setIsLoading(true);
        setIsError(false);
        setErrorMessage("");
        setIsSuccess(false);

        // Prepare data based on input type, aligning with ProcessInputData interface
        const data: ProcessInputData = {
            type: inputType,
            level: level,
            SesHızı: speakingRate,
            text: inputType === "text" ? text : undefined,
            input: inputType === "youtube" ? youtubeLink : (inputType === "spotify" ? spotifyLink : undefined), // Use 'input' for links
            file: inputType === "file" ? file : undefined,
        };

        // Basic validation before API call
        if ((inputType === "text" && !data.text?.trim()) ||
            ((inputType === "youtube" || inputType === "spotify") && !data.input?.trim()) ||
            (inputType === "file" && !data.file))
        {
            setIsError(true);
            setErrorMessage("Please provide the required input for the selected type.");
            setIsLoading(false);
            return;
        }

        try {
            // Call the processTts function from api.ts
            const result: ApiResponse<TtsResponseData> = await processTts(data);

            // handleApiResponse in api.ts throws error on !response.ok, so we assume success here
            // We still check for mp3_url as a sanity check
            if (result.mp3_url) {
                setIsSuccess(true);
                if (onSuccess) {
                    // Pass the relevant data to the parent component
                    onSuccess({
                        message: result.message || "", // Adapted text
                        mp3_url: result.mp3_url,
                        vtt_url: result.vtt_url || "",
                        level: result.level || level,
                    });
                }

                // Log the successful generation (using submitContent from api.ts)
                try {
                    const logInput = data.text || data.input || data.file?.name || "unknown_input";
                    await submitContent(logInput, inputType, result.level || level, result.mp3_url);
                    console.log("Content submission logged successfully.");
                } catch (logError) {
                    // Log errors should not block user flow
                    console.error("Error logging content submission:", logError);
                }
            } else {
                // Handle cases where API call was technically successful but didn't return expected data
                throw new Error(result.message || "API call succeeded but returned no audio URL.");
            }

        } catch (err: any) {
            console.error("Error during TTS processing:", err);
            setIsError(true);
            // Error message should be set by the handleApiResponse helper in api.ts
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
                        <option value="spotify">Spotify Link</option>
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
                            type="url" // Use url type for better validation
                            className="w-full border border-gray-300 rounded p-3"
                            value={youtubeLink}
                            onChange={(e) => setYoutubeLink(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                    </div>
                )}

                {inputType === "spotify" && (
                    <div className="space-y-2">
                        <label className="block font-medium">Spotify Link</label>
                        <input
                            type="url" // Use url type
                            className="w-full border border-gray-300 rounded p-3"
                            value={spotifyLink}
                            onChange={(e) => setSpotifyLink(e.target.value)}
                            placeholder="https://open.spotify.com/track/..."
                        />
                    </div>
                )}

                {inputType === "file" && (
                    <div className="space-y-2">
                        <label className="block font-medium">Upload File (PDF or DOCX)</label>
                        <input
                            type="file"
                            className="w-full border border-gray-300 rounded p-3 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            accept=".pdf, .docx, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Specify accepted types
                        />
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

                {/* Optional: Add control for speaking rate */}
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

                {isLoading && <p className="text-blue-600">Preparing audio...</p>}
                {isError && (
                    <div className="text-red-600 bg-red-100 border border-red-400 rounded p-3">
                        <p className="font-semibold">Error:</p>
                        <p>{errorMessage}</p>
                    </div>
                )}
                {isSuccess && <p className="text-green-600">✅ Audio generated successfully!</p>}

                <button
                    onClick={handleSubmit}
                    className="bg-blue-600 text-white font-semibold py-3 px-6 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || (inputType === 'file' && !file) || (inputType === 'text' && !text.trim()) || (inputType === 'youtube' && !youtubeLink.trim()) || (inputType === 'spotify' && !spotifyLink.trim())}
                >
                    {isLoading ? "Preparing..." : "Generate Audio"}
                </button>
            </div>
        </div>
    );
}

