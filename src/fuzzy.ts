/**
 * Lightweight subsequence fuzzy match. Returns a score (higher is better)
 * or -1 when `query` is not a subsequence of `text`. Rewards matches at
 * word boundaries and consecutive runs, so "gm" ranks "getMessage" highly.
 */
export function fuzzyScore(query: string, text: string): number {
  if (query === "") return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let score = 0;
  let qi = 0;
  let prevMatch = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;
    let bonus = 1;
    if (ti === prevMatch + 1) bonus += 3; // consecutive
    const prev = t[ti - 1];
    if (ti === 0 || prev === " " || prev === "-" || prev === "_" || prev === ".")
      bonus += 4; // word boundary
    score += bonus;
    prevMatch = ti;
    qi++;
  }
  return qi === q.length ? score : -1;
}
