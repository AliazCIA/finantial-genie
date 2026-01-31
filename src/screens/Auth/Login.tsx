import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const { signIn, signUp, requiresAuth, isAuthenticated } = useAuth();

  // Asegurar que el header esté oculto
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      title: undefined,
    });
  }, [navigation]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isSubmittingRef = useRef(false);
  const passwordInputRef = useRef<TextInput>(null);

  // Detectar cuando la autenticación se completa y navegar
  useEffect(() => {
    if (isAuthenticated && (loading || isSubmittingRef.current)) {
      // El usuario se autenticó, navegar a Main
      setLoading(false);
      isSubmittingRef.current = false;
      
      // Forzar navegación a Main usando reset para asegurar que funcione
      setTimeout(() => {
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' as never }],
          });
        } catch (err) {
          // Si reset falla, intentar replace
          try {
            navigation.replace('Main' as never);
          } catch (e) {
            // Si todo falla, recargar la página (solo en web)
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.reload();
            }
          }
        }
      }, 150);
    }
  }, [isAuthenticated, loading, navigation]);

  const onSubmit = async () => {
    // Prevenir múltiples submits
    if (isSubmittingRef.current || loading) {
      return;
    }

    // Validación básica
    const e = email.trim();
    if (!e || !password) {
      setError('Ingresa email y contraseña');
      return;
    }

    // Limpiar error previo y comenzar carga INMEDIATAMENTE
    setError(null);
    isSubmittingRef.current = true;
    setLoading(true); // Esto se ejecuta síncronamente y actualiza el estado inmediatamente

    try {
      if (mode === 'signin') {
        await signIn(e, password);
      } else {
        await signUp(e, password);
      }
      // El AppNavigator detectará automáticamente el cambio de isAuthenticated
      // y navegará a Main. El loading se ocultará cuando isAuthenticated cambie.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email o contraseña incorrectos');
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { color: themeColors.text }]}>Financial Genie</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          {mode === 'signin' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
        </Text>

        {requiresAuth && (
          <Card style={[styles.card, { borderColor: themeColors.info || themeColors.primary }]}>
            <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>
              {mode === 'signin' 
                ? 'Inicia sesión para acceder a tus datos sincronizados'
                : 'Crea una cuenta para sincronizar tus datos con el servidor'}
            </Text>
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete={Platform.OS === 'web' ? 'email' : 'email'}
            returnKeyType="next"
            onSubmitEditing={() => {
              // Focus en el campo de contraseña
              passwordInputRef.current?.focus();
            }}
            {...(Platform.OS === 'web' && { 
              // @ts-ignore - web-specific props
              name: 'email', 
              id: 'email',
              // @ts-ignore
              type: 'email'
            })}
            placeholder="tu@correo.com"
            placeholderTextColor={themeColors.textSecondary}
            style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]}
          />

          <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 12 }]}>Contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              ref={passwordInputRef}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              secureTextEntry={!showPassword}
              autoComplete={Platform.OS === 'web' ? (mode === 'signin' ? 'current-password' : 'new-password') : undefined}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              {...(Platform.OS === 'web' && { 
                // @ts-ignore - web-specific props
                name: 'password', 
                id: 'password',
                // @ts-ignore
                type: showPassword ? 'text' : 'password'
              })}
              placeholder="••••••••"
              placeholderTextColor={themeColors.textSecondary}
              style={[styles.input, styles.passwordInput, { color: themeColors.text, borderColor: themeColors.border }]}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Text style={[styles.eyeIcon, { color: themeColors.textSecondary }]}>
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </TouchableOpacity>
          </View>

          {error && !loading && <Text style={[styles.error, { color: themeColors.error }]}>{error}</Text>}

          <Button
            title={loading ? 'Entrando...' : (mode === 'signin' ? 'Entrar' : 'Crear cuenta')}
            onPress={onSubmit}
            loading={loading}
            disabled={loading}
            variant="primary"
            fullWidth
            style={{ marginTop: 16 }}
          />

          <Button
            title={mode === 'signin' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            variant="secondary"
            fullWidth
            style={{ marginTop: 10 }}
          />
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 20, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, textAlign: 'center' },
  card: { marginTop: 18 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 45, // Espacio para el botón del ojo
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
  error: { marginTop: 12, fontSize: 13 },
});

