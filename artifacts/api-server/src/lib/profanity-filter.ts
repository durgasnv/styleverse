const BLOCKLIST = [
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "cunt",
  "dick",
  "pussy",
  "slut",
  "whore",
  "nigger",
  "nigga",
  "chink",
  "spic",
  "faggot",
  "fag",
  "retard",
  "cock",
  "douchebag",
  "motherfucker",
  "asshole",
];

function collapse(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, "");
}

export function containsProfanity(text: string): boolean {
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (words.some((word) => BLOCKLIST.some((bad) => word.includes(bad)))) return true;

  const collapsed = collapse(text);
  return BLOCKLIST.some((bad) => collapsed.includes(bad));
}
