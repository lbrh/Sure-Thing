import { z } from "zod";
import { generateConcepts, rateLimited } from "@/lib/ai";

const Body = z.object({ unitName: z.string().min(1).max(80), topics: z.string().max(3000).optional() });

export async function POST(req: Request) {
  if (rateLimited(req.headers.get("x-forwarded-for") ?? "local")) return Response.json({ error: "slow down" }, { status: 429 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    return Response.json(await generateConcepts(body.data.unitName, body.data.topics));
  } catch {
    // client falls back to the seeded unit
    return Response.json({ error: "generation unavailable" }, { status: 503 });
  }
}
