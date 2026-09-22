import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { Icon } from '@/components/Icon';
import { scaleX } from '../constants/lostAndFoundStyles';
import type { LostAndFoundTab } from '../types/lostAndFound.types';

interface EmptyLostAndFoundStateProps {
  selectedTab: LostAndFoundTab;
}

/**
 * Copy per tab, mirroring `EmptyTicketsState`.
 *
 * `created` has no status filter — it is every item — so an empty `created`
 * means the hotel has nothing registered at all, and it is the only one that
 * points at the way out. The other three can be empty while items exist
 * elsewhere, so they describe their own bucket and nothing more.
 *
 * "Returned" over "shipped" copy is the same deliberate clash the tab carries:
 * see `LOST_AND_FOUND_TAB_LABELS`.
 */
const MESSAGES: Record<LostAndFoundTab, { title: string; subtitle: string }> = {
  created: {
    title: 'No Lost & Found Items',
    subtitle: 'Nothing has been handed in yet. Tap Register to add the first item.',
  },
  stored: {
    title: 'No Items Stored',
    subtitle: 'Nothing is waiting in storage right now.',
  },
  returned: {
    title: 'No Items Returned',
    subtitle: 'Nothing has been shipped back to a guest yet.',
  },
  discarded: {
    title: 'No Items Discarded',
    subtitle: 'Nothing has been discarded yet.',
  },
};

export default function EmptyLostAndFoundState({ selectedTab }: EmptyLostAndFoundStateProps) {
  const message = MESSAGES[selectedTab];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {/*
          `nav-lost-found` — the mark the app already gives this feature, the
          same substitution `EmptyTicketsState` makes with `nav-tickets`.
          3128:32 draws no empty state, so there is no frame to match and this
          invents no art.

          **No `color`.** This is a two-tone brand mark: `#5A759D` basket with
          white knockouts, which `scripts/normalizeSvg.js` documents as one of
          the marks that must keep its fills. Passing `color` would be ignored
          and would earn a dev warning. Its blue is already the blue this
          empty state wants.

          Not `lost-found-registered`: that illustration is the success basket
          at 151x165, and shrinking celebration art into an 80pt "there is
          nothing here" disc reads as the wrong sentiment.
        */}
        <Icon name="nav-lost-found" size={40 * scaleX} />
      </View>
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.subtitle}>{message.subtitle}</Text>
    </View>
  );
}

/*
 * Deliberately identical to `EmptyTicketsState`'s: the two screens are
 * siblings and an empty Lost & Found should not look like a different app
 * from an empty Tickets. If these ever need to diverge they should move to a
 * shared component rather than drift.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40 * scaleX,
    paddingVertical: 60 * scaleX,
  },
  iconContainer: {
    width: 80 * scaleX,
    height: 80 * scaleX,
    borderRadius: 40 * scaleX,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24 * scaleX,
  },
  title: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
    marginBottom: 8 * scaleX,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22 * scaleX,
  },
});
