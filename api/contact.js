// api/contact.js — 聯絡表單後端驗證 (Vercel Serverless Function)
// 部署後由 Vercel 自動掛載為 /api/contact 端點。
// 執行環境：Node.js（Vercel 預設 runtime）

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
  // 靜默回傳 200，讓機器人以為送出成功，不洩漏任何線索。
  if (_honeypot) {
    return res.status(200).json({ ok: true });
  }

  // ── 2. 時間戳記檢查（< 3 秒送出 = 機器人）────────────────────────
  const elapsed = Date.now() - parseInt(String(_formtime ?? '0'), 10);
  if (Number.isFinite(elapsed) && elapsed < 3000) {
    return res.status(200).json({ ok: true }); // 同樣靜默
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

  // ── 7. 在此接入電子郵件服務 ────────────────────────────────────────
  //
  // 方案 A：SendGrid
  //   import sgMail from '@sendgrid/mail';
  //   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  //   await sgMail.send({
  //     to:      'abc11032203@gmail.com',
  //     from:    'noreply@yourdomain.com',
  //     replyTo: safe.email,
  //     subject: `【聯絡表單】來自 ${safe.name} 的訊息`,
  //     text:    safe.message,
  //   });
  //
  // 方案 B：Nodemailer + Gmail App Password
  //   import nodemailer from 'nodemailer';
  //   const transporter = nodemailer.createTransport({
  //     service: 'gmail',
  //     auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS },
  //   });
  //   await transporter.sendMail({ from: safe.email, to: 'abc11032203@gmail.com', ... });
  //
  // ─────────────────────────────────────────────────────────────────

  console.log('[contact-form]', safe); // 部署前請接上 Email 服務

  return res.status(200).json({ ok: true });
}
