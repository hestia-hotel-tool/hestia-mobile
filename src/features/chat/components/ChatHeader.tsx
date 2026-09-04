import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, colors } from '@/theme';
import {
  CHAT_HEADER,
  SEARCH_BAR,
  CHAT_COLORS,
  CHAT_TYPOGRAPHY,
  CHAT_ITEM,
  CHAT_HEADER_BAR_HEIGHT,
  scaleX,
} from '../constants/chatStyles';
import SearchInput from '@/components/SearchInput';

interface ChatHeaderProps {
  onBackPress?: () => void;
  onSearch?: (text: string) => void;
  onFilterPress?: () => void;
  onMessagePress?: () => void;
  searchPlaceholder?: string | { bold: string; normal: string };
  showSearch?: boolean;
  title?: string;
  /** Subtitle below title (e.g. "3 participants" for group, "last seen" for direct) */
  subtitle?: string;
  isGroup?: boolean;
  avatar?: any;
  showAvatar?: boolean;
  showMessageButton?: boolean;
  onGroupOptionsPress?: () => void;
}

export default function ChatHeader({
  onBackPress,
  onSearch,
  onFilterPress,
  onMessagePress,
  searchPlaceholder = 'Search',
  showSearch = true,
  title = 'Chat',
  subtitle,
  isGroup = false,
  avatar,
  showAvatar = false,
  showMessageButton = true,
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

  // Legacy list header with search
  return (
    <View style={styles.container}>
      <View style={styles.headerBackground} />
      <View style={styles.topSection}>
        <TouchableOpacity
          style={showAvatar ? styles.avatarButton : styles.backButton}
          onPress={onBackPress || (() => {})}
          activeOpacity={0.7}
        >
          {showAvatar ? (
            avatar ? (
              <Image source={avatar} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(typeof title === 'string' ? title : 'Chat').charAt(0).toUpperCase()}
                </Text>
              </View>
            )
          ) : (
            <Image
              source={require('../../../../assets/icons/back-arrow.png')}
              style={styles.backArrow}
              tintColor="#607aa1"
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
        <Text style={styles.title}>{typeof title === 'string' ? title : 'Chat'}</Text>
        {onGroupOptionsPress ? (
          <TouchableOpacity style={styles.messageButton} onPress={onGroupOptionsPress} activeOpacity={0.7}>
            <Text style={styles.groupOptionsIcon}>⋮</Text>
          </TouchableOpacity>
        ) : showMessageButton ? (
          <TouchableOpacity style={styles.messageButton} onPress={onMessagePress || (() => {})} activeOpacity={0.7}>
            <View style={styles.messageButtonInner}>
              <Text style={styles.messageIconText}>+</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
      {shouldShowSearch && (
        <>
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <SearchInput
                placeholder={searchPlaceholder}
                onSearch={handleSearchChange}
                inputStyle={styles.searchInput}
                placeholderStyle={styles.placeholderText}
                inputWrapperStyle={styles.searchInputWrapper}
              />
              <TouchableOpacity style={styles.searchIconContainer} activeOpacity={0.7}>
                <Image
                  source={require('../../../../assets/icons/search-icon.png')}
                  style={styles.searchIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            {onFilterPress && (
              <TouchableOpacity style={styles.filterButton} onPress={onFilterPress} activeOpacity={0.7}>
                <Image
                  source={require('../../../../assets/icons/menu-icon.png')}
                  style={styles.filterIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
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
  // Legacy list header
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CHAT_HEADER.height * scaleX,
    zIndex: 10,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CHAT_HEADER.background.height * scaleX,
    backgroundColor: CHAT_COLORS.headerBackground,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CHAT_HEADER.backButton.left * scaleX,
    paddingTop: CHAT_HEADER.backButton.top * scaleX,
    height: CHAT_HEADER.background.height * scaleX,
  },
  backButton: {
    width: CHAT_HEADER.backButton.width * scaleX,
    height: CHAT_HEADER.backButton.height * scaleX,
    marginRight: 17 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: CHAT_HEADER.backButton.width * scaleX,
    height: CHAT_HEADER.backButton.height * scaleX,
  },
  avatarButton: {
    width: CHAT_ITEM.avatar.size * scaleX,
    height: CHAT_ITEM.avatar.size * scaleX,
    marginRight: 17 * scaleX,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: CHAT_ITEM.avatar.borderRadius * scaleX,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: CHAT_ITEM.avatar.borderRadius * scaleX,
    backgroundColor: CHAT_COLORS.searchBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18 * scaleX,
    fontWeight: 'bold' as any,
    color: CHAT_COLORS.textSecondary,
  },
  title: {
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700' as any,
    color: '#607AA1',
    lineHeight: 24 * scaleX,
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  groupOptionsIcon: {
    fontSize: 24 * scaleX,
    fontWeight: '700' as any,
    color: '#607AA1',
    lineHeight: 28 * scaleX,
  },
  messageButton: {
    position: 'absolute',
    right: CHAT_HEADER.messageButton.right * scaleX,
    top: CHAT_HEADER.messageButton.top * scaleX,
    width: CHAT_HEADER.messageButton.width * scaleX,
    height: CHAT_HEADER.messageButton.height * scaleX,
    borderRadius: CHAT_HEADER.messageButton.borderRadius * scaleX,
    backgroundColor: CHAT_HEADER.messageButton.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: CHAT_HEADER.messageButton.borderRadiusInner * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIconText: {
    fontSize: 32 * scaleX,
    fontWeight: '300' as any,
    color: '#ffffff',
    lineHeight: 32 * scaleX,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SEARCH_BAR.container.left * scaleX,
    marginTop: (SEARCH_BAR.container.top - CHAT_HEADER.background.height) * scaleX,
    gap: 12 * scaleX,
  },
  searchBar: {
    flex: 1,
    height: SEARCH_BAR.container.height * scaleX,
    backgroundColor: SEARCH_BAR.container.backgroundColor,
    borderRadius: SEARCH_BAR.container.borderRadius * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SEARCH_BAR.container.paddingLeft * scaleX,
    paddingRight: SEARCH_BAR.container.paddingRight * scaleX,
  },
  searchInputWrapper: { justifyContent: 'center' },
  searchInput: {
    fontSize: CHAT_TYPOGRAPHY.searchPlaceholder.fontSize * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: CHAT_COLORS.textPrimary,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    height: SEARCH_BAR.container.height * scaleX,
  },
  placeholderText: {
    fontSize: CHAT_TYPOGRAPHY.searchPlaceholder.fontSize * scaleX,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as any,
    color: CHAT_COLORS.textPlaceholder,
    opacity: CHAT_TYPOGRAPHY.searchPlaceholder.opacity,
  },
  searchIconContainer: {
    width: 26 * scaleX,
    height: 26 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10 * scaleX,
  },
  searchIcon: {
    width: 19 * scaleX,
    height: 19 * scaleX,
    tintColor: SEARCH_BAR.searchIcon.tintColor,
  },
  filterButton: {
    width: SEARCH_BAR.filterIcon.width * scaleX,
    height: SEARCH_BAR.filterIcon.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    width: SEARCH_BAR.filterIcon.width * scaleX,
    height: SEARCH_BAR.filterIcon.height * scaleX,
  },
});
