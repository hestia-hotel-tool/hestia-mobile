import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import type { RoomPickerRoom } from '../../types/roomPicker.types';
import RoomPickerCard from './RoomPickerCard';
import { ROOM_PICKER_LAYOUT as L } from './roomPickerLayout';

export interface RoomPickerModalProps {
  visible: boolean;
  rooms: RoomPickerRoom[];
  /** The room currently chosen on the form, ticked and scrolled to on open. */
  value: RoomPickerRoom | null;
  onSelect: (room: RoomPickerRoom) => void;
  onClose: () => void;
  scaleX: number;
  loading?: boolean;
  title?: string;
}

/**
 * Choose a room from the whole list.
 *
 * A full-screen modal rather than a dropdown, following `ReassignModal` —
 * the app's existing answer to picking one of many, and the one screen that
 * already reveals its search field only when the search icon is tapped.
 *
 * Search matches the room number *or* the guest's name: a housekeeper who has
 * been handed a name rather than a number should not have to scroll 40 rooms
 * to find it. It stays hidden until asked for, because the list is short
 * enough to scroll and a permanently open keyboard would cover half of it.
 */
export default function RoomPickerModal({
  visible,
  rooms,
  value,
  onSelect,
  onClose,
  scaleX,
  loading = false,
  title = 'Select Room',
}: RoomPickerModalProps) {
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => buildRoomPickerModalStyles(scaleX, insets.top, insets.bottom),
    [scaleX, insets.top, insets.bottom],
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);
  /*
   * `useState` with an initialiser, not `useRef(new Animated.Value(0))`: the
   * value is read during render to drive the style, and a ref read in render
   * is exactly what `react-hooks/refs` forbids. `useState` gives the same
   * once-only construction without pretending it is not render state.
   */
  const [reveal] = useState(() => new Animated.Value(0));

  /*
   * There is no reset effect here. Every open starts from a clean search
   * because the caller remounts this component with a fresh `key` — see
   * `RoomNumberSelector`. Resetting from an effect on `visible` would mean
   * calling setState synchronously inside one, and it would also fire during
   * the closing animation, wiping the list out from under the user as it
   * slides away.
   */
  const toggleSearch = () => {
    if (searchOpen) {
      Keyboard.dismiss();
      setQuery('');
      Animated.timing(reveal, {
        toValue: 0,
        duration: L.modal.search.duration,
        useNativeDriver: false,
      }).start(() => setSearchOpen(false));
      return;
    }
    setSearchOpen(true);
    Animated.timing(reveal, {
      toValue: 1,
      duration: L.modal.search.duration,
      useNativeDriver: false,
    }).start();
    // The input has to be mounted before it can take focus.
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rooms;
    return rooms.filter(
      (room) =>
        room.number.toLowerCase().includes(needle) ||
        (room.primaryGuest?.fullName ?? '').toLowerCase().includes(needle),
    );
  }, [rooms, query]);

  const rowHeight = (L.card.minHeight + L.list.rowGap) * scaleX;
  const selectedIndex = value ? filtered.findIndex((r) => r.id === value.id) : -1;

  const countLabel =
    query.trim().length > 0
      ? `${filtered.length} of ${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`
      : `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon name="action-chevron" size={L.modal.backChevron * scaleX} color="#607aa1" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={toggleSearch}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'Hide search' : 'Search rooms'}
            accessibilityState={{ expanded: searchOpen }}
          >
            <Icon
              name="action-search"
              size={L.modal.searchIcon * scaleX}
              color={searchOpen ? '#2f4a72' : '#607aa1'}
            />
          </TouchableOpacity>
        </View>

        {searchOpen ? (
          <Animated.View
            style={[
              styles.searchRow,
              {
                opacity: reveal,
                maxHeight: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (L.modal.search.height + L.modal.search.marginTop * 2) * scaleX],
                }),
              },
            ]}
          >
            <View style={styles.searchField}>
              <Icon name="action-search" size={L.modal.search.glyph * scaleX} color="#8b9bb4" />
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Room number or guest name"
                placeholderTextColor="#9aa7bd"
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="never"
                onSubmitEditing={Keyboard.dismiss}
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {loading && rooms.length === 0 ? (
          <View style={styles.status}>
            <ActivityIndicator size="large" color="#5a759d" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(room) => room.id || room.number}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            /*
             * Rows are a constant height — the card has a fixed `minHeight`
             * and its guest name is capped at one line — so the list can be
             * measured rather than laid out, which is what lets it open
             * already scrolled to the chosen room.
             */
            getItemLayout={(_, index) => ({
              length: rowHeight,
              offset: rowHeight * index,
              index,
            })}
            initialScrollIndex={selectedIndex > 0 ? selectedIndex : undefined}
            ListHeaderComponent={
              rooms.length > 0 ? <Text style={styles.count}>{countLabel}</Text> : null
            }
            ListEmptyComponent={
              <View style={styles.status}>
                <Text style={styles.statusText}>
                  {rooms.length === 0
                    ? 'No rooms available.'
                    : `No room matches “${query.trim()}”.`}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <RoomPickerCard
                room={item}
                scaleX={scaleX}
                variant="option"
                checked={!!value && value.id === item.id}
                onPress={() => onSelect(item)}
              />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function buildRoomPickerModalStyles(scaleX: number, insetTop: number, insetBottom: number) {
  const androidText = Platform.select({
    android: { includeFontPadding: false } as const,
    default: {} as const,
  });

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: L.modal.headerBackground,
      paddingTop: insetTop + L.modal.headerSafeAreaGap * scaleX,
      paddingBottom: L.modal.headerPaddingBottom * scaleX,
      paddingHorizontal: L.modal.gutter * scaleX,
    },
    /** `action-chevron` already points left, so no rotation. */
    backButton: {
      width: L.modal.backChevron * scaleX,
      height: L.modal.backChevron * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      // The chevron box ends at 24+28 = 52; the frame's titles start at 69.
      marginLeft: 17 * scaleX,
      fontSize: L.modal.headerTitleFontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '700',
      color: L.modal.headerTitleColor,
      ...androidText,
    },
    searchButton: {
      width: L.modal.backChevron * scaleX,
      height: L.modal.backChevron * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchRow: {
      overflow: 'hidden',
      paddingHorizontal: L.modal.gutter * scaleX,
      backgroundColor: '#ffffff',
    },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10 * scaleX,
      height: L.modal.search.height * scaleX,
      marginTop: L.modal.search.marginTop * scaleX,
      paddingHorizontal: 14 * scaleX,
      borderRadius: L.modal.search.radius * scaleX,
      backgroundColor: '#f1f4f9',
    },
    searchInput: {
      flex: 1,
      fontSize: L.modal.search.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      color: '#111827',
      // Android centres single-line inputs poorly without this.
      paddingVertical: 0,
    },
    searchClear: {
      fontSize: L.modal.search.clear * scaleX,
      color: '#8b9bb4',
    },
    listContent: {
      paddingHorizontal: L.modal.gutter * scaleX,
      paddingTop: L.list.paddingTop * scaleX,
      paddingBottom: insetBottom + L.list.paddingBottom * scaleX,
      flexGrow: 1,
    },
    count: {
      marginBottom: L.list.rowGap * scaleX,
      fontSize: L.modal.countFontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: '#8b9bb4',
      ...androidText,
    },
    status: {
      flex: 1,
      paddingVertical: 48 * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusText: {
      fontSize: 14 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: '#6b7280',
      textAlign: 'center',
      ...androidText,
    },
  });
}
