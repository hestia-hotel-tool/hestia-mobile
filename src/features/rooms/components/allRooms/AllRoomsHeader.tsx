import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors, typography } from '@shared/theme';
import { HOME_HEADER_HEIGHT_DESIGN_PX } from '@features/home';
import { scaleX } from '../../constants/allRoomsStyles';
import { AMPMToggle } from '@features/home';
import SearchInput from '@shared/ui/SearchInput';
import type { ShiftType } from '@features/home';

interface AllRoomsHeaderProps {
  selectedShift: ShiftType;
  onShiftToggle: (shift: ShiftType) => void;
  onSearch: (text: string) => void;
  searchQuery?: string; // Controlled search value
  onFilterPress?: () => void; // Optional - filter handler
  onBackPress?: () => void; // Optional - navigation handler
  searchPlaceholder?: string | { bold: string; normal: string }; // Optional dynamic placeholder
  showFilterModal?: boolean; // Whether filter modal is open
}

export default function AllRoomsHeader({
  selectedShift,
  onShiftToggle,
  onSearch,
  searchQuery = '',
  onFilterPress,
  onBackPress,
  searchPlaceholder = { bold: 'Search ', normal: 'by room number, guest name' },
  showFilterModal = false,
}: AllRoomsHeaderProps) {

  return (
    <View style={[
      styles.container, 
      showFilterModal && styles.containerModalOpen,
      selectedShift === 'PM' && styles.containerPM
    ]}>
      {/* Blue gradient background - white when filter modal is open */}
      <View style={[
        styles.headerBackground, 
        showFilterModal && styles.headerBackgroundWhite,
        selectedShift === 'PM' && styles.headerBackgroundPM,
        selectedShift === 'PM' && showFilterModal && styles.headerBackgroundPMModal
      ]} />
      
      {/* Top section with back button, title, and AM/PM toggle */}
      <View style={styles.topSection}>
        {/* Back arrow - always visible as per Figma design */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBackPress || (() => {})} 
          activeOpacity={0.7}
        >
            <Image
              source={require('../../../../../assets/icons/back-arrow.png')}
              style={[
                styles.backArrow,
                selectedShift === 'PM' && styles.backArrowPM
              ]}
              resizeMode="contain"
              tintColor={selectedShift === 'PM' ? colors.text.white : "#5A759D"}
            />
          </TouchableOpacity>
        
        <Text style={[
          styles.title,
          selectedShift === 'PM' && styles.titlePM
        ]}>
          All Rooms
        </Text>
        
        <View style={styles.toggleContainer}>
          <AMPMToggle
            selected={selectedShift}
            onToggle={onShiftToggle}
          />
        </View>
      </View>
      
      {/* Search bar section - hidden when filter modal is open */}
      {!showFilterModal && (
        <View style={styles.searchSection}>
          <View style={[
            styles.searchBar,
            selectedShift === 'PM' && styles.searchBarPM
          ]}>
            <TouchableOpacity
              style={styles.searchIconButton}
              onPress={() => {/* Search action */}}
              activeOpacity={0.7}
            >
              <Image
                source={require('../../../../../assets/icons/search-icon.png')}
                style={[
                  styles.searchIcon,
                  selectedShift === 'PM' && styles.searchIconPM
                ]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <SearchInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChangeText={onSearch}
              onSearch={onSearch}
              inputStyle={[
                styles.searchInput,
                selectedShift === 'PM' && styles.searchInputPM
              ]}
              placeholderStyle={[
                styles.placeholderText,
                selectedShift === 'PM' && styles.placeholderTextPM
              ]}
              placeholderBoldStyle={[
                styles.placeholderBold,
                selectedShift === 'PM' && styles.placeholderBoldPM
              ]}
              placeholderNormalStyle={[
                styles.placeholderNormal,
                selectedShift === 'PM' && styles.placeholderNormalPM
              ]}
              inputWrapperStyle={styles.searchInputContainer}
            />
          </View>
          {onFilterPress && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={onFilterPress}
              activeOpacity={0.7}
            >
              <Image
                source={require('../../../../../assets/icons/menu-icon.png')}
                style={[
                  styles.filterIcon,
                  selectedShift === 'PM' && styles.filterIconPM
                ]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 217 * scaleX, // Full height with search bar
    zIndex: 10,
  },
  containerModalOpen: {
    height: HOME_HEADER_HEIGHT_DESIGN_PX * scaleX, // Match HomeScreen header when modal is open
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 133 * scaleX,
    backgroundColor: '#e4eefe', // Light blue background
  },
  headerBackgroundWhite: {
    backgroundColor: '#FFF', // White when filter modal is open
    height: HOME_HEADER_HEIGHT_DESIGN_PX * scaleX, // Match HomeScreen header when modal is open
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 27 * scaleX,
    paddingTop: 69 * scaleX,
    height: 133 * scaleX,
  },
  backButton: {
    position: 'absolute',
    left: 27 * scaleX,
    top: 69 * scaleX,
    width: 14 * scaleX, // Figma: 14px width
    height: 28 * scaleX, // Figma: 28px height
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 14 * scaleX, // Figma: 14px × 28px
    height: 28 * scaleX,
    // No rotation - using back-arrow.png directly as it already points left
  },
  title: {
    fontSize: 24 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700' as any,
    fontStyle: 'normal',
    color: '#607AA1',
    lineHeight: undefined, // normal line height
    position: 'absolute',
    left: 69 * scaleX, // Figma: 69px (27px arrow start + 14px arrow width + 28px gap = 69px)
    top: 69 * scaleX,
  },
  toggleContainer: {
    position: 'absolute',
    right: 32.5 * scaleX,
    top: 65 * scaleX,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15 * scaleX,
    marginTop: 25 * scaleX,
  },
  searchBar: {
    height: 59 * scaleX,
    width: 347 * scaleX,
    backgroundColor: '#F1F6FC',
    borderRadius: 82 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20 * scaleX,
  },
  searchBarPM: {
    backgroundColor: '#F1F6FC',
  },
  searchInputContainer: {
    height: '100%',
  },
  searchInput: {
    fontFamily: 'Inter',
    fontWeight: '300' as any,
    padding: 0,
    height: '100%',
    backgroundColor: 'transparent',
  },
  searchInputPM: {
    color: '#000000',
  },
  placeholderText: {
    fontFamily: 'Inter',
    color: 'rgba(0,0,0,0.6)',
    includeFontPadding: false,
  },
  placeholderTextPM: {
    color: 'rgba(0,0,0,0.6)',
  },
  placeholderBold: {
    fontWeight: '700' as any, // Bold for "Search"
  },
  placeholderBoldPM: {
    color: 'rgba(0,0,0,0.6)',
  },
  placeholderNormal: {
    fontWeight: '400' as any, // Regular for rest of text
  },
  placeholderNormalPM: {
    color: 'rgba(0,0,0,0.6)',
  },
  searchIconButton: {
    width: 26 * scaleX,
    height: 26 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10 * scaleX,
  },
  searchIcon: {
    width: 19 * scaleX,
    height: 19 * scaleX,
    tintColor: colors.primary.main,
  },
  searchIconPM: {
    tintColor: colors.primary.main,
  },
  filterButton: {
    width: 40 * scaleX, // Increased touch target for easier clicking
    height: 40 * scaleX, // Increased touch target for easier clicking
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 18 * scaleX, // Gap between search bar and filter icon
    padding: 8 * scaleX, // Add padding for better touch area
  },
  filterIcon: {
    width: 32 * scaleX, // Increased from 26px for better visibility (and fixed to use scaleX)
    height: 16 * scaleX, // Increased from 12px for better visibility (maintaining aspect ratio)
    tintColor: colors.primary.main,
  },
  filterIconPM: {
    tintColor: colors.primary.main,
  },
  containerPM: {
    // Container already has dark background via headerBackgroundPM
  },
  headerBackgroundPM: {
    backgroundColor: '#38414F', // Dark slate gray for PM mode
  },
  headerBackgroundPMModal: {
    height: HOME_HEADER_HEIGHT_DESIGN_PX * scaleX, // Match HomeScreen header when modal is open
  },
  titlePM: {
    color: colors.text.white,
  },
  backArrowPM: {
    // Tint color handled inline
  },
});

