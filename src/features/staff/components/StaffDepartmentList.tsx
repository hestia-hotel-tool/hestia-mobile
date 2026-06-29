import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '@shared/theme';
import { scaleX, STAFF_DEPARTMENT_LIST } from '../constants/staffStyles';
import type { DepartmentRowPosition } from './StaffDepartmentStaffPanel';

export type StaffDepartmentId =
  | 'engineering'
  | 'hskPortier'
  | 'inRoomDining'
  | 'laundry'
  | 'concierge'
  | 'reception'
  | 'it';

export interface StaffDepartmentItem {
  id: StaffDepartmentId;
  name: string;
  icon: any;
}

export const STAFF_DEPARTMENTS_LIST: StaffDepartmentItem[] = [
  { id: 'engineering', name: 'Engineering', icon: require('../../../../assets/icons/engineering.png') },
  { id: 'hskPortier', name: 'HSK Portier', icon: require('../../../../assets/icons/hsk-portier.png') },
  { id: 'inRoomDining', name: 'In Room Dining', icon: require('../../../../assets/icons/in-room-dining-icon.png') },
  { id: 'laundry', name: 'Laundry', icon: require('../../../../assets/icons/laundry-icon.png') },
  { id: 'concierge', name: 'Concierge', icon: require('../../../../assets/icons/concierge.png') },
  { id: 'reception', name: 'Reception', icon: require('../../../../assets/icons/reception.png') },
  { id: 'it', name: 'IT', icon: require('../../../../assets/icons/it.png') },
];

const DEPARTMENTS = STAFF_DEPARTMENTS_LIST;

interface StaffDepartmentListProps {
  activeDepartmentId?: StaffDepartmentId | null;
  onDepartmentPress?: (department: StaffDepartmentItem, rowPosition: DepartmentRowPosition) => void;
}

export default function StaffDepartmentList({ activeDepartmentId = null, onDepartmentPress }: StaffDepartmentListProps) {
  return (
    <View style={styles.container}>
      {DEPARTMENTS.map((dept) => (
        <DepartmentRow
          key={dept.id}
          department={dept}
          isActive={dept.id === activeDepartmentId}
          onPress={onDepartmentPress}
        />
      ))}
    </View>
  );
}

function DepartmentRow({
  department,
  isActive,
  onPress,
}: {
  department: StaffDepartmentItem;
  isActive: boolean;
  onPress?: (department: StaffDepartmentItem, rowPosition: DepartmentRowPosition) => void;
}) {
  const rowRef = useRef<View>(null);
  const labelRef = useRef<View>(null);

  const handlePress = () => {
    if (!onPress) return;
    rowRef.current?.measureInWindow((x, y, width, height) => {
      const position: DepartmentRowPosition = { x, y, width, height };
      const trySend = () => onPress(department, position);
      if (labelRef.current) {
        labelRef.current.measureInWindow((nx, ny, nw, nh) => {
          position.namePosition = { x: nx, y: ny, width: nw, height: nh };
          trySend();
        });
      } else {
        trySend();
      }
    });
  };

  const iconWidth = STAFF_DEPARTMENT_LIST.icon.width * scaleX;
  const iconHeight = STAFF_DEPARTMENT_LIST.icon.height * scaleX;
  const borderRadius = STAFF_DEPARTMENT_LIST.icon.borderRadius * scaleX;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={styles.item}
    >
      <View ref={rowRef} style={styles.itemInner} collapsable={false}>
        <View style={[
          styles.iconWrap,
          {
            width: iconWidth,
            height: iconHeight,
            aspectRatio: STAFF_DEPARTMENT_LIST.icon.aspectRatio,
            borderRadius,
          },
        ]}>
          <Image
            source={department.icon}
            style={[
              styles.iconImage,
              { width: iconWidth * 0.55, height: iconHeight * 0.55 },
              (department.id === 'hskPortier' || department.id === 'inRoomDining') ? {} : { tintColor: '#F92424' },
            ]}
            resizeMode="contain"
          />
        </View>
        <View ref={labelRef} style={styles.labelWrap} collapsable={false}>
          <Text
            style={[styles.label, isActive && styles.labelActive, { textAlign: STAFF_DEPARTMENT_LIST.label.textAlign as 'left' | 'center' | 'right' | 'auto' | 'justify' }]}
            numberOfLines={2}
          >
            {department.name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: STAFF_DEPARTMENT_LIST.container.paddingHorizontal * scaleX,
    paddingTop: STAFF_DEPARTMENT_LIST.container.paddingTop * scaleX,
    paddingBottom: STAFF_DEPARTMENT_LIST.container.paddingBottom * scaleX,
  },
  item: {
    marginBottom: STAFF_DEPARTMENT_LIST.item.marginBottom * scaleX,
    alignItems: STAFF_DEPARTMENT_LIST.item.alignItems,
  },
  itemInner: {
    alignItems: 'flex-start',
  },
  iconWrap: {
    backgroundColor: STAFF_DEPARTMENT_LIST.icon.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {},
  labelWrap: {
    alignItems: 'flex-start',
  },
  label: {
    fontSize: STAFF_DEPARTMENT_LIST.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: typography.fontWeights.light as any,
    color: STAFF_DEPARTMENT_LIST.label.color,
    marginTop: STAFF_DEPARTMENT_LIST.label.marginTop * scaleX,
    maxWidth: 120 * scaleX,
  },
  labelActive: {
    color: STAFF_DEPARTMENT_LIST.labelActive.color,
    fontFamily: STAFF_DEPARTMENT_LIST.labelActive.fontFamily,
    fontSize: STAFF_DEPARTMENT_LIST.labelActive.fontSize * scaleX,
    fontStyle: STAFF_DEPARTMENT_LIST.labelActive.fontStyle,
    fontWeight: typography.fontWeights.semibold as any,
  },
});
