import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { typography, colors } from '../theme';
import { useDesignScale } from '../hooks/useDesignScale';

interface SearchInputProps {
  placeholder: string | { bold: string; normal: string };
  onSearch: (text: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  inputStyle?: object;
  placeholderStyle?: object;
  placeholderBoldStyle?: object;
  placeholderNormalStyle?: object;
  inputWrapperStyle?: object;
}

export default function SearchInput({
  placeholder,
  onSearch,
  value: controlledValue,
  onChangeText: controlledOnChangeText,
  inputStyle,
  placeholderStyle,
  placeholderBoldStyle,
  placeholderNormalStyle,
  inputWrapperStyle,
}: SearchInputProps) {
  const { scaleX, textMetrics } = useDesignScale();
  const styles = useMemo(() => buildSearchInputStyles(scaleX, textMetrics), [scaleX, textMetrics]);
  const [internalValue, setInternalValue] = useState('');

  const searchText = controlledValue !== undefined ? controlledValue : internalValue;
  const isControlled = controlledValue !== undefined;

  const handleSearchChange = (text: string) => {
    if (isControlled && controlledOnChangeText) {
      controlledOnChangeText(text);
    } else {
      setInternalValue(text);
    }
    onSearch(text);
  };

  const hasBoldParts = typeof placeholder === 'object' && 'bold' in placeholder && 'normal' in placeholder;

  return (
    <View style={[styles.searchInputContainer, inputWrapperStyle]}>
      <TextInput
        style={[styles.searchInput, inputStyle]}
        value={searchText}
        onChangeText={handleSearchChange}
        placeholder=""
        placeholderTextColor="transparent"
      />

      {searchText === '' && (
        <View style={styles.placeholderContainer} pointerEvents="none">
          {hasBoldParts ? (
            <Text style={[styles.placeholderText, placeholderStyle]}>
              <Text style={[styles.placeholderBold, placeholderBoldStyle]}>{placeholder.bold}</Text>
              <Text style={[styles.placeholderNormal, placeholderNormalStyle]}>{placeholder.normal}</Text>
            </Text>
          ) : (
            <Text style={[styles.placeholderText, styles.placeholderBold, placeholderStyle]}>
              {typeof placeholder === 'string' ? placeholder : String(placeholder ?? '')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function buildSearchInputStyles(
  scaleX: number,
  textMetrics: { includeFontPadding?: boolean },
) {
  return StyleSheet.create({
    searchInputContainer: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
    },
    searchInput: {
      fontSize: 13 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.light as any,
      color: colors.text.primary,
      paddingVertical: 0,
      includeFontPadding: false,
      textAlignVertical: 'center',
      height: 59 * scaleX,
      ...textMetrics,
    },
    placeholderContainer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 1,
    },
    placeholderText: {
      fontSize: 13 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.light as any,
      color: '#b1afaf',
      opacity: 0.36,
      ...textMetrics,
    },
    placeholderBold: {
      fontWeight: typography.fontWeights.semibold as any,
    },
    placeholderNormal: {
      fontWeight: typography.fontWeights.light as any,
    },
  });
}
