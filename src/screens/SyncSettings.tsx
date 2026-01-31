import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../hooks/useSync';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { isDesktop } from '../utils/responsive';

export default function SyncSettings() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const { isAuthenticated, requiresAuth } = useAuth();
  const { sync, initialSync, configureServer, isSyncing, isConnected, pendingChanges, serverUrl } = useSync();
  const [inputUrl, setInputUrl] = useState(serverUrl || 'http://localhost:3001');
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (serverUrl) {
      setInputUrl(serverUrl);
    }
  }, [serverUrl]);

  const handleSaveUrl = async () => {
    configureServer(inputUrl);
  };

  const checkAuthAndSync = async () => {
    // If server is configured and user is not authenticated, show login
    if (requiresAuth && !isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    await sync(inputUrl);
  };

  const checkAuthAndInitialSync = async () => {
    // If server is configured and user is not authenticated, show login
    if (requiresAuth && !isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    await initialSync(inputUrl);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    content: {
      padding: isDesktop ? spacing.xl : spacing.md,
      maxWidth: isDesktop ? 800 : undefined,
      alignSelf: isDesktop ? 'center' : 'stretch',
    },
    title: {
      ...typography.h1,
      color: themeColors.primary,
      marginBottom: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h3,
      color: themeColors.text,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      padding: spacing.md,
      color: themeColors.text,
      marginBottom: spacing.sm,
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      lineHeight: typography.body.lineHeight,
      ...(Platform.OS === 'web' && {
        outlineStyle: 'none' as any,
      }),
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.sm,
    },
    statusText: {
      ...typography.body,
      color: themeColors.text,
    },
    infoText: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      marginTop: spacing.xs,
    },
  });

  return (
    <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.content}>
      <Text style={dynamicStyles.title}>Configuración de Sincronización</Text>

      <Card padding={isDesktop ? spacing.xl : spacing.lg} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>Servidor</Text>
        <TextInput
          style={dynamicStyles.input}
          value={inputUrl}
          onChangeText={setInputUrl}
          placeholder="http://localhost:3001"
          placeholderTextColor={themeColors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          title="Guardar URL"
          onPress={handleSaveUrl}
          variant="primary"
          fullWidth
        />
        <Text style={dynamicStyles.infoText}>
          URL del servidor local donde se almacenan los datos. Ejemplo: http://192.168.1.100:3001
        </Text>
      </Card>

      <Card padding={isDesktop ? spacing.xl : spacing.lg} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>Estado</Text>
        <View style={dynamicStyles.statusRow}>
          <View
            style={[
              dynamicStyles.statusIndicator,
              { backgroundColor: isConnected ? '#4caf50' : '#f44336' },
            ]}
          />
          <Text style={dynamicStyles.statusText}>
            {isConnected ? 'Conectado al servidor' : 'Desconectado'}
          </Text>
        </View>
        <View style={dynamicStyles.statusRow}>
          <Text style={dynamicStyles.statusText}>
            Cambios pendientes: {pendingChanges}
          </Text>
        </View>
      </Card>

      <Card padding={isDesktop ? spacing.xl : spacing.lg} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>Sincronización</Text>
        {requiresAuth && !isAuthenticated && (
          <Card style={{ marginBottom: spacing.md, backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <Text style={{ ...typography.bodySmall, color: themeColors.text }}>
              ⚠️ Debes iniciar sesión para sincronizar tus datos con el servidor.
            </Text>
          </Card>
        )}
        <Button
          title={isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          onPress={checkAuthAndSync}
          disabled={isSyncing || !isConnected}
          variant="primary"
          fullWidth
          loading={isSyncing}
        />
        <View style={{ marginTop: spacing.md }}>
          <Button
            title="Sincronización inicial (descargar todo)"
            onPress={checkAuthAndInitialSync}
            disabled={isSyncing || !isConnected}
            variant="outline"
            fullWidth
          />
        </View>
        <Text style={dynamicStyles.infoText}>
          La sincronización envía tus cambios locales al servidor y descarga cambios nuevos.
        </Text>
      </Card>
    </ScrollView>
  );
}
