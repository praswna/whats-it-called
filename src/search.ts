import type { Term } from "./data/types";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

/** 검색: 이름·영문·별칭이 맞으면 높은 점수, 설명·예시가 맞으면 낮은 점수 */
export function searchTerms(all: Term[], query: string): Term[] {
  const q = norm(query);
  if (!q) return all;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean).map(norm);
  return all
    .map((t) => {
      const head = [t.name, t.en, ...t.aliases].map(norm);
      const body = norm([t.summary, t.description, ...t.examples].join(" "));
      let score = 0;
      if (head.some((h) => h === q)) score += 100;
      else if (head.some((h) => h.includes(q))) score += 50;
      for (const w of words) {
        if (head.some((h) => h.includes(w))) score += 20;
        else if (body.includes(w)) score += 5;
      }
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}
