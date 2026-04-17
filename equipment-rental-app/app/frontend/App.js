import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainTabs from './src/navigation/MainTabs';
import AdminTabs from './src/navigation/AdminTabs';
import EquipmentDetail from './src/screens/EquipmentDetail';
import { RentModal, ExtendModal, DamageReport } from './src/screens/Modals';

const Stack = createStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D2B2B' }}>
        <ActivityIndicator size="large" color="#02C39A" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen}
            options={{ headerShown: true, title: '회원가입', headerStyle: { backgroundColor: '#028090' }, headerTintColor: '#fff' }} />
        </>
      ) : user.role === 'admin' ? (
        <>
          <Stack.Screen name="AdminMain" component={AdminTabs} />
          <Stack.Screen name="EquipmentDetail" component={EquipmentDetail}
            options={{ headerShown: true, title: '기자재 상세', headerStyle: { backgroundColor: '#028090' }, headerTintColor: '#fff' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="EquipmentDetail" component={EquipmentDetail}
            options={{ headerShown: true, title: '기자재 상세', headerStyle: { backgroundColor: '#028090' }, headerTintColor: '#fff' }} />
          <Stack.Screen name="RentModal" component={RentModal}
            options={{ presentation: 'modal', headerShown: true, title: '대여 신청', headerStyle: { backgroundColor: '#028090' }, headerTintColor: '#fff' }} />
          <Stack.Screen name="ExtendModal" component={ExtendModal}
            options={{ presentation: 'modal', headerShown: true, title: '연장 신청', headerStyle: { backgroundColor: '#028090' }, headerTintColor: '#fff' }} />
          <Stack.Screen name="DamageReport" component={DamageReport}
            options={{ presentation: 'modal', headerShown: true, title: '고장/파손 신고', headerStyle: { backgroundColor: '#028090' }, headerTintColor: '#fff' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}