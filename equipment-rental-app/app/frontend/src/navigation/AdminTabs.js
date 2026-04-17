import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../theme';

import AdminDashboard     from '../screens/admin/Dashboard';
import AdminEquipment     from '../screens/admin/Equipment';
import AdminCategory      from '../screens/admin/Category';
import AdminRentals       from '../screens/admin/Rentals';
import AdminPenalty       from '../screens/admin/Penalty';
import AdminDamageReports from '../screens/admin/DamageReports';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: '500' },
      }}
    >
      <Tab.Screen name="대시보드"  component={AdminDashboard}     options={{ tabBarIcon: () => <Text style={{ fontSize: 18 }}>📊</Text> }} />
      <Tab.Screen name="기자재"    component={AdminEquipment}     options={{ tabBarIcon: () => <Text style={{ fontSize: 18 }}>📦</Text> }} />
      <Tab.Screen name="카테고리"  component={AdminCategory}      options={{ tabBarIcon: () => <Text style={{ fontSize: 18 }}>🏷️</Text> }} />
      <Tab.Screen name="대여 현황"  component={AdminRentals}       options={{ tabBarIcon: () => <Text style={{ fontSize: 18 }}>📋</Text> }} />
      <Tab.Screen name="패널티"    component={AdminPenalty}       options={{ tabBarIcon: () => <Text style={{ fontSize: 18 }}>⚠️</Text> }} />
      <Tab.Screen name="신고관리"  component={AdminDamageReports} options={{ tabBarIcon: () => <Text style={{ fontSize: 18 }}>🔧</Text> }} />
    </Tab.Navigator>
  );
}