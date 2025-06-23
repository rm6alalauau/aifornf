// **IMPORTANT**: Set your Cloudflare Worker's ROOT URL here
const WORKER_URL = "https://ai.zzz-archive-back-end.workers.dev";

export async function analyzeImage(imageDataUrl, aiType, apiKey) {
  if (!apiKey) {
    throw new Error("API 金鑰為空，無法進行分析。");
  }

  if (!imageDataUrl) {
    throw new Error("圖片數據為空，無法進行分析。");
  }

  const url = `${WORKER_URL}/api/analyze-image`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl,
        aiType,
        apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Worker API Error:", errorData);
      throw new Error(
        errorData.error || `請求失敗，狀態碼: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("呼叫 Worker API 時出錯:", error);
    throw error;
  }
}
