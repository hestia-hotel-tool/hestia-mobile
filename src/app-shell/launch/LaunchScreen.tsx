import React from 'react';
import { LaunchView } from '@/components/launch/LaunchView';
import { NoAccessNotice } from '@/domain/rbac/NoAccessNotice';
import { useLaunchRouting } from './useLaunchRouting';

/**
 * The app's entry route.
 *
 * Not an auth screen — it renders no auth affordance. It is the bootstrap
 * decision point that composes auth, rbac and navigation, which is why it lives
 * in `app-shell` rather than under `features/auth` (where it also created an
 * auth -> rbac -> auth import cycle).
 */
export default function LaunchScreen() {
  const { notice, canSignOut } = useLaunchRouting();

  return (
    <LaunchView animateIn>
      {notice ? <NoAccessNotice message={notice} showSignOut={canSignOut} /> : null}
    </LaunchView>
  );
}
