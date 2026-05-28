import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { typography } from '@shared/theme';
import { REASSIGN_MODAL, scaleX } from '../../constants/reassignModalStyles';
import { ReassignTab } from '@features/staff';

interface ReassignTabsProps {
  activeTab: ReassignTab;
  onTabChange: (tab: ReassignTab) => void;
  onSearchPress?: () => void;
}

export default function ReassignTabs({
  activeTab,
  onTabChange,
  onSearchPress,
}: ReassignTabsProps) {
  return (
    <View style={styles.container}>
      {/* Tabs */}
      <TouchableOpacity
        style={[styles.tab, { left: REASSIGN_MODAL.tabs.onShift.left * scaleX }]}
        onPress={() => onTabChange('OnShift')}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'OnShift' && styles.tabTextActive,
          ]}
        >
          On Shift
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, { left: REASSIGN_MODAL.tabs.am.left * scaleX }]}
        onPress={() => onTabChange('AM')}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'AM' && styles.tabTextActive,
          ]}
        >
          AM
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, { left: REASSIGN_MODAL.tabs.pm.left * scaleX }]}
        onPress={() => onTabChange('PM')}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'PM' && styles.tabTextActive,
          ]}
        >
          PM
        </Text>
      </TouchableOpacity>

      {/* Active Tab Underline */}
      <View
        style={[
          styles.underline,
          activeTab === 'OnShift' && { left: REASSIGN_MODAL.tabs.underline.left * scaleX },
          activeTab === 'AM' && { left: REASSIGN_MODAL.tabs.underline.leftAM * scaleX },
          activeTab === 'PM' && { left: REASSIGN_MODAL.tabs.underline.leftPM * scaleX },
        ]}
      />

      {/* Search Icon - Next to PM tab */}
      <TouchableOpacity
        style={styles.searchButton}
        onPress={onSearchPress || (() => {})}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Image
          source={require('../../../../../assets/icons/search-icon.png')}
          style={styles.searchIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: REASSIGN_MODAL.tabs.height * scaleX,
    backgroundColor: REASSIGN_MODAL.tabs.backgroundColor,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    position: 'absolute',
    top: (REASSIGN_MODAL.tabs.onShift.top - REASSIGN_MODAL.tabs.top) * scaleX,
    paddingVertical: 10 * scaleX,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  tabText: {
    fontSize: REASSIGN_MODAL.tabs.inactiveTab.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: REASSIGN_MODAL.tabs.inactiveTab.color,
  },
  tabTextActive: {
    fontWeight: typography.fontWeights.bold as any,
    color: REASSIGN_MODAL.tabs.activeTab.color,
  },
  underline: {
    position: 'absolute',
    bottom: REASSIGN_MODAL.tabs.underline.height,
    height: REASSIGN_MODAL.tabs.underline.height,
    width: REASSIGN_MODAL.tabs.underline.width * scaleX,
    backgroundColor: REASSIGN_MODAL.tabs.underline.backgroundColor,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: REASSIGN_MODAL.tabs.divider.height,
    backgroundColor: REASSIGN_MODAL.tabs.divider.color,
  },
  searchButton: {
    position: 'absolute',
    left: 380 * scaleX, // From Figma: x=380
    // Align vertically with tab text center
    // Tabs are at top: (157-133) = 24px from tabs section top
    // Tab has 10px padding, so text starts at 34px
    // Text is 16px font, so center is approximately at 34 + 8 = 42px
    // Icon is 19px tall, so top should be at 42 - 9.5 = 32.5px
    top: ((REASSIGN_MODAL.tabs.onShift.top - REASSIGN_MODAL.tabs.top) + 10 + (REASSIGN_MODAL.tabs.activeTab.fontSize / 2) - (19 / 2)) * scaleX,
    width: 19 * scaleX,
    height: 19 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: 19 * scaleX,
    height: 19 * scaleX,
  },
});

