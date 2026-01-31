import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { isDesktop } from '../utils/responsive';
import { getCurrentUser, signOutUser } from '../services/auth/localAuth';
import { getServerUrl } from '../services/sync/syncService';

export default function UserSettings() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const { signOut, localUser } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = localUser || await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);
      }
    };
    loadUser();
  }, [localUser]);

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      showToast('El email es requerido', 'error');
      return;
    }

    showToast('Cambio de email aún no implementado', 'info');
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Todos los campos son requeridos', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    setLoading(true);
    try {
      const serverUrl = getServerUrl();
      
      if (serverUrl && user) {
        // Update password on server
        const response = await fetch(`${serverUrl}/api/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            currentPassword,
            newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Error al cambiar contraseña');
        }

        showToast('Contraseña actualizada correctamente', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast('Cambio de contraseña requiere servidor configurado', 'info');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al cambiar contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      await signOutUser();
      navigation.replace('Login');
      showToast('Sesión cerrada correctamente', 'success');
    } catch (error) {
      showToast('Error al cerrar sesión', 'error');
    }
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
    label: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      padding: spacing.md,
      color: themeColors.text,
      fontSize: typography.body.fontSize,
      ...(Platform.OS === 'web' && {
        outlineStyle: 'none' as any,
      }),
    },
    passwordContainer: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    passwordInput: {
      flex: 1,
      paddingRight: 45,
    },
    eyeButton: {
      position: 'absolute',
      right: 12,
      padding: 8,
      zIndex: 1,
      ...(Platform.OS === 'web' && {
        cursor: 'pointer',
      }),
    },
    eyeIcon: {
      fontSize: 20,
    },
    infoText: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      marginTop: spacing.xs,
    },
    userInfo: {
      ...typography.body,
      color: themeColors.text,
      marginBottom: spacing.xs,
    },
  });

  if (!user) {
    return (
      <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.content}>
        <Text style={dynamicStyles.title}>Configuración de Usuario</Text>
        <Card padding={isDesktop ? spacing.xl : spacing.lg}>
          <Text style={{ color: themeColors.textSecondary }}>Cargando información del usuario...</Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.content}>
      <Text style={dynamicStyles.title}>Configuración de Usuario</Text>

      <Card padding={isDesktop ? spacing.xl : spacing.lg} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>Información de Cuenta</Text>
        <Text style={dynamicStyles.userInfo}>
          <Text style={{ fontWeight: '600' }}>ID:</Text> {user.id}
        </Text>
        <Text style={dynamicStyles.userInfo}>
          <Text style={{ fontWeight: '600' }}>Email:</Text> {user.email}
        </Text>
        <Text style={dynamicStyles.userInfo}>
          <Text style={{ fontWeight: '600' }}>Creado:</Text> {new Date(user.createdAt).toLocaleDateString()}
        </Text>
      </Card>

      <Card padding={isDesktop ? spacing.xl : spacing.lg} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>Cambiar Contraseña</Text>
        
        <Text style={dynamicStyles.label}>Contraseña actual</Text>
        <View style={dynamicStyles.passwordContainer}>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor={themeColors.textSecondary}
            style={[dynamicStyles.input, dynamicStyles.passwordInput, { color: themeColors.text }]}
          />
          <TouchableOpacity
            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            style={dynamicStyles.eyeButton}
          >
            <Text style={[dynamicStyles.eyeIcon, { color: themeColors.textSecondary }]}>
              {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={dynamicStyles.label}>Nueva contraseña</Text>
        <View style={dynamicStyles.passwordContainer}>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder="••••••••"
            placeholderTextColor={themeColors.textSecondary}
            style={[dynamicStyles.input, dynamicStyles.passwordInput, { color: themeColors.text }]}
          />
          <TouchableOpacity
            onPress={() => setShowNewPassword(!showNewPassword)}
            style={dynamicStyles.eyeButton}
          >
            <Text style={[dynamicStyles.eyeIcon, { color: themeColors.textSecondary }]}>
              {showNewPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={dynamicStyles.label}>Confirmar nueva contraseña</Text>
        <View style={dynamicStyles.passwordContainer}>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={themeColors.textSecondary}
            style={[dynamicStyles.input, dynamicStyles.passwordInput, { color: themeColors.text }]}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={dynamicStyles.eyeButton}
          >
            <Text style={[dynamicStyles.eyeIcon, { color: themeColors.textSecondary }]}>
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Cambiar Contraseña"
          onPress={handleUpdatePassword}
          loading={loading}
          disabled={loading}
          variant="primary"
          fullWidth
          style={{ marginTop: spacing.md }}
        />
        <Text style={dynamicStyles.infoText}>
          La contraseña debe tener al menos 6 caracteres.
        </Text>
      </Card>

      <Card padding={isDesktop ? spacing.xl : spacing.lg} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>Sesión</Text>
        <Button
          title="Cerrar Sesión"
          onPress={handleSignOut}
          variant="outline"
          fullWidth
        />
        <Text style={dynamicStyles.infoText}>
          Cerrar sesión te desconectará de tu cuenta.
        </Text>
      </Card>
    </ScrollView>
  );
}
