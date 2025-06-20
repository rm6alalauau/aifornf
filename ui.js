// ui.js 的內容與您 js.html 中的 ui 物件完全相同，
// 只是每個函式前面都加上 export 關鍵字。
// 例如:
// export function initializeTheme(...) { ... }
// export function showToast(...) { ... }
// ...etc...
// 我將提供完整的檔案：
const elements = {
  body: document.body,
  inputCard: document.getElementById("input-card"),
  resultContainer: document.getElementById("result-container"),
  resultImage: document.getElementById("result-image"),
  loading: document.getElementById("loading"),
  resultContent: document.getElementById("result-content"),
  verdict: document.getElementById("verdict"),
  rating: document.getElementById("rating"),
  explanation: document.getElementById("explanation"),
  saveResultBtn: document.getElementById("save-result-btn"),
  themeToggle: document.getElementById("theme-toggle"),
  savedResultsContainer: document.getElementById("saved-results-container"),
  popupOverlay: document.getElementById("popup-overlay"),
  popupImg: document.getElementById("popup-img"),
  popupVerdict: document.getElementById("popup-verdict"),
  popupRating: document.getElementById("popup-rating"),
  popupExplanation: document.getElementById("popup-explanation"),
  shareCanvasContainer: document.getElementById("share-canvas-container"),
  shareImage: document.getElementById("share-image"),
  shareVerdict: document.getElementById("share-verdict"),
  shareRating: document.getElementById("share-rating"),
  shareExplanation: document.getElementById("share-explanation"),
  popupShareBtn: document.getElementById("popup-share-btn"),
  settingsOverlay: document.getElementById("settings-overlay"),
  userApiKeyInput: document.getElementById("user-api-key-input"),
  toastContainer: document.getElementById("toast-container"),
};

export function initializeTheme(isDarkMode) {
  elements.body.classList.toggle("dark-mode", isDarkMode);
  elements.themeToggle.querySelector(".material-symbols-outlined").textContent =
    isDarkMode ? "dark_mode" : "light_mode";
}
export function showResultView(imageDataUrl) {
  elements.inputCard.classList.add("hidden");
  elements.resultContainer.classList.remove("hidden");
  if (imageDataUrl) elements.resultImage.src = imageDataUrl;
}
export function showLoading() {
  elements.loading.classList.remove("hidden");
  elements.resultContent.classList.add("hidden");
}
export function displayResult({ verdict, rating, explanation }) {
  elements.loading.classList.add("hidden");
  elements.resultContent.classList.remove("hidden");
  elements.verdict.textContent = verdict;
  elements.rating.textContent = `${rating}/10`;
  elements.explanation.textContent = explanation;
  elements.saveResultBtn.disabled = false;
  elements.saveResultBtn.querySelector(
    ".material-symbols-outlined"
  ).textContent = "save";
}
export function displayError(errorMessage) {
  elements.loading.classList.add("hidden");
  elements.resultContent.classList.remove("hidden");
  elements.verdict.textContent = "分析失敗";
  elements.rating.textContent = "N/A";
  elements.explanation.textContent = `發生錯誤：${errorMessage}`;
}
export function resetToInputView() {
  elements.inputCard.classList.remove("hidden");
  elements.resultContainer.classList.add("hidden");
  document.getElementById("file-input").value = "";
  document.getElementById("image-url-input").value = "";
}
export function markAsSaved() {
  elements.saveResultBtn.disabled = true;
  elements.saveResultBtn.querySelector(
    ".material-symbols-outlined"
  ).textContent = "check_circle";
}
export function renderSavedResults(results, handlers) {
  const container = elements.savedResultsContainer;
  if (!results || results.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; padding: 16px; color: var(--md-sys-color-on-surface-variant);">還沒有儲存任何結果。</p>';
    return;
  }
  container.innerHTML = results
    .map(
      (result, index) => `
       <div class="saved-result-card" data-index="${index}">
           <img src="${result.image}" alt="Saved analysis">
           <div class="saved-result-info">
               <h4>${result.verdict} (${result.rating}/10)</h4>
               <p>${new Date(result.timestamp).toLocaleString()}</p>
               <div class="saved-result-actions">
                   <button class="button-icon delete-btn" data-index="${index}" aria-label="刪除"><span class="material-symbols-outlined">delete</span></button>
               </div>
           </div>
       </div>
   `
    )
    .join("");
  container.querySelectorAll(".saved-result-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (!e.target.closest(".delete-btn")) {
        handlers.onView(parseInt(card.dataset.index, 10));
      }
    });
  });
  container.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handlers.onDelete(parseInt(btn.dataset.index, 10));
    });
  });
}
export function showPopup(result, handlers) {
  elements.popupImg.src = result.image;
  elements.popupVerdict.textContent = result.verdict;
  elements.popupRating.textContent = `${result.rating}/10`;
  elements.popupExplanation.textContent = result.explanation;
  const newShareBtn = elements.popupShareBtn.cloneNode(true);
  elements.popupShareBtn.parentNode.replaceChild(
    newShareBtn,
    elements.popupShareBtn
  );
  elements.popupShareBtn = newShareBtn;
  elements.popupShareBtn.addEventListener("click", () => {
    handlers.onShare(result);
  });
  elements.popupOverlay.classList.add("visible");
}
export function hidePopup() {
  elements.popupOverlay.classList.remove("visible");
}
export async function generateShareImage() {
  // 我們的目標現在是螢幕上可見的結果卡片
  const targetElement = document.getElementById("result-container");
  if (!targetElement) {
    console.error("Result container not found for sharing.");
    return false;
  }

  // 臨時為截圖目標添加一個 class，以便應用特殊的分享樣式
  // 例如，添加一個深色背景和 padding，使其看起來像一張卡片
  const shareCardClass = "share-capture-style";
  targetElement.classList.add(shareCardClass);

  try {
    const canvas = await html2canvas(targetElement, {
      useCORS: true, // 允許加載跨域圖片
      scale: 2, // 提高截圖解析度，使其更清晰
      // 讓 html2canvas 計算元素的完整高度，包括滾動部分
      windowHeight: targetElement.scrollHeight,
      scrollY: -window.scrollY, // 告訴 html2canvas 當前頁面的滾動位置
    });

    // 截圖完成後，立即移除臨時樣式
    targetElement.classList.remove(shareCardClass);

    // 改善iPhone下載機制
    const dataUrl = canvas.toDataURL("image/png");
    const fileName = `ai-analysis-${Date.now()}.png`;
    
    // 檢測是否為iOS設備
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS設備使用特殊的下載方法
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.style.display = "none";
      
      // 添加到DOM並觸發點擊
      document.body.appendChild(link);
      link.click();
      
      // 延遲移除元素
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 100);
    } else {
      // 其他設備使用標準方法
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    }

    return true;
  } catch (err) {
    console.error("Error generating share image:", err);
    // 確保即使出錯也要移除臨時樣式
    targetElement.classList.remove(shareCardClass);
    return false;
  }
}
export function toggleSettingsPanel(currentKey) {
  const overlay = elements.settingsOverlay;
  if (overlay.classList.contains("visible")) {
    overlay.classList.remove("visible");
  } else {
    elements.userApiKeyInput.value = currentKey;
    overlay.classList.add("visible");
  }
}
export function showToast(message) {
  if (!elements.toastContainer) {
    console.error("Toast container not found!");
    return;
  }
  
  // 清理舊的toast
  const existingToasts = elements.toastContainer.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });
  
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  
  // 確保toast容器存在且可見
  if (!elements.toastContainer.parentNode) {
    document.body.appendChild(elements.toastContainer);
  }
  
  elements.toastContainer.appendChild(toast);
  
  // 強制重繪以確保動畫正常執行
  toast.offsetHeight;
  
  const FADE_OUT_DELAY = 3000; // 增加顯示時間
  const ANIMATION_DURATION = 350;
  
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.classList.add("fade-out");
    }
  }, FADE_OUT_DELAY);
  
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.remove();
    }
  }, FADE_OUT_DELAY + ANIMATION_DURATION);
}
