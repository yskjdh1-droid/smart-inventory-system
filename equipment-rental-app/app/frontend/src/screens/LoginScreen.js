import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';
import { Button } from '../components/UI';

export default function LoginScreen({ navigation }) {
  const { login, adminLogin } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!id || !pw) return Alert.alert('알림', '아이디와 비밀번호를 입력해주세요.');
    setLoading(true);
    try {
      if (isAdmin) await adminLogin(id, pw);
      else         await login(id, pw);
    } catch (e) {
      Alert.alert('로그인 실패', e.response?.data?.message || '아이디 또는 비밀번호를 확인해주세요.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* 로고 */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>📦</Text></View>
          <Text style={styles.logoTitle}>기자재 대여 관리</Text>
          <Text style={styles.logoSub}>스마트 학과 기자재 대여 시스템</Text>
        </View>

        {/* 탭 */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, !isAdmin && styles.tabActive]} onPress={() => { setIsAdmin(false); setId(''); setPw(''); }}>
            <Text style={[styles.tabText, !isAdmin && styles.tabTextActive]}>학생</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, isAdmin && styles.tabActive]} onPress={() => { setIsAdmin(true); setId(''); setPw(''); }}>
            <Text style={[styles.tabText, isAdmin && styles.tabTextActive]}>관리자</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{isAdmin ? '관리자 ID' : '학번'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isAdmin ? '관리자 ID 입력' : '20XXXXXXXX'}
            value={id}
            onChangeText={setId}
            autoCapitalize="none"
            keyboardType={isAdmin ? 'default' : 'numeric'}
          />
          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="비밀번호 입력"
            secureTextEntry
            value={pw}
            onChangeText={setPw}
            onSubmitEditing={handleLogin}
          />
          <Button title="로그인" onPress={handleLogin} loading={loading} style={{ marginTop: 8 }} />
          {!isAdmin && (
            <TouchableOpacity style={styles.registerRow} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>계정이 없으신가요?</Text>
              <Text style={styles.registerLink}> 회원가입</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoIcon: { fontSize: 34 },
  logoTitle: { fontSize: 22, fontWeight: '700', color: COLORS.primaryDark },
  logoSub: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.grayLight, borderRadius: 10, padding: 3, marginBottom: 16, width: '100%' },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.white },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  card: { width: '100%', backgroundColor: COLORS.white, borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: COLORS.border },
  label: { fontSize: 13, color: COLORS.gray, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: COLORS.white },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  registerText: { fontSize: 14, color: COLORS.gray },
  registerLink: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});
