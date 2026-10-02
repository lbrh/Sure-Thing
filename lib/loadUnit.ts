import databases from "@/data/databases-101.json";
import materials from "@/data/materials-chemistry.json";
import soils from "@/data/soil-chemistry.json";
import type { Concept, Question } from "./engine";
import type { Unit } from "./store";

export interface Loaded {
  unit: Unit;
  concepts: Concept[];
  questions: Question[];
  fallback?: string;
}

/** Hand-checked units that work offline. The first one is the fallback when live generation fails. */
export const SEEDED = [
  { match: /database/i, bank: databases },
  { match: /materials?\s*chem/i, bank: materials },
  { match: /soil/i, bank: soils },
];

function seeded(examDate: string, fallback?: string, seed = SEEDED[0].bank): Loaded {
  return {
    unit: { id: seed.unit.id, name: seed.unit.name, examDate, live: false },
    concepts: seed.concepts,
    questions: seed.questions as Question[],
    fallback,
  };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

/** Live generation with the seeded bank as the fallback for any failure (offline, no key, bad JSON). */
export async function loadUnit(name: string, examDate: string, progress: (msg: string) => void): Promise<Loaded> {
  const hit = SEEDED.find((s) => s.match.test(name));
  if (hit) return seeded(examDate, undefined, hit.bank);
  try {
    progress("Mapping your unit…");
    const { unitId, concepts } = await post<{ unitId: string; concepts: Concept[] }>("/api/unit", { unitName: name });
    const batches: Concept[][] = [];
    for (let i = 0; i < concepts.length; i += 3) batches.push(concepts.slice(i, i + 3));
    let done = 0;
    progress(`Writing and checking questions (0/${concepts.length})…`);
    const results = await Promise.all(
      batches.map(async (b) => {
        try {
          const { questions } = await post<{ questions: Question[] }>("/api/questions", {
            unitName: name,
            concepts: b.map(({ id, name, summary }) => ({ id, name, summary })),
            perConcept: 4,
          });
          return questions;
        } catch {
          return [];
        } finally {
          done += b.length;
          progress(`Writing and checking questions (${done}/${concepts.length})…`);
        }
      })
    );
    const questions = results.flat();
    const kept = concepts.filter((c) => questions.filter((q) => q.conceptId === c.id).length >= 2);
    if (kept.length < 6) throw new Error("too few verified questions");
    return { unit: { id: unitId, name, examDate, live: true }, concepts: kept, questions: questions.filter((q) => kept.some((c) => c.id === q.conceptId)) };
  } catch {
    return seeded(examDate, `Couldn't build "${name}" right now, so you're on the hand-checked Databases 101 demo unit.`);
  }
}
