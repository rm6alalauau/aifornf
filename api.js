const WORKER_URL = "https://ai.zzz-archive-back-end.workers.dev";

export async function analyzeImage(imageDataUrl, aiType) {
  if (!imageDataUrl) {
    throw new Error("缺少圖片資料，無法進行分析。");
  }

  const response = await fetch(`${WORKER_URL}/api/analyze-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageDataUrl,
      aiType,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `分析失敗，狀態碼: ${response.status}`);
  }

  return data;
}
