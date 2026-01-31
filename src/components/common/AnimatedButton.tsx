import React from 'react';
import { Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { isDesktop, getShadowStyle } from '../../utils/responsive';
import { SPRING_CONFIG } from '../../utils/animations';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
}

export default function AnimatedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
}: AnimatedButtonProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  
  // Animation values
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const opacity = useSharedValue(disabled ? 0.5 : 1);

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

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    const scaleValue = interpolate(
      pressed.value,
      [0, 1],
      [1, 0.95],
      Extrapolate.CLAMP
    );

    const shadowOpacity = interpolate(
      pressed.value,
      [0, 1],
      [0.2, 0.1],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale: scaleValue }],
      opacity: opacity.value,
      shadowOpacity,
    };
  });

  // Press handlers
  const handlePressIn = () => {
    if (!disabled && !loading) {
      pressed.value = withSpring(1, SPRING_CONFIG.snappy);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      pressed.value = withSpring(0, SPRING_CONFIG.snappy);
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      // Haptic feedback on mobile
      if (Platform.OS !== 'web') {
        // You can add haptic feedback here if needed
      }
      onPress();
    }
  };

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
      width: fullWidth ? '100%' : 'auto',
      ...(variant === 'primary' && getShadowStyle(4)),
      ...(Platform.OS === 'web' ? {
        cursor: (disabled ? 'not-allowed' : 'pointer') as any,
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

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedTouchable
        style={dynamicStyles.button}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variantStyles.textColor}
          />
        ) : (
          <>
            {icon && <Text style={dynamicStyles.icon}>{icon}</Text>}
            <Text style={dynamicStyles.buttonText}>{title}</Text>
          </>
        )}
      </AnimatedTouchable>
    </Animated.View>
  );
}
