export async function submitChallengeEntry(
  challengeId: string,
  params: { productIds: string[]; creatorName: string; creatorId: string },
) {
  const res = await fetch(`/api/challenges/${challengeId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to submit entry (${res.status})`);
  return res.json();
}

export async function voteChallengeEntry(challengeId: string, entryId: string, voterId: string): Promise<{ voteCount: number }> {
  const res = await fetch(`/api/challenges/${challengeId}/entries/${entryId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterId }),
  });
  if (res.status === 409) throw new Error('ALREADY_VOTED');
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to vote (${res.status})`);
  return res.json();
}
