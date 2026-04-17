// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail 앱 비밀번호
  },
});

// 인증번호 생성 (6자리)
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 인증번호 이메일 발송
async function sendVerificationEmail(to, code) {
  await transporter.sendMail({
    from: `"기자재 대여 관리" <${process.env.EMAIL_USER}>`,
    to,
    subject: '[기자재 대여] 이메일 인증번호',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #E0E4E8;border-radius:12px">
        <h2 style="color:#028090;margin-bottom:8px">이메일 인증</h2>
        <p style="color:#6B7B8A;margin-bottom:24px">아래 인증번호를 앱에 입력해주세요.</p>
        <div style="background:#E1F5EE;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#028090">${code}</span>
        </div>
        <p style="color:#6B7B8A;font-size:13px">• 인증번호는 <strong>5분간</strong> 유효합니다.<br>
        • 본인이 요청하지 않은 경우 무시하세요.</p>
      </div>
    `,
  });
}

module.exports = { generateCode, sendVerificationEmail };
