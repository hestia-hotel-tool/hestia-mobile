import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Icon } from '@/components/Icon';
import { typography, colors } from '@/theme';
import { CHAT_COLORS, CHAT_LIST as L, CHAT_HEADER_BAR_HEIGHT, scaleX } from '../constants/chatStyles';
import SearchInput from '@/components/ui/SearchInput';

interface ChatHeaderProps {
  onBackPress?: () => void;
  onSearch?: (text: string) => void;
  onFilterPress?: () => void;
  /** Marks the filter glyph when the list is filtered to something other than All. */
  filterActive?: boolean;
  searchPlaceholder?: string | { bold: string; normal: string };
  showSearch?: boolean;
  title?: string;
  /** Subtitle below title (e.g. "3 participants" for group, "last seen" for direct) */
  subtitle?: string;
  isGroup?: boolean;
  avatar?: any;
  showAvatar?: boolean;
  onGroupOptionsPress?: () => void;
}

export default function ChatHeader({
  onBackPress,
  onSearch,
  onFilterPress,
  filterActive = false,
  searchPlaceholder = 'Search',
  showSearch = true,
  title = 'Chat',
  subtitle,
  avatar,
  showAvatar = false,
  onGroupOptionsPress,
}: ChatHeaderProps) {
  const handleSearchChange = (text: string) => onSearch?.(text);
  const shouldShowSearch = showSearch && onSearch !== undefined;

  // WhatsApp-style compact header for chat detail (no search).
  // Top inset is applied by parent SafeAreaView; no extra padding here to avoid double gap.
  if (!shouldShowSearch) {
    const displayTitle = typeof title === 'string' ? title : 'Chat';
    return (
      <View style={styles.compactWrapper}>
        <View style={styles.compactBar}>
          <TouchableOpacity
            style={styles.compactBack}
            onPress={onBackPress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.primary.main} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.compactAvatarTitle}
            onPress={onBackPress}
            activeOpacity={0.9}
          >
            {showAvatar ? (
              avatar?.uri ? (
                <Image source={avatar} style={styles.compactAvatar} resizeMode="cover" />
              ) : (
                <View style={styles.compactAvatarPlaceholder}>
                  <Text style={styles.compactAvatarInitial} numberOfLines={1}>
                    {displayTitle.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )
            ) : null}
            <View style={styles.compactTitleBlock}>
              <Text style={styles.compactTitle} numberOfLines={1}>{displayTitle}</Text>
              {subtitle ? (
                <Text style={styles.compactSubtitle} numberOfLines={1}>{subtitle}</Text>
              ) : null}
            </View>
          </TouchableOpacity>

          <View style={styles.compactRight}>
            <TouchableOpacity style={styles.compactIconBtn} activeOpacity={0.7}>
              <Ionicons name="call-outline" size={22} color={colors.primary.main} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.compactIconBtn} activeOpacity={0.7}>
              <Ionicons name="videocam-outline" size={22} color={colors.primary.main} />
            </TouchableOpacity>
            {onGroupOptionsPress ? (
              <TouchableOpacity style={styles.compactIconBtn} onPress={onGroupOptionsPress} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.primary.main} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.compactIconBtn} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.primary.main} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  /*
   * Chat list header — Figma 3272:62: tinted band with back chevron and title,
   * then the search pill, the filter glyph and a full-width rule.
   *
   * The + (new chat) button used to sit in the band; the frame moves it to a
   * floating button above the tab bar, which the screen draws.
   */
  return (
    <View style={styles.container}>
      <View style={styles.headerBackground} />
      <View style={styles.topSection}>
        <TouchableOpacity
          onPress={onBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          {/* 14x28; `action-chevron`'s aspect is exactly 0.5. */}
          <Icon name="action-chevron" size={L.header.backChevron * scaleX} color={CHAT_COLORS.glyph} />
        </TouchableOpacity>
        <Text style={styles.title}>{typeof title === 'string' ? title : 'Chat'}</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <SearchInput
            placeholder={searchPlaceholder}
            onSearch={handleSearchChange}
            inputStyle={styles.searchInput}
            placeholderStyle={styles.placeholderText}
            inputWrapperStyle={styles.searchInputWrapper}
          />
          {/* The registry glyph has its handle bottom-left; the frame's is bottom-right. */}
          <View style={styles.searchIcon} pointerEvents="none">
            <Icon name="action-search" size={L.search.iconSize * scaleX} color="rgba(90, 117, 157, 0.59)" />
          </View>
        </View>
        {onFilterPress ? (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={onFilterPress}
            activeOpacity={0.7}
            hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Filter chats"
            accessibilityState={{ selected: filterActive }}
          >
            <Icon name="action-filter" size={L.search.filterHeight * scaleX} color={CHAT_COLORS.glyph} />
            {filterActive ? <View style={styles.filterDot} /> : null}
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.searchDivider} />
    </View>
  );
}

const styles = StyleSheet.create({
  // WhatsApp-style compact header (chat detail) – theme aligned with home/rooms
  compactWrapper: {
    backgroundColor: colors.background.header,
    zIndex: 10,
  },
  compactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CHAT_HEADER_BAR_HEIGHT,
    paddingHorizontal: 8,
    backgroundColor: colors.background.header,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.medium,
  },
  compactBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  compactAvatarTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  compactAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAvatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  compactTitleBlock: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  compactTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  compactSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 1,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  // Chat list header — Figma 3272:62
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: (L.search.dividerTop + 1) * scaleX,
    backgroundColor: CHAT_COLORS.background,
    zIndex: 10,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: L.header.bandHeight * scaleX,
    backgroundColor: CHAT_COLORS.headerBackground,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: L.header.left * scaleX,
    paddingTop: L.header.top * scaleX,
    height: L.header.bandHeight * scaleX,
  },
  title: {
    marginLeft: L.header.titleGap * scaleX,
    fontSize: L.header.titleFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.title,
    includeFontPadding: false,
  },
  searchSection: {
    position: 'absolute',
    top: L.search.top * scaleX,
    left: L.search.left * scaleX,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  searchBar: {
    width: L.search.width * scaleX,
    height: L.search.height * scaleX,
    backgroundColor: CHAT_COLORS.searchBackground,
    borderRadius: L.search.radius * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: L.search.paddingLeft * scaleX,
    paddingRight: (L.search.iconRight + L.search.iconSize + 8) * scaleX,
  },
  searchInputWrapper: { flex: 1, justifyContent: 'center' },
  searchInput: {
    fontSize: L.search.placeholderFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: CHAT_COLORS.textPrimary,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    height: L.search.height * scaleX,
  },
  placeholderText: {
    fontSize: L.search.placeholderFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: '#000000',
    opacity: L.search.placeholderOpacity,
  },
  searchIcon: {
    position: 'absolute',
    right: L.search.iconRight * scaleX,
    transform: [{ scaleX: -1 }],
  },
  filterButton: {
    marginLeft: L.search.filterGap * scaleX,
    marginTop: L.search.filterTop * scaleX - 1,
  },
  filterDot: {
    position: 'absolute',
    top: -4 * scaleX,
    right: -5 * scaleX,
    width: 8 * scaleX,
    height: 8 * scaleX,
    borderRadius: 4 * scaleX,
    backgroundColor: CHAT_COLORS.badge,
  },
  searchDivider: {
    position: 'absolute',
    top: L.search.dividerTop * scaleX,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: CHAT_COLORS.divider,
  },
});
