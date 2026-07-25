export interface VotingRoom {
  id: string;
  productIds: string[];
  outfitId?: string;
  tryOnImage?: string;
  creatorLabel: string;
  createdAt: string;
}

export type Reaction = 'fire' | 'yes' | 'nah';

export interface Tally {
  fire: number;
  yes: number;
  nah: number;
}

export async function createVotingRoom(params: {
  productIds: string[];
  outfitId?: string;
  tryOnImage?: string;
  creatorLabel?: string;
  creatorVoterId: string;
}): Promise<VotingRoom> {
  const res = await fetch('/api/voting/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to create voting room (${res.status})`);
  return res.json();
}

export async function fetchVotingRoom(roomId: string, voterId: string): Promise<{
  room: VotingRoom;
  tally: Tally;
  totalVoters: number;
  myReaction: Reaction | null;
  isCreator: boolean;
}> {
  const res = await fetch(`/api/voting/rooms/${roomId}?voterId=${encodeURIComponent(voterId)}`);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to load voting room (${res.status})`);
  return res.json();
}
