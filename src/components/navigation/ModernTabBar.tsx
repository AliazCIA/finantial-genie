import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { SPRING_CONFIG } from '../../utils/animations';
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
} from './TabIcons';

interface Tab {
  name: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route: string;
}

interface ModernTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

// Tabs principales con iconos (móvil - máximo 5)
const PRIMARY_TABS_MOBILE: Tab[] = [
  { name: 'Dashboard', label: 'Inicio', icon: HomeIcon, route: 'Dashboard' },
  { name: 'Transactions', label: 'Trans.', icon: TransactionsIcon, route: 'Transactions' },
  { name: 'CreditCards', label: 'Tarjetas', icon: CardsIcon, route: 'CreditCards' },
  { name: 'Payments', label: 'Pagos', icon: PaymentsIcon, route: 'Payments' },
  { name: 'Analysis', label: 'Análisis', icon: AnalysisIcon, route: 'Analysis' },
];

// Todos los tabs para web/desktop
const ALL_TABS: Tab[] = [
  { name: 'Dashboard', label: 'Inicio', icon: HomeIcon, route: 'Dashboard' },
  { name: 'Transactions', label: 'Trans.', icon: TransactionsIcon, route: 'Transactions' },
  { name: 'CreditCards', label: 'Tarjetas', icon: CardsIcon, route: 'CreditCards' },
  { name: 'Payments', label: 'Pagos', icon: PaymentsIcon, route: 'Payments' },
  { name: 'Installments', label: 'A Meses', icon: InstallmentsIcon, route: 'Installments' },
  { name: 'Analysis', label: 'Análisis', icon: AnalysisIcon, route: 'Analysis' },
  { name: 'Assets', label: 'Patrimonio', icon: AssetsIcon, route: 'Assets' },
  { name: 'Investments', label: 'Inversiones', icon: InvestmentsIcon, route: 'Investments' },
  { name: 'UserSettings', label: 'Config', icon: SettingsIcon, route: 'UserSettings' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ModernTabBar({ state, descriptors, navigation }: ModernTabBarProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const isMobileDevice = Platform.OS !== 'web';

  // Usar tabs diferentes según la plataforma
  const PRIMARY_TABS = isMobileDevice ? PRIMARY_TABS_MOBILE : ALL_TABS;

  // Encontrar la ruta activa
  const activeRoute = state.routes[state.index]?.name;
  const activeIndex = PRIMARY_TABS.findIndex(tab => tab.route === activeRoute);

  // Animación del indicador
  const indicatorPosition = useSharedValue(activeIndex >= 0 ? activeIndex : 0);
  const indicatorOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (activeIndex >= 0) {
      indicatorPosition.value = withSpring(activeIndex, SPRING_CONFIG.gentle);
      indicatorOpacity.value = withSpring(1, SPRING_CONFIG.gentle);
    } else {
      indicatorOpacity.value = withSpring(0, SPRING_CONFIG.gentle);
    }
  }, [activeRoute]);

  const handleTabPress = (route: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      // UserSettings debe navegar como modal desde el Stack Navigator
      if (route === 'UserSettings') {
        // Navegar al Stack Navigator padre para abrir el modal
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('UserSettings');
        } else {
          // Fallback: intentar navegar directamente
          navigation.navigate('UserSettings');
        }
      } else {
        navigation.navigate(route);
      }
    }
  };

  const renderTab = (tab: Tab, index: number) => {
    const route = state.routes.find((r: any) => r.name === tab.route);
    if (!route) {
      return (
        <AnimatedTouchable
          key={tab.route}
          onPress={() => navigation.navigate(tab.route)}
          style={[styles.tabButton]}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <tab.icon size={22} color={themeColors.textSecondary} />
            <Text style={[styles.tabLabel, { color: themeColors.textSecondary, fontSize: 10 }]}>
              {tab.label}
            </Text>
          </View>
        </AnimatedTouchable>
      );
    }

    const { options } = descriptors[route.key];
    const routeIndex = state.routes.findIndex((r: any) => r.name === tab.route);
    const isFocused = routeIndex >= 0 && state.index === routeIndex;

    const scale = useSharedValue(isFocused ? 1.1 : 1);
    const opacity = useSharedValue(isFocused ? 1 : 0.6);

    React.useEffect(() => {
      scale.value = withSpring(isFocused ? 1.15 : 1, SPRING_CONFIG.snappy);
      opacity.value = withSpring(isFocused ? 1 : 0.6, SPRING_CONFIG.gentle);
    }, [isFocused]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const IconComponent = tab.icon;
    const iconColor = isFocused ? themeColors.primary : themeColors.textSecondary;

    return (
      <AnimatedTouchable
        key={tab.route}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={() => handleTabPress(tab.route, isFocused)}
        style={[styles.tabButton, animatedStyle]}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <IconComponent size={isFocused ? 24 : 22} color={iconColor} />
          <Text style={[
            styles.tabLabel,
            {
              color: iconColor,
              fontSize: isFocused ? 11 : 10,
              fontWeight: isFocused ? '700' : '500',
            }
          ]}>
            {tab.label}
          </Text>
        </View>
        {isFocused && (
          <View style={[
            styles.activeIndicator,
            { backgroundColor: themeColors.primary }
          ]} />
        )}
      </AnimatedTouchable>
    );
  };

  // Estilo del indicador animado
  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = 100 / PRIMARY_TABS.length;
    const translateXValue = interpolate(
      indicatorPosition.value,
      [0, PRIMARY_TABS.length - 1],
      [0, (PRIMARY_TABS.length - 1) * tabWidth],
      Extrapolate.CLAMP
    );
    return {
      transform: [
        {
          translateX: `${translateXValue}%` as any,
        },
      ],
      opacity: indicatorOpacity.value,
    };
  });

  // Gradiente para el fondo - más visible
  const gradientColors = isDark
    ? ['rgba(30, 41, 59, 1)', 'rgba(15, 23, 42, 0.98)', 'rgba(30, 41, 59, 0.95)'] // Slate-800 a Slate-900
    : ['rgba(255, 255, 255, 1)', 'rgba(248, 250, 252, 0.98)', 'rgba(255, 255, 255, 0.95)']; // White a Slate-50

  // Intentar usar LinearGradient para móvil
  let LinearGradient: any = null;
  try {
    LinearGradient = require('expo-linear-gradient').LinearGradient;
  } catch (e) {
    // LinearGradient no está instalado
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: isDark 
        ? 'rgba(15, 23, 42, 0.98)' // Slate-900 with opacity
        : 'rgba(255, 255, 255, 0.98)',
      borderTopWidth: 0,
      paddingTop: spacing.sm,
      paddingBottom: Math.max(insets.bottom, spacing.sm),
      paddingHorizontal: spacing.xs,
      ...(Platform.OS === 'ios' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }),
      ...(Platform.OS === 'android' && {
        elevation: 20,
      }),
      ...(Platform.OS === 'web' && {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        backgroundImage: `linear-gradient(to top, ${gradientColors[0]} 0%, ${gradientColors[1]} 50%, ${gradientColors[2]} 100%)`,
      }),
    },
    primaryTabs: {
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-around',
      alignItems: 'center',
      position: 'relative',
    },
    indicatorContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      zIndex: 0,
    },
    indicator: {
      width: `${100 / PRIMARY_TABS.length}%`,
      height: 3,
      borderRadius: 2,
      backgroundColor: themeColors.primary,
    },
  });

  // Aplicar gradiente directamente al DOM en web usando ref
  const containerRef = React.useRef<any>(null);
  
  React.useEffect(() => {
    if (Platform.OS === 'web' && containerRef.current) {
      const element = containerRef.current as any;
      const gradientBg = `linear-gradient(to top, ${gradientColors[0]} 0%, ${gradientColors[1]} 50%, ${gradientColors[2]} 100%)`;
      
      // Obtener el nodo DOM real
      let domNode: any = null;
      if (element._nativeNode) {
        domNode = element._nativeNode;
      } else if (element.getNode && element.getNode()) {
        domNode = element.getNode();
      } else if (element.style) {
        domNode = element;
      }
      
      if (domNode && domNode.style) {
        domNode.style.backgroundImage = gradientBg;
      }
    }
  }, [gradientColors]);

  // Contenido del menú con gradiente
  const tabBarContent = (
    <View style={dynamicStyles.primaryTabs}>
      {/* Indicador animado */}
      <Animated.View style={[dynamicStyles.indicatorContainer, indicatorStyle]}>
        <View style={[dynamicStyles.indicator, { backgroundColor: themeColors.primary }]} />
      </Animated.View>

      {/* Tabs principales */}
      {PRIMARY_TABS.map((tab, index) => renderTab(tab, index))}
    </View>
  );

  // Usar LinearGradient en móvil si está disponible
  if (LinearGradient && Platform.OS !== 'web') {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.5, 1]}
        style={dynamicStyles.container}
      >
        {tabBarContent}
      </LinearGradient>
    );
  }

  return (
    <View ref={containerRef} style={dynamicStyles.container}>
      {tabBarContent}
    </View>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...typography.caption,
    marginTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -spacing.xs,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
