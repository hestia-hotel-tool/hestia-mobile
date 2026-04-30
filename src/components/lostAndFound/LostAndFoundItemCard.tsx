import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../../contexts/ToastContext';
import { typography } from '../../theme';
import {
  LOST_AND_FOUND_CARD,
  LOST_AND_FOUND_CONTENT,
  LOST_AND_FOUND_STORED_LOCATION,
  LOST_AND_FOUND_REGISTERED_BY,
  LOST_AND_FOUND_IMAGE,
  LOST_AND_FOUND_STATUS,
  LOST_AND_FOUND_DIVIDER,
  LOST_AND_FOUND_COLORS,
  LOST_AND_FOUND_TYPOGRAPHY,
  scaleX,
} from '../../constants/lostAndFoundStyles';
import { LostAndFoundItem } from '../../types/lostAndFound.types';

export type LostAndFoundStatusAnchorLayout = { x: number; y: number; width: number; height: number };

interface LostAndFoundItemCardProps {
  item: LostAndFoundItem;
  onPress?: () => void;
  onStatusPress?: (anchor?: LostAndFoundStatusAnchorLayout) => void;
  statusUpdating?: boolean;
}

export default function LostAndFoundItemCard({ item, onPress, onStatusPress, statusUpdating = false }: LostAndFoundItemCardProps) {
  const toast = useToast();
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [guestThumbFailed, setGuestThumbFailed] = useState(false);
  const imagePulse = useRef(new Animated.Value(0.35)).current;
  const getInitials = (name?: string) => {
    const parts = String(name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return '?';
    return parts
      .slice(0, 2)
      .map((p) => p[0] ?? '')
      .join('')
      .toUpperCase();
  };
  const fallbackGuestAvatarUrl = (seed: string) =>
    `https://i.pravatar.cc/96?u=${encodeURIComponent(seed)}`;
  const formatPublicAreaTimestamp = (iso?: string) => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = String(dt.getFullYear());
    return `${hh}:${mm} ${dd}/${mo}/${yyyy}`;
  };
  const shippedLocationDisplay = (() => {
    const v = (item.shippedLocation ?? '').trim();
    return v || '—';
  })();
  const locationTrimmed = typeof item.location === 'string' ? item.location.trim() : '';
  const isRoomItem = item.roomNumber != null || /^room\b/i.test(locationTrimmed);
  const isPublicAreaItem = !isRoomItem && (item.publicArea != null || !!locationTrimmed);
  const roomBadgeText =
    item.roomNumber != null
      ? String(item.roomNumber)
      : (() => {
          const m = (item.location || '').match(/room\s*(\d+)/i);
          return m?.[1] ?? null;
        })();
  const statusConfig =
    item.status === 'shipped' || item.status === 'returned'
      ? LOST_AND_FOUND_STATUS.shipped
      : item.status === 'discarded'
        ? LOST_AND_FOUND_STATUS.discarded
        : LOST_AND_FOUND_STATUS.stored;

  // Always show "Stored by" and the person who stored the item
  const registeredByLabel = 'Stored by';

  const statusButtonRef = useRef<View>(null);
  const handleStatusPressIn = (e: any) => {
    if (!onStatusPress) return;
    const ne = e?.nativeEvent;
    const pageX = typeof ne?.pageX === 'number' ? ne.pageX : undefined;
    const pageY = typeof ne?.pageY === 'number' ? ne.pageY : undefined;
    if (pageX == null || pageY == null) return;
    // Use an estimated button rect as an immediate anchor so the popover opens below
    // even before `measureInWindow()` resolves.
    const approxButtonH = LOST_AND_FOUND_STATUS.button.height * scaleX;
    onStatusPress({
      x: pageX,
      y: pageY - approxButtonH / 2,
      width: 0,
      height: approxButtonH,
    });
  };
  const handleStatusPress = () => {
    if (!onStatusPress) return;
    // Always open the status popover; on iOS, `measureInWindow` may be unavailable
    // or fail to invoke its callback for certain refs, which would otherwise prevent
    // the modal from opening entirely.
    onStatusPress(undefined);

    const measure = (statusButtonRef.current as any)?.measureInWindow as
      | ((cb: (x: number, y: number, width: number, height: number) => void) => void)
      | undefined;
    if (typeof measure !== 'function') return;

    try {
      measure((x, y, width, height) => {
        // Update anchor position if measurement succeeds.
        onStatusPress({ x, y, width, height });
      });
    } catch {
      // Swallow iOS measurement crashes (e.g. __internalInstanceHandle undefined).
      // The popover is already open; it will just use the fallback positioning.
    }
  };

  useEffect(() => {
    setIsImageLoading(false);
    imagePulse.setValue(0.35);
  }, [item.image, imagePulse]);

  useEffect(() => {
    // Reset guest thumb error when the item changes.
    setGuestThumbFailed(false);
  }, [item.id, item.guestImage, item.guestName]);

  useEffect(() => {
    if (!isImageLoading) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(imagePulse, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(imagePulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isImageLoading, imagePulse]);

  const handleCopyId = async () => {
    try {
      await Clipboard.setStringAsync(item.itemId);
      toast.show(`Item ID "${item.itemId}" copied to clipboard`, { type: 'success', title: 'Copied' });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.show('Failed to copy item ID', { type: 'error', title: 'Error' });
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Item Title (can wrap) */}
      <Text style={styles.itemName} numberOfLines={2}>
        {item.itemName}
      </Text>

      {/* Tracking Number + copy icon (fixed position, as in Figma) */}
      <View style={styles.itemIdContainer}>
        <Text style={styles.itemId} numberOfLines={1}>
          {item.itemId}
        </Text>
        <TouchableOpacity
          style={styles.copyIconButton}
          onPress={handleCopyId}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../../assets/icons/clip-board.png')}
            style={styles.copyIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Found In */}
      <Text style={styles.foundInLabel}>Found in</Text>
      <View style={styles.foundInCard}>
        <View style={styles.foundInCardContent}>
          {/* Room: guest block starts from left (Figma 3107:70). */}
          {isRoomItem && (item.guestName || item.guestDates || item.guestImage) ? (
            <>
              <View style={styles.foundInGuestSection}>
                {/* Guest thumbnail */}
                <View style={styles.foundInImageThumbContainer}>
                  {guestThumbFailed ? (
                    <View style={styles.foundInGuestThumbFallback}>
                      <Text style={styles.foundInGuestThumbFallbackText}>
                        {getInitials(item.guestName)}
                      </Text>
                    </View>
                  ) : (
                    <Image
                      source={
                        item.guestImage ??
                        ({ uri: fallbackGuestAvatarUrl(`${item.id}-${item.guestName ?? ''}`) } as any)
                      }
                      style={styles.foundInImageThumb}
                      resizeMode="cover"
                      onError={() => setGuestThumbFailed(true)}
                    />
                  )}
                </View>

                <View style={styles.foundInGuestTextContainer}>
                  <View style={styles.foundInGuestNameRow}>
                    {item.guestName && (
                      <Text style={styles.foundInGuestName} numberOfLines={1} ellipsizeMode="tail">
                        {item.guestName}
                      </Text>
                    )}
                    {roomBadgeText ? (
                      <View style={styles.roomBadge}>
                        <Text style={styles.roomBadgeText} numberOfLines={1}>
                          {roomBadgeText}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {!!item.guestDates && (
                    <Text style={styles.foundInGuestDates} numberOfLines={1} ellipsizeMode="tail">
                      {item.guestDates}
                    </Text>
                  )}
                </View>
              </View>

            </>
          ) : isRoomItem ? (
            <View style={styles.foundInGuestSection}>
              <View style={styles.foundInGuestTextContainer}>
                <View style={styles.foundInGuestNameRow}>
                  <Text style={styles.foundInGuestName} numberOfLines={1} ellipsizeMode="tail">
                    {roomBadgeText ? `Room ${roomBadgeText}` : (locationTrimmed || 'Room')}
                  </Text>
                  {roomBadgeText ? (
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomBadgeText} numberOfLines={1}>
                        {roomBadgeText}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.foundInGuestDates} numberOfLines={1} ellipsizeMode="tail">
                  {formatPublicAreaTimestamp(item.storedAt ?? item.createdAt) || ''}
                </Text>
              </View>
            </View>
          ) : isPublicAreaItem ? (
            <View style={styles.publicAreaFoundInSection}>
              <View style={styles.publicAreaFoundInIconTile} aria-hidden>
                <Image
                  source={require('../../../assets/icons/public-areea-icon.png')}
                  style={styles.publicAreaFoundInIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.publicAreaFoundInTextContainer}>
                <View style={styles.publicAreaFoundInTitleRow}>
                  <Text style={styles.publicAreaFoundInTitle} numberOfLines={1} ellipsizeMode="tail">
                    {item.publicArea ?? item.location ?? 'Public Area'}
                  </Text>
                  <View style={styles.publicAreaBadge}>
                    <Text style={styles.publicAreaBadgeText} numberOfLines={1}>
                      public area
                    </Text>
                  </View>
                </View>
                <Text style={styles.publicAreaFoundInSubTitle} numberOfLines={1} ellipsizeMode="tail">
                  {formatPublicAreaTimestamp(item.storedAt ?? item.createdAt) ||
                    item.guestDates ||
                    ''}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* Stored Location Section */}
      <View style={styles.storedLocationContainer}>
        <View style={styles.storedLocationTextContainer}>
          <Text style={styles.storedLocationLabel}>
            {item.status === 'shipped' ? 'Shipped Location' : 'Stored Location'}
          </Text>
          <Text style={styles.storedLocationName} numberOfLines={1}>
            {item.status === 'shipped'
              ? shippedLocationDisplay
              : item.storedLocation}
          </Text>
        </View>
      </View>

      {/* Item Image */}
      {item.image && (
        <View style={styles.itemImageContainer}>
          {isImageLoading && (
            <Animated.View
              pointerEvents="none"
              style={[styles.imageLoadingPlaceholder, { opacity: imagePulse }]}
            />
          )}
          <Image
            source={item.image}
            style={[styles.itemImage, isImageLoading && styles.itemImageHidden]}
            resizeMode="cover"
            onLoadStart={() => setIsImageLoading(true)}
            onLoad={() => setIsImageLoading(false)}
            onLoadEnd={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </View>
      )}

      {/* Horizontal Divider */}
      <View style={styles.divider} />

      {/* Registered/Stored By Label */}
      <Text style={styles.registeredByLabel}>{registeredByLabel}</Text>

      {/* Registered/Stored By Section */}
      {item.registeredBy.avatar ? (
        <Image
          source={
            typeof item.registeredBy.avatar === 'string'
              ? { uri: item.registeredBy.avatar }
              : item.registeredBy.avatar
          }
          style={styles.avatar}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {item.registeredBy.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.staffName} numberOfLines={1}>
        {item.registeredBy.name}
      </Text>
      <Text style={styles.timestamp} numberOfLines={1}>
        {item.registeredBy.timestamp}
      </Text>

      {/* Status Button */}
      <View
        ref={statusButtonRef}
        collapsable={false}
        style={[
          styles.statusButton,
          {
            backgroundColor: statusConfig.backgroundColor,
            right: (statusConfig as any).right != null ? (statusConfig as any).right * scaleX : undefined,
            minWidth: statusConfig.width * scaleX,
            top: statusConfig.top * scaleX,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPressIn={handleStatusPressIn}
          onPress={handleStatusPress}
          activeOpacity={0.7}
          disabled={statusUpdating}
          accessibilityRole="button"
          accessibilityLabel="Change lost and found status"
        />
        <View style={styles.statusButtonContent} pointerEvents="none">
          {statusUpdating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={[styles.statusText, { color: statusConfig.textColor }]} numberOfLines={1}>
                {item.status === 'shipped' || item.status === 'returned'
                  ? 'Shipped'
                  : item.status === 'discarded'
                    ? 'Discarded'
                    : 'Stored'}
              </Text>
              <Image
                source={
                  item.status === 'shipped' || item.status === 'returned'
                    ? require('../../../assets/icons/tick.png')
                    : require('../../../assets/icons/down-arrow.png')
                }
                style={[
                  styles.statusIcon,
                  {
                    width: statusConfig.iconWidth * scaleX,
                    height: statusConfig.iconHeight * scaleX,
                    tintColor: '#ffffff',
                  },
                ]}
                resizeMode="contain"
              />
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: LOST_AND_FOUND_CARD.width * scaleX,
    height: LOST_AND_FOUND_CARD.height * scaleX,
    backgroundColor: LOST_AND_FOUND_CARD.backgroundColor,
    borderWidth: LOST_AND_FOUND_CARD.borderWidth,
    borderColor: LOST_AND_FOUND_CARD.borderColor,
    borderRadius: LOST_AND_FOUND_CARD.borderRadius * scaleX,
    marginHorizontal: LOST_AND_FOUND_CARD.marginHorizontal * scaleX,
    marginBottom: LOST_AND_FOUND_CARD.marginBottom * scaleX,
    position: 'relative',
    overflow: 'hidden',
  },
  itemName: {
    position: 'absolute',
    left: LOST_AND_FOUND_CONTENT.itemName.left * scaleX,
    top: LOST_AND_FOUND_CONTENT.itemName.top * scaleX,
    fontSize: LOST_AND_FOUND_TYPOGRAPHY.itemName.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: LOST_AND_FOUND_TYPOGRAPHY.itemName.fontWeight as any,
    color: LOST_AND_FOUND_TYPOGRAPHY.itemName.color,
    maxWidth:
      (LOST_AND_FOUND_CONTENT.itemId.left -
        LOST_AND_FOUND_CONTENT.itemName.left -
        8) *
      scaleX,
  },
  itemIdContainer: {
    position: 'absolute',
    left: LOST_AND_FOUND_CONTENT.itemId.left * scaleX,
    top: LOST_AND_FOUND_CONTENT.itemId.top * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemId: {
    fontSize: LOST_AND_FOUND_TYPOGRAPHY.itemId.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: LOST_AND_FOUND_TYPOGRAPHY.itemId.fontWeight as any,
    color: LOST_AND_FOUND_TYPOGRAPHY.itemId.color,
    marginRight: 4 * scaleX, // Space between ID and copy icon
  },
  copyIconButton: {
    width: LOST_AND_FOUND_CONTENT.copyIcon.width * scaleX,
    height: LOST_AND_FOUND_CONTENT.copyIcon.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyIcon: {
    width: LOST_AND_FOUND_CONTENT.copyIcon.width * scaleX,
    height: LOST_AND_FOUND_CONTENT.copyIcon.height * scaleX,
    tintColor: LOST_AND_FOUND_COLORS.textPrimary,
    opacity: 0.6,
  },
  foundInLabel: {
    position: 'absolute',
    left: LOST_AND_FOUND_CONTENT.location.left * scaleX,
    top: LOST_AND_FOUND_CONTENT.location.top * scaleX,
    width: 84 * scaleX,
    height: 19 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '300' as any,
    color: '#000000',
    lineHeight: undefined,
    includeFontPadding: false,
  },
  foundInCard: {
    position: 'absolute',
    left: LOST_AND_FOUND_CONTENT.guestName.left * scaleX,
    top: LOST_AND_FOUND_CONTENT.guestName.top * scaleX,
    width: (LOST_AND_FOUND_IMAGE.left - LOST_AND_FOUND_CONTENT.guestName.left - 10) * scaleX,
    borderRadius: 6 * scaleX,
    backgroundColor: 'transparent',
    paddingHorizontal: 12 * scaleX,
    paddingVertical: 8 * scaleX,
    overflow: 'hidden',
  },
  foundInCardContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 42 * scaleX,
  },
  foundInLocationText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300' as any,
    color: LOST_AND_FOUND_COLORS.tabActive,
  },
  foundInGuestSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minWidth: 0,
    paddingRight: 0,
    minHeight: 30 * scaleX,
    marginLeft: 0,
  },
  foundInImageThumbContainer: {
    // Figma: ~34.6px square thumbnail
    width: 34.6 * scaleX,
    height: 34.6 * scaleX,
    borderRadius: 5 * scaleX,
    overflow: 'hidden',
    // Figma gap between thumb and name ~11px
    marginRight: 11 * scaleX,
    backgroundColor: '#e5e7eb',
  },
  foundInImageThumb: {
    width: '100%',
    height: '100%',
  },
  foundInGuestThumbFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5a759d',
  },
  foundInGuestThumbFallbackText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700' as any,
    color: '#ffffff',
    includeFontPadding: false,
  },
  foundInGuestTextContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: 0,
    justifyContent: 'flex-start',
    paddingLeft: 0,
  },
  foundInGuestNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  foundInGuestName: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700' as any,
    color: '#000000',
    marginRight: 6 * scaleX,
    marginBottom: 0,
    flexShrink: 1,
    minWidth: 0,
    lineHeight: 14 * scaleX,
    includeFontPadding: false,
  },
  foundInGuestDates: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300' as any,
    color: '#000000',
    marginTop: 6 * scaleX,
    flexShrink: 1,
    minWidth: 0,
  },
  roomBadge: {
    backgroundColor: 'rgba(59,193,246,0.25)',
    borderRadius: 7 * scaleX,
    minHeight: 18 * scaleX,
    paddingHorizontal: 10 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomBadgeText: {
    fontSize: 9 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300' as any,
    color: '#000000',
    includeFontPadding: false,
    lineHeight: 10 * scaleX,
  },
  // Match foundInGuestSection: same thumb size + gap so text aligns with room “Found in” rows
  publicAreaFoundInSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minWidth: 0,
    minHeight: 30 * scaleX,
  },
  publicAreaFoundInIconTile: {
    width: 34.6 * scaleX,
    height: 34.6 * scaleX,
    borderRadius: 5 * scaleX,
    backgroundColor: '#F0F5FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11 * scaleX,
  },
  publicAreaFoundInIcon: {
    width: 20 * scaleX,
    height: 20 * scaleX,
    tintColor: '#5A759D',
  },
  publicAreaFoundInTextContainer: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 0,
  },
  publicAreaFoundInTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  publicAreaFoundInTitle: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700' as any,
    color: '#000000',
    flexShrink: 1,
    minWidth: 0,
    includeFontPadding: false,
  },
  publicAreaBadge: {
    marginLeft: 10 * scaleX,
    backgroundColor: 'rgba(59,193,246,0.25)',
    borderRadius: 7 * scaleX,
    height: 18 * scaleX,
    paddingHorizontal: 10 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicAreaBadgeText: {
    fontSize: 9 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300' as any,
    color: '#000000',
    includeFontPadding: false,
    lineHeight: 10 * scaleX,
  },
  publicAreaFoundInSubTitle: {
    marginTop: 6 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300' as any,
    color: '#000000',
    flexShrink: 1,
    minWidth: 0,
  },
  // Align with Found In card inner content: guestName.left + foundInCard paddingHorizontal
  storedLocationContainer: {
    position: 'absolute',
    left: (LOST_AND_FOUND_CONTENT.guestName.left + 12) * scaleX,
    // Keep a safe lane below "Found in" content to prevent overlap.
    top: (LOST_AND_FOUND_STORED_LOCATION.icon.top + 19) * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth:
      (LOST_AND_FOUND_IMAGE.left + 8 - LOST_AND_FOUND_CONTENT.guestName.left - 12 - 12) * scaleX,
  },
  storedLocationTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  storedLocationLabel: {
    fontSize: LOST_AND_FOUND_TYPOGRAPHY.storedLocationLabel.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300' as any,
    color: LOST_AND_FOUND_TYPOGRAPHY.storedLocationLabel.color,
  },
  storedLocationName: {
    fontSize: LOST_AND_FOUND_TYPOGRAPHY.storedLocationName.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: LOST_AND_FOUND_TYPOGRAPHY.storedLocationName.fontWeight as any,
    color: LOST_AND_FOUND_TYPOGRAPHY.storedLocationName.color,
  },
  itemImageContainer: {
    position: 'absolute',
    left: (LOST_AND_FOUND_IMAGE.left + 8) * scaleX,
    top: LOST_AND_FOUND_IMAGE.top * scaleX,
    width: (LOST_AND_FOUND_IMAGE.width - 8) * scaleX,
    height: LOST_AND_FOUND_IMAGE.height * scaleX,
    borderRadius: LOST_AND_FOUND_IMAGE.borderRadius * scaleX,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  imageLoadingPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#cbd5e1',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: LOST_AND_FOUND_IMAGE.borderRadius * scaleX,
  },
  itemImageHidden: {
    opacity: 0,
  },
  divider: {
    position: 'absolute',
    left: LOST_AND_FOUND_DIVIDER.left * scaleX,
    top: LOST_AND_FOUND_DIVIDER.top * scaleX,
    width: (LOST_AND_FOUND_CARD.width - 2 * LOST_AND_FOUND_DIVIDER.left) * scaleX,
    height: LOST_AND_FOUND_DIVIDER.height,
    backgroundColor: LOST_AND_FOUND_DIVIDER.color,
  },
  registeredByLabel: {
    position: 'absolute',
    left: LOST_AND_FOUND_REGISTERED_BY.label.left * scaleX,
    top: LOST_AND_FOUND_REGISTERED_BY.label.top * scaleX,
    fontSize: LOST_AND_FOUND_TYPOGRAPHY.registeredByLabel.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: LOST_AND_FOUND_TYPOGRAPHY.registeredByLabel.fontWeight as any,
    color: LOST_AND_FOUND_TYPOGRAPHY.registeredByLabel.color,
  },
  avatar: {
    position: 'absolute',
    left: LOST_AND_FOUND_REGISTERED_BY.avatar.left * scaleX,
    top: LOST_AND_FOUND_REGISTERED_BY.avatar.top * scaleX,
    width: LOST_AND_FOUND_REGISTERED_BY.avatar.size * scaleX,
    height: LOST_AND_FOUND_REGISTERED_BY.avatar.size * scaleX,
    borderRadius: (LOST_AND_FOUND_REGISTERED_BY.avatar.size / 2) * scaleX,
  },
  avatarPlaceholder: {
    position: 'absolute',
    left: LOST_AND_FOUND_REGISTERED_BY.avatar.left * scaleX,
    top: LOST_AND_FOUND_REGISTERED_BY.avatar.top * scaleX,
    width: LOST_AND_FOUND_REGISTERED_BY.avatar.size * scaleX,
    height: LOST_AND_FOUND_REGISTERED_BY.avatar.size * scaleX,
    borderRadius: (LOST_AND_FOUND_REGISTERED_BY.avatar.size / 2) * scaleX,
    backgroundColor: LOST_AND_FOUND_COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 12 * scaleX,
    fontWeight: 'bold' as any,
    color: LOST_AND_FOUND_COLORS.textSecondary,
  },
  staffName: {
    position: 'absolute',
    left: LOST_AND_FOUND_REGISTERED_BY.name.left * scaleX,
    top: LOST_AND_FOUND_REGISTERED_BY.name.top * scaleX,
    fontSize: LOST_AND_FOUND_TYPOGRAPHY.staffName.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: LOST_AND_FOUND_TYPOGRAPHY.staffName.fontWeight as any,
    color: LOST_AND_FOUND_TYPOGRAPHY.staffName.color,
    maxWidth: 150 * scaleX,
  },
  timestamp: {
    position: 'absolute',
    left: LOST_AND_FOUND_REGISTERED_BY.timestamp.left * scaleX,
    top: LOST_AND_FOUND_REGISTERED_BY.timestamp.top * scaleX,
    fontSize: LOST_AND_FOUND_TYPOGRAPHY.timestamp.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: LOST_AND_FOUND_TYPOGRAPHY.timestamp.fontWeight as any,
    color: LOST_AND_FOUND_TYPOGRAPHY.timestamp.color,
    maxWidth: 150 * scaleX,
  },
  statusButton: {
    position: 'absolute',
    height: LOST_AND_FOUND_STATUS.button.height * scaleX,
    borderRadius: LOST_AND_FOUND_STATUS.button.borderRadius * scaleX,
    justifyContent: 'center',
  },
  statusButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14 * scaleX,
  },
  statusIcon: {
    // Icon styles are set inline
    marginLeft: 8 * scaleX,
  },
  statusText: {
    fontSize: LOST_AND_FOUND_STATUS.text.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: LOST_AND_FOUND_STATUS.text.fontWeight as any,
    lineHeight: LOST_AND_FOUND_STATUS.text.lineHeight * scaleX,
    includeFontPadding: false,
  },
});

