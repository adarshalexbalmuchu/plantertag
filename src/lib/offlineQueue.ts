import { supabase, isMockMode } from './supabase';
import { addMockLog, updateMockTreeStatus, getMockTrees } from './mockData';

export interface QueueItem {
  id: string;
  tree_id: number;
  type: 'visit' | 'photo' | 'edit';
  status: string;
  note?: string;
  photoBlob?: Blob;
  gpsCoords?: { latitude: number | null, longitude: number | null };
  staff_name: string;
  timestamp: string;
  retryCount: number;

  // Edit details fields
  planter_name?: string;
  species?: string;
  planted_date?: string;
  location?: string;
}

const DB_NAME = 'ptr-offline-db';
const STORE_NAME = 'queue';
const DB_VERSION = 1;
const MAX_RETRIES = 5;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server-side'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function addToQueue(item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
  const db = await openDB();
  const id = `queue-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  const fullItem: QueueItem = { ...item, id, timestamp, retryCount: 0 };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(fullItem);

    request.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ptr_sync_queue_changed'));
      }
      resolve(id);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getQueue(): Promise<QueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('getQueue error:', e);
    return [];
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ptr_sync_queue_changed'));
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

async function bumpRetryCount(item: QueueItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ ...item, retryCount: item.retryCount + 1 });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function syncItem(item: QueueItem): Promise<void> {
  if (item.type === 'visit') {
    if (isMockMode) {
      addMockLog({
        tree_id: item.tree_id,
        type: 'visit',
        note: item.note,
        staff_name: item.staff_name
      });
      updateMockTreeStatus(item.tree_id, item.status);
    } else {
      // Single atomic RPC: inserts the log and updates tree status together.
      const { error } = await supabase.rpc('log_tree_visit', {
        p_tree_id: item.tree_id,
        p_status: item.status,
        p_note: item.note || null,
        p_created_at: item.timestamp,
      });
      if (error) throw error;
    }
  } else if (item.type === 'photo') {
    let photoUrl = '';
    if (item.photoBlob) {
      if (isMockMode) {
        photoUrl = await blobToBase64(item.photoBlob);
      } else {
        const fileName = `tree-${item.tree_id}-${crypto.randomUUID()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('tree-photos')
          .upload(fileName, item.photoBlob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
            upsert: false
          });
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('tree-photos')
          .getPublicUrl(fileName);
        photoUrl = publicUrl;
      }
    }

    if (isMockMode) {
      addMockLog({
        tree_id: item.tree_id,
        type: 'photo',
        photo_url: photoUrl,
        note: item.note,
        log_latitude: item.gpsCoords?.latitude || undefined,
        log_longitude: item.gpsCoords?.longitude || undefined,
        staff_name: item.staff_name
      });
      updateMockTreeStatus(item.tree_id, item.status);
    } else {
      if (!photoUrl) throw new Error('Missing photo for queued photo log');
      const { error } = await supabase.rpc('log_tree_photo', {
        p_tree_id: item.tree_id,
        p_status: item.status,
        p_photo_url: photoUrl,
        p_note: item.note || null,
        p_lat: item.gpsCoords?.latitude ?? null,
        p_lng: item.gpsCoords?.longitude ?? null,
        p_created_at: item.timestamp,
      });
      if (error) throw error;
    }
  } else if (item.type === 'edit') {
    let bannerPhotoUrl = '';
    if (item.photoBlob) {
      if (isMockMode) {
        bannerPhotoUrl = await blobToBase64(item.photoBlob);
      } else {
        const fileName = `tree-banner-${item.tree_id}-${crypto.randomUUID()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('tree-photos')
          .upload(fileName, item.photoBlob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
            upsert: false
          });
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('tree-photos')
          .getPublicUrl(fileName);
        bannerPhotoUrl = publicUrl;
      }
    }

    if (isMockMode) {
      const updateData: any = {
        planter_name: item.planter_name,
        species: item.species,
        planted_date: item.planted_date,
        location: item.location
      };
      if (bannerPhotoUrl) {
        updateData.main_photo_url = bannerPhotoUrl;
      }
      const storedTrees = getMockTrees();
      const target = storedTrees.find(t => t.id === item.tree_id);
      const updatedTree = { ...target, ...updateData };
      const newTrees = storedTrees.map(t => t.id === item.tree_id ? updatedTree : t);
      localStorage.setItem('ptr_mock_trees', JSON.stringify(newTrees));
    } else {
      const { error } = await supabase.rpc('update_tree_details', {
        p_tree_id: item.tree_id,
        p_planter_name: item.planter_name,
        p_species: item.species,
        p_planted_date: item.planted_date,
        p_location: item.location,
        p_main_photo_url: bannerPhotoUrl || null,
      });
      if (error) throw error;
    }
  }
}

// Guards against overlapping sync runs (e.g. the 'online' event firing while
// the navbar's mount-time sync is still in flight) double-processing the queue.
let syncInProgress = false;

export async function syncOfflineQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  if (syncInProgress) return;

  syncInProgress = true;
  try {
    const queue = await getQueue();
    if (queue.length === 0) return;

    console.log(`[Offline Sync] Starting sync for ${queue.length} items...`);

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) {
        console.warn(`[Offline Sync] Item ${item.id} exceeded ${MAX_RETRIES} retries, leaving queued for manual review.`);
        continue;
      }

      try {
        await syncItem(item);
        await removeFromQueue(item.id);
        console.log(`[Offline Sync] Successfully synced item ${item.id}`);
      } catch (err) {
        // Skip this item and keep going — one bad item must not block every
        // other queued item from syncing.
        console.error(`[Offline Sync] Failed to sync item ${item.id}:`, err);
        await bumpRetryCount(item).catch(() => {});
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ptr_sync_queue_changed'));
      window.dispatchEvent(new Event('ptr_data_synced'));
    }
  } finally {
    syncInProgress = false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
