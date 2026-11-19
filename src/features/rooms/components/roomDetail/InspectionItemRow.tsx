import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { inspectionImage } from '../../constants/inspectionImages';
import type { InspectionItem } from '../../services/roomInspection';

export type InspectionItemRowProps = {
  item: InspectionItem;
  /** False: read-only (not the room's technician or a lead). */
  editable: boolean;
  onGood: () => void;
  onIssue: () => void;
};

/**
 * One checklist row — Figma 4759:225 (4759:1427…1431): the 68 picture, the
 * name, then the Good tick and the Issue cross, each a 34x35 square. The word
 * under the squares says where the item is: "Good" under the green tick,
 * "Issues" under the red cross, "Unchecked" under the tick when neither.
 */
export default function InspectionItemRow({ item, editable, onGood, onIssue }: InspectionItemRowProps) {
  const image = inspectionImage(item.imageKey);
  const good = item.result === 'good';
  const issue = item.result === 'issue';

  return (
    <View style={styles.row}>
      <View style={styles.picture}>
        {image ? (
          <Image source={image} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.initial}>{item.name.charAt(0).toUpperCase()}</Text>
        )}
      </View>

      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        {issue && item.note ? (
          <Text style={styles.note} numberOfLines={2}>
            {item.note}
          </Text>
        ) : null}
      </View>

      <View style={styles.mark}>
        <TouchableOpacity
          style={[styles.box, good ? styles.goodOn : styles.goodOff]}
          onPress={onGood}
          disabled={!editable}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: good, disabled: !editable }}
          accessibilityLabel={`${item.name}: good`}
        >
          <Icon name="action-inspect-tick" size={11.2 * scaleX} color={good ? '#ffffff' : '#b0c0c6'} />
        </TouchableOpacity>
        <Text style={styles.caption}>{good ? 'Good' : issue ? ' ' : 'Unchecked'}</Text>
      </View>

      <View style={[styles.mark, styles.issueMark]}>
        <TouchableOpacity
          style={[styles.box, issue ? styles.issueOn : styles.issueOff]}
          onPress={onIssue}
          disabled={!editable}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: issue, disabled: !editable }}
          accessibilityLabel={`${item.name}: issue`}
        >
          <Icon name="action-inspect-cross" size={10.62 * scaleX} color={issue ? '#ffffff' : '#b0c0c6'} />
        </TouchableOpacity>
        <Text style={[styles.caption, styles.issueCaption]}>{issue ? 'Issues' : ' '}</Text>
      </View>
    </View>
  );
}

const BOX_W = 34 * scaleX;
const BOX_H = 35 * scaleX;

const styles = StyleSheet.create({
  /* Rows sit ~95 apart in the frame: a 68 picture and 27 between. */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 68 * scaleX,
    marginBottom: 27 * scaleX,
  },
  picture: {
    width: 68 * scaleX,
    height: 68 * scaleX,
    borderRadius: 6 * scaleX,
    borderWidth: 1,
    borderColor: '#f2f1f1',
    backgroundColor: '#f1f6fc',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  initial: {
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
  },
  /* Name 18 right of the picture, ~19 down; it wraps before the tick (x 306). */
  text: {
    flex: 1,
    marginLeft: 18 * scaleX,
    marginRight: 12 * scaleX,
    paddingTop: 17 * scaleX,
  },
  name: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  note: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#8e8888',
    marginTop: 4 * scaleX,
  },
  /* The squares 17 down from the picture's top; tick to cross 27 apart. */
  mark: { width: BOX_W, alignItems: 'flex-start', paddingTop: 17 * scaleX },
  issueMark: { marginLeft: 27 * scaleX },
  box: { width: BOX_W, height: BOX_H, alignItems: 'center', justifyContent: 'center' },
  goodOn: { backgroundColor: '#6fe36f' },
  goodOff: { backgroundColor: '#e8ecf3' },
  issueOn: { backgroundColor: '#f92424' },
  issueOff: { backgroundColor: 'rgba(100,131,176,0.15)' },
  caption: {
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#8e8888',
    marginTop: 4 * scaleX,
    width: 70 * scaleX,
  },
  issueCaption: { marginLeft: 3 * scaleX },
});
