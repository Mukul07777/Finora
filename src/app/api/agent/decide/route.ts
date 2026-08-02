import { NextResponse } from "next/server";
import { AutopilotDecision, AutopilotSnapshot, isAutopilotAction } from "@/lib/finora/autopilot";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

function systemPrompt() {
  return `You are the decision-making core of an autonomous procurement agent (agent.procure-01) inside a fintech demo called Finora. Your job is to buy GPU compute time for a task by managing a credit line — but you do not enforce anything yourself. Every action you choose is re-checked by wallet-layer policy you cannot see the internals of and cannot override, even if you try.

Available actions:
- "requestCredit": ask for a line of credit. Only useful when creditStatus is "idle".
- "sendPayment": spend against your credit line with an allowlisted vendor. Only useful when creditStatus is "approved".
- "completeJob": report task revenue and auto-repay your outstanding balance. Only useful when balance > 0.
- "wait": do nothing this tick — sensible if none of the above currently make sense, or if frozen is true (a payment attempt while frozen will be blocked, not silently ignored).

Pick exactly one action that makes the most sense for you to do next, then explain your reasoning in one short sentence (under 20 words, plain English, no jargon).

Respond with strict JSON only — no markdown, no code fences, no commentary outside the JSON object:
{"action": "requestCredit" | "sendPayment" | "completeJob" | "wait", "reasoning": "..."}`;
}

export async function POST(request: Request) {
  let snapshot: AutopilotSnapshot;
  try {
    snapshot = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // Prefer a real Lyzr agent when configured — the autonomous agent whose
  // spending Finora governs is itself an agentic-AI agent built on Lyzr.
  // Its decision still flows through the identical policy path a human click
  // would, so Lyzr can't bypass any enforcement.
  const lyzrKey = process.env.LYZR_API_KEY;
  const lyzrAgent = process.env.LYZR_AGENT_ID;
  if (lyzrKey && lyzrAgent) {
    const decision = await decideWithLyzr(snapshot, lyzrKey, lyzrAgent);
    if (decision) return NextResponse.json({ ok: true, provider: "lyzr", decision });
    // fall through to Groq if Lyzr errors
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "No agent provider configured. Set LYZR_API_KEY + LYZR_AGENT_ID, or GROQ_API_KEY, in .env.local." },
      { status: 200 }
    );
  }

  try {
    const groqResponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 150,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: JSON.stringify(snapshot) },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const detail = await groqResponse.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Groq API error (${groqResponse.status}): ${detail.slice(0, 200)}` },
        { status: 200 }
      );
    }

    const payload = await groqResponse.json();
    const content: string | undefined = payload?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ ok: false, error: "Groq returned no content." }, { status: 200 });
    }

    const parsed = parseDecision(content);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: `Could not parse a valid decision from: ${content.slice(0, 200)}` },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, provider: "groq", decision: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `Request to Groq failed: ${message}` }, { status: 200 });
  }
}

/**
 * Calls a Lyzr Studio agent to decide the autonomous agent's next move.
 * Returns null on any error so the caller can fall back to Groq.
 */
async function decideWithLyzr(
  snapshot: AutopilotSnapshot,
  apiKey: string,
  agentId: string
): Promise<AutopilotDecision | null> {
  const url = process.env.LYZR_API_URL || "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        user_id: process.env.LYZR_USER_ID || "finora-demo",
        agent_id: agentId,
        session_id: `finora-${agentId}`,
        message:
          `You are agent.procure-01, an autonomous procurement agent managing a Finora credit line. ` +
          `Given this state, choose exactly ONE next action and reply with strict JSON only: ` +
          `{"action":"requestCredit"|"sendPayment"|"completeJob"|"wait","reasoning":"<20 words"}. ` +
          `State: ${JSON.stringify(snapshot)}`,
      }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const content: string | undefined =
      payload?.response ?? payload?.message ?? payload?.choices?.[0]?.message?.content;
    if (!content) return null;
    return parseDecision(content);
  } catch {
    return null;
  }
}

function parseDecision(raw: string): AutopilotDecision | null {
  // Models occasionally wrap JSON in a code fence despite instructions not to.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    if (!isAutopilotAction(obj.action)) return null;
    const reasoning = typeof obj.reasoning === "string" ? obj.reasoning.slice(0, 240) : "(no reasoning given)";
    return { action: obj.action, reasoning };
  } catch {
    return null;
  }
}
