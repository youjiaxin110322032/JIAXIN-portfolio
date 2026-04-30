// api/contact.js — 聯絡表單後端驗證 (Vercel Serverless Function)
// 部署後由 Vercel 自動掛載為 /api/contact 端點。
// 執行環境：Node.js（Vercel 預設 runtime）

import nodemailer from 'nodemailer'; // 🌟 修正 1：import 移到檔案最頂端

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** 伺服器端淨化：移除所有 HTML 標籤與前後空白 */
function stripTags(str) {
  return String(str ?? '').replace(/<[^>]*>/g, '').trim();
}

export default async function handler(req, res) {
  // ── 只接受 POST ────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, email, message, _honeypot, _formtime } = req.body ?? {};

  // ── 1. Honeypot 檢查（機器人會填入此隱藏欄位）─────────────────────
  if (_honeypot) {
    return res.status(200).json({ ok: true });
  }

  // ── 2. 時間戳記檢查（< 3 秒送出 = 機器人）────────────────────────
  const elapsed = Date.now() - parseInt(String(_formtime ?? '0'), 10);
  if (Number.isFinite(elapsed) && elapsed < 3000) {
    return res.status(200).json({ ok: true }); 
  }

  // ── 3. 必填欄位檢查 ────────────────────────────────────────────────
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: '請填寫所有必填欄位' });
  }

  // ── 4. 格式驗證 ────────────────────────────────────────────────────
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: '電子郵件格式不正確' });
  }

  // ── 5. 長度限制（防止大量資料攻擊）───────────────────────────────
  if (name.length > 100 || email.length > 200 || message.length > 2000) {
    return res.status(400).json({ error: '輸入內容超過長度限制' });
  }

  // ── 6. 伺服器端淨化（移除所有 HTML 標籤）─────────────────────────
  const safe = {
    name:    stripTags(name),
    email:   stripTags(email).toLowerCase(),
    message: stripTags(message),
  };

  // ── 7. 寄信服務 (Nodemailer + Gmail App Password) ─────────────
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { 
        user: process.env.GMAIL_USER, 
        pass: process.env.GMAIL_APP_PASS 
      },
    });

    // 🌟 修正 3：補齊信件的各個欄位
    await transporter.sendMail({ 
      from: `"${safe.name}" <${safe.email}>`, // 顯示是誰寄的
      to: process.env.TO_EMAIL || 'abc11032203@gmail.com',
      replyTo: safe.email,                    // 讓你按回覆時直接回信給對方
      subject: `【作品集網站聯絡】來自 ${safe.name} 的訊息`,
      text: safe.message 
    });

    console.log('[contact-form] 信件已發送', safe);
    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[contact-form] 寄信失敗:', error);
    return res.status(500).json({ error: '信件發送失敗，請稍後再試' });
  }
}