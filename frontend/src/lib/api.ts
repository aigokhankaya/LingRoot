// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};

import { useAuth } from "./auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://lingloops-backend.onrender.com/api";

export interface ProcessInputData {
    type: "text" | "youtube" | "spotify" | "file" | "weblink";
    input?: string;
    text?: string;
    file?: File;
    level: string;
    SesHızı?: number;
    voice?: string;
}

export interface TtsResponseData {
    message: string;
    mp3_url: string;
    level: string;
    vtt_url: string;
    timepoints?: any[];
    words?: string[];
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    mp3_url?: string;
    vtt_url?: string;
    level?: string;
}

export const getToken = (): string | null => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("lingroot_token");
    }
    return null;
};

export const createHeaders = (contentType?: string): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (contentType) {
        headers["Content-Type"] = contentType;
    }
    return headers;
};

async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        console.error("API Error:", errorMessage);
        const error = new Error(errorMessage);
        (error as any).response = response;
        throw error;
    }
    try {
        return await response.json() as ApiResponse<T>;
    } catch (e) {
        console.error("API Response JSON Parse Error:", e);
        throw new Error("Failed to parse successful API response.");
    }
}

export const processTts = async (data: ProcessInputData): Promise<TtsResponseData> => {
    const { type, input, file, level, SesHızı, voice } = data;
    const url = `${API_BASE_URL}/tts/process`;
    let headers: Record<string, string>;
    let body: string | FormData;

    if (type === "text") {
        headers = createHeaders("application/json");
        body = JSON.stringify({ input, type, level, SesHızı, voice });
    } else {
        headers = createHeaders();
        const formData = new FormData();
        formData.append("level", level);
        formData.append("type", type);
        if (SesHızı !== undefined) formData.append("SesHızı", SesHızı.toString());
        if (voice) formData.append("voice", voice);

        if (input && type !== "file") {
            formData.append("input", input);
        }
        if (type === "file" && file) {
            formData.append("file", file);
        }
        body = formData;
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: body,
        });
        const apiResponse = await response.json();
        return {
            message: apiResponse.message || "",
            mp3_url: apiResponse.mp3_url || "",
            level: apiResponse.level || "",
            vtt_url: apiResponse.vtt_url || "",
            timepoints: apiResponse.timepoints || [],
            words: apiResponse.words || [],
        };
    } catch (error) {
        console.error("Process TTS API call error:", error);
        throw error;
    }
};

// Function to submit content details after successful TTS processing
export const submitContent = async (
    input: string,
    inputType: string,
    level: string,
    mp3Url: string
): Promise<ApiResponse> => {
    const url = `${API_BASE_URL}/content/submit`;
    const token = getToken();
    if (!token) {
        console.warn("Cannot submit content, user not authenticated.");
        // Decide if this should be an error or just a warning
        return { success: false, message: "User not authenticated" };
    }

    const headers = createHeaders("application/json");
    headers["Authorization"] = `Bearer ${token}`;

    const body = JSON.stringify({
        input,
        input_type: inputType,
        level,
        mp3_url: mp3Url,
    });

    try {
        console.log(`Calling Submit Content API: ${url}`);
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: body,
        });
        return await handleApiResponse(response);
    } catch (error) {
        console.error("Submit Content API call error:", error);
        throw error;
    }
};

// Function to get content history for the authenticated user
export const getContentHistory = async (): Promise<ApiResponse> => {
    const url = `${API_BASE_URL}/content/history`;
    const token = getToken();
    if (!token) {
        console.warn("Cannot get content history, user not authenticated.");
        return { success: false, message: "User not authenticated" };
    }

    const headers = createHeaders();
    headers["Authorization"] = `Bearer ${token}`;

    try {
        console.log(`Calling Get Content History API: ${url}`);
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });
        return await handleApiResponse(response);
    } catch (error) {
        console.error("Get Content History API call error:", error);
        throw error;
    }
};

