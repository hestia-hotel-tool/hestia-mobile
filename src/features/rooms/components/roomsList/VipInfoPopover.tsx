import React from 'react';
import { Platform, Pressable as RNPressable, useWindowDimensions } from 'react-native';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { BlurBackdrop } from '@/components/ui/BlurBackdrop';
import { View, Text } from '@/tw';
import { Icon } from '@/components/Icon';
import { colors, typography } from '@/theme';
import { vipTierLabel, type VipTier } from '@/domain/vip';
import { INK, ROOM_CARD, cardPx } from './roomCardLayout';

/** Where the tapped VIP disc's ⓘ is on screen (`measureInWindow`). */
export type VipAnchor = { x: number; y: number; width: number; height: number };

export type VipInfoPopoverProps = {
  visible: boolean;
  onClose: () => void;
  anchor: VipAnchor | null;
  /** Window y of the tapped card's top: from there to the popover stays sharp, everything else blurs. */
  cropTop: number;
  /** Window y where the screen's header ends: the header is never blurred (client, 2026-11-06). */
  clearAbove: number;
  tier: VipTier;
  /** The room's cleaning credits — "Use 80 credits…". */
  credits: number;
  /** "What are the VIP guest requirements?" — asks the assistant. */
  onAskAssistant: () => void;
};

/** The status popover's tail (StatusPopover), the same registered glyph. */
const TAIL = { width: cardPx(37.82), height: cardPx(13.54) };
/** Clear of the ⓘ above it. */
const GAP = cardPx(4);
const QUESTION = 'What are the VIP guest requirements?';

/**
 * A lighter backdrop than the status popover's (client, 2026-11-06): the list
 * behind stays readable as context. iOS blur 30 (the default is 80); Android,
 * which cannot blur behind a modal, a 55% wash instead of 88%.
 */
const LIGHT_BLUR = { intensity: 30, androidScrimOpacity: 0.55 } as const;

/**
 * Room the popover needs under the ⓘ: the gap, the tail, the panel (36 + chip
 * 28 + 20 + title 25 + 10 + two lines 44 + 40 + 20 + 16 + button 62 + 36 =
 * 337) and a margin above the tab bar. The list scrolls to make it
 * (useRevealBelow) so the popover always opens downward.
 */
export const VIP_POPOVER_SPACE = GAP + TAIL.height + cardPx(337) + cardPx(12);

/**
 * What a VIP code means — opened from a room card's VIP disc or its ⓘ.
 *
 * A card-wide panel hanging from the ⓘ, its tail pointing up at it — always
 * downward; the list scrolls first to make room (useRevealBelow):
 *
 *   Code: V3                      the guest's tier
 *   VIP GUEST
 *   Use 80 credits and make sure  the room's credits
 *   to fulfill all the VIP guest
 *   checklist
 *   Need Assistance?
 *   (ai) What are the VIP guest requirements?   → the assistant, asked
 *
 * Everything behind is blurred except the screen's header and the tapped
 * card's strip above the panel, so it stays clear which guest this is about.
 * A tap anywhere outside closes it.
 */
export function VipInfoPopover({
  visible,
  onClose,
  anchor,
  cropTop,
  clearAbove,
  tier,
  credits,
  onAskAssistant,
}: VipInfoPopoverProps) {
  const { width: windowWidth } = useWindowDimensions();

  const left = ROOM_CARD.listGutter;
  const width = windowWidth - 2 * left;
  const anchorCentre = anchor ? anchor.x + anchor.width / 2 : windowWidth / 2;
  const tailTop = anchor ? anchor.y + anchor.height + GAP : 0;
  const panelTop = tailTop + TAIL.height - 1;
  const tailLeft = Math.min(
    Math.max(anchorCentre - TAIL.width / 2, left + cardPx(16)),
    left + width - TAIL.width - cardPx(16),
  );
  // The sharp strip: the card's top down to the panel, never below the ⓘ.
  const sharpTop = Math.max(0, Math.min(cropTop, tailTop));
  // The header stays sharp: the top blur runs from its bottom edge to the card.
  const headerEdge = Math.max(0, Math.min(clearAbove, sharpTop));

  return (
    <Modal
      transparent
      visible={visible && !!anchor}
      animationType="fade"
      onRequestClose={onClose}
      // Window coordinates (measureInWindow) include the status bar.
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* The screen's header: sharp, but a tap on it still closes. */}
      {headerEdge > 0 ? (
        <RNPressable
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: headerEdge }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close VIP details"
        />
      ) : null}
      {/* Blurred between the header and the card… */}
      {sharpTop > headerEdge ? (
        <BlurBackdrop
          {...LIGHT_BLUR}
          top={headerEdge}
          onPress={onClose}
          accessibilityLabel="Close VIP details"
          style={{ bottom: undefined, height: sharpTop - headerEdge }}
        />
      ) : null}
      {/* …sharp across the card's strip (still closes on a tap)… */}
      <RNPressable
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: sharpTop,
          height: Math.max(0, panelTop - sharpTop),
        }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close VIP details"
      />
      {/* …and blurred from the panel down. */}
      <BlurBackdrop {...LIGHT_BLUR} top={panelTop} onPress={onClose} accessibilityLabel="Close VIP details" />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: tailLeft,
          top: tailTop,
          zIndex: 2,
        }}
      >
        <Icon name="action-tooltip-tail" width={TAIL.width} height={TAIL.height} color="#ffffff" />
      </View>

      {/* A Pressable of its own, so taps inside do not fall through and close it. */}
      <RNPressable
        accessibilityViewIsModal
        style={{
          position: 'absolute',
          left,
          width,
          top: panelTop,
          paddingTop: cardPx(36),
          paddingBottom: cardPx(36),
          paddingHorizontal: cardPx(24),
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: cardPx(16),
          shadowColor: '#1e2a3a',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        <View
          className="items-center justify-center"
          style={{
            height: cardPx(28),
            paddingHorizontal: cardPx(16),
            borderRadius: cardPx(9),
            backgroundColor: '#e8ecf2',
          }}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.primary,
              fontSize: cardPx(13),
              fontWeight: '700',
              color: INK,
            }}
          >
            Code: {vipTierLabel(tier.tier)}
          </Text>
        </View>

        <Text
          style={{
            marginTop: cardPx(20),
            fontFamily: typography.fontFamily.primary,
            fontSize: cardPx(21),
            fontWeight: '700',
            color: '#000000',
            letterSpacing: 0.3,
          }}
        >
          VIP GUEST
        </Text>

        <Text
          style={{
            marginTop: cardPx(10),
            maxWidth: cardPx(300),
            textAlign: 'center',
            fontFamily: typography.fontFamily.primary,
            fontSize: cardPx(16),
            lineHeight: cardPx(22),
            fontWeight: '400',
            color: '#1e1e1e',
          }}
        >
          Use {credits} credits and make sure to fulfill all the VIP guest checklist
        </Text>

        <Text
          style={{
            marginTop: cardPx(40),
            fontFamily: typography.fontFamily.primary,
            fontSize: cardPx(16),
            fontWeight: '700',
            color: colors.text.pink,
          }}
        >
          Need Assistance?
        </Text>

        <RNPressable
          onPress={onAskAssistant}
          accessibilityRole="button"
          accessibilityLabel={`Ask the assistant: ${QUESTION}`}
          style={({ pressed }) => ({
            marginTop: cardPx(16),
            alignSelf: 'stretch',
            marginHorizontal: cardPx(6),
            height: cardPx(62),
            borderRadius: cardPx(31),
            borderWidth: 1,
            borderColor: INK,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: cardPx(14),
            gap: cardPx(12),
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="ai-assistant-mark" size={cardPx(34)} />
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontFamily: typography.fontFamily.primary,
              fontSize: cardPx(14.5),
              color: '#1e1e1e',
            }}
          >
            {QUESTION}
          </Text>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}

export default VipInfoPopover;
export { QUESTION as VIP_ASSISTANT_QUESTION };
