import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  TextInput, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { equipmentAPI, rentalAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { COLORS, STATUS } from '../theme';
import { Badge, Button, OutlineButton, Card } from '../components/UI';

// 모드: camera → rent_confirm → rent_done
//       camera → return_confirm → return_photo → done
export default function QRScan() {
  const navigation  = useNavigation();
  const route       = useRoute();
  const { user }    = useAuth();

  // 기자재 상세에서 넘어온 경우 (대여 전용 QR 스캔)
  const rentItemId  = route.params?.rentItemId || null;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]   = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [item, setItem]         = useState(null);
  const [rental, setRental]     = useState(null);
  const [mode, setMode]         = useState('camera');
  const [photo, setPhoto]       = useState(null);
  const [returning, setReturning] = useState(false);

  // 대여 기간 입력
  const [dueDate, setDueDate]   = useState('');
  const [purpose, setPurpose]   = useState('');
  const [renting, setRenting]   = useState(false);

  const lookup = async (code) => {
    try {
      let result;
      if (code.includes('/equipment/')) {
        const id = code.split('/equipment/').pop().split('?')[0];
        const res = await equipmentAPI.getOne(id);
        result = res.data;
      } else {
        const res = await equipmentAPI.getAll({ search: code });
        if (!res.data.length) {
          Alert.alert('알림', '기자재를 찾을 수 없습니다.', [{ text: '확인', onPress: () => setScanned(false) }]);
          return;
        }
        result = res.data[0];
      }

      // 대여 흐름: 기자재 상세에서 넘어온 경우 ID 확인
      if (rentItemId && result._id !== rentItemId) {
        Alert.alert('알림', '다른 기자재의 QR 코드입니다.\n올바른 기자재를 스캔해주세요.', [
          { text: '확인', onPress: () => setScanned(false) },
        ]);
        return;
      }

      // 반납 흐름: 내가 빌린 기자재인지 확인
      if (result.status === 'RENTED') {
        const myRentals = await rentalAPI.getMyRentals();
        const myRental  = myRentals.data.find(
          (r) => r.equipment?._id === result._id && r.status === 'ACTIVE'
        );
        if (myRental) {
          setItem(result);
          setRental(myRental);
          setMode('return_confirm');
          return;
        }
      }

      setItem(result);

      // 대여 흐름
      if (result.status === 'AVAILABLE') {
        setMode('rent_confirm');
      } else {
        setMode('result');
      }
    } catch {
      Alert.alert('오류', '조회 중 오류가 발생했습니다.', [{ text: '확인', onPress: () => setScanned(false) }]);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    lookup(data);
  };

  const reset = () => {
    setScanned(false); setItem(null); setRental(null);
    setMode('camera'); setManualCode(''); setPhoto(null);
    setDueDate(''); setPurpose('');
  };

  // ── 대여 처리 ─────────────────────────────────────
  const handleRent = async () => {
    if (!dueDate) return Alert.alert('알림', '반납 예정일을 입력해주세요. (YYYY-MM-DD)');
    setRenting(true);
    try {
      await rentalAPI.create({ equipmentId: item._id, dueDate, purpose });
      setMode('rent_done');
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '대여 신청에 실패했습니다.');
    } finally { setRenting(false); }
  };

  // ── 사진 촬영 ─────────────────────────────────────
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('알림', '카메라 권한이 필요합니다.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  // ── 반납 처리 ─────────────────────────────────────
  const handleReturn = async () => {
    if (!photo) { Alert.alert('알림', '반납 전 기자재 상태 사진을 촬영해주세요.'); return; }
    setReturning(true);
    try {
      const formData = new FormData();
      formData.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'return_photo.jpg' });
      await rentalAPI.returnItem(rental._id, formData);
      setMode('done');
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '반납 처리 중 오류가 발생했습니다.');
    } finally { setReturning(false); }
  };

  // ── 대여 기간 입력 화면 ───────────────────────────
  if (mode === 'rent_confirm' && item) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + (item.maxRentalDays || 7));
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);

    return (
      <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }} contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
        {/* 기자재 정보 */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: COLORS.mintLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26 }}>✅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>QR 스캔 완료!</Text>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>{item.modelName}</Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>{item.serialNumber}</Text>
            </View>
          </View>
        </Card>

        {/* 대여 기간 입력 */}
        <Card>
          <Text style={styles.sectionTitle}>대여 기간 설정</Text>

          <Text style={styles.formLabel}>반납 예정일 * (YYYY-MM-DD)</Text>
          <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 6 }}>
            선택 범위: {minDate.toISOString().split('T')[0]} ~ {maxDate.toISOString().split('T')[0]}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="예: 2026-04-25"
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.formLabel, { marginTop: 14 }]}>사용 목적 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 졸업 작품 촬영"
            value={purpose}
            onChangeText={setPurpose}
          />

          <Button
            title={renting ? '대여 신청 중...' : '대여 확인'}
            onPress={handleRent}
            loading={renting}
            style={{ marginTop: 20 }}
          />
          <OutlineButton title="취소" onPress={reset} style={{ marginTop: 8 }} />
        </Card>
      </ScrollView>
    );
  }

  // ── 대여 완료 화면 ────────────────────────────────
  if (mode === 'rent_done') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 }}>대여 완료!</Text>
        <Text style={{ fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 8, lineHeight: 22 }}>
          {item?.modelName}
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: '600', marginBottom: 32 }}>
          반납 예정일: {dueDate}
        </Text>
        <Button title="홈으로" onPress={() => { reset(); navigation.navigate('홈'); }} style={{ width: '100%', marginBottom: 8 }} />
        <OutlineButton title="내 대여 확인" onPress={() => { reset(); navigation.navigate('내 대여'); }} style={{ width: '100%' }} />
      </View>
    );
  }

  // ── 반납 확인 화면 ────────────────────────────────
  if (mode === 'return_confirm' && item) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }} contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
        <Text style={styles.confirmTitle}>반납하시겠습니까?</Text>
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: COLORS.redLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26 }}>💻</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>{item.modelName}</Text>
              <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{item.serialNumber}</Text>
              {rental && (
                <Text style={{ fontSize: 12, color: COLORS.red, marginTop: 2 }}>
                  반납 예정일: {new Date(rental.dueDate).toLocaleDateString('ko-KR')}
                </Text>
              )}
            </View>
          </View>
        </Card>
        <View style={styles.guideBox}>
          <Text style={styles.guideText}>
            📸 반납 전 기자재 상태를 사진으로 촬영해야 합니다.{'\n'}파손·분실 시 증빙 자료로 활용됩니다.
          </Text>
        </View>
        <Button title="반납 진행하기" onPress={() => setMode('return_photo')} style={{ marginBottom: 8 }} />
        <OutlineButton title="취소" onPress={reset} />
      </ScrollView>
    );
  }

  // ── 사진 촬영 + 반납 화면 ─────────────────────────
  if (mode === 'return_photo' && item) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }} contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
        <Text style={styles.confirmTitle}>반납 상태 촬영</Text>
        <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 20, lineHeight: 22 }}>
          기자재 전체가 잘 보이도록 촬영해주세요.
        </Text>
        <TouchableOpacity style={styles.photoBox} onPress={takePhoto}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text>
              <Text style={{ color: COLORS.gray, fontSize: 14 }}>탭하여 촬영하기</Text>
            </View>
          )}
        </TouchableOpacity>
        {photo && (
          <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>📷 다시 촬영</Text>
          </TouchableOpacity>
        )}
        <Button title={returning ? '반납 처리 중...' : '반납 완료'} onPress={handleReturn}
          disabled={!photo || returning} loading={returning} style={{ marginTop: 20 }} />
        <OutlineButton title="취소" onPress={() => setMode('return_confirm')} style={{ marginTop: 8 }} />
      </ScrollView>
    );
  }

  // ── 반납 완료 화면 ────────────────────────────────
  if (mode === 'done') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>✅</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 }}>반납 완료!</Text>
        <Text style={{ fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
          {item?.modelName}{'\n'}반납이 정상 처리됐습니다.
        </Text>
        <Button title="홈으로" onPress={() => { reset(); navigation.navigate('홈'); }} style={{ width: '100%' }} />
      </View>
    );
  }

  // ── 기타 결과 화면 ────────────────────────────────
  if (mode === 'result' && item) {
    const st = STATUS[item.status] || STATUS.AVAILABLE;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: st.bg }}>
              <Text style={{ fontSize: 26 }}>💻</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>{item.modelName}</Text>
              <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{item.serialNumber}</Text>
            </View>
            <Badge label={st.label} color={st.color} bg={st.bg} />
          </View>
        </Card>
        {item.status === 'RENTED' && (
          <View style={{ backgroundColor: COLORS.redLight, borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <Text style={{ color: COLORS.red, fontSize: 13, textAlign: 'center' }}>다른 사람이 대여 중인 기자재입니다.</Text>
          </View>
        )}
        <OutlineButton title="다시 스캔" onPress={reset} />
      </ScrollView>
    );
  }

  // ── 카메라 화면 ───────────────────────────────────
  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 16 }}>카메라 권한이 필요합니다.</Text>
        <Button title="권한 허용" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {mode === 'camera' && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      )}
      <View style={styles.overlay}>
        <View style={styles.topArea}>
          <Text style={styles.title}>QR 스캔</Text>
          <Text style={styles.subtitle}>
            {rentItemId ? '해당 기자재의 QR 코드를 스캔하세요' : '기자재에 부착된 QR 코드를 스캔하세요'}
          </Text>
        </View>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <View style={styles.bottomArea}>
          {mode === 'camera' ? (
            <TouchableOpacity style={styles.manualBtn} onPress={() => setMode('manual')}>
              <Text style={styles.manualBtnText}>코드 직접 입력</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.manualRow}>
              <TextInput style={styles.manualInput} placeholder="NB-001"
                placeholderTextColor="rgba(255,255,255,0.5)" value={manualCode}
                onChangeText={setManualCode} autoFocus />
              <TouchableOpacity style={styles.manualSearch} onPress={() => lookup(manualCode)}>
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>조회</Text>
              </TouchableOpacity>
            </View>
          )}
          {mode === 'manual' && (
            <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setMode('camera')}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>카메라로 돌아가기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, justifyContent: 'space-between' },
  topArea:      { paddingTop: 60, paddingHorizontal: 24, alignItems: 'center' },
  title:        { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle:     { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, textAlign: 'center' },
  frame:        { width: 240, height: 240, alignSelf: 'center', position: 'relative' },
  corner:       { position: 'absolute', width: 24, height: 24, borderColor: '#02C39A', borderWidth: 3 },
  tl:           { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr:           { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl:           { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br:           { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  bottomArea:   { paddingBottom: 80, paddingHorizontal: 32 },
  manualBtn:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  manualBtnText:{ color: '#fff', fontSize: 15, fontWeight: '600' },
  manualRow:    { flexDirection: 'row', gap: 8 },
  manualInput:  { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15 },
  manualSearch: { backgroundColor: '#028090', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  confirmTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
  guideBox:     { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, marginBottom: 20 },
  guideText:    { fontSize: 13, color: '#633806', lineHeight: 20 },
  photoBox:     { width: '100%', height: 240, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', marginBottom: 8 },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  retakeBtn:    { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  formLabel:    { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
  input:        { borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: COLORS.white },
});