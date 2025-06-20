import { systemPrompts } from "./config.js";

const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL = "gemini-1.5-flash-latest";

export async function analyzeImage(imageDataUrl, aiType, userApiKey) {
  if (!userApiKey) {
    throw new Error("API 金鑰為空。請在設定中提供您的 Gemini API Key。");
  }

  const systemPrompt = systemPrompts[aiType];
  if (!systemPrompt) {
    throw new Error(`無效的分析模式: ${aiType}`);
  }

  const [header, base64Data] = imageDataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)[1];

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
    },
  };

  const url = `${API_BASE_URL}${MODEL}:generateContent?key=${userApiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(
        errorData.error.message || `請求失敗，狀態碼: ${response.status}`
      );
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      throw new Error("從 API 收到的回應格式無效。");
    }

    // The response is a string which should be parsed.
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("呼叫 Gemini API 時出錯:", error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}
