import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from 'expo-router';
import { RouteProp } from 'expo-router/react-navigation';
import { NativeStackNavigationProp } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '@shared/theme';
import type { RootStackParamList } from '@app/navigation/types';
import { fetchAllRooms, assignRoomToStaff } from '../services/rooms';
import type { RoomCardData } from '../types/allRooms.types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AssignRooms'>;
type Rt = RouteProp<RootStackParamList, 'AssignRooms'>;

const TYPE_ICON: Record<string, any> = {
  Arrival: require('../../../../assets/icons/arrival-icon.png'),
  Departure: require('../../../../assets/icons/departure-icon.png'),
  'Arrival/Departure': require('../../../../assets/icons/arrival-departure-icon.png'),
  Stayover: require('../../../../assets/icons/stayover-guest_icon.png'),
  Turndown: require('../../../../assets/icons/turndown-icon.png'),
};

/** Soft circle background for the bed/moon types, matching the room list design. */
const TYPE_CIRCLE_BG: Record<string, string | undefined> = {
  Stayover: '#7dd3fc',
  Turndown: '#8b5cf6',
};

function typeLabel(frontOfficeStatus: string): string {
  return frontOfficeStatus === 'Arrival/Departure' ? 'ArrivalDeparture' : frontOfficeStatus;
}

export default function AssignRoomsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { staffId, shift } = route.params;
  const insets = useSafeAreaInsets();

  const [rooms, setRooms] = useState<RoomCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllRooms(shift);
        if (cancelled) return;
        // Only dirty rooms that aren't already assigned to someone this shift.
        const dirtyUnassigned = data.rooms.filter(
          (r) => r.houseKeepingStatus === 'Dirty' && !r.roomAttendantAssigned
        );
        setRooms(dirtyUnassigned);
      } catch {
        if (!cancelled) setError('Could not load rooms');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shift]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => r.roomNumber.toLowerCase().includes(q));
  }, [rooms, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const autoAssign = () => setSelected(new Set(filtered.map((r) => r.id)));

  const onAssign = async () => {
    if (selected.size === 0 || assigning) return;
    setAssigning(true);
    try {
      await Promise.all([...selected].map((id) => assignRoomToStaff(id, staffId, shift)));
      navigation.goBack();
    } catch {
      setError('Could not assign rooms');
      setAssigning(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Image source={require('../../../../assets/icons/back-arrow.png')} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.title}>Assign Rooms</Text>
        <TouchableOpacity style={styles.autoAssignBtn} onPress={autoAssign} activeOpacity={0.85}>
          <Text style={styles.autoAssignText}>Auto Assign</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>Rooms</Text>
        </View>
        <Text style={styles.tabSelected}>
          <Text style={styles.tabSelectedCount}>{selected.size}</Text> Selected
        </Text>
        <TouchableOpacity onPress={() => setSearchOpen((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Image source={require('../../../../assets/icons/search-icon.png')} style={styles.searchIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {searchOpen && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search room number"
          placeholderTextColor="#9aa0a6"
          value={query}
          onChangeText={setQuery}
          autoFocus
          keyboardType="number-pad"
        />
      )}

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#5a759d" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No dirty rooms to assign</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filtered.map((room) => {
            const isSelected = selected.has(room.id);
            const circleBg = TYPE_CIRCLE_BG[room.frontOfficeStatus];
            return (
              <TouchableOpacity
                key={room.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                activeOpacity={0.8}
                onPress={() => toggle(room.id)}
              >
                <View style={[styles.typeIconWrap, circleBg ? { backgroundColor: circleBg } : null]}>
                  <Image
                    source={TYPE_ICON[room.frontOfficeStatus] ?? TYPE_ICON.Stayover}
                    style={[styles.typeIcon, circleBg ? { tintColor: '#ffffff' } : null]}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.cardText}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.roomNumber}>{room.roomNumber}</Text>
                    <Text style={styles.roomCode}>{room.roomCategory}</Text>
                  </View>
                  <Text style={styles.roomType}>{typeLabel(room.frontOfficeStatus)}</Text>
                </View>
                <View style={styles.dirtyPill}>
                  <Image source={require('../../../../assets/icons/dirty-status.png')} style={styles.dirtyIcon} resizeMode="contain" />
                  <Text style={styles.dirtyText}>Dirty</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Assign action */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.assignBtn, (selected.size === 0 || assigning) && styles.assignBtnDisabled]}
          onPress={onAssign}
          disabled={selected.size === 0 || assigning}
          activeOpacity={0.85}
        >
          {assigning ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.assignBtnText}>
              Assign{selected.size > 0 ? ` (${selected.size})` : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#e4eefe',
  },
  backButton: { width: 32, height: 32, justifyContent: 'center' },
  backIcon: { width: 18, height: 18, tintColor: '#5a759d' },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5a759d',
    marginLeft: 4,
  },
  autoAssignBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  autoAssignText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#5a759d',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f4',
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#5a759d', paddingBottom: 8, marginRight: 28 },
  tabActiveText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5a759d',
  },
  tabSelected: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
  },
  tabSelectedCount: { fontWeight: typography.fontWeights.bold as any },
  searchIcon: { width: 20, height: 20, tintColor: '#5a759d' },
  searchInput: {
    marginHorizontal: 20,
    marginTop: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e3e8ef',
    paddingHorizontal: 14,
    fontFamily: typography.fontFamily.primary,
    fontSize: 14,
    color: '#1e1e1e',
  },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#eceff3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  cardSelected: { borderColor: '#37c871', borderWidth: 1.5, backgroundColor: '#f6fefa' },
  typeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeIcon: { width: 28, height: 28 },
  cardText: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'baseline' },
  roomNumber: {
    fontSize: 18,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#1e1e1e',
    marginRight: 8,
  },
  roomCode: {
    fontSize: 11,
    fontFamily: typography.fontFamily.primary,
    color: '#9aa0a6',
  },
  roomType: {
    fontSize: 13,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#1e1e1e',
    marginTop: 2,
  },
  dirtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f92424', // matches the dirty-status icon's red so it blends seamlessly
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dirtyIcon: { width: 22, height: 22, marginRight: 7 },
  dirtyText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#ffffff',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.primary,
    color: '#9aa0a6',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eef1f4',
  },
  assignBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignBtnDisabled: { backgroundColor: '#b7c2d3' },
  assignBtnText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#ffffff',
  },
});
