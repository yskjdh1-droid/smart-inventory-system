// ── RentModal.js ──────────────────────────────────
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { rentalAPI } from '../api';
import { COLORS } from '../theme';
import { Button, Card } from '../components/UI';

export function RentModal() {
  const { params: { item } } = useRoute();
  const navigation = useNavigation();
  const [dueDate, setDueDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (item?.maxRentalDays || 7));
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  const handleRent = async () => {
    if (!dueDate) return Alert.alert('알림', '반납 예정일을 입력해주세요. (YYYY-MM-DD)');
    setLoading(true);
    try {
      await rentalAPI.create({ equipmentId: item._id, dueDate, purpose });
      setDone(true);
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '대여 신청에 실패했습니다.');
    } finally { setLoading(false); }
  };

  if (done) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.grayLight, padding: 24 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 }}>대여 신청 완료!</Text>
      <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 24 }}>반납 예정일: {dueDate}</Text>
      <Button title="확인" onPress={() => navigation.popToTop()} style={{ width: '100%' }} />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }} contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={{ fontSize: 15, fontWeight: '600', marginBottom: 4 }}>{item.modelName}</Text>
        <Text style={{ fontSize: 12, color: COLORS.gray }}>{item.serialNumber}</Text>
      </Card>
      <Card>
        <Text style={s.label}>반납 예정일 * (YYYY-MM-DD)</Text>
        <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 6 }}>
          선택 범위: {minDate.toISOString().split('T')[0]} ~ {maxDate.toISOString().split('T')[0]}
        </Text>
        <TextInput style={s.input} placeholder="예: 2026-04-20" value={dueDate} onChangeText={setDueDate} keyboardType="numbers-and-punctuation" />
        <Text style={[s.label, { marginTop: 12 }]}>사용 목적 (선택)</Text>
        <TextInput style={s.input} placeholder="예: 졸업 작품 촬영" value={purpose} onChangeText={setPurpose} />
        <Button title="대여 신청하기" onPress={handleRent} loading={loading} style={{ marginTop: 16 }} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
  input: { borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 11, fontSize: 15 },
});

// ── ExtendModal.js ────────────────────────────────
export function ExtendModal() {
  const { params: { rentalId, dueDate: curDue } } = useRoute();
  const navigation = useNavigation();
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!newDate) return Alert.alert('알림', '새 반납 예정일을 입력해주세요.');
    setLoading(true);
    try {
      await rentalAPI.extend(rentalId, { newDueDate: newDate });
      Alert.alert('완료', '연장 신청이 접수됐습니다.\n관리자 승인 후 확정됩니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '연장 신청에 실패했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight, padding: 16 }}>
      <Card>
        <Text style={s.label}>현재 반납 예정일</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 16 }}>{new Date(curDue).toLocaleDateString('ko-KR')}</Text>
        <Text style={s.label}>새 반납 예정일 * (YYYY-MM-DD)</Text>
        <TextInput style={s.input} placeholder="예: 2026-04-25" value={newDate} onChangeText={setNewDate} keyboardType="numbers-and-punctuation" />
        <Button title="연장 신청하기" onPress={handle} loading={loading} style={{ marginTop: 16 }} />
      </Card>
    </View>
  );
}

// ── DamageReport.js ───────────────────────────────
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

export function DamageReport() {
  const { params: { equipmentId } } = useRoute();
  const navigation = useNavigation();
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled) setPhoto(res.assets[0]);
  };

  const handle = async () => {
    if (!desc) return Alert.alert('알림', '증상 설명을 입력해주세요.');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('equipmentId', equipmentId);
      form.append('description', desc);
      if (photo) form.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'damage.jpg' });
      await api.post('/reports/damage', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('완료', '신고가 접수됐습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '신고 접수에 실패했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }} contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={s.label}>증상 설명 *</Text>
        <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} placeholder="어떤 고장/파손이 발생했는지 구체적으로 설명해주세요." value={desc} onChangeText={setDesc} multiline />
        <Text style={[s.label, { marginTop: 12 }]}>사진 첨부</Text>
        <Button title={photo ? '사진 재촬영' : '카메라로 촬영'} onPress={pickPhoto} color={COLORS.gray} style={{ marginBottom: 8 }} />
        {photo && <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 8 }} />}
        <Button title="신고 접수하기" onPress={handle} loading={loading} color={COLORS.red} style={{ marginTop: 8 }} />
      </Card>
    </ScrollView>
  );
}

import api from '../api';
module.exports = { RentModal, ExtendModal, DamageReport };
