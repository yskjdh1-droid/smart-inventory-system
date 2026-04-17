// ── Notifications ─────────────────────────────────
import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme';
import { Card, PageHeader, Empty, Loading } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { rentalAPI, adminAPI } from '../api';

const TYPE_STYLE = {
  overdue:  { dot: COLORS.red,     label: '연체',      bg: COLORS.redLight },
  dueToday: { dot: COLORS.warning, label: 'D-Day',    bg: COLORS.warningLight },
  dueSoon:  { dot: COLORS.warning, label: '반납 예정', bg: COLORS.warningLight },
  approved: { dot: COLORS.mint,    label: '승인',      bg: COLORS.mintLight },
  rejected: { dot: COLORS.red,     label: '거절',      bg: COLORS.redLight },
  penalty:  { dot: COLORS.red,     label: '패널티',    bg: COLORS.redLight },
};

export function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
    setNotifs([]);
  }, []);

  const renderItem = ({ item }) => {
    const ts = TYPE_STYLE[item.type] || { dot: COLORS.gray, label: '알림', bg: COLORS.grayLight };
    return (
      <Card style={!item.read ? { borderColor: COLORS.mint, borderWidth: 1 } : {}}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.dotWrap, { backgroundColor: ts.bg }]}>
            <View style={[styles.dot, { backgroundColor: ts.dot }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifBody}>{item.body}</Text>
            <Text style={styles.notifTime}>{item.time}</Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <PageHeader title="알림" subtitle="반납 예정 및 연체 알림" />
      {loading ? <Loading /> : (
        <FlatList data={notifs} keyExtractor={(i) => i._id} renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Empty message="알림이 없습니다." />}
        />
      )}
    </View>
  );
}

// ── MyPage ────────────────────────────────────────
export function MyPage() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [rentals, setRentals]     = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [showHistory, setShowHistory]   = useState(false);
  const [showPenalty, setShowPenalty]   = useState(false);
  const [showNotifSetting, setShowNotifSetting] = useState(false);
  const [notifSettings, setNotifSettings] = useState({ dueAlert: true, overdueAlert: true, penaltyAlert: true });

  useEffect(() => {
    rentalAPI.getMyRentals()
      .then((r) => setRentals(r.data))
      .catch(() => {});
  }, []);

  const activeRentals   = rentals.filter((r) => ['ACTIVE', 'OVERDUE'].includes(r.status));
  const returnedRentals = rentals.filter((r) => r.status === 'RETURNED');

  const menuItems = [
    {
      icon: '📋', label: `현재 대여 중 (${activeRentals.length}건)`,
      onPress: () => navigation.navigate('내 대여'),
    },
    {
      icon: '📝', label: '전체 대여 이력',
      onPress: () => setShowHistory(!showHistory),
      expand: true, expanded: showHistory,
    },
    {
      icon: '⚠️', label: `패널티 이력 (${user?.penaltyScore || 0}점)`,
      onPress: () => setShowPenalty(!showPenalty),
      expand: true, expanded: showPenalty,
    },
    {
      icon: '🔔', label: '알림 설정',
      onPress: () => setShowNotifSetting(!showNotifSetting),
      expand: true, expanded: showNotifSetting,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      {/* 프로필 헤더 */}
      <View style={styles2.profileHead}>
        <View style={styles2.avatar}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.white }}>{user?.name?.[0]}</Text>
        </View>
        <View>
          <Text style={styles2.profileName}>{user?.name}</Text>
          <Text style={styles2.profileSub}>{user?.studentId} · 컴퓨터공학과</Text>
        </View>
      </View>

      {/* 통계 카드 */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 10 }}>
        <View style={styles2.statCard}>
          <Text style={styles2.statLabel}>대여 중</Text>
          <Text style={[styles2.statNum, { color: COLORS.primary }]}>{activeRentals.length}건</Text>
        </View>
        <View style={styles2.statCard}>
          <Text style={styles2.statLabel}>패널티</Text>
          <Text style={[styles2.statNum, { color: (user?.penaltyScore || 0) >= 5 ? COLORS.red : COLORS.mint }]}>
            {user?.penaltyScore || 0}점
          </Text>
        </View>
        <View style={styles2.statCard}>
          <Text style={styles2.statLabel}>대여 정지</Text>
          <Text style={[styles2.statNum, { color: user?.isSuspended ? COLORS.red : COLORS.mint, fontSize: 14 }]}>
            {user?.isSuspended ? '정지 중' : '정상'}
          </Text>
        </View>
      </View>

      {/* 대여 정지 경고 */}
      {user?.isSuspended && (
        <View style={styles2.suspendBox}>
          <Text style={styles2.suspendText}>⛔ 패널티 누적으로 대여가 정지됐습니다. 관리자에게 문의하세요.</Text>
        </View>
      )}

      {/* 메뉴 */}
      <View style={{ flex: 1 }}>
        {menuItems.map((m) => (
          <View key={m.label}>
            <TouchableOpacity style={styles2.menuItem} onPress={m.onPress}>
              <Text style={{ fontSize: 18 }}>{m.icon}</Text>
              <Text style={styles2.menuLabel}>{m.label}</Text>
              <Text style={{ color: COLORS.gray, fontSize: 16 }}>{m.expand ? (m.expanded ? '▲' : '▼') : '›'}</Text>
            </TouchableOpacity>

            {/* 전체 대여 이력 펼침 */}
            {m.expand && m.label.includes('대여 이력') && showHistory && (
              <View style={styles2.expandBox}>
                {returnedRentals.length === 0 ? (
                  <Text style={styles2.expandEmpty}>반납 이력이 없습니다.</Text>
                ) : (
                  returnedRentals.slice(0, 5).map((r) => (
                    <View key={r._id} style={styles2.historyRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles2.historyName}>{r.equipment?.modelName}</Text>
                        <Text style={styles2.historySub}>
                          {new Date(r.rentalDate).toLocaleDateString('ko-KR')} ~ {new Date(r.returnDate || r.dueDate).toLocaleDateString('ko-KR')}
                        </Text>
                      </View>
                      <View style={[styles2.historyBadge, { backgroundColor: COLORS.grayLight }]}>
                        <Text style={{ fontSize: 11, color: COLORS.gray, fontWeight: '600' }}>반납 완료</Text>
                      </View>
                    </View>
                  ))
                )}
                {returnedRentals.length > 5 && (
                  <TouchableOpacity onPress={() => navigation.navigate('내 대여')}>
                    <Text style={{ fontSize: 12, color: COLORS.primary, textAlign: 'center', paddingVertical: 8 }}>
                      전체 보기 ({returnedRentals.length}건) →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* 패널티 이력 펼침 */}
            {m.expand && m.label.includes('패널티') && showPenalty && (
              <View style={styles2.expandBox}>
                {(user?.penaltyScore || 0) === 0 ? (
                  <Text style={styles2.expandEmpty}>패널티 이력이 없습니다. ✅</Text>
                ) : (
                  <View>
                    <View style={styles2.penaltyInfo}>
                      <Text style={styles2.penaltyScore}>{user?.penaltyScore || 0}점</Text>
                      <Text style={styles2.penaltyDesc}>
                        {(user?.penaltyScore || 0) >= 10 ? '⛔ 대여 정지 상태' :
                         (user?.penaltyScore || 0) >= 5  ? '⚠️ 주의 필요' : '✅ 양호'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: COLORS.gray, textAlign: 'center', marginTop: 8 }}>
                      패널티 상세 내역은 관리자에게 문의하세요.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 알림 설정 펼침 */}
            {m.expand && m.label.includes('알림') && showNotifSetting && (
              <View style={styles2.expandBox}>
                {[
                  { key: 'dueAlert',     label: '반납 예정 알림 (D-3, D-1)' },
                  { key: 'overdueAlert', label: '연체 알림' },
                  { key: 'penaltyAlert', label: '패널티 알림' },
                ].map((s) => (
                  <View key={s.key} style={styles2.notifRow}>
                    <Text style={styles2.notifLabel}>{s.label}</Text>
                    <Switch
                      value={notifSettings[s.key]}
                      onValueChange={(v) => setNotifSettings({ ...notifSettings, [s.key]: v })}
                      trackColor={{ false: COLORS.border, true: COLORS.mint }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* 로그아웃 */}
        <TouchableOpacity
          style={[styles2.menuItem, { marginTop: 16 }]}
          onPress={() => Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '확인', style: 'destructive', onPress: logout },
          ])}
        >
          <Text style={{ fontSize: 18 }}>🚪</Text>
          <Text style={[styles2.menuLabel, { color: COLORS.red }]}>로그아웃</Text>
          <Text style={{ color: COLORS.border, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dotWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  notifTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  notifBody:  { fontSize: 12, color: COLORS.gray, marginTop: 2, lineHeight: 18 },
  notifTime:  { fontSize: 11, color: '#aaa', marginTop: 4 },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4 },
});

const styles2 = StyleSheet.create({
  profileHead:  { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:       { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  profileName:  { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  profileSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  statCard:     { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center' },
  statLabel:    { fontSize: 11, color: COLORS.gray },
  statNum:      { fontSize: 20, fontWeight: '700', marginTop: 2 },
  suspendBox:   { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.redLight, borderRadius: 10, padding: 12 },
  suspendText:  { fontSize: 12, color: COLORS.red, fontWeight: '500', textAlign: 'center' },
  menuItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  menuLabel:    { flex: 1, fontSize: 14, color: COLORS.text },
  expandBox:    { backgroundColor: COLORS.grayLight, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  expandEmpty:  { fontSize: 13, color: COLORS.gray, textAlign: 'center', paddingVertical: 8 },
  historyRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  historyName:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  historySub:   { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  penaltyInfo:  { alignItems: 'center', paddingVertical: 8 },
  penaltyScore: { fontSize: 32, fontWeight: '700', color: COLORS.red },
  penaltyDesc:  { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  notifRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  notifLabel:   { fontSize: 13, color: COLORS.text, flex: 1 },
});

module.exports = { Notifications, MyPage };