import { useState, useEffect } from 'react';

const KEY = 'styleverse_identity';

export interface Identity {
  userId: string;
  username: string;
}

type Listener = () => void;
let listeners: Listener[] = [];
const emit = () => listeners.forEach((l) => l());

let cache: Identity | null | undefined;

function loadIdentity(): Identity | null {
  if (cache !== undefined) return cache;
  try {
    const saved = localStorage.getItem(KEY);
    cache = saved ? (JSON.parse(saved) as Identity) : null;
  } catch {
    cache = null;
  }
  return cache;
}

function saveIdentity(identity: Identity) {
  cache = identity;
  localStorage.setItem(KEY, JSON.stringify(identity));
  emit();
}

export async function identify(username: string): Promise<Identity> {
  const res = await fetch('/api/users/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to identify (${res.status})`);
  // Backend responds with {id, username} (matching every other model's field
  // naming convention) — map id -> userId for this hook's own shape.
  const data = (await res.json()) as { id: string; username: string };
  const identity: Identity = { userId: data.id, username: data.username };
  saveIdentity(identity);
  return identity;
}

export function useIdentity(): Identity | null {
  const [identity, setIdentity] = useState<Identity | null>(loadIdentity);

  useEffect(() => {
    const listener = () => setIdentity(loadIdentity());
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return identity;
}
