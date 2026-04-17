import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import EquipmentList from '../screens/EquipmentList';
import QRScan from '../screens/QRScan';
import MyRentals from '../screens/MyRentals';
import { Notifications, MyPage } from '../screens/Pages';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#028090',
        tabBarInactiveTintColor: '#6B7B8A',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E4E8',
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarIcon: ({ focused }) => {
          const icons = { '홈': '🏠', 'QR 스캔': '📷', '내 대여': '📋', '알림': '🔔', '마이': '👤' };
          return <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="홈"      component={EquipmentList} />
      <Tab.Screen name="QR 스캔" component={QRScan} />
      <Tab.Screen name="내 대여"  component={MyRentals} />
      <Tab.Screen name="알림"    component={Notifications} />
      <Tab.Screen name="마이"    component={MyPage} />
    </Tab.Navigator>
  );
}