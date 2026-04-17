import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

// ── 상태 배지 ─────────────────────────────────────
export function Badge({ label, color, bg }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ── 기본 버튼 ─────────────────────────────────────
export function Button({ title, onPress, color = COLORS.primary, style, loading, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: disabled ? COLORS.gray : color }, style]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={COLORS.white} size="small" />
        : <Text style={styles.btnText}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

// ── 아웃라인 버튼 ─────────────────────────────────
export function OutlineButton({ title, onPress, color = COLORS.primary, style }) {
  return (
    <TouchableOpacity style={[styles.outlineBtn, { borderColor: color }, style]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.outlineBtnText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );
}

// ── 카드 컨테이너 ─────────────────────────────────
export function Card({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.card, style]} onPress={onPress} activeOpacity={0.95}>
      {children}
    </Wrapper>
  );
}

// ── 페이지 헤더 ───────────────────────────────────
export function PageHeader({ title, subtitle }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
    </View>
  );
}

// ── 빈 상태 ───────────────────────────────────────
export function Empty({ message = '내역이 없습니다.' }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ── 로딩 ─────────────────────────────────────────
export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );
}

// ── 구분선 ────────────────────────────────────────
export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  outlineBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: COLORS.white },
  outlineBtnText: { fontSize: 14, fontWeight: '500' },
  card: { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 0.5, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 18, paddingTop: 52 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.gray, fontSize: 14 },
  divider: { height: 0.5, backgroundColor: COLORS.border, marginVertical: 8 },
});
