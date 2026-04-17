import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Alert, Modal, RefreshControl,
} from 'react-native';
import { categoryAPI } from '../../api';
import { COLORS } from '../../theme';
import { Button, OutlineButton, Card, Empty, Loading } from '../../components/UI';

export default function AdminCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null); // null = 신규, object = 수정
  const [form, setForm] = useState({ name: '', maxRentalDays: '7' });

  const load = useCallback(async () => {
    try {
      const r = await categoryAPI.getAll();
      setCategories(r.data);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', maxRentalDays: '7' });
    setShowForm(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, maxRentalDays: String(cat.maxRentalDays) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return Alert.alert('알림', '카테고리 이름을 입력해주세요.');
    const days = parseInt(form.maxRentalDays, 10);
    if (!days || days < 1) return Alert.alert('알림', '올바른 대여 기간을 입력해주세요.');
    try {
      if (editing) {
        await categoryAPI.update(editing._id, { name: form.name, maxRentalDays: days });
        Alert.alert('완료', '카테고리가 수정됐습니다.');
      } else {
        await categoryAPI.create({ name: form.name, maxRentalDays: days });
        Alert.alert('완료', '카테고리가 추가됐습니다.');
      }
      setShowForm(false);
      load();
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '저장 실패');
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('삭제 확인', `"${name}" 카테고리를 삭제하시겠습니까?\n해당 카테고리의 기자재가 있으면 삭제되지 않을 수 있습니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await categoryAPI.delete(id);
          load();
        } catch (e) {
          Alert.alert('오류', e.response?.data?.message || '삭제 실패');
        }
      }},
    ]);
  };

  const catEmojis = { '노트북': '💻', '카메라': '📷', '태블릿': '📱', '음향 장비': '🎙' };

  const renderItem = ({ item }) => (
    <Card>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Text style={{ fontSize: 24 }}>{catEmojis[item.name] || '📦'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.catName}>{item.name}</Text>
          <Text style={styles.catSub}>최대 대여 기간: {item.maxRentalDays}일</Text>
        </View>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.mintLight }]} onPress={() => openEdit(item)}>
            <Text style={[styles.btnText, { color: COLORS.primary }]}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.redLight }]} onPress={() => handleDelete(item._id, item.name)}>
            <Text style={[styles.btnText, { color: COLORS.red }]}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>카테고리 관리</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>+ 추가</Text>
        </TouchableOpacity>
      </View>

      {loading ? <Loading /> : (
        <FlatList
          data={categories}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Empty message="카테고리가 없습니다." />}
          ListHeaderComponent={
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>📌 카테고리별 최대 대여 기간을 설정하세요.{'\n'}기자재 등록 시 카테고리의 기본 대여 기간이 적용됩니다.</Text>
            </View>
          }
        />
      )}

      {/* 추가/수정 모달 */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
          <View style={styles.modalHeader}>
            <Text style={{ fontSize: 17, fontWeight: '700' }}>
              {editing ? '카테고리 수정' : '카테고리 추가'}
            </Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={{ fontSize: 18, color: COLORS.gray }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={styles.formLabel}>카테고리 이름 *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="예: 노트북, 카메라, 태블릿"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              autoFocus
            />
            <Text style={[styles.formLabel, { marginTop: 14 }]}>최대 대여 기간 (일) *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="7"
              value={form.maxRentalDays}
              onChangeText={(v) => setForm({ ...form, maxRentalDays: v })}
              keyboardType="numeric"
            />
            <Button
              title={editing ? '수정 저장' : '추가하기'}
              onPress={handleSave}
              style={{ marginTop: 24 }}
            />
            <OutlineButton title="취소" onPress={() => setShowForm(false)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: COLORS.white, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 10, backgroundColor: COLORS.mintLight, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  catSub: { fontSize: 12, color: COLORS.gray, marginTop: 3 },
  btnRow: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnText: { fontSize: 12, fontWeight: '700' },
  infoBox: { backgroundColor: '#EEEDFE', borderRadius: 10, padding: 12, marginBottom: 12 },
  infoText: { fontSize: 12, color: '#534AB7', lineHeight: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  formLabel: { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
  formInput: { borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: COLORS.white },
});