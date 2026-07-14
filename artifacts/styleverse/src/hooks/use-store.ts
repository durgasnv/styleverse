import { useState, useEffect, useCallback } from 'react';
import { Outfit } from '../data/mock-data';

export interface BagItem {
  id: string;
  productId: string;
  size: string;
  qty: number;
}

export interface Collection {
  id: string;
  name: string;
  productIds: string[];
  outfitIds: string[];
}

export interface UserPrefs {
  mood: string;
  skinTone: string;
  weather: string;
}

export interface AppState {
  bag: BagItem[];
  wishlist: string[]; // product IDs
  collections: Collection[];
  myLooks: Outfit[];
  prefs: UserPrefs;
  challengeVotes: Record<string, boolean>; // entryId -> voted
}

const DEFAULT_STATE: AppState = {
  bag: [],
  wishlist: [],
  collections: [
    { id: 'col1', name: 'Wishlist', productIds: [], outfitIds: [] },
    { id: 'col2', name: 'Date Night', productIds: [], outfitIds: [] },
  ],
  myLooks: [],
  prefs: {
    mood: 'confident',
    skinTone: 'medium',
    weather: 'sunny'
  },
  challengeVotes: {}
};

// Simple event emitter for syncing state across components
type Listener = () => void;
let listeners: Listener[] = [];
const emit = () => listeners.forEach(l => l());

let stateCache: AppState | null = null;

const loadState = (): AppState => {
  if (stateCache) return stateCache;
  try {
    const saved = localStorage.getItem('styleverse_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults so fields added in later builds (e.g. a new
      // AppState key) don't crash reads/writes against older persisted state.
      stateCache = {
        ...DEFAULT_STATE,
        ...parsed,
        prefs: { ...DEFAULT_STATE.prefs, ...parsed?.prefs },
      };
      return stateCache;
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  stateCache = { ...DEFAULT_STATE };
  return stateCache;
};

const saveState = (newState: AppState) => {
  stateCache = newState;
  try {
    localStorage.setItem('styleverse_state', JSON.stringify(newState));
  } catch (e) {
    console.error('Failed to save state', e);
  }
  emit();
};

export const useStore = () => {
  const [state, setState] = useState<AppState>(loadState());

  useEffect(() => {
    const listener = () => setState(loadState());
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const addToBag = useCallback((productId: string, size: string, qty: number = 1) => {
    const current = loadState();
    const existing = current.bag.find(i => i.productId === productId && i.size === size);
    if (existing) {
      existing.qty += qty;
    } else {
      current.bag.push({ id: Math.random().toString(36).substring(7), productId, size, qty });
    }
    saveState({ ...current });
  }, []);

  const updateBagItem = useCallback((id: string, qty: number) => {
    const current = loadState();
    if (qty <= 0) {
      current.bag = current.bag.filter(i => i.id !== id);
    } else {
      const item = current.bag.find(i => i.id === id);
      if (item) item.qty = qty;
    }
    saveState({ ...current });
  }, []);

  const removeBagItem = useCallback((id: string) => {
    const current = loadState();
    current.bag = current.bag.filter(i => i.id !== id);
    saveState({ ...current });
  }, []);
  
  const clearBag = useCallback(() => {
    const current = loadState();
    current.bag = [];
    saveState({ ...current });
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    const current = loadState();
    if (current.wishlist.includes(productId)) {
      current.wishlist = current.wishlist.filter(id => id !== productId);
    } else {
      current.wishlist.push(productId);
    }
    saveState({ ...current });
  }, []);

  const saveLook = useCallback((outfit: Omit<Outfit, 'id' | 'createdAt'>) => {
    const current = loadState();
    const newLook: Outfit = {
      ...outfit,
      id: `look_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    current.myLooks = [newLook, ...current.myLooks];
    saveState({ ...current });
    return newLook;
  }, []);

  const removeLook = useCallback((id: string) => {
    const current = loadState();
    current.myLooks = current.myLooks.filter(l => l.id !== id);
    saveState({ ...current });
  }, []);

  const updatePrefs = useCallback((prefs: Partial<UserPrefs>) => {
    const current = loadState();
    current.prefs = { ...current.prefs, ...prefs };
    saveState({ ...current });
  }, []);

  const voteChallenge = useCallback((entryId: string) => {
    const current = loadState();
    current.challengeVotes[entryId] = true;
    saveState({ ...current });
  }, []);

  const toggleCollectionProduct = useCallback((collectionId: string, productId: string) => {
    const current = loadState();
    const col = current.collections.find(c => c.id === collectionId);
    if (col) {
      if (col.productIds.includes(productId)) {
        col.productIds = col.productIds.filter(id => id !== productId);
      } else {
        col.productIds.push(productId);
      }
      saveState({ ...current });
    }
  }, []);

  const createCollection = useCallback((name: string) => {
    const current = loadState();
    current.collections.push({
      id: `col_${Date.now()}`,
      name,
      productIds: [],
      outfitIds: []
    });
    saveState({ ...current });
  }, []);

  const deleteCollection = useCallback((id: string) => {
    const current = loadState();
    current.collections = current.collections.filter(c => c.id !== id);
    saveState({ ...current });
  }, []);

  const resetState = useCallback(() => {
    saveState({ ...DEFAULT_STATE });
  }, []);

  return {
    state,
    addToBag,
    updateBagItem,
    removeBagItem,
    clearBag,
    toggleWishlist,
    saveLook,
    removeLook,
    updatePrefs,
    voteChallenge,
    toggleCollectionProduct,
    createCollection,
    deleteCollection,
    resetState
  };
};
