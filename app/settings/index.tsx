import { withRouteGuard } from '@/domain/rbac';
import SettingsScreen from '@features/account/screens/SettingsScreen';

/** Account (formerly the Settings tab) — opened by tapping your profile at the top of Home and Rooms. */
export default withRouteGuard(SettingsScreen);
