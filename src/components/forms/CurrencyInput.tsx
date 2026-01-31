import React, { useState, useRef, useEffect } from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { isMobile } from '../../utils/responsive';

interface CurrencyInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: any;
}

export default function CurrencyInput({
  value,
  onChangeText,
  placeholder = '0.00',
  style,
}: CurrencyInputProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const cursorPositionRef = useRef(0);

  // Only format on blur, not while typing
  useEffect(() => {
    if (!value || value === '0' || value === '') {
      setDisplayValue('');
    } else {
      // Keep raw value while typing
      setDisplayValue(value);
    }
  }, [value]);

  const handleChange = (text: string) => {
    // Remove all non-numeric characters except decimal point
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }

    // Update numeric value (for parent component) - keep raw value
    const numericValue = cleaned === '' || cleaned === '.' ? '0' : cleaned;
    onChangeText(numericValue);
    setDisplayValue(cleaned);
  };

  const handleBlur = () => {
    // Format value when blurred
    if (value && value !== '0' && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
      const numValue = parseFloat(value);
      const formatted = new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue);
      setDisplayValue(formatted);
    } else {
      setDisplayValue('');
    }
  };

  return (
    <View style={[styles.container, style, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      <Text style={[styles.currencySymbol, { color: themeColors.textSecondary }]}>$</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: themeColors.text }]}
        value={displayValue}
        onChangeText={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={themeColors.textSecondary}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: 32,
  },
  currencySymbol: {
    ...typography.body,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: 4,
  },
});
