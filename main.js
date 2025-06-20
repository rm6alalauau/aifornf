import * as store from "./store.js";
import * as ui from "./ui.js";
import { analyzeImage } from "./api.js";

// **IMPORTANT**: Set your Cloudflare Worker URL here
const CORS_PROXY_URL =
  "https://ai.zzz-archive-back-end.workers.dev/?url=";

document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    themeToggle: document.getElementById("theme-toggle"),
    uploadArea: document.getElementById("upload-area"),
    fileInput: document.getElementById("file-input"),
    imageUrlInput: document.getElementById("image-url-input"),
    submitUrlBtn: document.getElementById("submit-url-btn"),
    saveResultBtn: document.getElementById("save-result-btn"),
    shareResultBtn: document.getElementById("share-result-btn"),
    tryAgainBtn: document.getElementById("try-again-btn"),
    viewSavedBtn: document.getElementById("view-saved-btn"),
    popupOverlay: document.getElementById("popup-overlay"),
    settingsToggle: document.getElementById("settings-toggle"),
    saveApiKeyBtn: document.getElementById("save-api-key-btn"),
    clearApiKeyBtn: document.getElementById("clear-api-key-btn"),
    userApiKeyInput: document.getElementById("user-api-key-input"),
  };

  let currentAnalysisResult = null;
  let selectedImageDataUrl = null;
  let isSavedVisible = false;

  async function generateImageHash(base64) {
    const pureBase64 = base64.substring(base64.indexOf(",") + 1);
    const binaryString = atob(pureBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes.buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function initialize() {
    const isDarkMode = store.getDarkModePreference();
    ui.initializeTheme(isDarkMode);
    setupEventListeners();
    if (!store.getUserApiKey()) {
      ui.showToast("歡迎！請點擊右上角 鑰匙圖示 設定您的 API Key。");
    }
  }

  function handleFileSelect() {
    if (!elements.fileInput.files.length) return;
    const file = elements.fileInput.files[0];
    if (!file.type.startsWith("image/")) {
      ui.showToast("請選擇一個圖片檔案。");
      return;
    }
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      ui.showToast(
        `檔案過大。請上傳小於 ${MAX_FILE_SIZE / 1024 / 1024} MB 的圖片。`
      );
      return;
    }
    processFileAsDataURL(file);
  }

  async function handleUrlSubmit() {
    const url = elements.imageUrlInput.value.trim();
    if (!url) {
      return ui.showToast("請輸入有效的圖片網址。");
    }
    try {
      new URL(url);
    } catch (_) {
      return ui.showToast("網址格式不正確。");
    }

    ui.showResultView("");
    ui.showLoading();

    try {
      const proxyUrl = `${CORS_PROXY_URL}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok)
        throw new Error(`無法從代理獲取圖片: ${response.statusText}`);

      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("該網址返回的內容不是圖片。");
      }
      processFileAsDataURL(blob);
    } catch (error) {
      console.error("從 URL 獲取圖片失敗:", error);
      ui.displayError(error.message || "無法從該網址加載圖片。");
    }
  }

  function processFileAsDataURL(fileOrBlob) {
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedImageDataUrl = e.target.result;
      startAnalysis();
    };
    reader.readAsDataURL(fileOrBlob);
  }

  async function startAnalysis() {
    if (!selectedImageDataUrl) return;

    const userApiKey = store.getUserApiKey();
    if (!userApiKey) {
      ui.showToast("請先在設定中提供您的 Gemini API Key。");
      ui.toggleSettingsPanel();
      return;
    }

    ui.showResultView(selectedImageDataUrl);
    ui.showLoading();

    try {
      const aiType = document.querySelector(
        'input[name="ai-type"]:checked'
      ).value;
      const imageHash = await generateImageHash(selectedImageDataUrl);
      const cacheKey = `${imageHash}-${aiType}`;
      const cachedResult = store.getCache(cacheKey);

      if (cachedResult) {
        ui.showToast("從快取中讀取結果！");
        setTimeout(() => {
          currentAnalysisResult = {
            ...cachedResult,
            image: selectedImageDataUrl,
            aiType,
          };
          ui.displayResult(currentAnalysisResult);
        }, 500);
        return;
      }

      const response = await analyzeImage(
        selectedImageDataUrl,
        aiType,
        userApiKey
      );
      currentAnalysisResult = {
        ...response,
        image: selectedImageDataUrl,
        aiType,
      };
      ui.displayResult(currentAnalysisResult);
      store.setCache(cacheKey, response);
    } catch (error) {
      console.error("分析時出錯:", error);
      ui.displayError(error.message || "發生未知錯誤。");
    }
  }

  function handleSaveResult() {
    if (currentAnalysisResult) {
      store.addSavedResult({
        ...currentAnalysisResult,
        timestamp: new Date().toISOString(),
      });
      ui.markAsSaved();
      ui.showToast("結果已儲存。");
      if (isSavedVisible) renderSaved();
    }
  }

  async function handleShareResult() {
    if (!currentAnalysisResult) return;
    const btn = elements.shareResultBtn;
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div>`;
    btn.disabled = true;
    const success = await ui.generateShareImage(currentAnalysisResult);
    if (!success) {
      ui.showToast("無法生成分享圖，請稍後再試。");
    }
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }

  function setupEventListeners() {
    elements.themeToggle.addEventListener("click", () => {
      const isDark = !store.getDarkModePreference();
      store.setDarkModePreference(isDark);
      ui.initializeTheme(isDark);
    });
    elements.settingsToggle.addEventListener("click", () => {
      ui.toggleSettingsPanel(store.getUserApiKey());
    });
    elements.saveApiKeyBtn.addEventListener("click", () => {
      const key = elements.userApiKeyInput.value.trim();
      store.setUserApiKey(key);
      ui.showToast(key ? "您的 API 金鑰已儲存。" : "API 金鑰已清除。");
      ui.toggleSettingsPanel(key);
    });
    elements.clearApiKeyBtn.addEventListener("click", () => {
      elements.userApiKeyInput.value = "";
      store.setUserApiKey("");
      ui.showToast("API 金鑰已清除。");
    });
    elements.uploadArea.addEventListener("click", () =>
      elements.fileInput.click()
    );
    elements.fileInput.addEventListener("change", handleFileSelect);
    elements.submitUrlBtn.addEventListener("click", handleUrlSubmit);
    ["dragover", "dragleave", "drop"].forEach((eventName) => {
      elements.uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (eventName === "dragover")
          elements.uploadArea.classList.add("drag-over");
        if (eventName === "dragleave" || eventName === "drop")
          elements.uploadArea.classList.remove("drag-over");
        if (eventName === "drop" && e.dataTransfer.files.length) {
          elements.fileInput.files = e.dataTransfer.files;
          handleFileSelect();
        }
      });
    });

    elements.saveResultBtn.addEventListener("click", handleSaveResult);
    elements.shareResultBtn.addEventListener("click", handleShareResult);
    elements.tryAgainBtn.addEventListener("click", handleTryAgain);
    elements.viewSavedBtn.addEventListener("click", toggleSavedResults);

    elements.popupOverlay.addEventListener("click", (e) => {
      if (
        e.target === elements.popupOverlay ||
        e.target.closest(".close-popup")
      ) {
        ui.hidePopup();
      }
    });

    const settingsOverlay = document.getElementById("settings-overlay");
    settingsOverlay.addEventListener("click", (e) => {
      if (e.target === settingsOverlay || e.target.closest(".close-popup")) {
        ui.toggleSettingsPanel(store.getUserApiKey());
      }
    });
  }

  initialize();
});
