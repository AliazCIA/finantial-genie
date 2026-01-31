import { Platform } from 'react-native';
import { getServerUrl } from '../sync/syncService';

export interface LocalUser {
  id: string;
  email: string;
  createdAt: string;
}

const AUTH_STORAGE_KEY = '@FinancialGenie:localAuth';
const USER_STORAGE_KEY = '@FinancialGenie:localUser';
const USERS_STORAGE_KEY = '@FinancialGenie:localUsers';

// Simple hash function for password (not secure, but better than plain text)
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Storage helpers
async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(key);
  }
}

async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(key, value);
  }
}

async function removeStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem(key);
  }
}

// Get all registered users
async function getUsers(): Promise<Record<string, { email: string; passwordHash: string; createdAt: string }>> {
  const stored = await getStorageItem(USERS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

// Save users registry
async function saveUsers(users: Record<string, { email: string; passwordHash: string; createdAt: string }>): Promise<void> {
  await setStorageItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Get current authenticated user
export async function getCurrentUser(): Promise<LocalUser | null> {
  const stored = await getStorageItem(USER_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Set current authenticated user
async function setCurrentUser(user: LocalUser | null): Promise<void> {
  if (user) {
    await setStorageItem(USER_STORAGE_KEY, JSON.stringify(user));
    await setStorageItem(AUTH_STORAGE_KEY, 'true');
  } else {
    await removeStorageItem(USER_STORAGE_KEY);
    await removeStorageItem(AUTH_STORAGE_KEY);
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const auth = await getStorageItem(AUTH_STORAGE_KEY);
  return auth === 'true';
}

// Register a new user
export async function registerUser(email: string, password: string): Promise<LocalUser> {
  const emailLower = email.trim().toLowerCase();
  
  if (!emailLower || !password) {
    throw new Error('Email y contraseña son requeridos');
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const serverUrl = getServerUrl();
  
  // If server is configured, register on server
  if (serverUrl) {
    try {
      const response = await fetch(`${serverUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar usuario en el servidor');
      }

      // Save user locally and sync to local storage
      const user: LocalUser = {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.createdAt,
      };

      // Also save to local storage for offline access
      const users = await getUsers();
      users[user.id] = {
        email: user.email,
        passwordHash: hashPassword(password),
        createdAt: user.createdAt,
      };
      await saveUsers(users);

      // Auto-login after registration
      await setCurrentUser(user);

      return user;
    } catch (error) {
      // If server fails, fall back to local-only registration
      console.warn('Error registering on server, using local storage:', error);
    }
  }

  // Local-only registration (no server or server failed)
  const users = await getUsers();
  
  // Check if user already exists locally
  const existingUser = Object.values(users).find(u => u.email.toLowerCase() === emailLower);
  if (existingUser) {
    throw new Error('Este email ya está registrado');
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = hashPassword(password);
  const createdAt = new Date().toISOString();

  users[userId] = {
    email: emailLower,
    passwordHash,
    createdAt,
  };

  await saveUsers(users);

  const user: LocalUser = {
    id: userId,
    email: emailLower,
    createdAt,
  };

  // Auto-login after registration
  await setCurrentUser(user);

  return user;
}

// Sign in user
export async function signInUser(email: string, password: string): Promise<LocalUser> {
  const emailLower = email.trim().toLowerCase();
  
  if (!emailLower || !password) {
    throw new Error('Email y contraseña son requeridos');
  }

  const serverUrl = getServerUrl();
  
  // If server is configured, try to login on server first
  if (serverUrl) {
    try {
      const response = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Server login successful
        const user: LocalUser = {
          id: data.user.id,
          email: data.user.email,
          createdAt: data.user.createdAt,
        };

        // Save to local storage for offline access
        const users = await getUsers();
        users[user.id] = {
          email: user.email,
          passwordHash: hashPassword(password),
          createdAt: user.createdAt,
        };
        await saveUsers(users);

        await setCurrentUser(user);
        return user;
      } else {
        throw new Error(data.error || 'Email o contraseña incorrectos');
      }
    } catch (error) {
      // If server fails, try local storage
      console.warn('Error logging in on server, trying local storage:', error);
      // Continue to local login below
    }
  }

  // Local-only login (no server or server failed)
  const users = await getUsers();
  const passwordHash = hashPassword(password);

  // Find user by email
  const userEntry = Object.entries(users).find(([_, u]) => u.email.toLowerCase() === emailLower);
  
  if (!userEntry) {
    throw new Error('Email o contraseña incorrectos');
  }

  const [userId, userData] = userEntry;

  if (userData.passwordHash !== passwordHash) {
    throw new Error('Email o contraseña incorrectos');
  }

  const user: LocalUser = {
    id: userId,
    email: userData.email,
    createdAt: userData.createdAt,
  };

  await setCurrentUser(user);

  return user;
}

// Sign out user
export async function signOutUser(): Promise<void> {
  await setCurrentUser(null);
}
