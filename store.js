const RESULTS_STORAGE_KEY = "aiAnalyzerResults";
const CACHE_STORAGE_KEY = "aiAnalyzerCache";
const DARK_MODE_KEY = "darkMode";
const USER_API_KEY_STORAGE_KEY = "userGeminiApiKey";

let userApiKey = "";
let savedResults = [];
let analysisCache = {};

function loadFromLocalStorage() {
  try {
    userApiKey = localStorage.getItem(USER_API_KEY_STORAGE_KEY) || "";
    savedResults = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || "[]");
    analysisCache = JSON.parse(localStorage.getItem(CACHE_STORAGE_KEY) || "{}");
  } catch (error) {
    console.error("載入本地儲存時出錯:", error);
    // 如果載入失敗，使用預設值
    userApiKey = "";
    savedResults = [];
    analysisCache = {};
  }
}

function saveCacheToLocalStorage() {
  try {
    const keys = Object.keys(analysisCache);
    if (keys.length > 100) {
      delete analysisCache[keys[0]];
    }
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(analysisCache));
    return true;
  } catch (error) {
    console.error("儲存快取時出錯:", error);
    return false;
  }
}

function saveResultsToLocalStorage() {
  try {
    localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(savedResults));
    return true;
  } catch (error) {
    console.error("儲存結果時出錯:", error);
    return false;
  }
}

export function getSavedResults() { 
  return [...savedResults]; 
}

export function addSavedResult(resultData) {
  try {
    // 檢查是否已經存在相同的結果
    const existingIndex = savedResults.findIndex(result => 
      result.image === resultData.image && 
      result.verdict === resultData.verdict &&
      result.rating === resultData.rating
    );
    
    if (existingIndex !== -1) {
      // 如果已存在，更新時間戳
      savedResults[existingIndex].timestamp = resultData.timestamp;
    } else {
      // 如果不存在，新增到開頭
      savedResults.unshift(resultData);
    }
    
    // 限制數量
    if (savedResults.length > 50) { 
      savedResults = savedResults.slice(0, 50);
    }
    
    const saveSuccess = saveResultsToLocalStorage();
    if (!saveSuccess) {
      console.error("儲存到localStorage失敗");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("新增儲存結果時出錯:", error);
    return false;
  }
}

export function deleteSavedResult(index) {
  try {
    if (index >= 0 && index < savedResults.length) {
      savedResults.splice(index, 1);
      const saveSuccess = saveResultsToLocalStorage();
      if (!saveSuccess) {
        console.error("刪除後儲存到localStorage失敗");
        return false;
      }
      return true;
    }
    console.error("刪除索引超出範圍:", index, "總數:", savedResults.length);
    return false;
  } catch (error) {
    console.error("刪除儲存結果時出錯:", error);
    return false;
  }
}

export function getCache(key) { 
  return analysisCache[key] || null; 
}

export function setCache(key, value) {
  try {
    analysisCache[key] = value;
    const saveSuccess = saveCacheToLocalStorage();
    if (!saveSuccess) {
      console.error("快取儲存到localStorage失敗");
      return false;
    }
    return true;
  } catch (error) {
    console.error("設定快取時出錯:", error);
    return false;
  }
}

export function getDarkModePreference() { 
  try {
    return localStorage.getItem(DARK_MODE_KEY) === "true"; 
  } catch (error) {
    console.error("獲取深色模式偏好時出錯:", error);
    return false;
  }
}

export function setDarkModePreference(isDarkMode) { 
  try {
    localStorage.setItem(DARK_MODE_KEY, String(isDarkMode)); 
    return true;
  } catch (error) {
    console.error("設定深色模式偏好時出錯:", error);
    return false;
  }
}

export function getUserApiKey() { 
  return userApiKey; 
}

export function setUserApiKey(key) {
  try {
    userApiKey = key;
    localStorage.setItem(USER_API_KEY_STORAGE_KEY, key);
    return true;
  } catch (error) {
    console.error("設定API金鑰時出錯:", error);
    return false;
  }
}

// Initial load
loadFromLocalStorage();