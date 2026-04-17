// ── MyRentals.js ─────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { rentalAPI } from '../api';
import { COLORS, RENTAL_STATUS } from '../theme';
import { Badge, Card, PageHeader, Empty, Loading } from '../components/UI';

export default function MyRentals() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('active');
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await rentalAPI.getMyRentals();
      setRentals(r.data);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = rentals.filter((r) =>
    tab === 'active' ? ['ACTIVE', 'OVERDUE'].includes(r.status) : r.status === 'RETURNED'
  );

  const renderItem = ({ item }) => {
    const st = RENTAL_STATUS[item.status];
    const overdueDays = item.status === 'OVERDUE' ? Math.floor((Date.now() - new Date(item.dueDate)) / 86400000) : 0;
    return (
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.equipName}>{item.equipment?.modelName}</Text>
            <Text style={styles.equipSerial}>{item.equipment?.serialNumber}</Text>
          </View>
          <Badge label={st.label} color={st.color} bg={st.bg} />
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>대여일: {new Date(item.rentalDate).toLocaleDateString('ko-KR')}</Text>
          <Text style={[styles.dateText, item.status === 'OVERDUE' && { color: COLORS.red }]}>
            반납예정: {new Date(item.dueDate).toLocaleDateString('ko-KR')}
          </Text>
        </View>
        {overdueDays > 0 && <Text style={styles.overdueText}>{overdueDays}일 연체 중</Text>}
        {item.status === 'ACTIVE' && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => navigation.navigate('QR 스캔')}>
              <Text style={styles.actionBtnText}>반납하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.primary }]}
              onPress={() => navigation.navigate('ExtendModal', { rentalId: item._id, dueDate: item.dueDate })}>
              <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>연장 신청</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <PageHeader title="내 대여 현황" />
      <View style={styles.tabs}>
        {[['active', '대여 중'], ['history', '반납 이력']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabBtnText, tab === key && styles.tabBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <Loading /> : (
        <FlatList data={filtered} keyExtractor={(i) => i._id} renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Empty message="내역이 없습니다." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabBtnText: { fontSize: 14, color: COLORS.gray },
  tabBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
  equipName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  equipSerial: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  dateRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  dateText: { fontSize: 12, color: COLORS.gray },
  overdueText: { fontSize: 12, color: COLORS.red, fontWeight: '600', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
});

module.exports = MyRentals;
