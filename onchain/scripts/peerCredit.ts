import { ethers } from "hardhat";

/**
 * Agent-to-agent peer-backed credit.
 *
 * Cold-start is the hardest part of lending to a brand-new agent: no history,
 * no basis to underwrite. Finora solves it by letting reputation flow through
 * the *principal* (the human/org that authorizes agents). An established
 * agent's track record raises its principal's standing on-chain; a new agent
 * that principal authorizes inherits that standing at a discount — so a peer's
 * proven behavior backs the newcomer's very first credit line.
 *
 * This demo shows a cold agent and a peer-backed agent getting materially
 * different terms from the SAME base limit, purely from on-chain reputation.
 *
 * Usage: npm run demo:peer
 */

const E = (n: string) => ethers.parseEther(n);
const fmt = (v: bigint) => ethers.formatEther(v);

async function main() {
  const [deployer, principal, agentA, agentB, coldAgent, lender] = await ethers.getSigners();

  console.log("\nFINORA — agent-to-agent peer-backed credit (cold-start solved)\n");

  const Reg = await ethers.getContractFactory("ReputationRegistry", deployer);
  const reg = await Reg.deploy();
  await reg.waitForDeployment();

  // Established agent A, working under `principal`, builds a track record.
  await reg.bootstrap(agentA.address, principal.address);
  for (let i = 0; i < 5; i++) await reg.recordJobSuccess(agentA.address, 45);
  console.log(`Agent A (established) score:        ${await reg.scoreOf(agentA.address)}`);
  console.log(`Principal standing (from A's work): ${await reg.principalScore(principal.address)}`);
  console.log("─".repeat(70));

  // Two brand-new agents. B is authorized by the SAME principal (peer-backed);
  // coldAgent has no sponsor.
  await reg.bootstrap(agentB.address, principal.address);
  await reg.bootstrap(coldAgent.address, ethers.ZeroAddress);
  console.log(`Agent B (peer-backed, new) score:  ${await reg.scoreOf(agentB.address)}  ← inherited from A's principal`);
  console.log(`Cold agent (no sponsor) score:     ${await reg.scoreOf(coldAgent.address)}`);
  console.log("─".repeat(70));

  const Line = await ethers.getContractFactory("CreditLine", lender);
  const baseLimit = E("10");

  const lineB = await Line.deploy(
    lender.address, agentB.address, principal.address, await reg.getAddress(), baseLimit, 1200
  );
  await lineB.waitForDeployment();
  const lineC = await Line.deploy(
    lender.address, coldAgent.address, coldAgent.address, await reg.getAddress(), baseLimit, 1200
  );
  await lineC.waitForDeployment();

  const [limB, bondB] = [await lineB.creditLimit(), await lineB.requiredBond()];
  const [limC, bondC] = [await lineC.creditLimit(), await lineC.requiredBond()];

  console.log("Same base limit (10 ETH), different terms from reputation alone:\n");
  console.log(`  Peer-backed agent B : limit ${fmt(limB)} ETH · required bond ${fmt(bondB)} ETH`);
  console.log(`  Cold agent          : limit ${fmt(limC)} ETH · required bond ${fmt(bondC)} ETH`);
  console.log("");
  console.log(`  → B borrows ${fmt(limB - limC)} ETH more, and posts ${fmt(bondC - bondB)} ETH LESS collateral,`);
  console.log("    because a peer's on-chain track record vouches for it. That's the network effect:");
  console.log("    reputation earned on one line is legible to the next lender, for the next agent.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
