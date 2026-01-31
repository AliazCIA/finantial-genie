import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { isDesktop } from '../../utils/responsive';

interface QuickAddButtonProps {
  onPress: () => void;
}

export default function QuickAddButton({ onPress }: QuickAddButtonProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    if (Platform.OS === 'web' && isDesktop) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS === 'web' && isDesktop) {
      setIsHovered(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.sm,
      borderRadius: 20,
      backgroundColor: themeColors.primary,
      minWidth: 40,
      height: 40,
      ...(Platform.OS === 'web' && {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }),
      ...(isHovered && Platform.OS === 'web' && {
        paddingHorizontal: spacing.md,
        minWidth: 'auto',
      }),
    },
    expandedButton: {
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      minWidth: 'auto',
    },
    icon: {
      fontSize: 20,
      color: themeColors.background,
    },
    text: {
      ...typography.bodySmall,
      color: themeColors.background,
      marginLeft: spacing.xs,
      fontWeight: '600',
      ...(Platform.OS === 'web' && isDesktop && {
        opacity: isHovered ? 1 : 0,
        width: isHovered ? 'auto' : 0,
        transition: 'all 0.2s ease',
        overflow: 'hidden',
      }),
    },
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={dynamicStyles.button}
      activeOpacity={0.7}
      {...(Platform.OS === 'web' && isDesktop ? {
        // @ts-ignore - web-specific props
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      } : {})}
    >
      <Text style={dynamicStyles.icon}>➕</Text>
      {(isHovered || Platform.OS !== 'web' || !isDesktop) && (
        <Text style={dynamicStyles.text}>Captura Rápida</Text>
      )}
    </TouchableOpacity>
  );
}
