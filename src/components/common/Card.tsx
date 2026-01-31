import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { spacing } from '../../theme/spacing';
import { isDesktop, isMobile, getShadowStyle, TRANSITION_DURATION } from '../../utils/responsive';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  marginBottom?: number;
  elevated?: boolean;
  interactive?: boolean;
  style?: any;
}

export default function Card({
  children,
  onPress,
  padding,
  marginBottom = spacing.md,
  elevated = true,
  interactive = false,
  style,
}: CardProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);

  const baseCardStyle: any = {
    backgroundColor: Platform.OS === 'web' 
      ? (theme === 'dark' ? 'rgba(26,26,29,0.8)' : 'rgba(255,255,255,0.9)')
      : themeColors.background,
    borderRadius: isDesktop ? 20 : 16,
    padding: padding || (isDesktop ? spacing.xl : spacing.lg),
    marginBottom,
    borderWidth: 1,
    borderColor: Platform.OS === 'web' 
      ? 'rgba(255,255,255,0.05)'
      : themeColors.border,
    ...(elevated && getShadowStyle(4)),
  };

  // Add web-specific styles
  if (Platform.OS === 'web') {
    if (elevated) {
      baseCardStyle.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    }
    baseCardStyle.backdropFilter = 'blur(10px)';
    baseCardStyle.WebkitBackdropFilter = 'blur(10px)';
    if (onPress) {
      baseCardStyle.cursor = 'pointer';
    }
    baseCardStyle.transition = `all ${TRANSITION_DURATION}ms ease`;
  }

  const dynamicStyles = StyleSheet.create({
    card: baseCardStyle,
  });

  // Web hover handlers
  const webHandlers = Platform.OS === 'web' && interactive && onPress ? {
    onMouseEnter: (e: any) => {
      if (e.currentTarget) {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px ${themeColors.primary}15`;
      }
    },
    onMouseLeave: (e: any) => {
      if (e.currentTarget) {
        e.currentTarget.style.transform = 'translateY(0px)';
        e.currentTarget.style.boxShadow = elevated ? '0 4px 20px rgba(0,0,0,0.3)' : '';
      }
    },
  } : {};

  if (onPress) {
    return (
      <TouchableOpacity
        style={[dynamicStyles.card, style]}
        onPress={onPress}
        activeOpacity={0.95}
        {...webHandlers}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[dynamicStyles.card, style]}>{children}</View>;
}
