// JIAXIN Design Studios — Core System
// Auth (SHA-256 hashed) + Projects Data + Carousel Data
// Passwords are NEVER stored in plaintext anywhere in this file.

const _SALT = 'jxds2024studio';

// Admin credentials stored as SHA-256(password + salt) hashes only
const _ADMINS = Object.freeze({
  'abc11032203@gmail.com':          'e09de65b199e0d00676a898be99d6deee5449189421767f68f13e0448edfe985',
  '11032203@gm.chihlee.edu.tw':     '0eb5ab46c4b7ea6a5be93459b480cce8b8caadcabf42be28fc523709c088644b'
});

// ── AUTH ─────────────────────────────────────────────────────────────────────

async function _sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function authLogin(email, password) {
  const key  = email.trim().toLowerCase();
  const hash = await _sha256(password + _SALT);

  // Check hardcoded admins first
  const expected = _ADMINS[key];
  if (expected) {
    if (hash !== expected) return { ok: false, msg: '密碼錯誤 / Wrong password' };
    sessionStorage.setItem('jx_s', JSON.stringify({ email: key, ts: Date.now() }));
    return { ok: true };
  }

  // Check extra admins stored in localStorage
  const extra = getExtraAdmins().find(a => a.email === key);
  if (!extra) return { ok: false, msg: '帳號不存在 / Account not found' };
  if (hash !== extra.hash) return { ok: false, msg: '密碼錯誤 / Wrong password' };
  sessionStorage.setItem('jx_s', JSON.stringify({ email: key, ts: Date.now() }));
  return { ok: true };
}

function authLogout() {
  sessionStorage.removeItem('jx_s');
  authRefreshUI();
  if (typeof onAuthChange === 'function') onAuthChange();
}

function authUser() {
  try { return JSON.parse(sessionStorage.getItem('jx_s')); } catch { return null; }
}

function isAdmin() { return !!authUser(); }

function authRefreshUI() {
  const u = authUser();
  const btn = document.getElementById('loginBtn');
  if (btn) {
    if (u) { btn.textContent = '登出 Logout'; btn.onclick = authLogout; }
    else   { btn.textContent = '登入 Login';  btn.onclick = openLoginModal; }
  }
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = u ? 'flex' : 'none';
  });
  // Inject/show settings gear button when logged in
  let gear = document.getElementById('adminSettingsBtn');
  if (u) {
    if (!gear && btn) {
      gear = document.createElement('button');
      gear.id = 'adminSettingsBtn';
      gear.className = 'btn btn-ghost';
      gear.style.cssText = 'padding:8px 12px;font-size:16px;min-width:0;line-height:1';
      gear.title = '管理員設定 Admin Settings';
      gear.textContent = '⚙';
      gear.onclick = openAdminSettings;
      btn.parentNode.insertBefore(gear, btn);
    } else if (gear) {
      gear.style.display = 'inline-flex';
    }
  } else if (gear) {
    gear.style.display = 'none';
  }
}

function openLoginModal() {
  const m = document.getElementById('loginModal');
  if (m) { m.classList.add('open'); document.getElementById('loginEmail').focus(); }
}

function closeLoginModal() {
  const m = document.getElementById('loginModal');
  if (m) m.classList.remove('open');
  ['loginEmail','loginPassword'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const err = document.getElementById('loginError'); if (err) err.textContent = '';
}

// ── PROJECTS DATA ─────────────────────────────────────────────────────────────

const _PROJ_KEY = 'jx_projects_v2';

const _DEFAULTS = [
  { id:'p1', title:'動態影音剪輯', titleEn:'Video Editing',      color:'#00eedd', tags:['Video','Motion','After Effects'], images:[], content:'' },
  { id:'p2', title:'AR 擴增實境',  titleEn:'Augmented Reality',  color:'#0088ff', tags:['AR','Interactive','Unity'],        images:[], content:'' },
  { id:'p3', title:'展場空間設計', titleEn:'Exhibition Design',   color:'#7744ff', tags:['Exhibition','Spatial','Design'],   images:[], content:'' },
  { id:'p4', title:'3D 建模動畫',  titleEn:'3D Modeling',         color:'#00aaff', tags:['3D','Blender','Animation'],        images:[], content:'' },
  { id:'p5', title:'品牌識別設計', titleEn:'Brand Identity',      color:'#ff44aa', tags:['Brand','Logo','Identity'],         images:[], content:'' },
  { id:'p6', title:'包裝平面設計', titleEn:'Graphic Design',      color:'#44dd88', tags:['Graphic','Print','Packaging'],     images:[], content:'' },
];

function getProjects() {
  try {
    const d = localStorage.getItem(_PROJ_KEY);
    if (d) return JSON.parse(d);
  } catch {}
  _saveProjects([..._DEFAULTS]);
  return [..._DEFAULTS];
}

function _saveProjects(list) { localStorage.setItem(_PROJ_KEY, JSON.stringify(list)); _devSync(); }

function projAdd(data) {
  if (!isAdmin()) return null;
  const list = getProjects();
  const colors = ['#00eedd','#0088ff','#7744ff','#ff44aa','#44dd88','#ffaa00','#00aaff','#ff6644'];
  const proj = {
    id: 'p' + Date.now(),
    color: colors[list.length % colors.length],
    images: [], content: '',
    ...data
  };
  list.push(proj);
  _saveProjects(list);
  return proj;
}

function projUpdate(id, data) {
  if (!isAdmin()) return null;
  const list = getProjects();
  const i = list.findIndex(p => p.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...data };
  _saveProjects(list);
  return list[i];
}

function projDelete(id) {
  if (!isAdmin()) return false;
  _saveProjects(getProjects().filter(p => p.id !== id));
  return true;
}

// ── WORKS DATA ────────────────────────────────────────────────────────────────

const _WORKS_KEY = 'jx_works_v1';

function getWorks(catId) {
  try {
    const all = JSON.parse(localStorage.getItem(_WORKS_KEY)) || [];
    return catId ? all.filter(w => w.catId === catId) : all;
  } catch { return []; }
}

function _saveAllWorks(list) { localStorage.setItem(_WORKS_KEY, JSON.stringify(list)); _devSync(); }

// ── SHARED UTILITIES ──────────────────────────────────────────────────────────

function autoGenerateTags(work) {
  if (work.tags && work.tags.length > 0) return work.tags.slice(0, 3);
  const stopEn = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','its','i','you','we','he','she','it','my','our']);
  const stopZh = new Set(['的','了','在','是','我','有','和','就','都','也','還','到','而','與','這','那','為','或','一','不','很','更','最','及','之','對','上','下','中','個','所','以','從','等','讓','將','使']);
  const text = [work.title, work.titleEn, (work.desc||'').slice(0,80), (work.descEn||'').slice(0,120)].filter(Boolean).join(' ');
  const words = text.split(/[\s,，。.!！?？、；;:：「」【】—\-\/\\()\[\]]+/)
    .map(w => w.trim()).filter(w => w.length >= 2 && w.length <= 10 && !stopEn.has(w.toLowerCase()) && !stopZh.has(w) && !/^\d+$/.test(w));
  const unique = [...new Set(words)];
  return unique.slice(0, 3);
}

function parseFileList(str) {
  return (str || '').split('\n').map(line => {
    const [name, url] = line.split('|').map(s => s.trim());
    return (name && url) ? { name, url } : (name && /^https?:\/\//.test(name)) ? { name: name.split('/').pop() || name, url: name } : null;
  }).filter(Boolean);
}

function workAdd(catId, data) {
  if (!isAdmin()) return null;
  const all = getWorks();
  const work = { id: 'w' + Date.now(), catId, title: '', titleEn: '', thumb: '', desc: '', descEn: '', tags: [], videos: [], files: [], images: [], content: '', ...data };
  if (!work.tags.length) work.tags = autoGenerateTags(work);
  all.push(work);
  _saveAllWorks(all);
  return work;
}

function workUpdate(id, data) {
  if (!isAdmin()) return null;
  const all = getWorks();
  const i = all.findIndex(w => w.id === id);
  if (i < 0) return null;
  all[i] = { ...all[i], ...data };
  _saveAllWorks(all);
  return all[i];
}

function workDelete(id) {
  if (!isAdmin()) return false;
  _saveAllWorks(getWorks().filter(w => w.id !== id));
  return true;
}

// ── CAROUSEL DATA ─────────────────────────────────────────────────────────────

const _CAR_KEY = 'jx_carousel_v1';

function getCarouselImages() {
  try { return JSON.parse(localStorage.getItem(_CAR_KEY)) || []; } catch { return []; }
}
function saveCarouselImages(arr) { localStorage.setItem(_CAR_KEY, JSON.stringify(arr)); _devSync(); }

// ── SETTINGS ─────────────────────────────────────────────────────────────────

const _SETTINGS_KEY = 'jx_settings_v1';

function getSettings() {
  try { return JSON.parse(localStorage.getItem(_SETTINGS_KEY)) || {}; } catch { return {}; }
}
function saveSettings(s) {
  localStorage.setItem(_SETTINGS_KEY, JSON.stringify({ ...getSettings(), ...s }));
  _devSync();
}

// ── EXTRA ADMINS ─────────────────────────────────────────────────────────────

const _EXTRA_ADMINS_KEY = 'jx_extra_admins_v1';

function getExtraAdmins() {
  try { return JSON.parse(localStorage.getItem(_EXTRA_ADMINS_KEY)) || []; } catch { return []; }
}
function _saveExtraAdmins(list) {
  localStorage.setItem(_EXTRA_ADMINS_KEY, JSON.stringify(list));
  _devSync();
}

async function adminAddAccount(email, password) {
  if (!isAdmin()) return { ok: false, msg: '需要管理員權限' };
  const key = email.trim().toLowerCase();
  if (!key || !password) return { ok: false, msg: '請填寫帳號與密碼' };
  if (_ADMINS[key]) return { ok: false, msg: '此為內建帳號，無法從這裡修改' };
  const hash = await _sha256(password + _SALT);
  const list = getExtraAdmins().filter(a => a.email !== key);
  list.push({ email: key, hash });
  _saveExtraAdmins(list);
  return { ok: true };
}

function adminRemoveAccount(email) {
  if (!isAdmin()) return false;
  _saveExtraAdmins(getExtraAdmins().filter(a => a.email !== email.trim().toLowerCase()));
  return true;
}

// ── DATA EXPORT / IMPORT ─────────────────────────────────────────────────────

const _ALL_LS_KEYS = [_PROJ_KEY, _WORKS_KEY, _CAR_KEY, _SETTINGS_KEY, _EXTRA_ADMINS_KEY];

function exportAllData() {
  const out = {};
  _ALL_LS_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v) try { out[k] = JSON.parse(v); } catch {}
  });
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jiaxin-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importAllData(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const msg = document.getElementById('importMsg');
    try {
      const data = JSON.parse(e.target.result);
      _ALL_LS_KEYS.forEach(k => {
        if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
      });
      if (msg) { msg.textContent = '✓ 匯入成功，重新載入中…'; msg.style.color = '#44dd88'; }
      setTimeout(() => location.reload(), 1200);
    } catch {
      if (msg) { msg.textContent = '✗ 檔案格式錯誤'; msg.style.color = '#ff6655'; }
    }
  };
  reader.readAsText(file);
}

// ── ADMIN SETTINGS MODAL ─────────────────────────────────────────────────────

function _ensureSettingsModal() {
  if (document.getElementById('adminSettingsModal')) return;

  const modal = document.createElement('div');
  modal.className = 'prog-modal';
  modal.id = 'adminSettingsModal';
  modal.innerHTML = `
    <div class="prog-modal-box" style="max-width:520px">
      <button class="prog-modal-close" onclick="closeAdminSettings()">✕</button>
      <h2 style="margin-bottom:20px">管理員設定</h2>
      <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">
        <button class="settings-tab active" id="stab-email"  onclick="switchSettingsTab('email')">收件 Email</button>
        <button class="settings-tab"        id="stab-admins" onclick="switchSettingsTab('admins')">管理員帳號</button>
        <button class="settings-tab"        id="stab-data"   onclick="switchSettingsTab('data')">資料備份</button>
      </div>

      <div id="settingsTabEmail">
        <div class="prog-field">
          <label>聯絡表單收件信箱</label>
          <input type="email" id="settingsToEmail" placeholder="your@email.com" style="width:100%" />
        </div>
        <p style="font-size:12px;color:var(--gray);margin-bottom:16px;line-height:1.6">
          此設定記錄收件地址供前端參考；實際寄信由後端 Vercel 環境變數 <code>TO_EMAIL</code> 控制。
        </p>
        <button class="btn btn-primary" onclick="saveSettingsEmail()" style="font-size:13px;padding:9px 20px">儲存</button>
        <span id="settingsEmailMsg" style="font-size:13px;margin-left:12px"></span>
      </div>

      <div id="settingsTabAdmins" style="display:none">
        <div id="settingsAdminList" style="margin-bottom:16px"></div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:16px 0">
        <h4 style="font-size:12px;color:var(--gray);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.1em">新增管理員帳號</h4>
        <div class="prog-field">
          <label>Email</label>
          <input type="email" id="newAdminEmail" placeholder="admin@example.com" style="width:100%" />
        </div>
        <div class="prog-field">
          <label>密碼</label>
          <input type="password" id="newAdminPass" placeholder="設定新密碼" style="width:100%" />
        </div>
        <button class="btn btn-primary" onclick="addNewAdmin()" style="font-size:13px;padding:9px 20px">新增</button>
        <span id="newAdminMsg" style="font-size:13px;margin-left:12px"></span>
      </div>

      <div id="settingsTabData" style="display:none">
        <p style="font-size:14px;color:var(--gray);margin-bottom:20px;line-height:1.7">
          匯出所有本機資料（專案、作品、輪播圖、設定）為 JSON 檔案，可在其他裝置匯入以同步記錄。
        </p>
        <button class="btn btn-primary" onclick="exportAllData()" style="font-size:13px;padding:9px 20px">⬇ 匯出資料 Export</button>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:20px 0">
        <p style="font-size:14px;color:var(--gray);margin-bottom:12px">匯入 JSON 備份（將覆蓋現有資料）：</p>
        <input type="file" id="importFileInput" accept=".json" onchange="importAllData(this)" style="color:var(--gray);font-size:13px" />
        <span id="importMsg" style="font-size:13px;margin-left:8px"></span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const backdrop = document.createElement('div');
  backdrop.className = 'prog-modal-backdrop';
  backdrop.id = 'adminSettingsBackdrop';
  backdrop.onclick = closeAdminSettings;
  document.body.appendChild(backdrop);
}

function openAdminSettings() {
  _ensureSettingsModal();
  const s = getSettings();
  const emailEl = document.getElementById('settingsToEmail');
  if (emailEl) emailEl.value = s.toEmail || '';
  switchSettingsTab('email');
  document.getElementById('adminSettingsModal').classList.add('open');
  document.getElementById('adminSettingsBackdrop').classList.add('open');
}

function closeAdminSettings() {
  const m = document.getElementById('adminSettingsModal');
  const b = document.getElementById('adminSettingsBackdrop');
  if (m) m.classList.remove('open');
  if (b) b.classList.remove('open');
}

function switchSettingsTab(tab) {
  ['email', 'admins', 'data'].forEach(t => {
    const id = 'settingsTab' + t.charAt(0).toUpperCase() + t.slice(1);
    const el = document.getElementById(id);
    const bt = document.getElementById('stab-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    if (bt) bt.classList.toggle('active', t === tab);
  });
  if (tab === 'admins') _renderAdminList();
}

function saveSettingsEmail() {
  const emailEl = document.getElementById('settingsToEmail');
  const msg     = document.getElementById('settingsEmailMsg');
  if (!emailEl) return;
  saveSettings({ toEmail: emailEl.value.trim().toLowerCase() });
  if (msg) { msg.textContent = '✓ 已儲存'; setTimeout(() => { if (msg) msg.textContent = ''; }, 2000); }
}

function _renderAdminList() {
  const el = document.getElementById('settingsAdminList');
  if (!el) return;
  const extras = getExtraAdmins();
  if (!extras.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--gray)">尚未新增額外管理員帳號。</p>';
    return;
  }
  el.innerHTML = extras.map(a => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
      <span style="font-size:13px;color:var(--off-white)">${a.email}</span>
      <button onclick="removeAdmin('${a.email}')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,100,68,0.3);background:transparent;color:#ff8866;cursor:pointer;font-family:var(--font-sans)">移除</button>
    </div>
  `).join('');
}

async function addNewAdmin() {
  const email = (document.getElementById('newAdminEmail')?.value || '').trim();
  const pass  = (document.getElementById('newAdminPass')?.value  || '').trim();
  const msg   = document.getElementById('newAdminMsg');
  const res   = await adminAddAccount(email, pass);
  if (msg) {
    msg.textContent = res.ok ? '✓ 新增成功' : res.msg;
    msg.style.color = res.ok ? '#44dd88' : '#ff6655';
    if (res.ok) {
      const eEl = document.getElementById('newAdminEmail');
      const pEl = document.getElementById('newAdminPass');
      if (eEl) eEl.value = '';
      if (pEl) pEl.value = '';
      _renderAdminList();
      setTimeout(() => { if (msg) msg.textContent = ''; }, 2000);
    }
  }
}

function removeAdmin(email) {
  if (!confirm('確定要移除管理員帳號：' + email + '？')) return;
  adminRemoveAccount(email);
  _renderAdminList();
}

// ── DEV SERVER AUTO-SYNC & DATA FILE INIT ────────────────────────────────────

// Auto-sync to _data.json when using `npm run dev` (localhost:3000 only)
const _IS_DEV = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
                && location.port === '3000';

function _devSync() {
  if (!_IS_DEV) return;
  const out = {};
  [_PROJ_KEY, _WORKS_KEY, _CAR_KEY, _SETTINGS_KEY, _EXTRA_ADMINS_KEY].forEach(k => {
    const v = localStorage.getItem(k);
    if (v) try { out[k] = JSON.parse(v); } catch {}
  });
  fetch('/api/sync-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(out)
  }).catch(() => {});
}

// On first visit (empty localStorage), load data from _data.json.
// Pages await this promise before rendering so content is available.
const _dataReady = fetch('/_data.json')
  .then(r => r.ok ? r.json() : {})
  .then(data => {
    if (!Object.keys(data).length) return;
    const hasAny = [_PROJ_KEY, _WORKS_KEY, _CAR_KEY].some(k => localStorage.getItem(k));
    if (hasAny) return; // localStorage already populated — don't overwrite
    Object.entries(data).forEach(([k, v]) => {
      if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v));
    });
  })
  .catch(() => {}); // graceful fail — site still works without _data.json

// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  authRefreshUI();

  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const err = document.getElementById('loginError');
      err.textContent = '驗證中…';
      const res = await authLogin(
        document.getElementById('loginEmail').value,
        document.getElementById('loginPassword').value
      );
      if (res.ok) {
        closeLoginModal();
        authRefreshUI();
        if (typeof onAuthChange === 'function') onAuthChange();
      } else {
        err.textContent = res.msg;
      }
    });
  }

  const modal = document.getElementById('loginModal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeLoginModal(); });
});
