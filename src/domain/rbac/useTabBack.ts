import { useCallback } from 'react';
import { useNavigation, useRouter } from 'expo-router';

import { resolveLandingRoute, TAB_ROUTE } from './landing';
import { PERMISSIONS } from './permissions';
import { usePermissions } from './usePermissions';

/**
 * The back arrow on a tab's root screen (Rooms, Tickets, Chat, Lost & Found,
 * Staff).
 *
 * In the tab navigator `goBack()` goes to the *first* tab, Home. Someone
 * without Home — laundry attendants, porters, F&B staff — was then sent there,
 * the route guard (which wraps the whole tab navigator) redirected them to
 * their landing tab, and that bounce repeated until React stopped it with
 * "Maximum update depth exceeded" (2026-11-09).
 *
 * So: with Home, back is what it always was. Without it, back goes to the
 * person's landing tab, and on the landing tab itself there is nowhere to go —
 * `canGoBack` is false and `goBack` does nothing.
 *
 * @param tab This screen's tab, as in TAB_ROUTE ('Tickets', 'Rooms', …).
 */
export function useTabBack(tab: keyof typeof TAB_ROUTE) {
  const navigation = useNavigation();
  const router = useRouter();
  const { can, permissions, worksFromTickets } = usePermissions();

  const hasHome = can(PERMISSIONS.HOME_VIEW);
  const landing = resolveLandingRoute(permissions, { worksFromTickets });
  const onLanding = !hasHome && landing === TAB_ROUTE[tab];

  const goBack = useCallback(() => {
    if (hasHome) {
      navigation.goBack();
      return;
    }
    if (landing && !onLanding) router.navigate(landing as never);
  }, [hasHome, landing, onLanding, navigation, router]);

  return { goBack, canGoBack: !onLanding, hasHome };
}
