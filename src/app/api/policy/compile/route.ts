import { NextResponse } from "next/server";
import { compilePolicy, CompiledPolicy } from "@/lib/finora/policyCompiler";

/**
 * Compiles an English policy instruction into structured ops.
 *
 * The deterministic compiler is always the ground truth. If a GROQ_API_KEY
 * is configured, the model is used only to *normalize messy phrasing into a
 * cleaner instruction* before compilation — it never emits the ops itself,
 * so it cannot invent or widen a limit. No key? The raw text goes straight
 * to the same deterministic compiler.
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

export async function POST(request: Request) {
  let text = "";
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json({ ok: false, error: "Empty instruction." }, { status: 200 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  let normalized = text;
  let usedModel = false;

  if (apiKey) {
    const cleaned = await normalizeWithGroq(text, apiKey);
    if (cleaned) {
      normalized = cleaned;
      usedModel = true;
    }
  }

  const compiled: CompiledPolicy = compilePolicy(normalized);
  return NextResponse.json({ ok: true, compiled, usedModel, normalized });
}

async function normalizeWithGroq(text: string, apiKey: string): Promise<string | null> {
  const system = `You normalize a spending-policy instruction into a single, clean, semicolon-separated line using ONLY these directive forms, preserving the user's numbers and vendor names exactly:
- "max $<n> per transaction"
- "no more than $<n> per day"
- "only pay <vendor> and <vendor>"
- "block <vendor>"
- "freeze if risk above <n>" or "freeze if spend doubles"
Do not add limits the user didn't state. Do not widen any number. Output only the normalized line, nothing else.`;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        max_tokens: 200,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const content: string | undefined = payload?.choices?.[0]?.message?.content;
    return content ? content.trim().replace(/^```.*$/gm, "").trim() : null;
  } catch {
    return null;
  }
}
