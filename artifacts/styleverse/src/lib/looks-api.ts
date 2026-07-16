export interface Look {
  id: string;
  userId: string;
  name: string;
  productIds: string[];
  companionScore?: number;
  createdAt: string;
}

export async function createLook(params: {
  userId: string;
  name: string;
  productIds: string[];
  companionScore?: number;
}): Promise<Look> {
  const res = await fetch('/api/looks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to save look (${res.status})`);
  return res.json();
}

export async function fetchLooks(userId: string): Promise<Look[]> {
  const res = await fetch(`/api/looks?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to load looks (${res.status})`);
  return res.json();
}

export async function deleteLook(id: string, userId: string): Promise<void> {
  const res = await fetch(`/api/looks/${id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error((await res.json().catch(() => null))?.error || `Failed to delete look (${res.status})`);
  }
}
