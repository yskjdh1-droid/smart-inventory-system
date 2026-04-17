// ── utils/fcm.js ──────────────────────────────────
// Firebase Admin SDK로 FCM 푸시 알림 발송

let admin = null;

function initFirebase() {
  if (admin) return;
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn('[FCM] Firebase 환경변수 없음. 알림 발송 비활성화.');
    return;
  }
  try {
    admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('[FCM] Firebase 초기화 완료');
  } catch (e) {
    console.error('[FCM] 초기화 실패:', e.message);
  }
}

async function sendPush(fcmToken, title, body, data = {}) {
  if (!admin || !fcmToken) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: { priority: 'high' },
    });
  } catch (e) {
    console.error('[FCM] 발송 실패:', e.message);
  }
}

async function sendPushToUser(user, title, body, data = {}) {
  if (!user?.fcmToken) return;
  await sendPush(user.fcmToken, title, body, data);
}

module.exports = { initFirebase, sendPush, sendPushToUser };
