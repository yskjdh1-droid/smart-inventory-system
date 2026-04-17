import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { equipmentAPI, categoryAPI } from '../api';
import { COLORS, STATUS } from '../theme';
import { Badge, Card, PageHeader, Empty, Loading } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const CAT_EMOJI = {
  '노트북':       '💻',
  '카메라':       '📷',
  '태블릿':       '📱',
  '음향 장비':    '🎙',
  '주변기기':     '🖱️',
  '촬영 장비':    '🎬',
  '네트워크 장비':'🌐',
  '사무용품':     '🖨️',
};

export default function EquipmentList() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat]   = useState('all');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    categoryAPI.getAll().then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const params = {};
      if (activeCat !== 'all') params.category = activeCat;
      if (search) params.search = search;
      const r = await equipmentAPI.getAll(params);
      setItems(r.data);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCat, search]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const onRefresh = () => { setRefreshing(true); loadItems(); };

  const renderItem = ({ item }) => {
    const st = STATUS[item.status] || STATUS.AVAILABLE;
    const emoji = CAT_EMOJI[item.category?.name] || '📦';
    return (
      <Card onPress={() => navigation.navigate('EquipmentDetail', { id: item._id })}>
        <View style={styles.row}>
          <View style={[styles.thumb, { backgroundColor: st.bg }]}>
            <Text style={styles.thumbIcon}>{emoji}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.itemName} numberOfLines={1}>{item.modelName}</Text>
            <Text style={styles.itemSub}>{item.serialNumber} · {item.category?.name}</Text>
            <Badge label={st.label} color={st.color} bg={st.bg} />
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <PageHeader title="기자재 목록" subtitle={`안녕하세요, ${user?.name}님`} />

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="기자재명 또는 코드 검색..."
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {[{ _id: 'all', name: '전체' }, ...categories].map((cat) => (
          <TouchableOpacity
            key={cat._id}
            style={[styles.chip, activeCat === cat._id && styles.chipActive]}
            onPress={() => setActiveCat(cat._id)}
          >
            {cat._id !== 'all' && (
              <Text style={styles.chipEmoji}>{CAT_EMOJI[cat.name] || '📦'}</Text>
            )}
            <Text style={[styles.chipText, activeCat === cat._id && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <Loading /> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Empty message="기자재가 없습니다." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchInput: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 0.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chipScroll: { flexGrow: 0 },
  chipRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, height:38 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  chipTextActive: { color: COLORS.white, fontWeight: '700' },
  list: { padding: 16, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 54, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 26 },
  info: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemSub: { fontSize: 12, color: COLORS.gray, marginTop: 2, marginBottom: 4 },
  arrow: { fontSize: 22, color: COLORS.border },
});