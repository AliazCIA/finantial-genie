import { Platform } from 'react-native';
import { DatabaseAdapter } from './adapter.interface';
import { DexieAdapter } from './dexieAdapter';
import { AsyncStorageAdapter } from './asyncStorageAdapter';
import { SyncTrackingAdapter } from '../sync/syncAdapter';

let databaseAdapter: DatabaseAdapter | null = null;

export const getDatabase = async (): Promise<DatabaseAdapter> => {
  if (databaseAdapter) {
    return databaseAdapter;
  }

  // Use local storage: Dexie for web, AsyncStorage for mobile
  // This enables offline-first functionality
  let baseAdapter: DatabaseAdapter;
  if (Platform.OS === 'web') {
    baseAdapter = new DexieAdapter();
  } else {
    baseAdapter = new AsyncStorageAdapter();
  }

  await baseAdapter.initialize();
  
  // Wrap with sync tracking to enable server synchronization
  databaseAdapter = new SyncTrackingAdapter(baseAdapter);
  
  return databaseAdapter;
};

export const resetDatabase = (): void => {
  databaseAdapter = null;
};

