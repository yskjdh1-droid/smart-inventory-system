import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';


// 알림 수신 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// FCM 토큰 등록
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('[알림] 실제 기기에서만 사용 가능합니다.');
    return null;
  }

  // 권한 요청
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[알림] 알림 권한이 거부됐습니다.');
    return null;
  }

  // Android 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기자재 대여 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#028090',
    });
  }

  // Expo Push Token 발급
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('[알림] Expo Push Token:', token);
  return token;
}

// 알림 리스너 등록
export function setupNotificationListeners(onNotification, onResponse) {
  const sub1 = Notifications.addNotificationReceivedListener(onNotification);
  const sub2 = Notifications.addNotificationResponseReceivedListener(onResponse);
  return () => { sub1.remove(); sub2.remove(); };
}
