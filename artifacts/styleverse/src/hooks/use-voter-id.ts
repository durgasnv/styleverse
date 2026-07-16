import { useState } from 'react';

const KEY = 'styleverse_voter_id';

export function getVoterId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function useVoterId(): string {
  const [id] = useState(getVoterId);
  return id;
}
