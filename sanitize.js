// sanitize.js — 前端 XSS 防護工具
// 所有 innerHTML 渲染使用者輸入前，必須先呼叫對應函式。

/**
 * 將字串中的 HTML 特殊字元轉義，防止 XSS 注入。
 * 用於所有需要放入 innerHTML 的文字內容（標題、描述、標籤等）。
 */
function sanitizeHTML(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;' };
  return String(str ?? '').replace(/[&<>"'/]/g, c => map[c]);
}

/**
 * 驗證 URL：允許 https/http 絕對 URL 及安全的相對路徑（image/...）。
 * 封鎖 javascript:、vbscript:、data: 及 protocol-relative（//...）。
 * 用於 img src、a href、iframe src 等屬性。
 * @returns 安全的 URL 字串，若不符則回傳空字串。
 */
function sanitizeURL(str) {
  const s = String(str ?? '').trim();
  if (!s) return '';
  // Block dangerous protocols
  if (/^(javascript|vbscript|data):/i.test(s)) return '';
  // Allow absolute https/http URLs
  if (/^https?:\/\/.{3,}/.test(s)) return s;
  // Allow relative paths — must not start with // (protocol-relative) and must not contain ://
  if (!s.startsWith('//') && !s.includes('://')) return s;
  return '';
}

/**
 * 驗證 CSS 十六進制色碼格式（#RGB / #RRGGBB / #RRGGBBAA）。
 * 用於放入 style 屬性的動態顏色，防止 CSS 注入。
 * @returns 合法色碼，否則回傳預設藍色 #00aaff。
 */
function sanitizeColor(str) {
  const s = String(str ?? '').trim();
  return /^#[0-9A-Fa-f]{3,8}$/.test(s) ? s : '#00aaff';
}
