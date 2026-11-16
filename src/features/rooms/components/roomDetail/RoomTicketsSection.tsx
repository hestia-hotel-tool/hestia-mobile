import React from 'react';
import { ScrollView, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { router, useFocusEffect, useNavigation, NativeStackNavigationProp } from 'expo-router';
import type { RootStackParamList } from '@/types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/theme';
import { Icon } from '@/components/Icon';
import { scaleX } from '../../constants/roomDetailStyles';
import TicketCard from '@features/tickets/components/TicketCard';
import CreateTicketButton from '@features/tickets/components/CreateTicketButton';
import { getTicketsForRoom } from '@features/tickets/services/tickets';
import type { TicketData } from '@features/tickets/types/tickets.types';
import { getDepartments, sortDepartmentsByDisplayOrder } from '@/lib/departments';

interface RoomTicketsSectionProps {
  roomNumber: string;
  departmentName?: string;
  roomId?: string;
  onSubmit?: (ticketData: any) => void;
}

type StatusFilter = 'all' | 'open' | 'closed';

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

/**
 * Room Detail → Tickets — Figma 285:4037.
 *
 * Chips (All / Open / Closed / Department ▾), then every ticket on the room as
 * a card, newest first; "Create Ticket" (bottom right) opens the ticket form
 * with this room already chosen, and comes back here after submitting.
 */
export default function RoomTicketsSection({ roomNumber, departmentName, roomId }: RoomTicketsSectionProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tickets, setTickets] = React.useState<TicketData[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [deptFilter, setDeptFilter] = React.useState<string | null>(null);
  const [deptMenuOpen, setDeptMenuOpen] = React.useState(false);
  const [deptNames, setDeptNames] = React.useState<Map<string, string>>(new Map());

  const loadTickets = React.useCallback(async () => {
    if (!roomId) {
      setTickets([]);
      return;
    }
    setLoading(true);
    try {
      setTickets(await getTicketsForRoom(roomId));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // On open, and again on return from a ticket or the form.
  useFocusEffect(
    React.useCallback(() => {
      void loadTickets();
    }, [loadTickets])
  );

  // Department id → name, for the Department chip.
  React.useEffect(() => {
    let cancelled = false;
    getDepartments()
      .then((res) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const d of sortDepartmentsByDisplayOrder(res.data ?? [])) {
          if (d?.id && d?.name) map.set(String(d.id), String(d.name).trim());
        }
        setDeptNames(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /** Only the departments this room has tickets for, in display order. */
  const roomDepartments = React.useMemo(() => {
    const ids = new Set(tickets.map((t) => t.departmentId).filter(Boolean) as string[]);
    return Array.from(deptNames.entries()).filter(([id]) => ids.has(id));
  }, [tickets, deptNames]);

  const visible = React.useMemo(
    () =>
      tickets.filter((t) => {
        if (statusFilter === 'open' && t.status === 'done') return false;
        if (statusFilter === 'closed' && t.status !== 'done') return false;
        if (deptFilter && t.departmentId !== deptFilter) return false;
        return true;
      }),
    [tickets, statusFilter, deptFilter]
  );

  const openCreateTicket = () => {
    navigation.navigate('create-ticket-form/index', {
      roomId,
      roomNumber,
      departmentName,
      isPublicArea: false,
      returnToRoom: true,
    });
  };

  const deptLabel = deptFilter ? (deptNames.get(deptFilter) ?? 'Department') : 'Department';
  const emptyText =
    statusFilter === 'closed'
      ? 'No closed tickets for this room.'
      : statusFilter === 'open'
        ? 'No open tickets for this room.'
        : 'No tickets for this room yet.';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (120 + insets.bottom) * scaleX }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Chips — 4649:690…695 */}
        <View style={styles.chips}>
          {STATUS_CHIPS.map(({ key, label }) => {
            const active = statusFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatusFilter(key)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.chip, styles.deptChip, deptFilter != null && styles.chipActive]}
            onPress={() => setDeptMenuOpen((open) => !open)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Department filter: ${deptFilter ? deptLabel : 'all'}`}
            accessibilityState={{ expanded: deptMenuOpen }}
          >
            <Text style={[styles.chipText, deptFilter != null && styles.chipTextActive]} numberOfLines={1}>
              {deptLabel}
            </Text>
            <View style={deptMenuOpen ? styles.chevronOpen : undefined}>
              <Icon
                name="action-chevron-down-wide"
                width={14 * scaleX}
                height={6.6 * scaleX}
                color={deptFilter != null ? '#ffffff' : '#5a759d'}
              />
            </View>
          </TouchableOpacity>
        </View>

        {deptMenuOpen ? (
          <View style={styles.deptMenu}>
            {[[null, 'All departments'] as const, ...roomDepartments].map(([id, name]) => (
              <TouchableOpacity
                key={id ?? 'all'}
                style={styles.deptMenuRow}
                onPress={() => {
                  setDeptFilter(id);
                  setDeptMenuOpen(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected: deptFilter === id }}
              >
                <Text style={[styles.deptMenuText, deptFilter === id && styles.deptMenuTextActive]}>{name}</Text>
                {deptFilter === id ? <Icon name="action-check" width={14 * scaleX} height={12 * scaleX} color="#5a759d" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {loading && tickets.length === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator size="small" color={colors.primary.main} />
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visible.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: ticket.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 710:138 — the AI "Create Ticket" pill, bottom right (26 in). */}
      <View style={[styles.createButton, { bottom: (24 + insets.bottom) * scaleX }]}>
        <CreateTicketButton onPress={openCreateTicket} scaleX={scaleX} />
      </View>
    </View>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  /* 23 under the tab rule; All at x=16; 12 between chips. */
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 * scaleX,
    paddingTop: 23 * scaleX,
    paddingHorizontal: 16 * scaleX,
  },
  chip: {
    height: 44 * scaleX,
    minWidth: 57 * scaleX,
    paddingHorizontal: 18 * scaleX,
    borderRadius: 77 * scaleX,
    backgroundColor: '#eef2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    height: 46 * scaleX,
    backgroundColor: '#5a759d',
  },
  deptChip: {
    flexShrink: 1,
    flexDirection: 'row',
    gap: 10 * scaleX,
  },
  chipText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#5a759d',
    ...androidText,
  },
  chipTextActive: {
    fontSize: 16 * scaleX,
    fontWeight: '700',
    color: '#ffffff',
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  deptMenu: {
    marginTop: 10 * scaleX,
    marginHorizontal: 16 * scaleX,
    borderRadius: 12 * scaleX,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  deptMenuRow: {
    height: 46 * scaleX,
    paddingHorizontal: 18 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e3e3e3',
  },
  deptMenuText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  deptMenuTextActive: {
    fontWeight: '700',
    color: '#5a759d',
  },
  /* Cards 409 wide (x=10), 20 under the chips. */
  list: {
    marginTop: 20 * scaleX,
    paddingHorizontal: 15.5 * scaleX,
    gap: 16 * scaleX,
  },
  empty: {
    marginTop: 20 * scaleX,
    marginHorizontal: 16 * scaleX,
    minHeight: 80 * scaleX,
    borderRadius: 10 * scaleX,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    backgroundColor: '#f9fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16 * scaleX,
  },
  emptyText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#5a759d',
    textAlign: 'center',
    ...androidText,
  },
  createButton: {
    position: 'absolute',
    right: 26 * scaleX,
  },
});
