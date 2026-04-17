const admin = require('firebase-admin');
const path  = require('path');

let messaging = null;

try {
  const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  messaging = admin.messaging();
  console.log('[FCM] Firebase 초기화 완료');
} catch (e) {
  console.log('[FCM] Firebase 초기화 실패:', e.message);
}

// 단일 기기에 알림 발송
async function sendNotification(fcmToken, title, body, data = {}) {
  if (!messaging || !fcmToken) return false;
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns:    { payload: { aps: { sound: 'default', badge: 1 } } },
    });
    console.log(`[FCM] 발송 완료: ${title}`);
    return true;
  } catch (e) {
    console.error('[FCM] 발송 실패:', e.message);
    return false;
  }
}

// 여러 기기에 알림 발송
async function sendMulticast(fcmTokens, title, body, data = {}) {
  if (!messaging || !fcmTokens?.length) return;
  try {
    const res = await messaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns:    { payload: { aps: { sound: 'default', badge: 1 } } },
    });
    console.log(`[FCM] 멀티캐스트: 성공 ${res.successCount} / 실패 ${res.failureCount}`);
  } catch (e) {
    console.error('[FCM] 멀티캐스트 실패:', e.message);
  }
}

module.exports = { sendNotification, sendMulticast };