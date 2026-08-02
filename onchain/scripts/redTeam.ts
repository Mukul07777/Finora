import { ethers } from "hardhat";

/**
 * Adversarial red-team demo for the *new* layers: enforced repayment
 * (CreditLine), cryptographic delegation (EIP-712 grants), guardian /
 * monitor freeze roles, and the dead-man switch. Every "attack" is a real
 * transaction against real Solidity on an in-memory EVM — every BLOCKED
 * line is an actual revert reason, not a mock.
 *
 * Usage: npm run demo:redteam
 */

function line() {
  console.log("─".repeat(74));
}

async function expectRevert(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`✗ UNEXPECTED: "${label}" should have reverted but succeeded.`);
  } catch (err: unknown) {
    const e = err as { shortMessage?: string; message?: string };
    const reason = e.shortMessage || e.message || String(err);
    console.log(`✓ BLOCKED  — ${label}\n            reason: ${reason}`);
  }
}

async function ok(label: string, fn: () => Promise<unknown>) {
  await fn();
  console.log(`✓ ALLOWED  — ${label}`);
}

const E = (n: string) => ethers.parseEther(n);

async function main() {
  const [owner, agent, principal, lender, guardian, monitor, outsider] = await ethers.getSigners();

  console.log("\nFINORA RED-TEAM — enforced credit, delegation, guardians, dead-man switch\n");

  // --- Deploy the stack ---------------------------------------------------
  const Reg = await ethers.getContractFactory("ReputationRegistry", owner);
  const reg = await Reg.deploy();
  await reg.waitForDeployment();

  const Line = await ethers.getContractFactory("CreditLine", lender);
  const creditLine = await Line.deploy(
    lender.address,
    agent.address,
    principal.address,
    await reg.getAddress(),
    E("10"),
    1200
  );
  await creditLine.waitForDeployment();
  await reg.connect(owner).setReporter(await creditLine.getAddress(), true);

  const Wallet = await ethers.getContractFactory("AgentWallet", owner);
  const wallet = await Wallet.deploy(agent.address, E("0.5"), E("1"));
  await wallet.waitForDeployment();
  await owner.sendTransaction({ to: await wallet.getAddress(), value: E("5") });

  console.log(`ReputationRegistry @ ${await reg.getAddress()}`);
  console.log(`CreditLine         @ ${await creditLine.getAddress()}`);
  console.log(`AgentWallet        @ ${await wallet.getAddress()}`);
  line();

  // === Repayment enforcement =============================================
  console.log("[1] Credit sizing is reputation-derived, not hardcoded.");
  console.log(`    score ${await reg.scoreOf(agent.address)} → limit ${ethers.formatEther(await creditLine.creditLimit())} ETH, required bond ${ethers.formatEther(await creditLine.requiredBond())} ETH`);
  line();

  console.log("[2] Agent tries to draw before the line is activated / bonded.");
  await expectRevert("drawdown on an un-activated line", () =>
    creditLine.connect(agent).drawdown(E("1"))
  );
  line();

  console.log("[3] Principal posts the reputation-scaled bond and activates.");
  const required = await creditLine.requiredBond();
  await creditLine.connect(principal).postBond({ value: required });
  await ok("principal posts slashable bond + activate", async () => {
    await creditLine.connect(principal).activate();
  });
  await creditLine.connect(lender).fundPool({ value: E("7") });
  line();

  console.log("[4] Agent draws 4 ETH working capital.");
  await ok("in-limit drawdown", () => creditLine.connect(agent).drawdown(E("4")));
  console.log(`    outstanding debt: ${ethers.formatEther(await creditLine.outstanding())} ETH`);
  line();

  console.log("[5] Task earns 5 ETH. Agent tries to keep the gross revenue.");
  await creditLine.connect(outsider).reportRevenue({ value: E("5") });
  console.log(`    → repayment skimmed at source. remaining debt: ${ethers.formatEther(await creditLine.outstanding())} ETH`);
  console.log(`    → agent's withdrawable NET: ${ethers.formatEther(await creditLine.revenueNet())} ETH (not the 5 gross)`);
  await ok("agent withdraws only its net (post-repayment) share", () =>
    creditLine.connect(agent).withdrawNet()
  );
  console.log("    The agent never controlled the gross — repayment wasn't a promise, it was a deduction.");
  line();

  // === Cryptographic delegation ==========================================
  console.log("[6] Agent forges its own spend authorization (self-signed grant).");
  const net = await ethers.provider.getNetwork();
  const domain = {
    name: "Finora AgentWallet",
    version: "1",
    chainId: Number(net.chainId),
    verifyingContract: await wallet.getAddress(),
  };
  const types = {
    SpendGrant: [
      { name: "agent", type: "address" },
      { name: "to", type: "address" },
      { name: "maxAmount", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const grant = {
    agent: agent.address,
    to: outsider.address,
    maxAmount: E("0.3"),
    expiry: Math.floor(Date.now() / 1000) + 3600,
    nonce: 1,
  };
  const forged = await agent.signTypedData(domain, types, grant);
  await expectRevert("pay with an agent-forged grant", () =>
    wallet.connect(agent).payWithGrant(grant, forged, E("0.2"))
  );

  console.log("[7] Owner signs a real grant; agent then tries to replay it twice.");
  const validSig = await owner.signTypedData(domain, types, grant);
  await ok("first use of an owner-signed grant", () =>
    wallet.connect(agent).payWithGrant(grant, validSig, E("0.2"))
  );
  await expectRevert("replay the same grant", () =>
    wallet.connect(agent).payWithGrant(grant, validSig, E("0.1"))
  );
  line();

  // === Monitor / guardian / dead-man =====================================
  console.log("[8] Monitor detects anomalous velocity and trips the breaker.");
  await wallet.connect(owner).setMonitor(monitor.address);
  await ok("monitor.tripBreaker(88) — automated freeze, no human click", () =>
    wallet.connect(monitor).tripBreaker(88)
  );
  await expectRevert("agent payment after the breaker tripped", () =>
    wallet.connect(agent).directPay(outsider.address, E("0.1"))
  );
  await wallet.connect(owner).unpause();
  line();

  console.log("[9] A guardian can freeze but can never drain.");
  await wallet.connect(owner).setGuardian(guardian.address, true);
  await ok("guardian.guardianPause()", () => wallet.connect(guardian).guardianPause());
  await expectRevert("guardian tries to withdraw funds", () =>
    wallet.connect(guardian).withdraw(E("1"))
  );
  await wallet.connect(owner).unpause();
  line();

  console.log("[10] Dead-man switch: owner goes silent, agent authority auto-expires.");
  await wallet.connect(owner).setHeartbeat(3600);
  await ethers.provider.send("evm_increaseTime", [3601]);
  await ethers.provider.send("evm_mine", []);
  await expectRevert("agent payment after owner heartbeat lapsed", () =>
    wallet.connect(agent).directPay(outsider.address, E("0.1"))
  );
  line();

  console.log("\nEvery BLOCKED line above is a real EVM revert. Repayment, delegation,");
  console.log("freeze authority, and expiry are all enforced by the contract — none of");
  console.log("them depend on the agent choosing to cooperate.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
