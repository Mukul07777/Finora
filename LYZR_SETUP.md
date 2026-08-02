# Lyzr Agent Setup (Finora)

Finora governs an **autonomous procurement agent**. That agent's "brain" is a
Lyzr Studio agent. Its decisions flow through the exact same wallet-layer policy
a human click would — so Lyzr drives behavior but **cannot bypass any
enforcement**. This is the integration the Lyzr AI team reviews.

When `LYZR_API_KEY` + `LYZR_AGENT_ID` are set in `.env.local`, `/api/agent/decide`
routes every decision through Lyzr and the console shows a **"Lyzr Agent"** badge.
If either is blank, it falls back to Groq automatically.

## Steps

1. **Sign in** at https://studio.lyzr.ai/ using the **official InnovaHack UTM
   account** you signed up with (so the Lyzr team can attribute the project).

2. **Create an agent.** New Agent → give it a name like `finora-procure-01`.
   Pick any capable model (e.g. GPT-4o-mini / Llama-3.1). Paste the system prompt
   below into the agent's instructions/system prompt field.

3. **Copy the Agent ID** from the agent's page/URL.

4. **Get your API key:** account/settings → API Keys → create/copy.

5. **Paste both into `.env.local`:**
   ```
   LYZR_API_KEY=<your key>
   LYZR_AGENT_ID=<your agent id>
   ```

6. **Restart** `npm run dev`. Open the console, run the autopilot — the badge
   should read **"Lyzr Agent"**. If it says "Groq LLM", one of the two values is
   missing or wrong (the app fell back).

## System prompt to paste into the Lyzr agent

> You are agent.procure-01, an autonomous procurement agent inside the fintech
> app Finora. You manage a short-term credit line to buy GPU compute for a task,
> then repay from the revenue the task generates. You do NOT enforce anything
> yourself — every action you pick is independently re-checked by wallet-layer
> policy you cannot see or override.
>
> Available actions:
> - "requestCredit": ask for a credit line. Only when creditStatus is "idle".
> - "sendPayment": spend against the line with an allowlisted vendor. Only when creditStatus is "approved".
> - "completeJob": report task revenue and auto-repay outstanding balance. Only when balance > 0.
> - "wait": do nothing this tick — sensible if nothing else applies, or if frozen is true.
>
> Choose exactly ONE action that makes the most sense next.
>
> Reply with STRICT JSON ONLY — no markdown, no code fences, no text outside the object:
> {"action":"requestCredit"|"sendPayment"|"completeJob"|"wait","reasoning":"<under 20 words, plain English"}

## Why this matters for judging

- **Technical soundness:** a real third-party agent (Lyzr) is making live
  decisions, not scripted logic — and is still fully contained by policy.
- **Risk containment:** even an LLM agent that tries to overspend gets blocked at
  the wallet layer. Demo it: let the Lyzr agent attempt `sendPayment` while
  frozen or over the per-tx cap — the attempt is rejected, not ignored.
