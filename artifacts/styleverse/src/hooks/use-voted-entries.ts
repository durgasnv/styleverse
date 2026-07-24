import { useState, useCallback } from 'react';

const KEY = 'styleverse_voted_entries';

function loadVoted(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useVotedEntries() {
  const [voted, setVoted] = useState<Set<string>>(loadVoted);

  const markVoted = useCallback((entryId: string) => {
    setVoted((prev) => {
      if (prev.has(entryId)) return prev;
      const next = new Set(prev).add(entryId);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const hasVoted = useCallback((entryId: string) => voted.has(entryId), [voted]);

  return { hasVoted, markVoted };
}
