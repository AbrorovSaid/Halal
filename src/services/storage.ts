import { ShiftReport } from '../types/shift';

const DB_NAME = 'PinskMeatShiftsDB';
const DB_VERSION = 1;
const STORE_SHIFTS = 'shifts';
const STORE_VIDEOS = 'videos';
const LS_KEY = 'pinsk_meat_shifts_backup';

// Clean initial state - no mock shifts
const INITIAL_SHIFTS: ShiftReport[] = [];

// Open / initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SHIFTS)) {
        db.createObjectStore(STORE_SHIFTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
        db.createObjectStore(STORE_VIDEOS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Retrieve all shifts
export async function getLocalShifts(): Promise<ShiftReport[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SHIFTS, 'readonly');
    const store = tx.objectStore(STORE_SHIFTS);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        let list: ShiftReport[] = request.result || [];
        // Filter out legacy mock data if any was cached in previous versions
        list = list.filter(
          (s) =>
            !s.id.startsWith('shift-10') &&
            s.supervisorName !== 'Ашраф Аброров' &&
            s.supervisorName !== 'Бахром Каримов'
        );

        const ls = localStorage.getItem(LS_KEY);
        if (list.length === 0 && ls) {
          try {
            const parsed = JSON.parse(ls);
            list = parsed.filter(
              (s: ShiftReport) =>
                !s.id.startsWith('shift-10') &&
                s.supervisorName !== 'Ашраф Аброров' &&
                s.supervisorName !== 'Бахром Каримов'
            );
          } catch {
            list = [];
          }
        }
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(list);
      };
      request.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

async function saveInitialShifts(shifts: ShiftReport[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(shifts));
    const db = await openDB();
    const tx = db.transaction(STORE_SHIFTS, 'readwrite');
    const store = tx.objectStore(STORE_SHIFTS);
    shifts.forEach((s) => store.put(s));
  } catch {}
}

// Save a shift record + video blob
export async function saveLocalShift(
  shift: ShiftReport,
  videoBlob?: Blob | null
): Promise<ShiftReport> {
  // 1. Save in IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SHIFTS, STORE_VIDEOS], 'readwrite');
    const shiftsStore = tx.objectStore(STORE_SHIFTS);
    shiftsStore.put(shift);

    if (videoBlob) {
      const videosStore = tx.objectStore(STORE_VIDEOS);
      videosStore.put(videoBlob, shift.id);
    }
  } catch (err) {
    console.warn('IndexedDB write error:', err);
  }

  // 2. Sync to localStorage backup
  try {
    const existing = await getLocalShifts();
    const index = existing.findIndex((s) => s.id === shift.id);
    if (index >= 0) {
      existing[index] = shift;
    } else {
      existing.unshift(shift);
    }
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
  } catch {}

  return shift;
}

// Update an existing shift (e.g. verify by boss or update sync)
export async function updateLocalShift(
  id: string,
  partial: Partial<ShiftReport>
): Promise<ShiftReport | null> {
  const all = await getLocalShifts();
  const index = all.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const updated: ShiftReport = {
    ...all[index],
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  // Recalculate weights if changed
  if (partial.meatWeightKg !== undefined || partial.bullsSlaughtered !== undefined) {
    const kg = Number(updated.meatWeightKg) || 0;
    const bulls = Number(updated.bullsSlaughtered) || 0;
    updated.meatWeightTons = Math.round((kg / 1000) * 100) / 100;
    updated.avgMeatPerBullKg = bulls > 0 ? Math.round((kg / bulls) * 10) / 10 : 0;
  }

  await saveLocalShift(updated);
  return updated;
}

// Delete shift
export async function deleteLocalShift(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SHIFTS, STORE_VIDEOS], 'readwrite');
    tx.objectStore(STORE_SHIFTS).delete(id);
    tx.objectStore(STORE_VIDEOS).delete(id);
  } catch {}

  try {
    const all = await getLocalShifts();
    const filtered = all.filter((s) => s.id !== id);
    localStorage.setItem(LS_KEY, JSON.stringify(filtered));
  } catch {}

  return true;
}

// Retrieve video blob for playback
export async function getLocalVideoUrl(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_VIDEOS, 'readonly');
    const store = tx.objectStore(STORE_VIDEOS);
    const request = store.get(id);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const blob: Blob = request.result;
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
