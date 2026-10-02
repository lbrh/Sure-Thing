import { z } from "zod";
import { generateQuestions, rateLimited } from "@/lib/ai";

const Body = z.object({
  unitName: z.string().min(1).max(80),
  concepts: z.array(z.object({ id: z.string().max(60), name: z.string().max(80), summary: z.string().max(300) })).min(1).max(4),
  perConcept: z.number().int().min(1).max(4),
});

export const maxDuration = 120;

export async function POST(req: Request) {
  if (rateLimited(req.headers.get("x-forwarded-for") ?? "local")) return Response.json({ error: "slow down" }, { status: 429 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { unitName, concepts, perConcept } = body.data;
  const results = await Promise.all(concepts.map((c) => generateQuestions(unitName, c, perConcept).catch(() => [])));
  const questions = results.flat();
  if (!questions.length) return Response.json({ error: "generation unavailable" }, { status: 503 });
  return Response.json({ questions });
}
