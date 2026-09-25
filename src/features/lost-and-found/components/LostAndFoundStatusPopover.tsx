import React from 'react';
import { ActivityIndicator, TextInput } from 'react-native';
import { Pressable, ScrollView, Text, View } from '@/tw';
import { Icon } from '@/components/Icon';
import StatusPopover from '@features/rooms/components/StatusPopover';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import type { LostAndFoundStatus } from '../types/lostAndFound.types';

/**
 * Card geometry, in design px.
 *
 * `StatusPopover` defaults to the room flow's 416 at x=11; the Lost & Found
 * popover in 3128:310 is narrower and sits further in, so it records its own
 * pair here exactly as `TICKET_STATUS_POPOVER` does for Tickets.
 */
export const LOST_AND_FOUND_STATUS_POPOVER = { width: 394, left: 23 } as const;

/**
 * Placement heights, design px. These only decide whether the card opens below
 * the pill or flips above it, so an estimate is fine.
 */
const HEIGHT_STATUS_GRID = 236;
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

const STATUS_TONE: Record<'stored' | 'shipped' | 'discarded', string> = {
  stored: '#f0be1b',
  shipped: '#39d47f',
  discarded: '#9ca3af',
};

/**
 * Change an item's status — Figma **3128:310**, and **3107:70** for the
 * shipping sub-mode.
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
  const options: { key: 'stored' | 'shipped' | 'discarded'; label: string }[] = [
    { key: 'stored', label: 'Stored' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'discarded', label: 'Discarded' },
  ];

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
            <Text
              className="font-hestia-primary font-bold text-ink-secondary"
              style={{
                fontSize: 17 * scaleX,
                fontFamily: typography.fontFamily.primary,
                marginBottom: 18 * scaleX,
              }}
            >
              Change status
            </Text>

            <View className="flex-row items-start justify-around">
              {options.map((option) => (
                <Pressable
                  key={option.key}
                  className="items-center"
                  disabled={busy}
                  onPress={() => onSelect(option.key, dismiss)}
                  style={{ opacity: busy ? 0.4 : 1, paddingHorizontal: 8 * scaleX }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent(option.key) }}
                  accessibilityLabel={`Set status to ${option.label}`}
                >
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 44 * scaleX,
                      height: 44 * scaleX,
                      borderRadius: 22 * scaleX,
                      backgroundColor: STATUS_TONE[option.key],
                      borderWidth: isCurrent(option.key) ? 3 : 0,
                      borderColor: '#334866',
                    }}
                  >
                    {busy && isCurrent(option.key) ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : option.key === 'shipped' ? (
                      <Icon name="action-check" size={9.75 * scaleX} color="#ffffff" />
                    ) : option.key === 'stored' ? (
                      <View style={{ transform: [{ rotate: '-90deg' }] }}>
                        <Icon name="action-chevron" size={12 * scaleX} color="#ffffff" />
                      </View>
                    ) : (
                      <Text
                        className="font-hestia-primary text-ink-white"
                        style={{ fontSize: 22 * scaleX, lineHeight: 24 * scaleX }}
                      >
                        ×
                      </Text>
                    )}
                  </View>
                  <Text
                    className="font-hestia-primary text-ink-primary"
                    style={{
                      fontSize: 13 * scaleX,
                      fontFamily: typography.fontFamily.primary,
                      marginTop: 8 * scaleX,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )
      }
    </StatusPopover>
  );
}
