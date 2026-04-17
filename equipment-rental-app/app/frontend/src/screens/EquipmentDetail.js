import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { equipmentAPI } from '../api';
import { COLORS, STATUS } from '../theme';
import { Badge, Button, OutlineButton, Card, Loading, Divider } from '../components/UI';

const CAT_EMOJI = {
  '노트북':        '💻',
  '카메라':        '📷',
  '태블릿':        '📱',
  '음향 장비':     '🎙',
  '주변기기':      '🖱️',
  '촬영 장비':     '🎬',
  '네트워크 장비': '🌐',
  '사무용품':      '🖨️',
};

export default function EquipmentDetail() {
  const { params: { id } } = useRoute();
  const navigation = useNavigation();
  const [item, setItem] = useState(null);

  useEffect(() => {
    equipmentAPI.getOne(id)
      .then((r) => setItem(r.data))
      .catch(() => Alert.alert('오류', '기자재 정보를 불러올 수 없습니다.'));
  }, [id]);

  if (!item) return <Loading />;

  const st    = STATUS[item.status] || STATUS.AVAILABLE;
  const emoji = CAT_EMOJI[item.category?.name] || '📦';

  const handleRentPress = () => {
    // QR 스캔 화면으로 이동 (대여할 기자재 ID 전달)
    navigation.navigate('QR 스캔', { rentItemId: item._id });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <View style={[styles.imgBox, { backgroundColor: st.bg }]}>
        <Text style={{ fontSize: 80 }}>{emoji}</Text>
      </View>

      <View style={{ padding: 16 }}>
        <Card>
          <Text style={styles.modelName}>{item.modelName}</Text>
          <Text style={styles.serial}>{item.serialNumber} · {item.category?.name}</Text>
          <Badge label={st.label} color={st.color} bg={st.bg} />
          <Divider />
          {[
            ['최대 대여 기간', `${item.maxRentalDays || 7}일`],
            ['시리얼 번호',   item.serialNumber],
            ['카테고리',      item.category?.name],
            ['담당 관리자',   item.managedBy?.name || '-'],
          ].map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={styles.detailVal}>{v}</Text>
            </View>
          ))}
        </Card>

        {/* 대여 가능 + QR 있을 때 */}
        {item.status === 'AVAILABLE' && item.qrCodeUrl && (
          <View>
            <View style={styles.scanGuideBox}>
              <Text style={styles.scanGuideText}>
                📷 기자재에 부착된 QR 코드를 스캔하여 대여를 진행합니다.
              </Text>
            </View>
            <Button
              title="QR 스캔하여 대여하기"
              onPress={handleRentPress}
              style={{ marginBottom: 10 }}
            />
          </View>
        )}

        {/* QR 없을 때 */}
        {item.status === 'AVAILABLE' && !item.qrCodeUrl && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ QR 코드가 없어 대여할 수 없습니다.{'\n'}관리자에게 문의하세요.
            </Text>
          </View>
        )}

        {/* 대여 중 */}
        {item.status === 'RENTED' && (
          <View style={styles.rentedBox}>
            <Text style={styles.rentedText}>현재 다른 사람이 대여 중입니다.</Text>
          </View>
        )}

        {/* 수리 중 */}
        {item.status === 'REPAIRING' && (
          <View style={styles.repairBox}>
            <Text style={styles.repairText}>현재 수리 중인 기자재입니다.</Text>
          </View>
        )}

        {/* 고장/파손 신고 — 항상 표시 */}
        <OutlineButton
          title="고장/파손 신고"
          onPress={() => navigation.navigate('DamageReport', { equipmentId: id })}
          color={COLORS.red}
          style={{ marginTop: 4 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  imgBox:        { height: 200, alignItems: 'center', justifyContent: 'center' },
  modelName:     { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  serial:        { fontSize: 13, color: COLORS.gray, marginBottom: 8 },
  detailRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  detailKey:     { fontSize: 14, color: COLORS.gray },
  detailVal:     { fontSize: 14, fontWeight: '500', color: COLORS.text },
  scanGuideBox:  { backgroundColor: COLORS.mintLight, borderRadius: 10, padding: 12, marginBottom: 10 },
  scanGuideText: { fontSize: 13, color: '#085041', lineHeight: 20 },
  warningBox:    { backgroundColor: COLORS.warningLight, borderRadius: 10, padding: 14, marginBottom: 10, alignItems: 'center' },
  warningText:   { fontSize: 13, color: '#633806', fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  rentedBox:     { backgroundColor: COLORS.redLight, borderRadius: 10, padding: 12, marginBottom: 10, alignItems: 'center' },
  rentedText:    { fontSize: 13, color: COLORS.red, fontWeight: '500' },
  repairBox:     { backgroundColor: COLORS.warningLight, borderRadius: 10, padding: 12, marginBottom: 10, alignItems: 'center' },
  repairText:    { fontSize: 13, color: COLORS.warning, fontWeight: '500' },
});

module.exports = EquipmentDetail;