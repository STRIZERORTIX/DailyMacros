export const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export const tokenize = (q: string) => normalize(q).split(" ").filter(Boolean).slice(0, 6);

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const words = (s: string) => s.split(/[^a-z0-9]+/).filter(Boolean);

/** Higher is better: exact name > exact alias > prefix > word prefix > contains. Shorter names win ties. */
export function scoreMatch(name: string, aliases: readonly string[], query: string): number {
  const q = normalize(query);
  const n = normalize(name);
  const al = aliases.map(normalize);
  let base = 10;
  if (n === q) base = 100;
  else if (al.includes(q)) base = 95;
  else if (n.startsWith(q)) base = 80;
  else if (al.some((a) => a.startsWith(q))) base = 70;
  else if (words(n).some((w) => w.startsWith(q))) base = 60;
  else if (al.some((a) => words(a).some((w) => w.startsWith(q)))) base = 55;
  else if (n.includes(q)) base = 50;
  else if (al.some((a) => a.includes(q))) base = 40;
  return base * 1000 - n.length;
}
