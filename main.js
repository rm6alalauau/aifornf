import * as store from "./store.js";
import * as ui from "./ui.js";
import { analyzeImage } from "./api.js";

// **IMPORTANT**: Set your Cloudflare Worker's ROOT URL here
const WORKER_URL = "https://ai.zzz-archive-back-end.workers.dev";
const CORS_PROXY_URL = `${WORKER_URL}/?url=`;

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
  }

  function handleFileSelect() {
    if (!elements.fileInput.files.length) return;

    const file = elements.fileInput.files[0];

    if (!file.type.startsWith("image/")) {
      return ui.showToast("請選擇一個圖片檔案。");
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      return ui.showToast(
        `檔案過大。請上傳小於 ${MAX_FILE_SIZE / 1024 / 1024} MB 的圖片。`
      );
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

      if (!response.ok) {
        throw new Error(`無法從代理獲取圖片: ${response.statusText}`);
      }

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

      const response = await analyzeImage(selectedImageDataUrl, aiType);

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
    if (!currentAnalysisResult) {
      console.error("沒有可儲存的結果");
      ui.showToast("沒有可儲存的結果。");
      return;
    }

    console.log("開始儲存結果...");

    const success = store.addSavedResult({
      ...currentAnalysisResult,
      timestamp: new Date().toISOString(),
    });

    console.log("儲存結果:", success);

    if (success) {
      ui.markAsSaved();
      ui.showToast("結果已儲存。");

      if (isSavedVisible) {
        console.log("重新渲染已儲存結果...");
        renderSaved();
      }
    } else {
      ui.showToast("儲存失敗，請稍後再試。");
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

  function handleTryAgain() {
    ui.resetToInputView();
    currentAnalysisResult = null;
    selectedImageDataUrl = null;
  }

  function toggleSavedResults() {
    isSavedVisible = !isSavedVisible;

    if (isSavedVisible) {
      renderSaved();
      elements.viewSavedBtn.innerHTML = `<span class="material-symbols-outlined">close</span> 隱藏已儲存的結果`;
    } else {
      document.getElementById("saved-results-container").innerHTML = "";
      elements.viewSavedBtn.innerHTML = `<span class="material-symbols-outlined">folder_open</span> 查看已儲存的結果`;
    }
  }

  function renderSaved() {
    const results = store.getSavedResults();

    ui.renderSavedResults(results, {
      onView: (index) => {
        const result = store.getSavedResults()[index];

        ui.showPopup(result, {
          onShare: async (resultToShare) => {
            const shareBtn = document.getElementById("popup-share-btn");
            if (!shareBtn) return;

            const originalIcon = shareBtn.innerHTML;

            shareBtn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div>`;
            shareBtn.disabled = true;

            const success = await ui.generateShareImage(resultToShare);

            if (!success) {
              ui.showToast("無法生成分享圖，請稍後再試。");
            }

            shareBtn.innerHTML = originalIcon;
            shareBtn.disabled = false;
          },
        });
      },

      onDelete: (index) => {
        if (confirm("您確定要刪除這個結果嗎？")) {
          console.log("開始刪除結果，索引:", index);

          const success = store.deleteSavedResult(index);

          console.log("刪除結果:", success);

          if (success) {
            ui.showToast("結果已刪除。");
            console.log("重新渲染已儲存結果...");
            renderSaved();
          } else {
            ui.showToast("刪除失敗，請稍後再試。");
          }
        }
      },
    });
  }

  function setupEventListeners() {
    elements.themeToggle.addEventListener("click", () => {
      const isDark = !store.getDarkModePreference();
      store.setDarkModePreference(isDark);
      ui.initializeTheme(isDark);
    });

    elements.uploadArea.addEventListener("click", () => {
      elements.fileInput.click();
    });

    elements.fileInput.addEventListener("change", handleFileSelect);
    elements.submitUrlBtn.addEventListener("click", handleUrlSubmit);

    ["dragover", "dragleave", "drop"].forEach((eventName) => {
      elements.uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (eventName === "dragover") {
          elements.uploadArea.classList.add("drag-over");
        }

        if (eventName === "dragleave" || eventName === "drop") {
          elements.uploadArea.classList.remove("drag-over");
        }

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
  }

  initialize();
});
