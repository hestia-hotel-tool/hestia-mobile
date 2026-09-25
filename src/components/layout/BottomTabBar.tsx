import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from 'expo-router';
import { colors } from '@/theme';
import TabBarItem from './TabBarItem';
import { MORE_MENU_OPTIONS } from '@/types/more.types';
import type { ReturnToTab } from '@/types/navigation';
import { useDesignScale } from '@/hooks/useDesignScale';
import { useBottomTabBadges } from '../../hooks/useBottomTabBadges';
import { TAB_PERMISSION } from '@/domain/rbac/permissions';
import { usePermissions } from '@/domain/rbac/usePermissions';
import type { HomeVariant } from '@/domain/rbac/matrix';
import type { IconName } from '@/components/Icon';
import { useAIChatOverlay } from '@features/ai-agent/context/AIChatOverlayContext';

export type TabPressOptions = { fromRoomsAssignmentBadge?: boolean };

/*
 * No props.
 *
 * There were two, `activeTab` and `onTabPress`, and each screen owned a piece
 * of the bar's state: local `activeTab` state, a focus effect to resync it, and
 * a `handleTabPress` that navigated and then set it. The resync compared
 * `route.name` against `'Home'` / `'Rooms'` — names the router never uses (the
 * real ones are `'(home)/index'` etc.), so it never fired and a screen kept
 * whatever tab was last pressed: Home -> Rooms -> Home left Home highlighting
 * Rooms.
 *
 * The bar now reads the route itself, which cannot go stale and costs the
 * leaving screen no re-render on press.
 */
/** Registered expo-router route name for each tab's screen. */
const TAB_ROUTE_NAMES: Record<string, string> = {
  Home: '(home)/index',
  Rooms: '(rooms)/index',
  Chat: '(chats)/index',
  Tickets: '(tickets)/index',
  LostAndFound: '(lost_and_found)/index',
  Staff: '(staff)/index',
  Settings: '(settings)/index',
};

/** Route name -> tab id, inverted from the map above so the two cannot drift. */
const ROUTE_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_ROUTE_NAMES).map(([tab, route]) => [route, tab])
);

/**
 * Screens inside a tab's group that are not its root — they draw the bar with
 * their tab highlighted, and pressing that tab returns to the root.
 */
const SUB_ROUTE_TO_TAB: Record<string, string> = {
  '(chats)/announcements': 'Chat',
};

/** Route name used as the `returnToTab` param, keyed by the currently active tab. */
const TAB_RETURN_ROUTE: Record<string, ReturnToTab> = {
  Home: '(home)/index',
  Rooms: '(rooms)/index',
  Chat: '(chats)/index',
  Tickets: '(tickets)/index',
  LostAndFound: '(lost_and_found)/index',
  Staff: '(staff)/index',
  Settings: '(settings)/index',
};

/**
 * Tabs deliberately outside the permission matrix. The signed-off roles spec
 * has no column for the AI assistant, so it stays available to everyone until
 * the spec says otherwise. Everything not listed here must be registered in
 * TAB_PERMISSION or it will not render.
 */
const UNGATED_TABS = new Set<string>(['AIHome']);

/**
 * Tab order, by the variant that describes how a person works.
 *
 * The frames do not agree on one order, and the disagreement is deliberate:
 * each puts the role's primary workspace immediately after Home. Housekeeping
 * (node 3883:6323) reads Home, Rooms, Chat, AI, Tickets; engineering
 * (node 3843:151) reads Home, Tickets, Chat, AI, Rooms, because engineering is
 * ticket-driven and holds no Rooms right at all.
 *
 * What they *do* agree on is the AI button: all three place it directly after
 * Chat, the porter frame (3859:1497) included. So that position is the one part
 * of the order which does not vary, and it is why AIHome is not simply left to
 * fall last out of MAIN_TABS.
 *
 * Keyed on `HomeVariant` because that field already means "what a person's day
 * looks like" rather than what they may do — the same reason it selects the
 * dashboard.
 *
 * Ids missing from a row keep their position from the unsorted list, so a tab
 * added to MAIN_TABS or the More menu still appears without being listed here.
 */
const TAB_ORDER_BY_VARIANT: Record<HomeVariant, readonly string[]> = {
  default: ['Home', 'Rooms', 'Chat', 'AIHome', 'Tickets', 'LostAndFound', 'Staff'],
  /*
   * Identical to `default` on purpose. The porter's frame (3859:1041) is that
   * order with Home removed, and permission filtering already removes it —
   * `hk_houseman` holds no `tab.home.view`. The row is spelled out rather than
   * deleted because the Record requires the key, and because "the porter needs
   * nothing bespoke" is worth recording.
   */
  hsk_portier: ['Home', 'Rooms', 'Chat', 'AIHome', 'Tickets', 'LostAndFound', 'Staff'],
  engineering: ['Home', 'Tickets', 'Chat', 'AIHome', 'Rooms', 'LostAndFound', 'Staff'],
  /*
   * The same order as engineering, and for the same reason: a ticket dashboard
   * puts Tickets next to Home. Figma 3859:3355 draws Home, Tickets, Chat, AI,
   * Rooms, Lost & Found — Staff is absent there because neither dining role
   * holds `tab.staff.view`, not because the row omits it, so the permission
   * filter already removes it.
   */
  dining: ['Home', 'Tickets', 'Chat', 'AIHome', 'Rooms', 'LostAndFound', 'Staff'],
};

/*
 * Every tab is a registry SVG. `iconHeight` is the glyph's own height in the
 * tab bar of Figma 3128:32 — Home 3128:149, Rooms 3128:154, Chat 3128:141,
 * Tickets 3128:184 — and width follows each SVG's aspect ratio. These replace
 * PNGs whose 56x56 boxes carried their own padding.
 */
type TabDef = {
  id: string;
  iconName: IconName;
  label: string;
  iconHeight: number;
};

const MAIN_TABS: TabDef[] = [
  { id: 'Home', iconName: 'nav-home', label: 'Home', iconHeight: 30 },
  { id: 'Rooms', iconName: 'nav-rooms', label: 'Rooms', iconHeight: 26 },
  { id: 'Chat', iconName: 'nav-chat', label: 'Chat', iconHeight: 28 },
  { id: 'Tickets', iconName: 'nav-tickets', label: 'Tickets', iconHeight: 27 },
  {
    id: 'AIHome',
    /*
     * The one tab drawn from the registry rather than a PNG.
     *
     * Node 3859:1498 is a #FF46A3 -> #5A759D gradient mark inside a gradient
     * ring. The PNG it replaces was a flat pink approximation, and `TabBarItem`
     * tints PNGs to the active/inactive colour, so it rendered as a single flat
     * house — neither the design's gradient nor its ring.
     */
    iconName: 'nav-ai',
    label: '',
    iconHeight: 56,
  },
];

export default function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  /*
   * The bar's own route is the source of truth for which tab is active — there
   * is one of these bars per mounted screen, and seven copies of a boolean
   * cannot be kept in step. Deriving it also means a press no longer has to
   * re-render the screen it is leaving just to update its highlight.
   *
   * `useRoute()`, not `useSegments()`. Segments describe the router's current
   * location, so every one of the seven mounted bars re-renders on every
   * navigation — the opposite of what this change is for. `useRoute()` returns
   * the route this bar is rendered inside, which never changes for the life of
   * the screen: each copy is correct by construction and re-renders never.
   */
  const routeName = useRoute().name;
  /** Set only when this bar is on a tab's root screen. */
  const rootTab = ROUTE_TO_TAB[routeName];
  const activeTab = rootTab ?? SUB_ROUTE_TO_TAB[routeName] ?? 'Home';
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildBottomTabBarStyles(scaleX), [scaleX]);
  const { chatBadgeCount, ticketsBadgeCount, roomsAssignmentCount } = useBottomTabBadges();
  const { can, homeVariant } = usePermissions();
  // Safe here: the tab bar only ever renders inside `(tabs)` screens, which all
  // sit under AppProviders — the hook throws outside its provider.
  const { open: openAIChatOverlay } = useAIChatOverlay();

  const tabs = useMemo(
    () => {
      const all = [
        ...MAIN_TABS,
        ...MORE_MENU_OPTIONS.map((option): TabDef => ({
          id: option.navigationTarget,
          iconName: option.iconName,
          label: option.label,
          iconHeight: option.iconHeight,
        })),
      ];
      // RBAC: fail CLOSED. A tab id with no entry in TAB_PERMISSION is hidden
      // unless it is explicitly listed as ungated, so forgetting to register a
      // new tab cannot silently expose it to every role.
      const permitted = all.filter((t) => {
        if (UNGATED_TABS.has(t.id)) return true;
        const permission = TAB_PERMISSION[t.id];
        return !!permission && can(permission);
      });

      // Order by the role's workspace — see TAB_ORDER_BY_VARIANT. Unlisted ids
      // sort after the listed ones, keeping their original relative order,
      // which `sort` guarantees since it is stable.
      const order = TAB_ORDER_BY_VARIANT[homeVariant] ?? TAB_ORDER_BY_VARIANT.default;
      const rank = (id: string) => {
        const i = order.indexOf(id);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };
      return permitted.sort((a, b) => rank(a.id) - rank(b.id));
    },
    [can, homeVariant]
  );

  const scrollRef = useRef<ScrollView | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const scrollXRef = useRef(0);
  const lastScrollTargetRef = useRef<number | null>(null);

  const handleTabLayout = (tabId: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[tabId] = { x, width };
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = e.nativeEvent.contentOffset.x;
  };

  const handleTabPress = (tabId: string, options?: TabPressOptions) => {
    /*
     * AI Home has no route: it opens the assistant over whatever is on screen.
     *
     * Handled here rather than delegated. This used to call out to the screen's
     * own `onTabPress`, which meant the same four lines were repeated in all
     * seven screens that render a tab bar — and because the prop was optional,
     * a new screen that forgot them got a silently dead AI button with no type
     * error.
     */
    if (tabId === 'AIHome') {
      openAIChatOverlay();
      return;
    }
    const targetRoute = TAB_ROUTE_NAMES[tabId];
    if (!targetRoute) return;
    /*
     * Re-tapping the tab you are on used to re-dispatch `navigate` with fresh
     * params, which changed `route.params` identity and re-ran every focus
     * effect keyed on it — a full refetch for a press that changes nothing.
     */
    // From a sub-screen (Announcements) the same tab still goes back to its root.
    if (tabId === rootTab) return;
    if (tabId === 'Rooms') {
      (navigation as any).navigate(targetRoute, {
        prioritizeMyAssignedRooms: !!options?.fromRoomsAssignmentBadge,
      });
    } else if (tabId === 'LostAndFound' || tabId === 'Staff' || tabId === 'Settings') {
      (navigation as any).navigate(targetRoute, {
        returnToTab: TAB_RETURN_ROUTE[activeTab] ?? '(home)/index',
      });
    } else {
      (navigation as any).navigate(targetRoute);
    }
  };

  useEffect(() => {
    const layout = tabLayouts.current[activeTab];
    if (!layout || viewportWidth <= 0) return;

    // Ensure active tab is visible inside the viewport.
    const leftPadding = 16 * scaleX;
    const rightPadding = 16 * scaleX;
    const visibleStart = scrollXRef.current;
    const visibleEnd = scrollXRef.current + viewportWidth;

    const tabStart = layout.x;
    const tabEnd = layout.x + layout.width;

    let targetX: number | null = null;
    if (tabStart < visibleStart + leftPadding) {
      targetX = Math.max(0, tabStart - leftPadding);
    } else if (tabEnd > visibleEnd - rightPadding) {
      targetX = Math.max(0, tabEnd - viewportWidth + rightPadding);
    }

    if (targetX != null) {
      // Avoid re-trigger loops (layout + effect) that can feel jittery.
      const last = lastScrollTargetRef.current;
      if (last == null || Math.abs(last - targetX) > 2) {
        lastScrollTargetRef.current = targetX;
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: targetX!, animated: true });
        });
      }
    }
  }, [activeTab, viewportWidth, scaleX]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        ref={(r) => {
          scrollRef.current = r;
        }}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
        decelerationRate="fast"
      >
        {tabs.map((tab) => (
          <View
            key={tab.id}
            style={styles.tabItemContainer}
            onLayout={handleTabLayout(tab.id)}
          >
            <TabBarItem
              iconName={tab.iconName}
              label={tab.label}
              active={activeTab === tab.id}
              badge={
                tab.id === 'Chat' && chatBadgeCount > 0
                  ? chatBadgeCount
                  : tab.id === 'Tickets' && ticketsBadgeCount > 0
                    ? ticketsBadgeCount
                    : tab.id === 'Rooms' && roomsAssignmentCount > 0
                      ? roomsAssignmentCount
                      : undefined
              }
              onPress={() =>
                handleTabPress(
                  tab.id,
                  tab.id === 'Rooms' && roomsAssignmentCount > 0 ? { fromRoomsAssignmentBadge: true } : undefined
                )
              }
              iconHeight={tab.iconHeight}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function buildBottomTabBarStyles(scaleX: number) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      minHeight: 152 * scaleX,
      backgroundColor: colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: '#e6e6e6',
      shadowColor: 'rgba(100,131,176,0.4)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: (105.1 * scaleX) / 3,
      elevation: 8,
      zIndex: 100,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16 * scaleX,
      height: '100%',
    },
    tabItemContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      // Fixed slot width prevents “some tabs not centered” due to varying padding/label lengths.
      width: 96 * scaleX,
      marginHorizontal: 6 * scaleX,
    },
  });
}
