import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, ScrollView } from 'react-native';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { isMobile } from '../utils/responsive';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  style?: any;
}

export default function DatePicker({ value, onChange, style }: DatePickerProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(value);
    setShowPicker(false);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      paddingVertical: 2,
      paddingHorizontal: spacing.md,
      minHeight: 28,
      justifyContent: 'center',
    },
    dateText: {
      ...typography.body,
      color: themeColors.text,
      fontSize: isMobile ? 12 : 14,
      lineHeight: isMobile ? 16 : 18,
    },
    icon: {
      ...typography.body,
      color: themeColors.primary,
      marginRight: spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: themeColors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: spacing.lg,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      ...typography.h4,
      color: themeColors.text,
      fontWeight: '600',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    button: {
      flex: 1,
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    confirmButton: {
      backgroundColor: themeColors.primary,
    },
    buttonText: {
      ...typography.body,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: themeColors.text,
    },
    confirmButtonText: {
      color: themeColors.background,
    },
    dateGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    dateButton: {
      width: '13%',
      aspectRatio: 1,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    dateButtonSelected: {
      backgroundColor: themeColors.primary,
      borderColor: themeColors.primary,
    },
    dateButtonText: {
      ...typography.caption,
      color: themeColors.text,
    },
    dateButtonTextSelected: {
      color: themeColors.background,
      fontWeight: '700',
    },
    monthSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    monthText: {
      ...typography.h4,
      color: themeColors.text,
      fontWeight: '600',
    },
    navButton: {
      padding: spacing.sm,
      borderRadius: 8,
      backgroundColor: themeColors.surface,
    },
    navButtonText: {
      ...typography.body,
      color: themeColors.primary,
      fontWeight: '700',
      fontSize: 20,
    },
  });

  // For web, use native date input
  if (Platform.OS === 'web') {
    return (
      <View style={[dynamicStyles.container, style]}>
        {/* @ts-ignore - React Native Web supports input elements */}
        <input
          type="date"
          value={format(value, 'yyyy-MM-dd')}
          onChange={(e: any) => {
            if (e.target.value) {
              onChange(new Date(e.target.value));
            }
          }}
          style={{
            backgroundColor: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            padding: `${spacing.md}px`,
            color: themeColors.text,
            fontSize: '16px',
            minHeight: '50px',
            width: '100%',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </View>
    );
  }

  // For mobile, show a simple date selector
  const monthStart = startOfMonth(tempDate);
  const monthEnd = endOfMonth(tempDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(tempDate, 30)
      : addDays(tempDate, 30);
    setTempDate(newDate);
  };

  return (
    <>
      <TouchableOpacity
        style={[dynamicStyles.container, style]}
        onPress={() => {
          setTempDate(value);
          setShowPicker(true);
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={dynamicStyles.icon}>📅</Text>
          <Text style={dynamicStyles.dateText}>{format(value, 'dd/MM/yyyy')}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <TouchableOpacity
          style={dynamicStyles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Seleccionar Fecha</Text>
            </View>

            <View style={dynamicStyles.monthSelector}>
              <TouchableOpacity
                style={dynamicStyles.navButton}
                onPress={() => changeMonth('prev')}
              >
                <Text style={dynamicStyles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={dynamicStyles.monthText}>
                {format(tempDate, 'MMMM yyyy')}
              </Text>
              <TouchableOpacity
                style={dynamicStyles.navButton}
                onPress={() => changeMonth('next')}
              >
                <Text style={dynamicStyles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={dynamicStyles.dateGrid}>
                {daysInMonth.map((day) => {
                  const isSelected = isSameDay(day, tempDate);
                  return (
                    <TouchableOpacity
                      key={day.toISOString()}
                      style={[
                        dynamicStyles.dateButton,
                        isSelected && dynamicStyles.dateButtonSelected,
                      ]}
                      onPress={() => setTempDate(day)}
                    >
                      <Text
                        style={[
                          dynamicStyles.dateButtonText,
                          isSelected && dynamicStyles.dateButtonTextSelected,
                        ]}
                      >
                        {format(day, 'd')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={dynamicStyles.buttonRow}>
              <TouchableOpacity
                style={[dynamicStyles.button, dynamicStyles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={[dynamicStyles.buttonText, dynamicStyles.cancelButtonText]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dynamicStyles.button, dynamicStyles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={[dynamicStyles.buttonText, dynamicStyles.confirmButtonText]}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
