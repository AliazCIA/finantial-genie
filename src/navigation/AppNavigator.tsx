import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Platform, View, ActivityIndicator } from 'react-native';
import { isMobile } from '../utils/responsive';
import ModernTabBar from '../components/navigation/ModernTabBar';
import {
  HomeIcon,
  PaymentsIcon,
  TransactionsIcon,
  CardsIcon,
  AnalysisIcon,
  InstallmentsIcon,
  AssetsIcon,
  InvestmentsIcon,
  SettingsIcon,
} from '../components/navigation/TabIcons';

// Screens
import Dashboard from '../screens/Dashboard';
import Transactions from '../screens/Transactions';
import Installments from '../screens/Installments';
import ExpenseAnalysis from '../screens/ExpenseAnalysis';
import Assets from '../screens/Assets';
import Investments from '../screens/Investments';
import CreditCards from '../screens/CreditCards';
import Payments from '../screens/Payments';
import StatementUpload from '../screens/StatementUpload';
import SyncSettings from '../screens/SyncSettings';
import UserSettings from '../screens/UserSettings';
import LoginScreen from '../screens/Auth/Login';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Mapeo de iconos
const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Dashboard: HomeIcon,
  Payments: PaymentsIcon,
  Transactions: TransactionsIcon,
  Installments: InstallmentsIcon,
  CreditCards: CardsIcon,
  Analysis: AnalysisIcon,
  Assets: AssetsIcon,
  Investments: InvestmentsIcon,
  UserSettings: SettingsIcon,
};

function MainTabs() {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const isMobileDevice = isMobile || Platform.OS !== 'web';

  return (
    <Tab.Navigator
      tabBar={(props) => {
        if (isMobileDevice) {
          return <ModernTabBar {...props} />;
        }
        // Para web/desktop, usar el tab bar personalizado también pero con más tabs
        return <ModernTabBar {...props} />;
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: isMobileDevice ? { display: 'none' } : {
          backgroundColor: themeColors.surface,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          display: 'none', // Ocultar el tab bar por defecto, usar ModernTabBar
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={Dashboard}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.Dashboard;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={Transactions}
        options={{
          tabBarLabel: 'Transacciones',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.Transactions;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
      <Tab.Screen 
        name="CreditCards" 
        component={CreditCards}
        options={{
          tabBarLabel: 'Tarjetas',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.CreditCards;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
      <Tab.Screen
        name="Payments"
        component={Payments}
        options={{
          tabBarLabel: 'Pagos',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.Payments;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
      <Tab.Screen 
        name="Installments" 
        component={Installments}
        options={{
          tabBarLabel: 'A Meses',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.Installments;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
      <Tab.Screen 
        name="Analysis" 
        component={ExpenseAnalysis}
        options={{
          tabBarLabel: 'Análisis',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.Analysis;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
      <Tab.Screen 
        name="Assets" 
        component={Assets}
        options={{
          tabBarLabel: 'Patrimonio',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.Assets;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
      <Tab.Screen 
        name="Investments" 
        component={Investments}
        options={{
          tabBarLabel: 'Inversiones',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.Investments;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
      <Tab.Screen 
        name="UserSettings" 
        component={UserSettings}
        options={{
          tabBarLabel: 'Configuración',
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap.UserSettings;
            return <Icon color={color} size={size || 24} />;
          },
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const { requiresAuth, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  // Determinar la ruta inicial
  const initialRouteName = requiresAuth && !isAuthenticated ? 'Login' : 'Main';

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator 
        initialRouteName={initialRouteName}
        screenOptions={{ 
          headerShown: false,
        }}
      >
        {/* Login screen - shown when auth is required and user is not authenticated */}
        {requiresAuth && !isAuthenticated && (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ 
              headerShown: false,
            }}
          />
        )}
        {/* Main app - always available */}
        <Stack.Screen name="Main" component={MainTabs} />
        {/* Modal screens - shown when authenticated or no auth required */}
        {(!requiresAuth || isAuthenticated) && (
          <>
            <Stack.Screen
              name="StatementUpload"
              component={StatementUpload}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Subir Estado de Cuenta',
              }}
            />
            <Stack.Screen
              name="SyncSettings"
              component={SyncSettings}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Sincronización',
              }}
            />
            <Stack.Screen
              name="UserSettings"
              component={UserSettings}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Configuración de Usuario',
              }}
            />
            {requiresAuth && (
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  title: 'Iniciar Sesión',
                }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
