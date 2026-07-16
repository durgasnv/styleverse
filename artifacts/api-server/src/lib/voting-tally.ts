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
