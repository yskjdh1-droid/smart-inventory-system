import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, RefreshControl } from 'react-native';
import { adminAPI } from '../../api';
import { COLORS } from '../../theme';
import { Button, OutlineButton, Card, Empty, Loading } from '../../components/UI';

export default function AdminPenalty() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]   = useState(false);
  const [mode, setMode]     = useState('add'); // add | reduce
  const [selected, setSelected] = useState(null);
  const [form, setForm]     = useState({ score: '1', reason: '' });

  const load = useCallback(async () => {
    try { const r = await adminAPI.users(); setUsers(r.data); }
    catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const openModal = (user, m) => { setSelected(user); setMode(m); setForm({ score: '1', reason: '' }); setModal(true); };

  const handle = async () => {
    if (!form.reason) return Alert.alert('알림', '사유를 입력해주세요.');
    const score = parseInt(form.score, 10);
    if (!score || score < 1) return Alert.alert('알림', '올바른 점수를 입력해주세요.');
    try {
      if (mode === 'add') await adminAPI.addPenalty({ userId: selected._id, score, reason: form.reason });
      else                await adminAPI.reducePenalty(selected._id, { score, reason: form.reason });
      Alert.alert('완료', `${score}점이 ${mode === 'add' ? '부과' : '감면'}됐습니다.`);
      setModal(false);
      load();
    } catch (e) { Alert.alert('오류', e.response?.data?.message || '처리 실패'); }
  };

  const renderUser = ({ item }) => {
    const high = item.penaltyScore >= 10;
    const mid  = item.penaltyScore >= 5;
    return (
      <Card style={item.isSuspended ? { borderColor: COLORS.red, borderWidth: 0.8 } : {}}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name?.[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userSub}>{item.studentId}</Text>
            {item.isSuspended && <Text style={styles.suspendedText}>⛔ 대여 정지 중</Text>}
          </View>
          <Text style={[styles.score, { color: high ? COLORS.red : mid ? COLORS.warning : COLORS.mint }]}>
            {item.penaltyScore}점
          </Text>
        </View>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.redLight }]} onPress={() => openModal(item, 'add')}>
            <Text style={[styles.actionText, { color: COLORS.red }]}>패널티 부과</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.mintLight }]} onPress={() => openModal(item, 'reduce')}>
            <Text style={[styles.actionText, { color: COLORS.primary }]}>패널티 감면</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <View style={styles.header}><Text style={styles.headerTitle}>패널티 관리</Text></View>
      {loading ? <Loading /> : (
        <FlatList data={users} keyExtractor={(i) => i._id} renderItem={renderUser}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Empty message="학생이 없습니다." />}
        />
      )}

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }} contentContainerStyle={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>
              {mode === 'add' ? '패널티 부과' : '패널티 감면'}
            </Text>
            <TouchableOpacity onPress={() => setModal(false)}><Text style={{ fontSize: 18, color: COLORS.gray }}>✕</Text></TouchableOpacity>
          </View>
          {selected && (
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: '700' }}>{selected.name}</Text>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>{selected.studentId} · 현재 {selected.penaltyScore}점</Text>
            </Card>
          )}
          <Text style={styles.formLabel}>점수</Text>
          <TextInput style={styles.formInput} value={form.score} onChangeText={(v) => setForm({ ...form, score: v })} keyboardType="numeric" placeholder="1" />
          <Text style={[styles.formLabel, { marginTop: 12 }]}>사유 *</Text>
          <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} value={form.reason} onChangeText={(v) => setForm({ ...form, reason: v })} placeholder="사유를 입력하세요." multiline />
          <Button title={mode === 'add' ? '패널티 부과' : '패널티 감면'} onPress={handle}
            color={mode === 'add' ? COLORS.red : COLORS.primary} style={{ marginTop: 16 }} />
          <OutlineButton title="취소" onPress={() => setModal(false)} style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: COLORS.white, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  userName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  userSub: { fontSize: 12, color: COLORS.gray, marginTop: 1 },
  suspendedText: { fontSize: 11, color: COLORS.red, fontWeight: '600', marginTop: 2 },
  score: { fontSize: 20, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '700' },
  formLabel: { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
  formInput: { borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: COLORS.white },
});
