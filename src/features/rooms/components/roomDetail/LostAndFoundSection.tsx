import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon } from "@/components/Icon";
import { typography } from "@/theme";
import { scaleX, LOST_AND_FOUND as L } from "../../constants/roomDetailStyles";
import LostAndFoundItemCard from "@features/lost-and-found/components/LostAndFoundItemCard";
import type { LostAndFoundItem } from "@features/lost-and-found/types/lostAndFound.types";

interface LostAndFoundSectionProps {
  /** Items registered as found in this room — the screen passes only the latest. */
  items?: LostAndFoundItem[];
  /** "Add Item" — opens Lost & Found's register sheet for this room. */
  onAddPress?: () => void;
  onItemPress?: (item: LostAndFoundItem) => void;
  /** The "Lost & Found" title — opens the Lost & Found screen. */
  onTitlePress?: () => void;
}

/**
 * Room detail's Lost & Found section — Figma 2333:312.
 *
 * A titled row, then either the "Add Item" card — the lost-and-found box with
 * a green "+" and a white pill, the whole card the tap target — while the room
 * has no items, or, once one is registered, that item's card in its place.
 *
 * Replaces the old dashed "Add Lost & Found" box (a PNG basket and a text "+").
 */
export default function LostAndFoundSection({
  items = [],
  onAddPress,
  onItemPress,
  onTitlePress,
}: LostAndFoundSectionProps) {
  const s = (n: number) => n * scaleX;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onTitlePress}
        disabled={!onTitlePress}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel="Open Lost & Found"
        style={({ pressed }) => [
          styles.titleRow,
          { paddingLeft: s(L.title.left), gap: s(L.title.glyphToText) },
          pressed && styles.pressed,
        ]}
      >
        <Icon name="lost-found-basket" size={s(L.title.glyphHeight)} />
        <Text
          style={[
            styles.title,
            {
              fontSize: s(L.title.fontSize),
              lineHeight: s(L.title.fontSize) * 1.2,
            },
          ]}
        >
          Lost & Found
        </Text>
      </Pressable>

      {items.length === 0 ? (
        <Pressable
          onPress={onAddPress}
          disabled={!onAddPress}
          accessibilityRole="button"
          accessibilityLabel="Add a lost and found item for this room"
          style={({ pressed }) => [
            styles.card,
            {
              marginTop: s(L.title.toCard),
              marginHorizontal: s(L.card.left),
              height: s(L.card.height),
              borderRadius: s(L.card.radius),
              paddingLeft: s(L.card.paddingLeft),
              paddingRight: s(L.card.paddingRight),
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.glyph}>
            <Icon name="lost-found-basket" size={s(L.glyphHeight)} />
            <Text
              style={[
                styles.plus,
                {
                  fontSize: s(L.plus.fontSize),
                  lineHeight: s(L.plus.lineHeight),
                  marginTop: s(L.plus.top),
                },
              ]}
              accessible={false}
            >
              +
            </Text>
          </View>

          <View
            style={[
              styles.pill,
              {
                width: s(L.pill.width),
                height: s(L.pill.height),
                borderRadius: s(L.pill.radius),
              },
            ]}
          >
            <Text style={[styles.pillText, { fontSize: s(L.pill.fontSize) }]}>
              Add Item
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={[styles.items, { marginTop: s(L.title.toCard) }]}>
          {items.map((item) => (
            <LostAndFoundItemCard
              key={item.id}
              item={item}
              onPress={() => onItemPress?.(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: 12 * scaleX,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as never,
    color: L.title.color,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: L.card.background,
    borderWidth: 1,
    borderColor: L.card.border,
  },
  pressed: {
    opacity: 0.85,
  },
  glyph: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  plus: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as never,
    color: L.plus.color,
  },
  pill: {
    backgroundColor: L.pill.background,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as never,
    color: L.pill.color,
  },
  items: {
    width: "100%",
  },
});
