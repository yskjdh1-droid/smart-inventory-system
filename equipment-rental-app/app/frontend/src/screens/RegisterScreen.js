import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';
import { Button, OutlineButton } from '../components/UI';

// 단계: email → code → info → done
const STEPS = ['email', 'code', 'info'];

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { login }  = useAuth();

  const [step, setStep] = useState('email');

  // 이메일 단계
  const [email, setEmail]           = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent]     = useState(false);

  // 인증번호 단계
  const [code, setCode]             = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying]   = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [timer, setTimer]           = useState(300); // 5분
  const timerRef                    = useRef(null);
  const codeRefs                    = useRef([]);

  // 정보 입력 단계
  const [form, setForm] = useState({ studentId: '', name: '', password: '', passwordConfirm: '', phone: '' });
  const [registering, setRegistering] = useState(false);

  // ── 타이머 ───────────────────────────────────────
  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimer(300);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const formatTimer = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  // ── 인증번호 발송 ────────────────────────────────
  const handleSendCode = async () => {
    if (!email.includes('@')) return Alert.alert('알림', '올바른 이메일을 입력해주세요.');
    setSendingCode(true);
    try {
      await authAPI.sendCode(email);
      setCodeSent(true);
      setStep('code');
      startTimer();
      setCode(['', '', '', '', '', '']);
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '이메일 발송에 실패했습니다.');
    } finally { setSendingCode(false); }
  };

  const handleResend = async () => {
    if (resendCount >= 3) return Alert.alert('알림', '재발송은 최대 3회까지 가능합니다.');
    setSendingCode(true);
    try {
      await authAPI.sendCode(email);
      setResendCount((c) => c + 1);
      setCode(['', '', '', '', '', '']);
      startTimer();
      Alert.alert('완료', '인증번호가 재발송됐습니다.');
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '재발송 실패');
    } finally { setSendingCode(false); }
  };

  // ── 인증번호 입력 핸들러 ─────────────────────────
  const handleCodeChange = (val, idx) => {
    const next = [...code];
    next[idx] = val.replace(/[^0-9]/g, '').slice(-1);
    setCode(next);
    if (val && idx < 5) codeRefs.current[idx + 1]?.focus();
  };

  const handleCodeKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  // ── 인증번호 확인 ────────────────────────────────
  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) return Alert.alert('알림', '인증번호 6자리를 모두 입력해주세요.');
    if (timer === 0) return Alert.alert('알림', '인증번호가 만료됐습니다. 다시 요청해주세요.');
    setVerifying(true);
    try {
      await authAPI.verifyCode(email, fullCode);
      clearInterval(timerRef.current);
      setStep('info');
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '인증번호가 올바르지 않습니다.');
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally { setVerifying(false); }
  };

  // ── 회원가입 ──────────────────────────────────────
  const handleRegister = async () => {
    const { studentId, name, password, passwordConfirm, phone } = form;
    if (!studentId || !name || !password)
      return Alert.alert('알림', '학번, 이름, 비밀번호를 입력해주세요.');
    if (studentId.length !== 10)
      return Alert.alert('알림', '학번은 10자리입니다.');
    if (password.length < 8)
      return Alert.alert('알림', '비밀번호는 8자 이상이어야 합니다.');
    if (password !== passwordConfirm)
      return Alert.alert('알림', '비밀번호가 일치하지 않습니다.');

    setRegistering(true);
    try {
      await authAPI.register({ studentId, name, email, password, phone });
      // 자동 로그인
      await login(studentId, password);
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '회원가입에 실패했습니다.');
    } finally { setRegistering(false); }
  };

  // ── 진행 표시 ────────────────────────────────────
  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {[['email', '이메일'], ['code', '인증'], ['info', '정보']].map(([s, label], i) => {
        const done    = STEPS.indexOf(step) > i;
        const current = step === s;
        return (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, current && styles.stepDotActive, done && styles.stepDotDone]}>
              {done
                ? <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '700' }}>✓</Text>
                : <Text style={[styles.stepNum, (current || done) && { color: COLORS.white }]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, current && { color: COLORS.primary, fontWeight: '700' }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* 헤더 */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>‹ 로그인</Text>
          </TouchableOpacity>
          <Text style={styles.title}>회원가입</Text>
          <View style={{ width: 60 }} />
        </View>

        <StepIndicator />

        {/* ─── STEP 1: 이메일 입력 ─── */}
        {step === 'email' && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>학교 이메일을 입력하세요</Text>
            <Text style={styles.stepDesc}>인증번호를 이메일로 보내드립니다.</Text>
            <TextInput
              style={styles.input}
              placeholder="example@univ.ac.kr"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Button
              title={sendingCode ? '발송 중...' : '인증번호 발송'}
              onPress={handleSendCode}
              loading={sendingCode}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        {/* ─── STEP 2: 인증번호 입력 ─── */}
        {step === 'code' && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>인증번호를 입력하세요</Text>
            <Text style={styles.stepDesc}>
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{email}</Text>
              {'\n'}로 발송된 6자리 인증번호를 입력하세요.
            </Text>

            {/* 6칸 입력 */}
            <View style={styles.codeRow}>
              {code.map((c, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (codeRefs.current[i] = r)}
                  style={[styles.codeBox, c && styles.codeBoxFilled, timer === 0 && styles.codeBoxExpired]}
                  value={c}
                  onChangeText={(v) => handleCodeChange(v, i)}
                  onKeyPress={(e) => handleCodeKeyPress(e, i)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* 타이머 */}
            <View style={styles.timerRow}>
              <Text style={[styles.timer, timer < 60 && { color: COLORS.red }]}>
                {timer === 0 ? '만료됨' : formatTimer(timer)}
              </Text>
              <TouchableOpacity onPress={handleResend} disabled={sendingCode || resendCount >= 3}>
                <Text style={[styles.resend, (sendingCode || resendCount >= 3) && { color: COLORS.border }]}>
                  재발송 {resendCount > 0 ? `(${resendCount}/3)` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title={verifying ? '확인 중...' : '인증 확인'}
              onPress={handleVerifyCode}
              loading={verifying}
              disabled={timer === 0}
              style={{ marginTop: 8 }}
            />
            <OutlineButton title="이메일 변경" onPress={() => { setStep('email'); setCode(['','','','','','']); clearInterval(timerRef.current); }} style={{ marginTop: 8 }} />
          </View>
        )}

        {/* ─── STEP 3: 정보 입력 ─── */}
        {step === 'info' && (
          <View style={styles.card}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ 이메일 인증 완료</Text>
            </View>
            <Text style={[styles.stepTitle, { marginTop: 12 }]}>기본 정보를 입력하세요</Text>

            {[
              { label: '학번 *', key: 'studentId', placeholder: '20XXXXXXXXXX', keyboardType: 'numeric', maxLength: 10 },
              { label: '이름 *', key: 'name',      placeholder: '홍길동' },
              { label: '연락처', key: 'phone',     placeholder: '010-0000-0000', keyboardType: 'phone-pad' },
            ].map(({ label, key, placeholder, keyboardType, maxLength }) => (
              <View key={key} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  value={form[key]}
                  onChangeText={(v) => setForm({ ...form, [key]: v })}
                  keyboardType={keyboardType}
                  maxLength={maxLength}
                />
              </View>
            ))}

            <Text style={styles.label}>비밀번호 * (8자 이상)</Text>
            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="비밀번호 입력"
              secureTextEntry
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
            <Text style={styles.label}>비밀번호 확인 *</Text>
            <TextInput
              style={[
                styles.input,
                form.passwordConfirm && form.password !== form.passwordConfirm && styles.inputError,
              ]}
              placeholder="비밀번호 재입력"
              secureTextEntry
              value={form.passwordConfirm}
              onChangeText={(v) => setForm({ ...form, passwordConfirm: v })}
            />
            {form.passwordConfirm !== '' && form.password !== form.passwordConfirm && (
              <Text style={styles.errorText}>비밀번호가 일치하지 않습니다.</Text>
            )}

            <Button
              title={registering ? '가입 중...' : '회원가입 완료'}
              onPress={handleRegister}
              loading={registering}
              style={{ marginTop: 20 }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flexGrow: 1, backgroundColor: COLORS.grayLight, padding: 20, paddingTop: 60 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn:       { fontSize: 16, color: COLORS.primary, fontWeight: '600', width: 60 },
  title:         { fontSize: 20, fontWeight: '700', color: COLORS.text },
  stepRow:       { flexDirection: 'row', justifyContent: 'center', gap: 0, marginBottom: 24 },
  stepItem:      { alignItems: 'center', width: 80 },
  stepDot:       { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepDotDone:   { backgroundColor: COLORS.mint },
  stepNum:       { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  stepLabel:     { fontSize: 11, color: COLORS.gray },
  card:          { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: COLORS.border },
  stepTitle:     { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  stepDesc:      { fontSize: 13, color: COLORS.gray, marginBottom: 20, lineHeight: 20 },
  label:         { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
  input:         { borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: COLORS.white, marginBottom: 0 },
  inputError:    { borderColor: COLORS.red },
  errorText:     { fontSize: 12, color: COLORS.red, marginTop: 4 },
  codeRow:       { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  codeBox:       { width: 44, height: 54, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center', backgroundColor: COLORS.grayLight },
  codeBoxFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.mintLight },
  codeBoxExpired:{ borderColor: COLORS.red, backgroundColor: COLORS.redLight },
  timerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timer:         { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  resend:        { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  verifiedBadge: { backgroundColor: COLORS.mintLight, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  verifiedText:  { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
});
