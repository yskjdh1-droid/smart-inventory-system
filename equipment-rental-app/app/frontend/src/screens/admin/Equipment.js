import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  Alert, Modal, ScrollView, RefreshControl, Image, Share,
} from 'react-native';
import { equipmentAPI, categoryAPI } from '../../api';
import { COLORS, STATUS } from '../../theme';
import { Badge, Button, OutlineButton, Card, Empty, Loading } from '../../components/UI';

export default function AdminEquipment() {
  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [showQR, setShowQR]         = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [form, setForm] = useState({ modelName: '', serialNumber: '', category: '', maxRentalDays: '7' });

  const load = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([equipmentAPI.getAll(), categoryAPI.getAll()]);
      setItems(e.data);
      setCategories(c.data);
      if (c.data.length > 0 && !form.category)
        setForm((f) => ({ ...f, category: c.data[0]._id }));
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.modelName || !form.serialNumber || !form.category)
      return Alert.alert('알림', '모델명, 시리얼 번호, 카테고리를 입력해주세요.');
    try {
      await equipmentAPI.create({ ...form, maxRentalDays: Number(form.maxRentalDays) });
      setShowForm(false);
      setForm({ modelName: '', serialNumber: '', category: categories[0]?._id || '', maxRentalDays: '7' });
      load();
      Alert.alert('완료', '기자재가 등록됐습니다.\nQR 코드가 자동 생성됐습니다.');
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '등록 실패');
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('삭제 확인', `"${name}"을(를) 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await equipmentAPI.delete(id); load(); } },
    ]);
  };

  const handleStatusChange = (id, name) => {
    Alert.alert('상태 변경', name, [
      { text: '취소', style: 'cancel' },
      { text: '대여 가능', onPress: () => changeStatus(id, 'AVAILABLE') },
      { text: '수리 중',   onPress: () => changeStatus(id, 'REPAIRING') },
      { text: '분실',      onPress: () => changeStatus(id, 'LOST') },
    ]);
  };

  const changeStatus = async (id, status) => {
    try { await equipmentAPI.update(id, { status }); load(); }
    catch { Alert.alert('오류', '상태 변경 실패'); }
  };

  const handleShowQR = async (item) => {
    try {
      let qrUrl = item.qrCodeUrl;
      if (!qrUrl) {
        const res = await equipmentAPI.getQR(item._id);
        qrUrl = res.data.qrCodeUrl;
      }
      setSelectedQR({ modelName: item.modelName, serialNumber: item.serialNumber, qrCodeUrl: qrUrl });
      setShowQR(true);
    } catch {
      Alert.alert('오류', 'QR 코드를 불러올 수 없습니다.');
    }
  };

  const handleShareQR = async () => {
    try {
      await Share.share({
        message: `기자재: ${selectedQR.modelName}\n코드: ${selectedQR.serialNumber}`,
      });
    } catch { }
  };

  const catEmojis = { '노트북': '💻', '카메라': '📷', '태블릿': '📱', '음향 장비': '🎙' };

  const renderItem = ({ item }) => {
    const st = STATUS[item.status] || STATUS.AVAILABLE;
    return (
      <Card>
        <View style={styles.row}>
          <View style={[styles.thumb, { backgroundColor: st.bg }]}>
            <Text style={{ fontSize: 22 }}>{catEmojis[item.category?.name] || '📦'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.modelName}</Text>
            <Text style={styles.itemSub}>{item.serialNumber} · {item.category?.name}</Text>
            <Badge label={st.label} color={st.color} bg={st.bg} />
          </View>
        </View>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#EEEDFE' }]} onPress={() => handleShowQR(item)}>
            <Text style={[styles.btnText, { color: '#534AB7' }]}>QR 코드</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.mintLight }]} onPress={() => handleStatusChange(item._id, item.modelName)}>
            <Text style={[styles.btnText, { color: COLORS.primary }]}>상태 변경</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.redLight }]} onPress={() => handleDelete(item._id, item.modelName)}>
            <Text style={[styles.btnText, { color: COLORS.red }]}>삭제</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>기자재 관리</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>+ 등록</Text>
        </TouchableOpacity>
      </View>

      {loading ? <Loading /> : (
        <FlatList data={items} keyExtractor={(i) => i._id} renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Empty message="등록된 기자재가 없습니다." />}
        />
      )}

      {/* QR 코드 모달 */}
      <Modal visible={showQR} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
          <View style={styles.modalHeader}>
            <Text style={{ fontSize: 17, fontWeight: '700' }}>QR 코드</Text>
            <TouchableOpacity onPress={() => setShowQR(false)}>
              <Text style={{ fontSize: 18, color: COLORS.gray }}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedQR && (
            <View style={{ flex: 1, alignItems: 'center', padding: 24 }}>
              <View style={styles.qrInfoBox}>
                <Text style={styles.qrModelName}>{selectedQR.modelName}</Text>
                <Text style={styles.qrSerial}>{selectedQR.serialNumber}</Text>
              </View>
              <View style={styles.qrImageBox}>
                {selectedQR.qrCodeUrl ? (
                  <Image source={{ uri: selectedQR.qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Text style={{ fontSize: 48 }}>📷</Text>
                    <Text style={{ color: COLORS.gray, marginTop: 8 }}>QR 코드 없음</Text>
                  </View>
                )}
              </View>
              <Text style={styles.qrGuide}>
                이 QR 코드를 기자재에 부착하세요.{'\n'}
                사용자가 스캔하면 대여 신청 화면으로 이동합니다.
              </Text>
              <Button title="공유하기" onPress={handleShareQR} style={{ width: '100%', marginTop: 16 }} />
              <OutlineButton title="닫기" onPress={() => setShowQR(false)} style={{ width: '100%', marginTop: 8 }} />
            </View>
          )}
        </View>
      </Modal>

      {/* 기자재 등록 모달 */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }} contentContainerStyle={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>기자재 등록</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={{ fontSize: 18, color: COLORS.gray }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: '#EEEDFE', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: '#534AB7', lineHeight: 20 }}>
              📌 등록 완료 시 QR 코드가 자동 생성됩니다.{'\n'}QR 코드를 출력해서 기자재에 부착하세요.
            </Text>
          </View>
          {[
            { label: '모델명 *', key: 'modelName', placeholder: 'MacBook Air 13 (M2)' },
            { label: '시리얼 번호 *', key: 'serialNumber', placeholder: 'NB-001' },
            { label: '최대 대여 기간 (일)', key: 'maxRentalDays', placeholder: '7', keyboardType: 'numeric' },
          ].map(({ label, key, placeholder, keyboardType }) => (
            <View key={key} style={{ marginBottom: 14 }}>
              <Text style={styles.formLabel}>{label}</Text>
              <TextInput style={styles.formInput} placeholder={placeholder} value={form[key]}
                onChangeText={(v) => setForm({ ...form, [key]: v })} keyboardType={keyboardType} />
            </View>
          ))}
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.formLabel}>카테고리 *</Text>
            <View style={styles.catRow}>
              {categories.map((c) => (
                <TouchableOpacity key={c._id}
                  style={[styles.catChip, form.category === c._id && styles.catChipActive]}
                  onPress={() => setForm({ ...form, category: c._id })}>
                  <Text style={[styles.catChipText, form.category === c._id && { color: COLORS.white }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Button title="등록하기 (QR 자동 생성)" onPress={handleAdd} />
          <OutlineButton title="취소" onPress={() => setShowForm(false)} style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: COLORS.white, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  thumb: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  itemSub: { fontSize: 11, color: COLORS.gray, marginTop: 2, marginBottom: 4 },
  btnRow: { flexDirection: 'row', gap: 6 },
  btn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  btnText: { fontSize: 11, fontWeight: '700' },
  formLabel: { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
  formInput: { borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: COLORS.white },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  qrInfoBox: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', marginBottom: 20, borderWidth: 0.5, borderColor: COLORS.border },
  qrModelName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  qrSerial: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  qrImageBox: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.border, marginBottom: 16 },
  qrImage: { width: 220, height: 220 },
  qrPlaceholder: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  qrGuide: { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 20 },
});