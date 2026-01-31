import { Platform } from 'react-native';

export interface PendingChange {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: string;
}

export interface SyncResult {
  success: boolean;
  appliedChanges: Array<{ table: string; operation: string; id: string; success: boolean }>;
  serverChanges: Array<{ table: string; operation: string; id: string; data: any; updatedAt: string }>;
  serverTimestamp: string;
}

const SYNC_QUEUE_KEY = '@FinancialGenie:syncQueue';
const LAST_SYNC_KEY = '@FinancialGenie:lastSync';
const SERVER_URL_KEY = '@FinancialGenie:serverUrl';

// Storage helpers
async function getSyncQueue(): Promise<PendingChange[]> {
  if (Platform.OS === 'web') {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
}

async function saveSyncQueue(queue: PendingChange[]): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
}

async function getLastSyncTimestamp(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(LAST_SYNC_KEY);
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  }
}

async function setLastSyncTimestamp(timestamp: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
  }
}

export function getServerUrl(): string | null {
  if (Platform.OS === 'web') {
    return localStorage.getItem(SERVER_URL_KEY) || process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';
  } else {
    // For mobile, we'll need to get it from AsyncStorage or env
    return process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';
  }
}

export function setServerUrl(url: string): void {
  if (Platform.OS === 'web') {
    localStorage.setItem(SERVER_URL_KEY, url);
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.setItem(SERVER_URL_KEY, url);
  }
}

// Add change to sync queue
export async function addToSyncQueue(
  table: string,
  operation: 'create' | 'update' | 'delete',
  id: string,
  data?: any
): Promise<void> {
  const queue = await getSyncQueue();
  const change: PendingChange = {
    id,
    table,
    operation,
    data,
    timestamp: new Date().toISOString(),
  };

  // Remove any existing change for this id+table+operation to avoid duplicates
  const filtered = queue.filter(
    (c) => !(c.id === id && c.table === table && c.operation === operation)
  );
  filtered.push(change);
  await saveSyncQueue(filtered);
}

// Check if server is reachable
export async function checkServerConnection(serverUrl?: string): Promise<boolean> {
  const url = serverUrl || getServerUrl();
  if (!url) return false;

  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Sync with server
export async function syncWithServer(serverUrl?: string): Promise<SyncResult | null> {
  const url = serverUrl || getServerUrl();
  if (!url) {
    throw new Error('Server URL no configurado');
  }

  // Check connection first
  const isConnected = await checkServerConnection(url);
  if (!isConnected) {
    throw new Error('No se puede conectar al servidor');
  }

  const queue = await getSyncQueue();
  const lastSync = await getLastSyncTimestamp();

  // Prepare changes for sync
  const changes = queue.map((change) => ({
    table: change.table,
    operation: change.operation,
    id: change.id,
    data: change.data,
  }));

  try {
    const response = await fetch(`${url}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changes,
        lastSyncTimestamp: lastSync,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const result: SyncResult = await response.json();

    if (result.success) {
      // Remove successfully synced changes from queue
      const syncedIds = new Set(
        result.appliedChanges
          .filter((c) => c.success)
          .map((c) => `${c.table}:${c.id}:${c.operation}`)
      );
      const remainingQueue = queue.filter(
        (c) => !syncedIds.has(`${c.table}:${c.id}:${c.operation}`)
      );
      await saveSyncQueue(remainingQueue);

      // Update last sync timestamp
      if (result.serverTimestamp) {
        await setLastSyncTimestamp(result.serverTimestamp);
      }

      return result;
    } else {
      throw new Error('Sincronización falló');
    }
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}

// Get all data from server (initial sync)
export async function fetchAllFromServer(serverUrl?: string): Promise<any> {
  const url = serverUrl || getServerUrl();
  if (!url) {
    throw new Error('Server URL no configurado');
  }

  const response = await fetch(`${url}/api/data`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.status}`);
  }

  return await response.json();
}

// Get sync queue size
export async function getSyncQueueSize(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}
