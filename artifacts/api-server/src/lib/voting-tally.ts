export const REACTIONS = ["fire", "yes", "nah"] as const;
export type Reaction = (typeof REACTIONS)[number];

export type Tally = Record<Reaction, number>;

export function computeTally(voters: { reaction: string }[]): Tally {
  const tally: Tally = { fire: 0, yes: 0, nah: 0 };
  for (const voter of voters) {
    if ((REACTIONS as readonly string[]).includes(voter.reaction)) {
      tally[voter.reaction as Reaction]++;
    }
  }
  return tally;
}

export function isReaction(value: unknown): value is Reaction {
  return typeof value === "string" && (REACTIONS as readonly string[]).includes(value);
}

export interface VoterEntry {
  voterId: string;
  voterName?: string | null;
  reaction: string;
  comment?: string | null;
  updatedAt: string;
}

export interface Comment {
  voterId: string;
  voterName: string;
  reaction: Reaction;
  comment: string;
  updatedAt: string;
}

export function extractComments(voters: VoterEntry[]): Comment[] {
  return voters
    .filter((v): v is VoterEntry & { comment: string } => Boolean(v.comment?.trim()) && isReaction(v.reaction))
    .map((v) => ({
      voterId: v.voterId,
      voterName: v.voterName || "Anonymous",
      reaction: v.reaction as Reaction,
      comment: v.comment.trim(),
      updatedAt: v.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
