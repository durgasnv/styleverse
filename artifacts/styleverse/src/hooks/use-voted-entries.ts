import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'styleverse_voted_entries';
const CHANGE_EVENT = 'styleverse:voted-entries-changed';

function loadVoted(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

// Module-level cache so every hook instance reads the same snapshot object;
// useSyncExternalStore requires a stable reference to avoid re-render loops.
let cache = loadVoted();

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getSnapshot() {
  return cache;
}

export function useVotedEntries() {
  const voted = useSyncExternalStore(subscribe, getSnapshot);

  const markVoted = useCallback((entryId: string) => {
    if (cache.has(entryId)) return;
    cache = new Set(cache).add(entryId);
    localStorage.setItem(KEY, JSON.stringify([...cache]));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const hasVoted = useCallback((entryId: string) => voted.has(entryId), [voted]);

  return { hasVoted, markVoted };
}
