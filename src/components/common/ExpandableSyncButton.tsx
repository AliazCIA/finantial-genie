import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { useSync } from '../../hooks/useSync';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { isDesktop } from '../../utils/responsive';

interface ExpandableSyncButtonProps {
  // Sin props, solo sincronización
}

export default function ExpandableSyncButton() {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const { isConnected, pendingChanges, sync, isSyncing } = useSync();
  const [isExpanded, setIsExpanded] = useState(false);
  const mouseLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePress = () => {
    if (Platform.OS === 'web' && isDesktop) {
      // En desktop, solo expandir con hover, no con clic
      return;
    }
    // En móvil, expandir con clic
    setIsExpanded(!isExpanded);
  };

  const handleSyncPress = () => {
    sync();
    if (Platform.OS !== 'web' || !isDesktop) {
      setIsExpanded(false);
    }
  };

  const handleMouseEnter = (e: any) => {
    if (Platform.OS === 'web' && isDesktop) {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = (e: any) => {
    if (Platform.OS === 'web' && isDesktop) {
      // Pequeño delay para evitar que se cierre al mover el mouse hacia el contenido
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
      }
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 300);
    }
  };

  const handleContentMouseEnter = () => {
    if (Platform.OS === 'web' && isDesktop && mouseLeaveTimeoutRef.current) {
      clearTimeout(mouseLeaveTimeoutRef.current);
    }
  };



  const dynamicStyles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      zIndex: 100,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xs,
      borderRadius: 20,
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      minWidth: 32,
      height: 32,
      ...(Platform.OS === 'web' && {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }),
    },
    expandedButton: {
      borderRadius: 12,
      paddingHorizontal: spacing.sm,
      minWidth: 'auto',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isConnected ? '#4caf50' : '#f44336',
    },
    expandedText: {
      ...typography.bodySmall,
      color: themeColors.text,
      marginLeft: spacing.xs,
      fontWeight: '600',
      fontSize: 12,
    },
  });

  return (
    <View 
      style={dynamicStyles.container}
      {...(Platform.OS === 'web' && isDesktop ? {
        // @ts-ignore - web-specific props
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      } : {})}
    >
      <TouchableOpacity
        onPress={Platform.OS === 'web' && isDesktop ? handleSyncPress : handlePress}
        style={[
          dynamicStyles.button,
          isExpanded && dynamicStyles.expandedButton,
        ]}
        activeOpacity={0.7}
      >
        <View style={dynamicStyles.statusDot} />
        {isExpanded && (
          <Text style={dynamicStyles.expandedText}>
            Sincronizar
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
