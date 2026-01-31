import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { useCreditCards } from '../hooks/useCreditCards';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { isMobile } from '../utils/responsive';

interface CreditCardPickerProps {
  value: string | null;
  onChange: (cardId: string | null) => void;
  style?: any;
  placeholder?: string;
}

export default function CreditCardPicker({
  value,
  onChange,
  style,
  placeholder = 'Seleccionar tarjeta',
}: CreditCardPickerProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const [showPicker, setShowPicker] = React.useState(false);
  const { activeCards } = useCreditCards();

  const selectedCard = activeCards.find(card => card.id === value);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      paddingVertical: 4,
      paddingHorizontal: spacing.md,
      minHeight: 32,
      justifyContent: 'center',
    },
    text: {
      ...typography.body,
      color: themeColors.text,
    },
    placeholder: {
      ...typography.body,
      color: themeColors.textSecondary,
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
    closeButton: {
      padding: spacing.sm,
    },
    closeButtonText: {
      ...typography.body,
      color: themeColors.primary,
      fontWeight: '600',
    },
    cardItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: themeColors.surface,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    cardInfo: {
      flex: 1,
    },
    cardName: {
      ...typography.body,
      color: themeColors.text,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    cardDetails: {
      ...typography.caption,
      color: themeColors.textSecondary,
    },
    noneButton: {
      padding: spacing.md,
      backgroundColor: themeColors.surface,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: themeColors.border,
      alignItems: 'center',
    },
    noneButtonText: {
      ...typography.body,
      color: themeColors.textSecondary,
    },
  });

  return (
    <>
      <TouchableOpacity
        style={[dynamicStyles.container, style]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {selectedCard && (
            <View
              style={{
                width: 4,
                height: 40,
                backgroundColor: selectedCard.color || themeColors.primary,
                borderRadius: 2,
                marginRight: spacing.md,
              }}
            />
          )}
          <Text style={dynamicStyles.icon}>💳</Text>
          {selectedCard ? (
            <View style={{ flex: 1 }}>
              <Text style={dynamicStyles.text}>
                {selectedCard.name} •••• {selectedCard.last4Digits}
              </Text>
              <Text style={dynamicStyles.cardDetails}>
                {selectedCard.bank}
              </Text>
            </View>
          ) : (
            <Text style={dynamicStyles.placeholder}>{placeholder}</Text>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={dynamicStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Seleccionar Tarjeta</Text>
              <TouchableOpacity
                style={dynamicStyles.closeButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={dynamicStyles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={dynamicStyles.noneButton}
              onPress={() => {
                onChange(null);
                setShowPicker(false);
              }}
            >
              <Text style={dynamicStyles.noneButtonText}>Ninguna</Text>
            </TouchableOpacity>

            <FlatList
              data={activeCards}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={dynamicStyles.cardItem}
                  onPress={() => {
                    onChange(item.id);
                    setShowPicker(false);
                  }}
                >
                  <View
                    style={{
                      width: 4,
                      height: '100%',
                      backgroundColor: item.color || themeColors.primary,
                      borderRadius: 2,
                      marginRight: spacing.md,
                    }}
                  />
                  <View style={dynamicStyles.cardInfo}>
                    <Text style={dynamicStyles.cardName}>
                      {item.name} •••• {item.last4Digits}
                    </Text>
                    <Text style={dynamicStyles.cardDetails}>
                      {item.bank} | Disponible: ${item.availableCredit.toLocaleString('es-MX')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: spacing.md, alignItems: 'center' }}>
                  <Text style={dynamicStyles.placeholder}>
                    No hay tarjetas registradas
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
