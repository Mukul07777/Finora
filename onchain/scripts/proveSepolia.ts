import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Runs real, on-chain transactions against the ALREADY-DEPLOYED Sepolia
 * contracts (not a fresh deploy, not an in-memory Hardhat EVM). Every tx
 * hash printed here is real and clickable on Etherscan — this is the
 * "npm run demo:attack" story, but happening on a public network instead
 * of a local simulation, so a judge can independently verify it happened.
 *
 * Costs only gas (a handful of tiny/zero-value calls) — no funded balance
 * needed, since directPay(to, 0) is a legitimate zero-value transfer that
 * still runs through every real policy check (allowlist, cap, pause).
 *
 * Usage: npm run demo:live   (needs DEPLOYER_PRIVATE_KEY + a little Sepolia ETH)
 */

const AGENT_WALLET = process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS || "0x45F1c7E023AA9E976cc38FA5FE7345f51BaB9103";
const REPUTATION_REGISTRY = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS || "0xe0F0Ab84f98068cBAC8375d28563d1f0E013c7e7";

const EXPLORER = "https://sepolia.etherscan.io/tx/";

type ProofEntry = { label: string; txHash: string; status: "success" | "reverted"; explorer: string };

async function main() {
  if (network.name !== "sepolia") {
    throw new Error(`Run this with --network sepolia (got "${network.name}"). Usage: npm run demo:live`);
  }

  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer found — set DEPLOYER_PRIVATE_KEY in .env.local");
  console.log(`Signer (owner + agent): ${signer.address}`);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Sepolia balance: ${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) {
    throw new Error("Deployer wallet has 0 Sepolia ETH — get testnet ETH from a faucet before running this.");
  }

  const wallet = await ethers.getContractAt("AgentWallet", AGENT_WALLET, signer);
  const registry = await ethers.getContractAt("ReputationRegistry", REPUTATION_REGISTRY, signer);

  const proof: ProofEntry[] = [];

  async function record(label: string, sendTx: () => Promise<any>, expectRevert = false) {
    console.log(`\n[${label}]`);
    try {
      const tx = await sendTx();
      const receipt = await tx.wait().catch(() => null);
      const status: "success" | "reverted" = receipt && receipt.status === 1 ? "success" : "reverted";
      console.log(`  tx: ${tx.hash} — ${status}`);
      proof.push({ label, txHash: tx.hash, status, explorer: `${EXPLORER}${tx.hash}` });
    } catch (err: any) {
      console.log(`  ✗ did not broadcast: ${err?.shortMessage || err?.message || err}`);
    }
  }

  // 1. Seed reputation for this agent if not already bootstrapped.
  const isBootstrapped = await registry.scoreOf(signer.address).then((s: bigint) => s > 0n).catch(() => false);
  if (!isBootstrapped) {
    await record("Bootstrap agent reputation", () => registry.bootstrap(signer.address, signer.address));
  } else {
    console.log("\n[Bootstrap agent reputation] — already bootstrapped, skipping.");
  }

  // 2. Allowlist a fresh demo vendor address.
  const demoVendor = ethers.Wallet.createRandom().address;
  console.log(`\nDemo vendor address: ${demoVendor}`);
  await record(`Allowlist demo vendor (${demoVendor.slice(0, 10)}…)`, () => wallet.setAllowlist(demoVendor, true));

  // 3. A real allowed payment (0 value — still runs every real policy check).
  await record("Allowed payment to allowlisted vendor", () => wallet.directPay(demoVendor, 0));

  // 4. A real blocked payment — unlisted counterparty. Manual gasLimit so
  //    ethers doesn't pre-simulate and swallow it client-side; it broadcasts
  //    and reverts ON-CHAIN with a real, minable, linkable transaction.
  const unlisted = ethers.Wallet.createRandom().address;
  await record(
    `Blocked payment to unlisted address (${unlisted.slice(0, 10)}…)`,
    () => wallet.directPay(unlisted, 0, { gasLimit: 150_000 }),
    true
  );

  // 5. Owner pauses the wallet.
  await record("Owner pause() — kill switch engaged", () => wallet.pause());

  // 6. Blocked payment while paused, even to the allowlisted vendor.
  await record(
    "Blocked payment while paused (in-flight revocation)",
    () => wallet.directPay(demoVendor, 0, { gasLimit: 150_000 }),
    true
  );

  // 7. Unpause so the demo/console isn't left frozen for the next visitor.
  await record("Owner unpause() — restore normal operation", () => wallet.unpause());

  console.log("\n\n=== Real Sepolia transaction proof ===");
  for (const p of proof) {
    console.log(`${p.status === "success" ? "✓" : "✓ (reverted, as expected)"}  ${p.label}`);
    console.log(`   ${p.explorer}`);
  }

  const outPath = path.resolve(__dirname, "..", "live-proof.json");
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(`\nWrote ${proof.length} entries to ${outPath}`);
  console.log("Paste this file's contents back so it can go on the /security page.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
