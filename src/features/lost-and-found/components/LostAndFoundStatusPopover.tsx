import React from 'react';
import { ActivityIndicator, TextInput } from 'react-native';
import { Pressable, ScrollView, Text, View } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import StatusPopover from '@features/rooms/components/StatusPopover';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import type { LostAndFoundStatus } from '../types/lostAndFound.types';

/**
 * Card geometry, in design px — Figma 4352:3112: 396 wide at x16.
 *
 * `StatusPopover` defaults to the room flow's 416 at x=11, so this records its
 * own pair, as `TICKET_STATUS_POPOVER` does for Tickets.
 */
export const LOST_AND_FOUND_STATUS_POPOVER = { width: 396, left: 16 } as const;

/**
 * Placement heights, design px. These only decide whether the card opens below
 * the pill or flips above it, so an estimate is fine.
 */
const HEIGHT_STATUS_GRID = 287;
const HEIGHT_SHIPPING = 330;

export type LostAndFoundStatusPopoverProps = {
  visible: boolean;
  onClose: () => void;
  buttonPosition?: { x: number; y: number; width: number; height: number } | null;
  /** Measured band height in device px; converted to the design px the prop wants. */
  headerHeight: number;
  /** The status of the item being edited, so the current one can read as selected. */
  currentStatus?: LostAndFoundStatus;
  busy?: boolean;
  onSelect: (status: LostAndFoundStatus, dismiss: (after?: () => void) => void) => void;
  /** Shipping sub-mode. */
  shippingMode: boolean;
  shippingLocation: string;
  onShippingLocationChange: (value: string) => void;
  shippingSuggestions: readonly string[];
  onSubmitShippingLocation: (value: string, dismiss: (after?: () => void) => void) => void;
};

type OptionKey = 'stored' | 'shipped' | 'discarded';

/**
 * Figma 4352-2983: each option is its status pill (the card's, larger), a name
 * and what it means. Colours and marks are the card pill's own.
 */
const OPTIONS: { key: OptionKey; label: string; hint: string; icon: IconName; tone: string; glyph: number }[] = [
  { key: 'stored', label: 'Stored', hint: 'HSK Office, Front Office, Warehouse', icon: 'lf-stored', tone: '#f0be1b', glyph: 16.8 },
  { key: 'shipped', label: 'Shipped', hint: 'Sent to guest Address', icon: 'lf-shipped', tone: '#39d47f', glyph: 15 },
  { key: 'discarded', label: 'Discarded', hint: 'Thrown away or Destroyed', icon: 'lf-discarded', tone: '#57595d', glyph: 16 },
];

/** Design px — nodes 4352:3160 (pill), 4352:3150 (name), 4352:3188 (hint), 4352:3189 (tick). */
const ROW = {
  pill: { width: 67, height: 45.5, iconSlot: 26, iconLeft: 8, chevron: 14.2 },
  /** Pills 69 to 78 apart; 73.5 splits them. */
  gap: 28,
  /** The name 17 after the pill. */
  textGap: 17,
  /** The tick ends 40 from the card's right; the popover pads 24. */
  tickInset: 16,
} as const;

/**
 * Change an item's status — Figma **4352-2983** (a list: each status's pill,
 * its name and what it means, a tick on the current one), and **3107:70** for
 * the shipping sub-mode.
 *
 * Wraps the shared `StatusPopover` rather than re-implementing it. What this
 * replaces was an inline `<Modal>` in the screen with its own hand-rolled
 * placement maths — a `useMemo` computing `left`, `top` and a clamped notch
 * offset from the window size — duplicating the shell that Room Detail and
 * Tickets already share. That shell already flips above the anchor when there
 * is no room below, animates in and out, and draws the tail; none of that was
 * in the inline copy.
 *
 * `backdrop="clear"`: this flow has never blurred, only dimmed, and `'clear'`
 * is the closer of the two. It also matches the ticket popover, which is the
 * other status-change surface in the app.
 *
 * **The shipping form is `children`, not a variant.** `StatusPopover` takes a
 * render prop precisely so a caller can put anything in the card; adding a
 * `mode` prop to the shared component for one flow's sub-state would push this
 * screen's business into three others.
 *
 * *Known, pre-existing:* a `TextInput` inside an absolutely-positioned modal
 * card gets no keyboard avoidance, so on a card low in the list the keyboard
 * can cover the field. That was equally true of the inline modal. Fixing it
 * inside `StatusPopover` would perturb the room and ticket flows, so it is left
 * alone rather than fixed in the wrong place.
 */
export default function LostAndFoundStatusPopover({
  visible,
  onClose,
  buttonPosition,
  headerHeight,
  currentStatus,
  busy = false,
  onSelect,
  shippingMode,
  shippingLocation,
  onShippingLocationChange,
  shippingSuggestions,
  onSubmitShippingLocation,
}: LostAndFoundStatusPopoverProps) {
  const isCurrent = (key: string) =>
    key === currentStatus || (key === 'shipped' && currentStatus === 'returned');

  return (
    <StatusPopover
      visible={visible}
      onClose={onClose}
      buttonPosition={buttonPosition ?? undefined}
      backdrop="clear"
      spacing={17.5}
      width={LOST_AND_FOUND_STATUS_POPOVER.width}
      left={LOST_AND_FOUND_STATUS_POPOVER.left}
      // The prop is design px; the header reports device px.
      headerHeight={headerHeight / scaleX}
      contentHeight={shippingMode ? HEIGHT_SHIPPING : HEIGHT_STATUS_GRID}
    >
      {(dismiss) =>
        shippingMode ? (
          <View>
            <Text
              className="font-hestia-primary font-bold"
              style={{
                fontSize: 17 * scaleX,
                fontFamily: typography.fontFamily.primary,
                color: '#41d541',
                marginBottom: 14 * scaleX,
              }}
            >
              Shipped Location
            </Text>

            <View
              className="flex-row items-center rounded-md border border-border-control"
              style={{ paddingHorizontal: 14 * scaleX, height: 52 * scaleX }}
            >
              <TextInput
                value={shippingLocation}
                onChangeText={onShippingLocationChange}
                placeholder="Enter location"
                placeholderTextColor="rgba(0,0,0,0.35)"
                editable={!busy}
                onSubmitEditing={() => onSubmitShippingLocation(shippingLocation, dismiss)}
                returnKeyType="done"
                style={{
                  flex: 1,
                  fontSize: 16 * scaleX,
                  fontFamily: typography.fontFamily.primary,
                  color: '#5a759d',
                  padding: 0,
                }}
              />
              <Pressable
                onPress={() => onSubmitShippingLocation(shippingLocation, dismiss)}
                disabled={busy || !shippingLocation.trim()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Save shipped location"
              >
                {/* 180deg points the left-facing chevron right; it preserves the footprint. */}
                <Icon
                  name="action-chevron"
                  size={14 * scaleX}
                  color="#5a759d"
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </Pressable>
            </View>

            {shippingSuggestions.length > 0 ? (
              <ScrollView
                style={{ maxHeight: 190 * scaleX, marginTop: 8 * scaleX }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {shippingSuggestions.map((option) => {
                  const active =
                    option.trim().toLowerCase() === shippingLocation.trim().toLowerCase();
                  return (
                    <Pressable
                      key={option}
                      className="flex-row items-center"
                      disabled={busy}
                      onPress={() => onSubmitShippingLocation(option, dismiss)}
                      style={{ paddingVertical: 12 * scaleX }}
                    >
                      <Icon
                        name="location-pin"
                        size={16 * scaleX}
                        color="#c6c5c5"
                        style={{ marginRight: 10 * scaleX }}
                      />
                      <Text
                        className="flex-1 font-hestia-primary text-ink-primary"
                        numberOfLines={1}
                        style={{ fontSize: 15 * scaleX, fontFamily: typography.fontFamily.primary }}
                      >
                        {option}
                      </Text>
                      {active ? (
                        <Icon name="action-check" size={11 * scaleX} color="#5a759d" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        ) : (
          <View>
            {/* 4352:3116 — Helvetica bold 18, #5b769e. */}
            <Text
              className="font-hestia-primary font-bold"
              style={{
                fontSize: 18 * scaleX,
                lineHeight: 20.7 * scaleX,
                fontFamily: typography.fontFamily.primary,
                color: '#5b769e',
                marginTop: -5 * scaleX,
                marginLeft: 4 * scaleX,
                marginBottom: 24 * scaleX,
              }}
            >
              Change Status
            </Text>

            <View style={{ gap: ROW.gap * scaleX, marginBottom: 6 * scaleX }}>
              {OPTIONS.map((option) => {
                const current = isCurrent(option.key);
                return (
                  <Pressable
                    key={option.key}
                    className="flex-row items-center"
                    disabled={busy}
                    onPress={() => onSelect(option.key, dismiss)}
                    style={{ opacity: busy && !current ? 0.4 : 1, paddingRight: ROW.tickInset * scaleX }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: current }}
                    accessibilityLabel={`Set status to ${option.label}. ${option.hint}`}
                  >
                    <View
                      className="flex-row items-center"
                      style={{
                        width: ROW.pill.width * scaleX,
                        height: ROW.pill.height * scaleX,
                        borderRadius: (ROW.pill.height / 2) * scaleX,
                        backgroundColor: option.tone,
                        paddingLeft: ROW.pill.iconLeft * scaleX,
                      }}
                    >
                      {busy && current ? (
                        <View className="flex-1 items-center justify-center">
                          <ActivityIndicator size="small" color="#ffffff" />
                        </View>
                      ) : (
                        <>
                          <View className="items-center justify-center" style={{ width: ROW.pill.iconSlot * scaleX }}>
                            <Icon name={option.icon} size={option.glyph * scaleX} color="#ffffff" />
                          </View>
                          {/* 4352:3162 — 14.2 x 6.7, a chevron turned down. */}
                          <View
                            className="items-center justify-center"
                            style={{ width: ROW.pill.chevron * scaleX, height: (ROW.pill.chevron / 2) * scaleX, marginLeft: 4 * scaleX }}
                          >
                            <View style={{ transform: [{ rotate: '-90deg' }] }}>
                              <Icon name="action-chevron" size={ROW.pill.chevron * scaleX} color="#ffffff" />
                            </View>
                          </View>
                        </>
                      )}
                    </View>

                    <View className="flex-1" style={{ marginLeft: ROW.textGap * scaleX }}>
                      {/* 4352:3150 — Helvetica medium 14. */}
                      <Text
                        style={{
                          fontSize: 14 * scaleX,
                          lineHeight: 16.9 * scaleX,
                          fontFamily: typography.fontFamily.primary,
                          fontWeight: '500',
                          color: '#000000',
                        }}
                      >
                        {option.label}
                      </Text>
                      {/* 4352:3188 — light 11, 19 under the name. */}
                      <Text
                        numberOfLines={1}
                        style={{
                          marginTop: 2 * scaleX,
                          fontSize: 11 * scaleX,
                          lineHeight: 12.6 * scaleX,
                          fontFamily: typography.fontFamily.primary,
                          fontWeight: '300',
                          color: '#000000',
                        }}
                      >
                        {option.hint}
                      </Text>
                    </View>

                    {current ? <Icon name="action-check" size={11 * scaleX} color="#5a759d" /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )
      }
    </StatusPopover>
  );
}
