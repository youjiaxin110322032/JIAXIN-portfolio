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
  const key = email.trim().toLowerCase();
  const expected = _ADMINS[key];
  if (!expected) return { ok: false, msg: '帳號不存在 / Account not found' };
  const hash = await _sha256(password + _SALT);
  if (hash !== expected) return { ok: false, msg: '密碼錯誤 / Wrong password' };
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

function _saveProjects(list) { localStorage.setItem(_PROJ_KEY, JSON.stringify(list)); }

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

function _saveAllWorks(list) { localStorage.setItem(_WORKS_KEY, JSON.stringify(list)); }

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
function saveCarouselImages(arr) { localStorage.setItem(_CAR_KEY, JSON.stringify(arr)); }

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
