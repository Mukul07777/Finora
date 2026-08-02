import { NextResponse } from "next/server";
import { ethers } from "ethers";

/**
 * Server-side READ-ONLY calls against the deployed Sepolia contracts.
 * No private key, no signing, no gas — just `eth_call`. Proves the
 * deployed addresses aren't just inert bytecode: they hold real,
 * queryable state right now, on a public network.
 */

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

const AGENT_WALLET = process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS;
const CREDIT_LINE = process.env.NEXT_PUBLIC_CREDIT_LINE_ADDRESS;
const REPUTATION_REGISTRY = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS;

const WALLET_ABI = [
  "function owner() view returns (address)",
  "function agent() view returns (address)",
  "function paused() view returns (bool)",
  "function perTxLimit() view returns (uint256)",
  "function dailyLimit() view returns (uint256)",
];
const CREDIT_LINE_ABI = [
  "function open() view returns (bool)",
  "function baseLimit() view returns (uint256)",
  "function aprBps() view returns (uint256)",
  "function drawn() view returns (uint256)",
  "function bond() view returns (uint256)",
  "function poolBalance() view returns (uint256)",
];
const REGISTRY_ABI = ["function scoreOf(address agent) view returns (uint32)"];

export async function GET() {
  if (!AGENT_WALLET || !CREDIT_LINE || !REPUTATION_REGISTRY) {
    return NextResponse.json({ ok: false, error: "Contract addresses not configured." }, { status: 200 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL, { chainId: 11155111, name: "sepolia" });
    const wallet = new ethers.Contract(AGENT_WALLET, WALLET_ABI, provider);
    const creditLine = new ethers.Contract(CREDIT_LINE, CREDIT_LINE_ABI, provider);
    const registry = new ethers.Contract(REPUTATION_REGISTRY, REGISTRY_ABI, provider);

    const [owner, agent, paused, perTxLimit, dailyLimit] = await Promise.all([
      wallet.owner(),
      wallet.agent(),
      wallet.paused(),
      wallet.perTxLimit(),
      wallet.dailyLimit(),
    ]);

    const score = await registry.scoreOf(agent).catch(() => BigInt(0));

    const [open, baseLimit, aprBps, drawn, bond, poolBalance] = await Promise.all([
      creditLine.open(),
      creditLine.baseLimit(),
      creditLine.aprBps(),
      creditLine.drawn(),
      creditLine.bond(),
      creditLine.poolBalance(),
    ]);

    return NextResponse.json({
      ok: true,
      network: "Ethereum Sepolia",
      fetchedAt: new Date().toISOString(),
      agentWallet: {
        address: AGENT_WALLET,
        owner,
        agent,
        paused,
        perTxLimitEth: ethers.formatEther(perTxLimit),
        dailyLimitEth: ethers.formatEther(dailyLimit),
      },
      reputation: {
        address: REPUTATION_REGISTRY,
        agentScore: Number(score), // 400-990 raw scale; divide by 10 for 0-100 display
        agentScoreDisplay: Number(score) / 10,
        bootstrapped: Number(score) > 0,
      },
      creditLine: {
        address: CREDIT_LINE,
        open,
        baseLimitEth: ethers.formatEther(baseLimit),
        aprPercent: Number(aprBps) / 100,
        drawnEth: ethers.formatEther(drawn),
        bondEth: ethers.formatEther(bond),
        poolBalanceEth: ethers.formatEther(poolBalance),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `On-chain read failed: ${message}` }, { status: 200 });
  }
}
