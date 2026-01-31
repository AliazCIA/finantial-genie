import { useState, useEffect, useCallback } from 'react';
import {
  syncWithServer,
  checkServerConnection,
  getSyncQueueSize,
  getServerUrl,
  setServerUrl,
  fetchAllFromServer,
  type SyncResult,
} from '../services/sync/syncService';
import { useToast } from '../context/ToastContext';
import { getDatabase } from '../services/database/adapter';

export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [serverUrl, setServerUrlState] = useState<string | null>(null);
  const { showToast } = useToast();

  // Load server URL and check connection on mount
  useEffect(() => {
    const initializeSync = async () => {
      const url = getServerUrl();
      setServerUrlState(url);
      if (url) {
        const connected = await checkServerConnection(url);
        setIsConnected(connected);
      }
      await updatePendingChanges();
    };
    initializeSync();
  }, []);

  // Periodically check connection and pending changes
  useEffect(() => {
    const interval = setInterval(async () => {
      const url = getServerUrl();
      if (url) {
        const connected = await checkServerConnection(url);
        setIsConnected(connected);
      }
      await updatePendingChanges();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const updatePendingChanges = async () => {
    const count = await getSyncQueueSize();
    setPendingChanges(count);
  };

  const sync = useCallback(async (url?: string): Promise<SyncResult | null> => {
    const syncUrl = url || serverUrl;
    if (!syncUrl) {
      showToast('URL del servidor no configurada', 'error');
      return null;
    }

    setIsSyncing(true);
    try {
      const result = await syncWithServer(syncUrl);
      if (!result) {
        return null;
      }
      
      setIsConnected(true);
      await updatePendingChanges();

      const syncedCount = result.appliedChanges.filter((c) => c.success).length;
      const serverCount = result.serverChanges.length;

      if (syncedCount > 0 || serverCount > 0) {
        showToast(
          `Sincronizado: ${syncedCount} cambios enviados, ${serverCount} recibidos`,
          'success'
        );
      } else {
        showToast('Todo está sincronizado', 'info');
      }

      // If server sent changes, reload database
      if (serverCount > 0) {
        const db = await getDatabase();
        // Apply server changes to local database
        for (const change of result.serverChanges) {
          try {
            const repo = (db as any)[change.table];
            if (!repo) continue;

            const existing = await repo.getById(change.id);
            if (existing) {
              await repo.update(change.id, change.data);
            } else {
              await repo.create(change.data);
            }
          } catch (err) {
            console.error(`Error applying server change for ${change.table}:${change.id}`, err);
          }
        }
      }

      return result;
    } catch (error) {
      setIsConnected(false);
      const message = error instanceof Error ? error.message : 'Error de sincronización';
      showToast(message, 'error');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [serverUrl, showToast]);

  const configureServer = useCallback((url: string) => {
    setServerUrl(url);
    setServerUrlState(url);
    checkServerConnection(url).then(setIsConnected);
  }, []);

  const initialSync = useCallback(async (url?: string): Promise<void> => {
    const syncUrl = url || serverUrl;
    if (!syncUrl) {
      showToast('URL del servidor no configurada', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await fetchAllFromServer(syncUrl);
      const db = await getDatabase();

      // Apply all server data to local database
      for (const [table, items] of Object.entries(result.data)) {
        const repo = (db as any)[table];
        if (!repo) continue;

        for (const item of items as any[]) {
          try {
            const existing = await repo.getById(item.id);
            if (existing) {
              await repo.update(item.id, item);
            } else {
              await repo.create(item);
            }
          } catch (err) {
            console.error(`Error applying initial sync for ${table}:${item.id}`, err);
          }
        }
      }

      showToast('Sincronización inicial completada', 'success');
      await updatePendingChanges();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error en sincronización inicial';
      showToast(message, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [serverUrl, showToast]);

  return {
    sync,
    initialSync,
    configureServer,
    isSyncing,
    isConnected,
    pendingChanges,
    serverUrl,
  };
};
