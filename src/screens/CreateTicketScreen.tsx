import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  PixelRatio,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { typography } from '../theme';
import {
  CREATE_TICKET_HEADER,
  CREATE_TICKET_CONTENT,
  DEPARTMENT_GRID,
  DEPARTMENT_GRID_LAYOUT,
  DEPARTMENT_NAME_TO_ICON,
  CREATE_TICKET_AI_BUTTON,
  CREATE_TICKET_AI_IMAGE,
  CREATE_TICKET_BETA_OVERLAP_AI_PX,
  CREATE_TICKET_BETA_TO_DESCRIPTION_PX,
  CREATE_TICKET_COLORS,
  CREATE_TICKET_TYPOGRAPHY,
  createTicketScaleX,
} from '../constants/createTicketStyles';
import { getDepartments } from '../services/departments';
import type { RootStackParamList } from '@app/navigation/types';

type CreateTicketScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateTicket'
>;

/** Display item for one department from Supabase with grid position and icon. */
interface DepartmentDisplayItem {
  id: string;
  name: string;
  icon: any;
  noTint: boolean;
  left: number;
  top: number;
  labelTop: number;
}

function buildCreateTicketStyles(windowWidth: number) {
  const scaleX = createTicketScaleX(windowWidth);
  const androidTextMetrics = Platform.select({
    android: { includeFontPadding: false } as const,
    default: {} as const,
  });
  const aiW = PixelRatio.roundToNearestPixel(CREATE_TICKET_AI_IMAGE.width * scaleX);
  const aiH = PixelRatio.roundToNearestPixel(CREATE_TICKET_AI_IMAGE.height * scaleX);
  const descriptionMaxWidth = Math.min(
    CREATE_TICKET_AI_BUTTON.description.width * scaleX,
    Math.max(0, windowWidth - PixelRatio.roundToNearestPixel(32)),
  );

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CREATE_TICKET_COLORS.background,
    },
    headerBackground: {
      position: 'absolute',
      top: CREATE_TICKET_HEADER.background.top * scaleX,
      left: 0,
      right: 0,
      height: CREATE_TICKET_HEADER.background.height * scaleX,
      backgroundColor: CREATE_TICKET_COLORS.headerBackground,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      minHeight: 900 * scaleX,
      paddingBottom: 100 * scaleX,
    },
    header: {
      height: CREATE_TICKET_HEADER.height * scaleX,
      position: 'relative',
    },
    backButtonContainer: {
      position: 'absolute',
      left: CREATE_TICKET_HEADER.backButton.left * scaleX,
      top: CREATE_TICKET_HEADER.backButton.top * scaleX,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 1,
    },
    backArrow: {
      width: 28 * scaleX,
      height: 28 * scaleX,
      tintColor: '#607AA1',
    },
    headerTitle: {
      fontSize: 24 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '700' as any,
      color: '#607AA1',
      lineHeight: undefined,
      marginLeft: 10 * scaleX,
      ...androidTextMetrics,
    },
    heading: {
      position: 'absolute',
      left: (windowWidth / 2) + (CREATE_TICKET_CONTENT.heading.leftOffset * scaleX),
      top: CREATE_TICKET_CONTENT.heading.top * scaleX,
      fontSize: CREATE_TICKET_TYPOGRAPHY.heading.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '700',
      color: CREATE_TICKET_TYPOGRAPHY.heading.color,
    },
    selectDepartmentLabel: {
      position: 'absolute',
      left: CREATE_TICKET_CONTENT.selectDepartmentLabel.left * scaleX,
      top: CREATE_TICKET_CONTENT.selectDepartmentLabel.top * scaleX,
      fontSize: CREATE_TICKET_TYPOGRAPHY.selectDepartmentLabel.fontSize * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: '300',
      color: CREATE_TICKET_TYPOGRAPHY.selectDepartmentLabel.color,
    },
    departmentLoading: {
      position: 'absolute',
      left: DEPARTMENT_GRID.container.left * scaleX,
      top: DEPARTMENT_GRID.container.top * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24 * scaleX,
    },
    departmentLoadingText: {
      marginTop: 8 * scaleX,
      fontSize: 14 * scaleX,
      color: CREATE_TICKET_COLORS.textSecondary,
    },
    departmentErrorText: {
      fontSize: 14 * scaleX,
      color: '#c00',
    },
    departmentContainer: {
      position: 'absolute',
    },
    departmentIcon: {
      position: 'absolute',
      width: 55.482 * scaleX,
      height: 55.482 * scaleX,
      borderRadius: DEPARTMENT_GRID.item.borderRadius * scaleX,
      aspectRatio: 55.48 / 55.48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    departmentIconImage: {
      width: (55.482 * 0.65) * scaleX,
      height: (55.482 * 0.65) * scaleX,
      aspectRatio: 55.48 / 55.48,
    },
    departmentLabel: {
      position: 'absolute',
      fontSize: CREATE_TICKET_TYPOGRAPHY.departmentLabel.fontSize * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: '300',
      color: CREATE_TICKET_TYPOGRAPHY.departmentLabel.color,
      textAlign: 'center',
    },
    aiButtonSection: {
      width: '100%',
      alignItems: 'center',
      paddingHorizontal: 24 * scaleX,
    },
    aiButtonWrapper: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 0,
    },
    aiButtonContainer: {
      width: aiW,
      height: aiH,
    },
    aiButtonImage: {
      width: aiW,
      height: aiH,
    },
    betaLabel: {
      fontSize: CREATE_TICKET_TYPOGRAPHY.betaLabel.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '700',
      color: CREATE_TICKET_TYPOGRAPHY.betaLabel.color,
      textAlign: 'center',
      marginTop: -CREATE_TICKET_BETA_OVERLAP_AI_PX * scaleX,
      marginBottom: CREATE_TICKET_BETA_TO_DESCRIPTION_PX * scaleX,
      ...androidTextMetrics,
    },
    description: {
      fontSize: CREATE_TICKET_TYPOGRAPHY.description.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: CREATE_TICKET_TYPOGRAPHY.description.color,
      textAlign: 'center',
      lineHeight:
        CREATE_TICKET_TYPOGRAPHY.description.lineHeight === 'normal'
          ? undefined
          : (CREATE_TICKET_TYPOGRAPHY.description.fontSize * 1.2) * scaleX,
      paddingHorizontal: 16 * scaleX,
      maxWidth: descriptionMaxWidth,
      alignSelf: 'center',
      ...androidTextMetrics,
    },
  });
}

export default function CreateTicketScreen() {
  const navigation = useNavigation<CreateTicketScreenNavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const scaleX = createTicketScaleX(windowWidth);
  const styles = useMemo(() => buildCreateTicketStyles(windowWidth), [windowWidth]);
  const [departments, setDepartments] = useState<DepartmentDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDepartments().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setDepartments([]);
        setLoading(false);
        return;
      }
      const layout = DEPARTMENT_GRID_LAYOUT;
      const items: DepartmentDisplayItem[] = (data ?? []).map((dept, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const left = layout.colLeft[col];
        const top = layout.rowTopStart + row * layout.rowGap;
        const labelTop = top + layout.labelOffset;
        const iconInfo = DEPARTMENT_NAME_TO_ICON[dept.name] ?? {
          icon: require('../../assets/icons/reception.png'),
          noTint: false,
        };
        return {
          id: dept.id,
          name: dept.name,
          icon: iconInfo.icon,
          noTint: !!iconInfo.noTint,
          left,
          top,
          labelTop,
        };
      });
      setDepartments(items);
      setLoadError(null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleDepartmentPress = (department: DepartmentDisplayItem) => {
    navigation.navigate('SelectTicketLocation', {
      departmentName: department.name,
    });
  };

  const handleAICreatePress = () => {
    // TODO: Implement AI ticket creation
    console.log('AI Create Ticket pressed');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBackground} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonContainer}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/icons/back-arrow.png')}
              style={styles.backArrow}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>{CREATE_TICKET_HEADER.title.text}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heading}>{CREATE_TICKET_CONTENT.heading.text}</Text>

        <Text style={styles.selectDepartmentLabel}>
          {CREATE_TICKET_CONTENT.selectDepartmentLabel.text}
        </Text>

        {loading ? (
          <View style={styles.departmentLoading}>
            <ActivityIndicator size="small" color={CREATE_TICKET_COLORS.textSecondary} />
          </View>
        ) : loadError ? (
          <View style={styles.departmentLoading}>
            <Text style={styles.departmentErrorText}>{loadError}</Text>
          </View>
        ) : (
          departments.map((department) => (
            <View key={department.id} style={styles.departmentContainer}>
              <TouchableOpacity
                style={[
                  styles.departmentIcon,
                  {
                    left: department.left * scaleX,
                    top: department.top * scaleX,
                    backgroundColor: CREATE_TICKET_COLORS.departmentIconBg,
                  },
                ]}
                onPress={() => handleDepartmentPress(department)}
                activeOpacity={0.7}
              >
                <Image
                  source={department.icon}
                  style={[
                    styles.departmentIconImage,
                    department.noTint ? {} : { tintColor: '#F92424' },
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.departmentLabel,
                  {
                    left: (department.left + DEPARTMENT_GRID_LAYOUT.iconSize / 2 - DEPARTMENT_GRID_LAYOUT.maxLabelWidth / 2) * scaleX,
                    top: department.labelTop * scaleX,
                    width: DEPARTMENT_GRID_LAYOUT.maxLabelWidth * scaleX,
                  },
                ]}
                numberOfLines={2}
              >
                {department.name}
              </Text>
            </View>
          ))
        )}

        <View style={[styles.aiButtonSection, { marginTop: CREATE_TICKET_AI_BUTTON.container.top * scaleX }]}>
          <View style={styles.aiButtonWrapper}>
            <TouchableOpacity
              style={styles.aiButtonContainer}
              onPress={handleAICreatePress}
              activeOpacity={0.7}
            >
              <Image
                source={CREATE_TICKET_AI_IMAGE.source}
                style={styles.aiButtonImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.betaLabel} maxFontSizeMultiplier={1.35}>
            {CREATE_TICKET_AI_BUTTON.betaLabel.text}
          </Text>

          <Text style={styles.description} maxFontSizeMultiplier={1.35}>
            {CREATE_TICKET_AI_BUTTON.description.text}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
