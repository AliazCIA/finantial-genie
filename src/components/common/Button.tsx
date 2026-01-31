import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { isDesktop, getShadowStyle, TRANSITION_DURATION } from '../../utils/responsive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  style?: any;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: typography.bodySmall.fontSize,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          fontSize: typography.h4.fontSize,
        };
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          fontSize: typography.button.fontSize,
        };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: themeColors.secondary,
          borderColor: themeColors.secondary,
          textColor: themeColors.background,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: themeColors.primary,
          textColor: themeColors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: themeColors.primary,
        };
      default:
        return {
          backgroundColor: themeColors.primary,
          borderColor: themeColors.primary,
          textColor: themeColors.background,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  const dynamicStyles = StyleSheet.create({
    button: {
      backgroundColor: variantStyles.backgroundColor,
      borderWidth: variant === 'outline' ? 2 : 0,
      borderColor: variantStyles.borderColor,
      borderRadius: isDesktop ? 12 : 10,
      paddingVertical: sizeStyles.paddingVertical,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      minHeight: size === 'large' ? 56 : size === 'small' ? 36 : 44,
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      ...(variant === 'primary' && getShadowStyle(2)),
      ...(Platform.OS === 'web' ? {
        cursor: (disabled ? 'not-allowed' : 'pointer') as any,
        transition: `all ${TRANSITION_DURATION}ms ease` as any,
        userSelect: 'none' as any,
      } : {}),
    },
    buttonText: {
      ...typography.button,
      fontSize: sizeStyles.fontSize,
      color: variantStyles.textColor,
      fontWeight: '600',
      marginLeft: icon ? spacing.sm : 0,
    },
    icon: {
      fontSize: sizeStyles.fontSize + 4,
    },
  });

  // Web hover handlers
  const webHandlers = Platform.OS === 'web' && !disabled ? {
    onMouseEnter: (e: any) => {
      if (e.currentTarget) {
        e.currentTarget.style.backgroundColor = 
          variant === 'primary' ? themeColors.primaryDark : 
          variant === 'secondary' ? themeColors.secondaryDark :
          variant === 'outline' ? themeColors.primary + '10' :
          themeColors.primary + '10';
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = `0 4px 12px ${themeColors.primary}30`;
        }
      }
    },
    onMouseLeave: (e: any) => {
      if (e.currentTarget) {
        e.currentTarget.style.backgroundColor = variantStyles.backgroundColor;
        e.currentTarget.style.transform = 'translateY(0px)';
        e.currentTarget.style.boxShadow = '';
      }
    },
  } : {};

  return (
    <TouchableOpacity
      style={[dynamicStyles.button, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...(Platform.OS === 'web' ? webHandlers : {})}
    >
      {loading ? (
        <>
          <ActivityIndicator
            size="small"
            color={variantStyles.textColor}
            style={{ marginRight: 8 }}
          />
          <Text style={dynamicStyles.buttonText}>{title}</Text>
        </>
      ) : (
        <>
          {icon && <Text style={dynamicStyles.icon}>{icon}</Text>}
          <Text style={dynamicStyles.buttonText}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
