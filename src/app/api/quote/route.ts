import { quoteCart, quoteRequestSchema } from "@/lib/server/quote";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid bag contents." }, { status: 400 });
  }
  try {
    const quote = await quoteCart(parsed.data);
    return Response.json(quote, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("quote failed", err);
    return Response.json({ error: "Could not check your bag right now." }, { status: 503 });
  }
}
