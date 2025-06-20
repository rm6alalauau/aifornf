const RESULTS_STORAGE_KEY = "aiAnalyzerResults";
const CACHE_STORAGE_KEY = "aiAnalyzerCache";
const DARK_MODE_KEY = "darkMode";
const USER_API_KEY_STORAGE_KEY = "userGeminiApiKey";

let userApiKey = "";
let savedResults = [];
let analysisCache = {};

function loadFromLocalStorage() {
  userApiKey = localStorage.getItem(USER_API_KEY_STORAGE_KEY) || "";
  savedResults = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || "[]");
  analysisCache = JSON.parse(localStorage.getItem(CACHE_STORAGE_KEY) || "{}");
}

function saveCacheToLocalStorage() {
  const keys = Object.keys(analysisCache);
  if (keys.length > 100) {
    delete analysisCache[keys[0]];
  }
  localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(analysisCache));
}

function saveResultsToLocalStorage() {
  localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(savedResults));
}

export function getSavedResults() { return [...savedResults]; }
export function addSavedResult(resultData) {
  savedResults.unshift(resultData);
  if (savedResults.length > 50) { savedResults.pop(); }
  saveResultsToLocalStorage();
}
export function deleteSavedResult(index) {
  if (index >= 0 && index < savedResults.length) {
    savedResults.splice(index, 1);
    saveResultsToLocalStorage();
  }
}
export function getCache(key) { return analysisCache[key] || null; }
export function setCache(key, value) {
  analysisCache[key] = value;
  saveCacheToLocalStorage();
}
export function getDarkModePreference() { return localStorage.getItem(DARK_MODE_KEY) === "true"; }
export function setDarkModePreference(isDarkMode) { localStorage.setItem(DARK_MODE_KEY, String(isDarkMode)); }
export function getUserApiKey() { return userApiKey; }
export function setUserApiKey(key) {
  userApiKey = key;
  localStorage.setItem(USER_API_KEY_STORAGE_KEY, key);
}

// Initial load
loadFromLocalStorage();