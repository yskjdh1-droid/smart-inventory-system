import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal, Image,
} from 'react-native';
import { rentalAPI } from '../../api';
import { BASE_URL } from '../../api';
import { COLORS, RENTAL_STATUS } from '../../theme';
import { Badge, Card, Empty, Loading, Button } from '../../components/UI';

const TABS = [
  { key: 'ACTIVE',   label: '대여 중' },
  { key: 'EXTEND',   label: '연장 요청' },
  { key: 'OVERDUE',  label: '연체' },
  { key: 'RETURNED', label: '반납 완료' },
];

export default function AdminRentals() {
  const [tab, setTab]         = useState('ACTIVE');
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const load = useCallback(async () => {
    try {
      let r;
      if (tab === 'EXTEND') {
        r = await rentalAPI.getAll({ status: 'ACTIVE' });
        setRentals(r.data.filter((item) => item.extendRequested));
      } else {
        r = await rentalAPI.getAll({ status: tab });
        setRentals(r.data);
      }
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, [tab]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const handleForceReturn = (id, name) => {
    Alert.prompt('강제 반납', `"${name}" 강제 반납 사유를 입력하세요.`, async (reason) => {
      if (!reason) return;
      try { await rentalAPI.forceReturn(id, { reason }); load(); Alert.alert('완료', '강제 반납 처리됐습니다.'); }
      catch (e) { Alert.alert('오류', e.response?.data?.message || '처리 실패'); }
    }, 'plain-text');
  };

  const handleApproveExtend = async (id, newDueDate) => {
    try {
      await rentalAPI.extend(id, { approved: true, newDueDate });
      Alert.alert('완료', '연장이 승인됐습니다.');
      load();
    } catch (e) { Alert.alert('오류', e.response?.data?.message || '처리 실패'); }
  };

  const handleRejectExtend = async (id) => {
    try {
      await rentalAPI.extend(id, { rejected: true });
      Alert.alert('완료', '연장이 거절됐습니다.');
      load();
    } catch (e) { Alert.alert('오류', e.response?.data?.message || '처리 실패'); }
  };

  const showPhoto = (photoUrl) => {
    const serverIP = BASE_URL.replace('/api', '');
    const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${serverIP}${photoUrl}`;
    setSelectedPhoto(fullUrl);
    setPhotoModal(true);
  };

  const renderItem = ({ item }) => {
    const st = RENTAL_STATUS[item.status] || RENTAL_STATUS.ACTIVE;
    const overdueDays = item.status === 'OVERDUE'
      ? Math.floor((Date.now() - new Date(item.dueDate)) / 86400000) : 0;

    return (
      <Card style={item.status === 'OVERDUE' ? { borderColor: COLORS.red, borderWidth: 0.8 } : {}}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.equipName}>{item.equipment?.modelName}</Text>
            <Text style={styles.userName}>{item.user?.name}  |  {item.user?.studentId}</Text>
          </View>
          <Badge label={st.label} color={st.color} bg={st.bg} />
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>대여: {new Date(item.rentalDate).toLocaleDateString('ko-KR')}</Text>
          <Text style={[styles.dateText, item.status === 'OVERDUE' && { color: COLORS.red, fontWeight: '600' }]}>
            반납예정: {new Date(item.dueDate).toLocaleDateString('ko-KR')}
          </Text>
        </View>

        {item.returnDate && (
          <Text style={[styles.dateText, { color: COLORS.primary, marginTop: 2 }]}>
            실제 반납: {new Date(item.returnDate).toLocaleDateString('ko-KR')}
          </Text>
        )}

        {overdueDays > 0 && <Text style={styles.overdueText}>{overdueDays}일 연체 중</Text>}
        {item.purpose && <Text style={styles.purposeText}>사용목적: {item.purpose}</Text>}

        {/* 반납 사진 */}
        {item.returnPhotoUrl ? (
          <TouchableOpacity style={styles.photoBtn} onPress={() => showPhoto(item.returnPhotoUrl)}>
            <Text style={styles.photoBtnText}>📷 반납 사진 확인</Text>
          </TouchableOpacity>
        ) : item.status === 'RETURNED' && (
          <View style={styles.noPhotoBox}>
            <Text style={styles.noPhotoText}>📷 반납 사진 없음</Text>
          </View>
        )}

        {/* 연장 요청 */}
        {item.extendRequested && item.extendNewDueDate && (
          <View style={styles.extendBox}>
            <Text style={styles.extendTitle}>📅 연장 요청</Text>
            <Text style={styles.extendDate}>
              요청 반납일: {new Date(item.extendNewDueDate).toLocaleDateString('ko-KR')}
            </Text>
            <View style={styles.extendBtnRow}>
              <TouchableOpacity style={[styles.extendBtn, { backgroundColor: COLORS.mintLight }]}
                onPress={() => handleApproveExtend(item._id, item.extendNewDueDate)}>
                <Text style={[styles.extendBtnText, { color: COLORS.primary }]}>✓ 승인</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.extendBtn, { backgroundColor: COLORS.redLight }]}
                onPress={() => handleRejectExtend(item._id)}>
                <Text style={[styles.extendBtnText, { color: COLORS.red }]}>✕ 거절</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {item.status !== 'RETURNED' && (
          <TouchableOpacity style={styles.forceBtn}
            onPress={() => handleForceReturn(item._id, item.equipment?.modelName)}>
            <Text style={styles.forceBtnText}>강제 반납</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>대여 현황</Text>
      </View>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Loading /> : (
        <FlatList data={rentals} keyExtractor={(i) => i._id} renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Empty message="내역이 없습니다." />}
        />
      )}

      {/* 반납 사진 모달 */}
      <Modal visible={photoModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.photoModalHeader}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.white }}>반납 사진</Text>
            <TouchableOpacity onPress={() => setPhotoModal(false)}>
              <Text style={{ fontSize: 18, color: COLORS.white }}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedPhoto && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={{ uri: selectedPhoto }}
                style={{ width: '100%', height: '80%' }}
                resizeMode="contain"
              />
            </View>
          )}
          <View style={{ padding: 16 }}>
            <Button title="닫기" onPress={() => setPhotoModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: COLORS.white, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.gray },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  equipName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  userName: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  dateRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  dateText: { fontSize: 12, color: COLORS.gray },
  overdueText: { fontSize: 12, color: COLORS.red, fontWeight: '700', marginBottom: 4 },
  purposeText: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  photoBtn: { marginTop: 8, backgroundColor: '#EEEDFE', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: '#534AB7' },
  noPhotoBox: { marginTop: 8, backgroundColor: COLORS.grayLight, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  noPhotoText: { fontSize: 12, color: COLORS.gray },
  extendBox: { backgroundColor: '#F0FAF9', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 0.5, borderColor: COLORS.mint },
  extendTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  extendDate: { fontSize: 13, color: COLORS.text, marginBottom: 10 },
  extendBtnRow: { flexDirection: 'row', gap: 8 },
  extendBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  extendBtnText: { fontSize: 13, fontWeight: '700' },
  forceBtn: { marginTop: 8, alignSelf: 'flex-end', backgroundColor: COLORS.redLight, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  forceBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.red },
  photoModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
});