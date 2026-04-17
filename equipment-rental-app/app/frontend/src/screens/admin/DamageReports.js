import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal, Image,
} from 'react-native';
import { reportAPI } from '../../api';
import { BASE_URL } from '../../api';
import { COLORS } from '../../theme';
import { Badge, Card, Empty, Loading, Button, OutlineButton } from '../../components/UI';

const STATUS_MAP = {
  RECEIVED:  { label: '접수됨',  color: '#854F0B', bg: '#FAEEDA' },
  REPAIRING: { label: '수리 중', color: '#534AB7', bg: '#EEEDFE' },
  DONE:      { label: '처리 완료', color: '#085041', bg: '#E1F5EE' },
};

export default function AdminDamageReports() {
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filter, setFilter]     = useState('RECEIVED');

  const load = useCallback(async () => {
    try {
      const r = await reportAPI.damageList();
      setReports(r.data);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const handleUpdateStatus = (id, equipName) => {
    Alert.alert('처리 상태 변경', equipName, [
      { text: '취소', style: 'cancel' },
      { text: '수리 중', onPress: () => updateStatus(id, 'REPAIRING') },
      { text: '처리 완료', onPress: () => updateStatus(id, 'DONE') },
    ]);
  };

  const updateStatus = async (id, status) => {
    try {
      await reportAPI.updateDamage(id, { status });
      Alert.alert('완료', '상태가 변경됐습니다.');
      load();
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '처리 실패');
    }
  };

  const showPhoto = (photoUrl) => {
    const serverIP = BASE_URL.replace('/api', '');
    const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${serverIP}${photoUrl}`;
    setSelectedPhoto(fullUrl);
    setPhotoModal(true);
  };

  const filtered = reports.filter((r) => filter === 'ALL' || r.status === filter);

  const renderItem = ({ item }) => {
    const st = STATUS_MAP[item.status] || STATUS_MAP.RECEIVED;
    return (
      <Card style={item.status === 'RECEIVED' ? { borderColor: COLORS.warning, borderWidth: 0.8 } : {}}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.equipName}>{item.equipment?.modelName}</Text>
            <Text style={styles.userName}>{item.user?.name}  |  {item.user?.studentId}</Text>
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</Text>
          </View>
          <Badge label={st.label} color={st.color} bg={st.bg} />
        </View>

        {/* 증상 설명 */}
        <View style={styles.descBox}>
          <Text style={styles.descLabel}>증상 설명</Text>
          <Text style={styles.descText}>{item.description}</Text>
        </View>

        {/* 사진 */}
        {item.photoUrl && (
          <TouchableOpacity style={styles.photoBtn} onPress={() => showPhoto(item.photoUrl)}>
            <Text style={styles.photoBtnText}>📷 신고 사진 확인</Text>
          </TouchableOpacity>
        )}

        {/* 처리 버튼 */}
        {item.status !== 'DONE' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: item.status === 'RECEIVED' ? '#EEEDFE' : COLORS.mintLight }]}
            onPress={() => handleUpdateStatus(item._id, item.equipment?.modelName)}
          >
            <Text style={[styles.actionBtnText, { color: item.status === 'RECEIVED' ? '#534AB7' : COLORS.primary }]}>
              {item.status === 'RECEIVED' ? '수리 중으로 변경' : '처리 완료로 변경'}
            </Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>고장/파손 신고</Text>
      </View>

      {/* 필터 탭 */}
      <View style={styles.tabRow}>
        {[
          { key: 'RECEIVED',  label: '접수됨' },
          { key: 'REPAIRING', label: '수리 중' },
          { key: 'DONE',      label: '처리 완료' },
          { key: 'ALL',       label: '전체' },
        ].map((t) => (
          <TouchableOpacity key={t.key}
            style={[styles.tabBtn, filter === t.key && styles.tabBtnActive]}
            onPress={() => setFilter(t.key)}>
            <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Loading /> : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Empty message="신고 내역이 없습니다." />}
        />
      )}

      {/* 사진 모달 */}
      <Modal visible={photoModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.photoModalHeader}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.white }}>신고 사진</Text>
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
  tabText: { fontSize: 11, color: COLORS.gray },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  equipName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  userName: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  dateText: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  descBox: { backgroundColor: COLORS.grayLight, borderRadius: 8, padding: 10, marginBottom: 10 },
  descLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 4, fontWeight: '600' },
  descText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  photoBtn: { backgroundColor: '#EEEDFE', borderRadius: 8, paddingVertical: 9, alignItems: 'center', marginBottom: 8 },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: '#534AB7' },
  actionBtn: { borderRadius: 8, paddingVertical: 9, alignItems: 'center', marginTop: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  photoModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
});